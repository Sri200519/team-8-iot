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
    // Keep flat threshold fields for worker compatibility.
    min_temp: row.min_temp,
    max_temp: row.max_temp,
    min_humidity: row.min_humidity,
    max_humidity: row.max_humidity,
    min_pressure: row.min_pressure,
    max_pressure: row.max_pressure,
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

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
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
      return res.status(404).json({
        error: 'Sensor not found',
        code: 'SENSOR_NOT_FOUND',
        sensor_id: id,
      })
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

app.post('/sensors', async (req, res) => {
  const {
    sensor_id,
    location,
    type,
    min_temp,
    max_temp,
    min_humidity,
    max_humidity,
    min_pressure,
    max_pressure,
  } = req.body

  const missingFields = []
  if (!sensor_id) missingFields.push('sensor_id')
  if (!location) missingFields.push('location')
  if (!type) missingFields.push('type')
  if (!isFiniteNumber(min_temp)) missingFields.push('min_temp')
  if (!isFiniteNumber(max_temp)) missingFields.push('max_temp')
  if (!isFiniteNumber(min_humidity)) missingFields.push('min_humidity')
  if (!isFiniteNumber(max_humidity)) missingFields.push('max_humidity')
  if (!isFiniteNumber(min_pressure)) missingFields.push('min_pressure')
  if (!isFiniteNumber(max_pressure)) missingFields.push('max_pressure')

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing or invalid required fields',
      missing: missingFields,
    })
  }

  if (min_temp > max_temp || min_humidity > max_humidity || min_pressure > max_pressure) {
    return res.status(400).json({
      error: 'Invalid threshold bounds',
    })
  }

  try {
    const result = await db.query(
      `INSERT INTO sensors (sensor_id, location, sensor_type, min_temp, max_temp, min_humidity, max_humidity, min_pressure, max_pressure, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (sensor_id) DO UPDATE SET
         location = EXCLUDED.location,
         sensor_type = EXCLUDED.sensor_type,
         min_temp = EXCLUDED.min_temp,
         max_temp = EXCLUDED.max_temp,
         min_humidity = EXCLUDED.min_humidity,
         max_humidity = EXCLUDED.max_humidity,
         min_pressure = EXCLUDED.min_pressure,
         max_pressure = EXCLUDED.max_pressure,
         updated_at = CURRENT_TIMESTAMP
       RETURNING sensor_id, location, sensor_type, min_temp, max_temp, min_humidity, max_humidity, min_pressure, max_pressure`,
      [sensor_id, location, type, min_temp, max_temp, min_humidity, max_humidity, min_pressure, max_pressure],
    )

    await redisClient.del(`sensor:config:${sensor_id}`)
    return res.status(201).json(toSensorMetadata(result.rows[0]))
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to upsert sensor threshold metadata',
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
