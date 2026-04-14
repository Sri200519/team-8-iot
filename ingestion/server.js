import express from 'express'
import pkg from 'pg'
import { createClient } from 'redis'
import { runHealthChecks } from './lib/health.js'

const { Pool } = pkg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const redisClient = createClient({ url: process.env.REDIS_URL })
redisClient.on('error', () => { })

const app = express()
const port = 3001
const startTime = Date.now()

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

app.get('/data', async (req, res) => {
  const { sensor_id } = req.query
  if (!sensor_id) {
    return res.status(400).json({ error: 'Missing required field', missing: ['sensor_id'] })
  }

  try {
    const result = await pool.query('SELECT * FROM sensor_data WHERE sensor_id = $1 LIMIT 10', [sensor_id])
    return res.status(200).json(result.rows)
  } catch (error) {
    if (error.code === '42P01') {
      return res.status(200).json([])
    }
    return res.status(500).json({ error: error.message })
  }
})

async function main() {
  await redisClient.connect().catch(() => { })
  app.listen(port, () => {
    console.log(`Ingestion Service listening on port ${port}`)
  })
}

main()
