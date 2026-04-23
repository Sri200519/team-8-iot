import express from 'express'
import pkg from 'pg'
import { randomUUID } from 'crypto'
import { createClient } from 'redis'
import { runHealthChecks } from './lib/health.js'

const { Pool } = pkg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const redisClient = createClient({ url: process.env.REDIS_URL })
redisClient.on('error', () => { })

const READING_QUEUE_KEY = process.env.QUEUE_KEY || 'sensor:readings:queue';

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

app.post('/sensor', async (req, res) => {
  const { sensor_id, timestamp, temperature, pressure, humidity } = req.body

  // missing fields check
  if(!sensor_id || !timestamp || !temperature || !pressure || !humidity) {
    return res.status(400).json({ error: 'Missing required fields'});
  }

  // idempotency check
  const claimed = await redisClient.set(`idem_key:${sensor_id}:${timestamp}`, "1", {
      NX: true,
  });

  if(!claimed) {
    return res.status(200).json({status: 'duplicate-skipped'});
  }

  // publishing reading to redis subscribers
   const reading_id = randomUUID();

   const sensor_reading = {
    reading_id,
    sensor_id,
    timestamp,
    temperature,
    pressure,
    humidity
  }

  try {
    await redisClient.rPush(READING_QUEUE_KEY, JSON.stringify(sensor_reading));

    return res.status(202).json({status: 'success', ...sensor_reading})
  } catch(e) {
    return res.status(500).json({error: 'Error occured when enqueuing reading'})
  }
});

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

   try {
    await pool.query(`
      CREATE TABLE sensor_readings (
          reading_id     UUID PRIMARY KEY,
          timestamp      TIMESTAMPTZ NOT NULL,
          sensor_id      VARCHAR(64) NOT NULL,
          temperature    DOUBLE PRECISION,
          pressure       DOUBLE PRECISION,
          humidity       DOUBLE PRECISION
      );
    `);
    console.log('sensor_readings table created');
  } catch (e) {
    console.error('Failed to initialize sensor_readings table:', e);
  }

  app.listen(port, () => {
    console.log(`Ingestion Service listening on port ${port}`)
  })
}

main()
