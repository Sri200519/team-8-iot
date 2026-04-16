import express from 'express'
import { createClient } from 'redis'

const app = express()
const PORT = Number(process.env.PORT || 3000)

const redisClient = createClient({ url: process.env.REDIS_URL })
redisClient.on('error', () => {})

const QUEUE_KEY = process.env.REPORT_GEN_QUEUE_KEY || 'report-gen:queue'
const DLQ_KEY = process.env.REPORT_GEN_DLQ_KEY || 'report-gen:dlq'
const LAST_SUCCESS_KEY = process.env.REPORT_GEN_LAST_SUCCESS_KEY || 'report-gen:stats:last_success_at'
const PROCESSED_COUNT_KEY = process.env.REPORT_GEN_PROCESSED_COUNT_KEY || 'report-gen:stats:jobs_processed'

app.get('/health', async (_req, res) => {
  const checkedAt = new Date().toISOString()

  let redisStatus = 'healthy'
  let redisLatencyMs = null

  try {
    const startedAt = Date.now()
    await redisClient.ping()
    redisLatencyMs = Date.now() - startedAt
  } catch (error) {
    redisStatus = 'unhealthy'

    return res.status(503).json({
      status: 'unhealthy',
      service: process.env.SERVICE_NAME || 'report-gen-worker',
      checked_at: checkedAt,
      dependencies: {
        redis: {
          status: redisStatus,
          error: error.message,
        },
      },
      metrics: {
        queue_depth: null,
        dlq_depth: null,
        last_successfully_processed_at: null,
        jobs_processed_count: null,
      },
    })
  }

  let queueDepth = 0
  let dlqDepth = 0
  let lastSuccessfullyProcessedAt = null
  let jobsProcessedCount = 0

  try {
    const [rawQueueDepth, rawDlqDepth, rawLastSuccess, rawProcessedCount] = await Promise.all([
      redisClient.lLen(QUEUE_KEY),
      redisClient.lLen(DLQ_KEY),
      redisClient.get(LAST_SUCCESS_KEY),
      redisClient.get(PROCESSED_COUNT_KEY),
    ])

    queueDepth = Number(rawQueueDepth) || 0
    dlqDepth = Number(rawDlqDepth) || 0
    lastSuccessfullyProcessedAt = rawLastSuccess || null
    jobsProcessedCount = Number(rawProcessedCount) || 0
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      service: process.env.SERVICE_NAME || 'report-gen-worker',
      checked_at: checkedAt,
      dependencies: {
        redis: {
          status: 'unhealthy',
          error: error.message,
        },
      },
      metrics: {
        queue_depth: null,
        dlq_depth: null,
        last_successfully_processed_at: null,
        jobs_processed_count: null,
      },
    })
  }

  return res.status(200).json({
    status: 'healthy',
    service: process.env.SERVICE_NAME || 'report-gen-worker',
    checked_at: checkedAt,
    dependencies: {
      redis: {
        status: redisStatus,
        latency_ms: redisLatencyMs,
      },
    },
    metrics: {
      queue_depth: queueDepth,
      dlq_depth: dlqDepth,
      last_successfully_processed_at: lastSuccessfullyProcessedAt,
      jobs_processed_count: jobsProcessedCount,
    },
    keys: {
      queue_key: QUEUE_KEY,
      dlq_key: DLQ_KEY,
      last_success_key: LAST_SUCCESS_KEY,
      processed_count_key: PROCESSED_COUNT_KEY,
    },
  })
})

async function main() {
  await redisClient.connect().catch(() => {})

  app.listen(PORT, () => {
    console.log(`report-gen-worker listening on port ${PORT}`)
  })
}

main()
