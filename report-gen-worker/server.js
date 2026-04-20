import express from 'express'
import pkg from 'pg'
import { createClient } from 'redis'

const { Pool } = pkg
const app = express()
const PORT = Number(process.env.PORT || 3000)

const REDIS_URL = process.env.REDIS_URL
const READINGS_DATABASE_URL =
  process.env.READINGS_DATABASE_URL || process.env.READINGS_DB_URL || process.env.DATABASE_URL
const REPORT_DATABASE_URL = process.env.REPORT_DATABASE_URL || process.env.REPORT_DB_URL

const QUEUE_KEY = process.env.REPORT_GEN_QUEUE_KEY || 'report-gen:queue'
const DLQ_KEY = process.env.REPORT_GEN_DLQ_KEY || 'report-gen:dlq'
const REPORT_READY_CHANNEL = process.env.REPORT_READY_CHANNEL || 'report:ready'
const LAST_SUCCESS_KEY = process.env.REPORT_GEN_LAST_SUCCESS_KEY || 'report-gen:stats:last_success_at'
const PROCESSED_COUNT_KEY = process.env.REPORT_GEN_PROCESSED_COUNT_KEY || 'report-gen:stats:jobs_processed'

const queueClient = createClient({ url: REDIS_URL })
const healthClient = createClient({ url: REDIS_URL })
const publisherClient = createClient({ url: REDIS_URL })
queueClient.on('error', () => {})
healthClient.on('error', () => {})
publisherClient.on('error', () => {})

const readingsDb = new Pool({
  connectionString: READINGS_DATABASE_URL,
})

const reportDb = new Pool({
  connectionString: REPORT_DATABASE_URL || READINGS_DATABASE_URL,
})

function normalizeRequest(payload) {
  if (!payload || typeof payload !== 'object') return null

  const sensorId = payload.sensor_id ?? payload.sensorId ?? null
  const startTime = payload.start_time ?? payload.startTime ?? null
  const endTime = payload.end_time ?? payload.endTime ?? null

  if (!sensorId || !startTime || !endTime) return null

  const parsedStart = new Date(startTime)
  const parsedEnd = new Date(endTime)
  if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) return null
  if (parsedStart.getTime() > parsedEnd.getTime()) return null

  return {
    sensorId: String(sensorId),
    startTime: parsedStart.toISOString(),
    endTime: parsedEnd.toISOString(),
    requestId: payload.request_id ?? payload.requestId ?? null,
  }
}

async function sendToDlq(rawJob, reason) {
  await queueClient.rPush(
    DLQ_KEY,
    JSON.stringify({
      failed_at: new Date().toISOString(),
      reason,
      job: rawJob,
    }),
  )
}

async function ensureReportSchema() {
  await reportDb.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS reports (
      report_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sensor_id       VARCHAR(255) NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      min_temp        FLOAT NOT NULL,
      max_temp        FLOAT NOT NULL,
      avg_temp        FLOAT NOT NULL,
      min_humidity    FLOAT NOT NULL,
      max_humidity    FLOAT NOT NULL,
      avg_humidity    FLOAT NOT NULL,
      min_pressure    FLOAT NOT NULL,
      max_pressure    FLOAT NOT NULL,
      avg_pressure    FLOAT NOT NULL,
      start_time      TIMESTAMPTZ NOT NULL,
      end_time        TIMESTAMPTZ NOT NULL,
      CONSTRAINT uq_report_sensor_range UNIQUE (sensor_id, start_time, end_time)
    );
  `)
}

async function processOne(rawJob) {
  let payload
  try {
    payload = JSON.parse(rawJob)
  } catch {
    await sendToDlq(rawJob, 'invalid_json')
    return
  }

  const request = normalizeRequest(payload)
  if (!request) {
    await sendToDlq(payload, 'invalid_request_shape')
    return
  }

  const summary = await readingsDb.query(
    `
    SELECT
      COUNT(*)::INT AS row_count,
      MIN(temperature) AS min_temp,
      MAX(temperature) AS max_temp,
      AVG(temperature) AS avg_temp,
      MIN(humidity) AS min_humidity,
      MAX(humidity) AS max_humidity,
      AVG(humidity) AS avg_humidity,
      MIN(pressure) AS min_pressure,
      MAX(pressure) AS max_pressure,
      AVG(pressure) AS avg_pressure
    FROM sensor_readings
    WHERE sensor_id = $1
      AND timestamp >= $2::timestamptz
      AND timestamp <= $3::timestamptz
    `,
    [request.sensorId, request.startTime, request.endTime],
  )

  const row = summary.rows[0]
  if (!row || Number(row.row_count) === 0) {
    await sendToDlq(payload, 'poison_pill_no_data')
    return
  }

  const requiredMetrics = [
    'min_temp',
    'max_temp',
    'avg_temp',
    'min_humidity',
    'max_humidity',
    'avg_humidity',
    'min_pressure',
    'max_pressure',
    'avg_pressure',
  ]

  for (const metric of requiredMetrics) {
    if (row[metric] === null || row[metric] === undefined) {
      await sendToDlq(payload, `poison_pill_missing_metric:${metric}`)
      return
    }
  }

  const insertResult = await reportDb.query(
    `
    INSERT INTO reports (
      sensor_id,
      min_temp,
      max_temp,
      avg_temp,
      min_humidity,
      max_humidity,
      avg_humidity,
      min_pressure,
      max_pressure,
      avg_pressure,
      start_time,
      end_time
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz, $12::timestamptz
    )
    ON CONFLICT (sensor_id, start_time, end_time) DO NOTHING
    RETURNING report_id, created_at
    `,
    [
      request.sensorId,
      row.min_temp,
      row.max_temp,
      row.avg_temp,
      row.min_humidity,
      row.max_humidity,
      row.avg_humidity,
      row.min_pressure,
      row.max_pressure,
      row.avg_pressure,
      request.startTime,
      request.endTime,
    ],
  )

  // Duplicate request for the same sensor/time range: skip publishing and counts.
  if (insertResult.rowCount === 0) return

  const report = insertResult.rows[0]

  await publisherClient.publish(
    REPORT_READY_CHANNEL,
    JSON.stringify({
      event: 'report_ready',
      report_id: report.report_id,
      sensor_id: request.sensorId,
      start_time: request.startTime,
      end_time: request.endTime,
      created_at: report.created_at,
      request_id: request.requestId,
    }),
  )

  const nowIso = new Date().toISOString()
  await Promise.all([
    healthClient.set(LAST_SUCCESS_KEY, nowIso),
    healthClient.incr(PROCESSED_COUNT_KEY),
  ])
}

async function workerLoop() {
  while (true) {
    try {
      const result = await queueClient.blPop(QUEUE_KEY, 5)
      if (!result) continue
      await processOne(result.element)
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'worker_error',
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
      )
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

app.get('/health', async (_req, res) => {
  const checkedAt = new Date().toISOString()

  try {
    const startedAt = Date.now()
    await healthClient.ping()
    const redisLatencyMs = Date.now() - startedAt

    const [rawQueueDepth, rawDlqDepth, rawLastSuccess, rawProcessedCount, readingsHealth, reportHealth] =
      await Promise.all([
        healthClient.lLen(QUEUE_KEY),
        healthClient.lLen(DLQ_KEY),
        healthClient.get(LAST_SUCCESS_KEY),
        healthClient.get(PROCESSED_COUNT_KEY),
        readingsDb.query('SELECT 1'),
        reportDb.query('SELECT 1'),
      ])

    return res.status(200).json({
      status: 'healthy',
      service: process.env.SERVICE_NAME || 'report-gen-worker',
      checked_at: checkedAt,
      dependencies: {
        redis: {
          status: 'healthy',
          latency_ms: redisLatencyMs,
        },
        readings_db: {
          status: readingsHealth.rowCount === 1 ? 'healthy' : 'unhealthy',
        },
        report_db: {
          status: reportHealth.rowCount === 1 ? 'healthy' : 'unhealthy',
        },
      },
      metrics: {
        queue_depth: Number(rawQueueDepth) || 0,
        dlq_depth: Number(rawDlqDepth) || 0,
        last_successfully_processed_at: rawLastSuccess || null,
        jobs_processed_count: Number(rawProcessedCount) || 0,
      },
      keys: {
        queue_key: QUEUE_KEY,
        dlq_key: DLQ_KEY,
        report_ready_channel: REPORT_READY_CHANNEL,
      },
    })
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      service: process.env.SERVICE_NAME || 'report-gen-worker',
      checked_at: checkedAt,
      error: error.message,
      metrics: {
        queue_depth: null,
        dlq_depth: null,
        last_successfully_processed_at: null,
        jobs_processed_count: null,
      },
    })
  }
})

async function main() {
  await Promise.all([queueClient.connect(), healthClient.connect(), publisherClient.connect()])
  await ensureReportSchema()

  app.listen(PORT, () => {
    console.log(`report-gen-worker listening on port ${PORT}`)
  })

  workerLoop().catch(error => {
    console.error(
      JSON.stringify({
        event: 'worker_fatal',
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    )
    process.exit(1)
  })
}

main().catch(error => {
  console.error(
    JSON.stringify({
      event: 'startup_fatal',
      error: error.message,
      timestamp: new Date().toISOString(),
    }),
  )
  process.exit(1)
})
