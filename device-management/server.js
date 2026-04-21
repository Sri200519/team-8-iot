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
      const queueMessage = {
        sensor_id: row.sensor_id || row.device_id,
        device_id: row.device_id,
        event: 'device_registered',
        status: row.status,
        timestamp: new Date().toISOString(),
        duplicate: true,
      };
      await redisClient.rPush(DEVICE_EVENTS_QUEUE_KEY, JSON.stringify(queueMessage));

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

app.get('/devices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const selectResult = await pool.query(
      `SELECT * FROM devices WHERE device_id = $1 OR sensor_id = $1`,
      [id]
    );

    if (selectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    return res.status(200).json(selectResult.rows[0]);
  } catch (error) {
    console.error('Error fetching device:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/devices/:id/firmware', async (req, res) => {
  const { id } = req.params;
  const { version } = req.body;

  if (!version) {
    return res.status(400).json({ error: 'Missing required field: version' });
  }

  try {
    const updateResult = await pool.query(
      `UPDATE devices SET version = $1 WHERE device_id = $2 OR sensor_id = $2 RETURNING *`,
      [version, id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const row = updateResult.rows[0];

    const queueMessage = {
      sensor_id: row.sensor_id || row.device_id,
      device_id: row.device_id,
      event: 'firmware_updated',
      version: row.version,
      timestamp: new Date().toISOString(),
    };

    await redisClient.publish('devices:firmware_updated', JSON.stringify(row));
    await redisClient.rPush(DEVICE_EVENTS_QUEUE_KEY, JSON.stringify(queueMessage));

    return res.status(200).json(row);
  } catch (error) {
    console.error('Error updating firmware:', error);
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
