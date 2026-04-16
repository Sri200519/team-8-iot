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
  return res.json(latest);
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
