const express = require('express');
const { createClient } = require('redis');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3004;
const QUEUE_KEY = process.env.QUEUE_KEY || 'sensor:readings:queue';
const DLQ_KEY = process.env.STORAGE_DLQ_KEY || `storage:dlq`;
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 50);
const BATCH_FLUSH_MS = Number(process.env.BATCH_FLUSH_MS || 2000);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const redisHealthClient = createClient({ url: process.env.REDIS_URL });
const redisQueueClient = createClient({ url: process.env.REDIS_URL });

let lastJobAt = null;
let jobsProcessed = 0;
const pendingReadings = [];
let oldestPendingAtMs = null;

const app = express();

app.get('/health', async (req, res) => {
  try {
    await redisHealthClient.ping();
    const [depth, dlqDepth] = await Promise.all([
      redisHealthClient.lLen(QUEUE_KEY),
      redisHealthClient.lLen(DLQ_KEY),
    ]);
    
    res.status(200).json({
      status: 'healthy',
      redis: 'ok',
      depth,
      dlq_depth: dlqDepth,
      last_job_at: lastJobAt,
      jobs_processed: jobsProcessed
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      redis: 'error: ' + err.message,
      depth: 0,
      dlq_depth: 0,
      last_job_at: lastJobAt,
      jobs_processed: jobsProcessed
    });
  }
});

async function flushBatch() {
  if (pendingReadings.length === 0) return;

  const batch = pendingReadings.splice(0, pendingReadings.length);
  oldestPendingAtMs = null;

  const values = [];
  const placeholders = batch
    .map((reading, index) => {
      const base = index * 6;
      values.push(
        reading.reading_id,
        reading.timestamp,
        reading.sensor_id,
        reading.temperature,
        reading.pressure,
        reading.humidity,
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    })
    .join(', ');

  const query = `
    INSERT INTO sensor_readings (reading_id, timestamp, sensor_id, temperature, pressure, humidity)
    VALUES ${placeholders}
    ON CONFLICT (reading_id) DO NOTHING
  `;

  await pool.query(query, values);
  jobsProcessed += batch.length;
  lastJobAt = new Date().toISOString();

  console.log(
    JSON.stringify({
      event: 'batch_processed',
      batch_size: batch.length,
      jobs_processed: jobsProcessed,
      timestamp: lastJobAt,
      action: 'inserted_batch_to_db',
    }),
  );
}

function shouldFlushByTime() {
  return oldestPendingAtMs !== null && Date.now() - oldestPendingAtMs >= BATCH_FLUSH_MS;
}

async function workerLoop() {
  while (true) {
    try {
      const result = await redisQueueClient.blPop(QUEUE_KEY, 1);

      if (result && result.element) {
        const reading = JSON.parse(result.element);
        pendingReadings.push(reading);
        if (oldestPendingAtMs === null) oldestPendingAtMs = Date.now();
      }

      if (pendingReadings.length >= BATCH_SIZE || shouldFlushByTime()) {
        await flushBatch();
      }
    } catch (err) {
      console.log(JSON.stringify({ event: 'worker_error', error: err.message, timestamp: new Date().toISOString() }));
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

async function main() {
  redisHealthClient.on('error', err => console.error('Redis Health Client Error', err));
  redisQueueClient.on('error', err => console.error('Redis Queue Client Error', err));
  
  await redisHealthClient.connect();
  await redisQueueClient.connect();
  
  workerLoop().catch(err => {
    console.error(JSON.stringify({ event: 'worker_fatal', error: err.message, timestamp: new Date().toISOString() }));
    process.exit(1);
  });
  
  app.listen(PORT, () => {
    console.log(JSON.stringify({ event: 'health_server_started', port: PORT, timestamp: new Date().toISOString() }));
  });
}

main().catch(err => {
  console.error(JSON.stringify({ event: 'fatal', error: err.message, timestamp: new Date().toISOString() }));
  process.exit(1);
});
