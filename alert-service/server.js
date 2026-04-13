import express from 'express'
import pkg from 'pg'
import { createClient } from 'redis'
import { runHealthChecks } from './lib/health.js'

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3000
const startTime = Date.now()

const { Pool } = pkg

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const redisClient = createClient({
  url: process.env.REDIS_URL,
})
redisClient.on('error', () => {})

app.get('/health', async (_req, res) => {
  const { statusCode, body } = await runHealthChecks({
    serviceName: process.env.SERVICE_NAME,
    startTime,
    pool: db,
    redisPing: () => redisClient.ping(),
  })
  res.status(statusCode).json(body)
})

app.get('/alerts', async (_req, res) => {
  res.json([])
})

async function main() {
  await redisClient.connect().catch(() => {})
  app.listen(PORT, () => {
    console.log(`Alert Service running on port ${PORT}`)
  })
}

main()
