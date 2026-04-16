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

const sub = redisClient.duplicate();

sub.on('message', async (channel, message) => {
  if(channel === 'alerts') {
    const alert = JSON.parse(message);
    await db.query('insert into alerts (sensor_id, message, timestamp, reading_value, alert_type) values ($1, $2, $3, $4, $5)',
      [alert.sensorId, alert.message, alert.timestamp, alert.reading_value, alert.alert_type]
    );
  }
  console.log('Alert received:', alert);
});

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
  const result = await db.query('select * from alerts order by timestamp desc limit 50');
  res.json(result.rows)
})

async function main() {
  await redisClient.connect().catch(() => {})
  await sub.connect();
  await sub.subscribe('alerts');
  app.listen(PORT, () => {
    console.log(`Alert Service running on port ${PORT}`)
  })
}

main()
