import express from 'express'
import { createClient } from 'redis'
import { randomUUID } from 'crypto'
import { Pool } from 'pg'
import { runHealthChecks } from './lib/health.js'

const app = express()
const port = 3000
const startTime = Date.now()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const redisClient = createClient({ url: process.env.REDIS_URL })
redisClient.on('error', () => {})
const REPORT_GEN_QUEUE_KEY = process.env.REPORT_GEN_QUEUE_KEY || 'report-gen:queue'

app.use(express.json())

app.get('/health', async (_req, res) => {
  const { statusCode, body } = await runHealthChecks({
    serviceName: process.env.SERVICE_NAME,
    startTime,
    pool,
    redisPing: () => redisClient.ping(),
  })
  res.status(statusCode).json(body)
})

// GET method to get the latest readings for specific sensor id
// First reads the cache, if not in cache, reads from database and caches result
app.get('/latest-readings/:sensor_id', async (req, res) => {
  const { sensor_id } = req.params;
  const cacheKey = `latest-reading:${sensor_id}`

  const cached = await redisClient.get(cacheKey);
  if (cached) {
    console.log("Using cache");
    return res.json(JSON.parse(cached));
  }

  const result = await pool.query(
    `SELECT * FROM sensor_readings
    WHERE sensor_id = $1
    ORDER BY timestamp DESC
    LIMIT 1;`,
    [sensor_id]
  );

  const latest = result.rows[0];
  if (!latest) {
    return res.status(404).json({ message: 'No readings found.'})
  }

  await redisClient.setEx(cacheKey, 60, JSON.stringify(latest));
  console.log("Fetched from database, added to cache");
  return res.json(latest);
})

// POST endpoint to publish report generation requests for report-gen-worker
// Example URL: http://dashboard-api:3000/reports/request
// Body:
// {
//   "sensor_id": "sensor-123",
//   "start_time": "2026-04-23T10:30:00Z",
//   "end_time": "2026-04-23T11:30:00Z"
// }
app.post('/reports/request', async (req, res) => {
  try {
    const sensor_id = req.body?.sensor_id ?? req.body?.sensorId
    const start_time = req.body?.start_time ?? req.body?.startTime
    const end_time = req.body?.end_time ?? req.body?.endTime

    const missingFields = []
    if (!sensor_id) missingFields.push('sensor_id')
    if (!start_time) missingFields.push('start_time')
    if (!end_time) missingFields.push('end_time')

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing: missingFields,
      })
    }

    const parsedStart = new Date(start_time)
    const parsedEnd = new Date(end_time)
    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ error: 'Invalid start_time or end_time format' })
    }
    if (parsedStart.getTime() > parsedEnd.getTime()) {
      return res.status(400).json({ error: 'start_time must be before or equal to end_time' })
    }

    const request_id = randomUUID()
    const reportRequest = {
      request_id,
      sensor_id: String(sensor_id),
      start_time: parsedStart.toISOString(),
      end_time: parsedEnd.toISOString(),
    }

    await redisClient.rPush(REPORT_GEN_QUEUE_KEY, JSON.stringify(reportRequest))

    return res.status(202).json({
      status: 'queued',
      request_id,
      queue: REPORT_GEN_QUEUE_KEY,
      request: reportRequest,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to queue report request' })
  }
})

app.post('/dashboard', async (req, res) => {
  const { sensor_id, timestamp, temperature, pressure, humidity } = req.body

  const missingFields = []
  if (!sensor_id) missingFields.push('sensor_id')
  if (!timestamp) missingFields.push('timestamp')
  if (temperature === undefined || temperature === null) missingFields.push('temperature')
  if (pressure === undefined || pressure === null) missingFields.push('pressure')
  if (humidity === undefined || humidity === null) missingFields.push('humidity')

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      missing: missingFields,
    })
  }

  const reading_id = randomUUID()
  try {
    const sensorCheckRes = await fetch(`http://sensor-registry-service:3000/sensors/${sensor_id}`)
    if (!sensorCheckRes.ok) {
      return res.status(400).json({ error: 'Validation failed: Unknown sensor_id' })
    }

    await pool.query(
      `INSERT INTO sensor_readings (reading_id, timestamp, sensor_id, temperature, pressure, humidity)
            VALUES ($1, $2, $3, $4, $5, $6)`,
      [reading_id, timestamp, sensor_id, temperature, pressure, humidity],
    )
    return res.status(201).json({
      status: 'success',
      reading_id,
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to submit sensor reading',
      details: error.message,
    })
  }
})

async function main() {
  await redisClient.connect().catch(() => {})
  app.listen(port, () => {
    console.log(`Dashboard API listening on port ${port}`)
  })
}

main()
