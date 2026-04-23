import express from 'express';
import pkg from 'pg';
import { createClient } from 'redis';
import { runHealthChecks } from './lib/health.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const startTime = Date.now();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const redisClient = createClient({
  url: process.env.REDIS_URL,
});
redisClient.on('error', () => {});

const sub = redisClient.duplicate();

app.get('/health', async (_req, res) => {
  const { statusCode, body } = await runHealthChecks({
    serviceName: process.env.SERVICE_NAME,
    startTime,
    pool,
    redisPing: () => redisClient.ping(),
  });
  res.status(statusCode).json(body);
});

app.get('/alerts', async (_req, res) => {
  const result = await pool.query('select * from alerts order by timestamp desc limit 50');
  res.json(result.rows);
});

async function main() {
  await redisClient.connect().catch(() => {});
  try {
    await pool.query(`
      create table if not exists alerts (
        alert_id    uuid primary key default gen_random_uuid(),
        sensor_id   varchar(255) not null,
        message     text not null,
        timestamp   timestamptz not null,
        reading_value float not null,
        alert_type  varchar(50) not null
      )
    `);
    console.log('alerts table created');
  } catch (e) {
    console.error('Failed to initialize alerts table:', e);
  }
  await sub.connect();
  await sub.subscribe('alerts', async(message) => {
    const alert = JSON.parse(message);
    await pool.query('insert into alerts(sensor_id, message, timestamp, reading_value, alert_type) values ($1, $2, $3, $4, $5)',
      [
        alert.sensor_id,
        alert.message,
        alert.timestamp,
        alert.reading_value,
        alert.alert_type
      ]
    );
    console.log('Alert received:', alert);
  });
  app.listen(PORT, () => {
    console.log(`Alert Service running on port ${PORT}`)
  });
}

main();
