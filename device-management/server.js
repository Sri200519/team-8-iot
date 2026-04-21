import express from 'express';
import pkg from 'pg';
import { createClient } from 'redis';
import { runHealthChecks } from './lib/health.js';

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});
const DEVICE_EVENTS_QUEUE_KEY = process.env.DEVICE_EVENTS_QUEUE_KEY || 'sensor:readings:queue';

const app = express();
const port = 3000;
const startTime = Date.now();

app.use(express.json());

app.get('/health', async (_req, res) => {
  const { statusCode, body } = await runHealthChecks({
    serviceName: process.env.SERVICE_NAME || 'device-management',
    startTime,
    pool,
    redisPing: () => redisClient.ping(),
  });
  res.status(statusCode).json(body);
});

app.post('/devices/register', async (req, res) => {
  const { deviceId, sensorId, status, version, metadata, idempotencyKey } = req.body;
  if (!deviceId || !status || !idempotencyKey) {
    return res.status(400).json({ error: 'Missing required fields: deviceId, status, idempotencyKey' });
  }

  try {
    let row;
    let isNew = false;
    
    // Attempt to insert. If idempotency_key conflict occurs, do nothing and return 0 rows.
    const insertResult = await pool.query(
      `INSERT INTO devices (device_id, sensor_id, status, version, metadata, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING *`,
      [deviceId, sensorId || null, status, version || null, metadata || {}, idempotencyKey]
    );

    if (insertResult.rows.length === 0) {
      // It was a duplicate request
      const selectResult = await pool.query(
        `SELECT * FROM devices WHERE idempotency_key = $1`,
        [idempotencyKey]
      );
      row = selectResult.rows[0];
    } else {
      // It was a new insert
      row = insertResult.rows[0];
      isNew = true;
    }

    if (isNew) {
      const queueMessage = {
        sensor_id: row.sensor_id || row.device_id,
        device_id: row.device_id,
        event: 'device_registered',
        status: row.status,
        timestamp: new Date().toISOString(),
      };

      // Keep pub/sub for existing consumers, plus push to queue for worker pipeline demo.
      await redisClient.publish('devices:registered', JSON.stringify(row));
      await redisClient.rPush(DEVICE_EVENTS_QUEUE_KEY, JSON.stringify(queueMessage));
      return res.status(201).json({
        duplicate: "false",
        ...row
      });
    } else {
      // Idempotent return of the original row (200 OK)
      return res.status(200).json({
        duplicate: "true",
        ...row
      });
    }
  } catch (error) {
    console.error('Error registering device:', error);
    // Specifically handle the case where sensorId might be a unique conflict (different than idempotency_key)
    if (error.code === '23505') {
       return res.status(409).json({ error: 'A different constraint was violated (e.g., sensor_id already in use)' });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

async function main() {
  await redisClient.connect().catch((e) => console.error('Redis connect error', e));

  // Initialize DB table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS devices (
          device_id VARCHAR(64) PRIMARY KEY,
          sensor_id VARCHAR(64) UNIQUE,
          status VARCHAR(20) NOT NULL,
          version VARCHAR(50),
          registered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_seen_at TIMESTAMPTZ,
          metadata JSONB,
          idempotency_key TEXT UNIQUE NOT NULL
      )
    `);
    console.log('Devices table ensured');
  } catch (e) {
    console.error('Failed to initialize database table:', e);
  }

  app.listen(port, () => {
    console.log(`Device Management Service listening on port ${port}`);
  });
}

main();
