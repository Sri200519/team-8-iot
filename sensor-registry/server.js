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
const SENSOR_CACHE_TTL_SECONDS = 60

function toSensorMetadata(row) {
  return {
    sensor_id: row.sensor_id,
    location: row.location,
    type: row.sensor_type,
    thresholds: {
      temperature: {
        min: row.min_temp,
        max: row.max_temp,
      },
      humidity: {
        min: row.min_humidity,
        max: row.max_humidity,
      },
      pressure: {
        min: row.min_pressure,
        max: row.max_pressure,
      },
    },
  }
}

app.get('/health', async (_req, res) => {
  const { statusCode, body } = await runHealthChecks({
    serviceName: process.env.SERVICE_NAME,
    startTime,
    pool: db,
    redisPing: () => redisClient.ping(),
  })
  res.status(statusCode).json(body)
})

app.get('/sensors/:id', async (req, res) => {
  const { id } = req.params
  const cacheKey = `sensor:config:${id}`

  try {
    const cachedSensor = await redisClient.get(cacheKey)
    if (cachedSensor) {
      return res.status(200).json(JSON.parse(cachedSensor))
    }

    const result = await db.query(
      `SELECT sensor_id, location, sensor_type, min_temp, max_temp, min_humidity, max_humidity, min_pressure, max_pressure
       FROM sensors
       WHERE sensor_id = $1
       LIMIT 1`,
      [id],
    )

    const row = result.rows[0]
    if (!row) {
      return res.status(404).json({ error: 'Sensor not found' })
    }

    const sensor = toSensorMetadata(row)
    await redisClient.setEx(cacheKey, SENSOR_CACHE_TTL_SECONDS, JSON.stringify(sensor))
    return res.status(200).json(sensor)
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch sensor metadata',
      details: error.message,
    })
  }
})

async function main() {
  await redisClient.connect().catch(() => {})
  app.listen(PORT, () => {
    console.log(`Sensor Registry running on port ${PORT}`)
  })
}

main()
