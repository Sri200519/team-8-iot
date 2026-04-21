const express = require('express');
const redis = require('redis');

const QUEUE_KEY = process.env.QUEUE_KEY || 'sensor:readings:queue';
const DLQ_KEY = `${QUEUE_KEY}:dlq`;
const PORT = process.env.PORT || 3002;

let lastJobAt = null;
let jobsProcessed = 0;

const queueClient = redis.createClient({ url: process.env.REDIS_URL });
const healthClient = redis.createClient({ url: process.env.REDIS_URL });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Health endpoint ───────────────────────────────────────────────────────────
const app = express();

app.get('/health', async (req, res) => {
  try {
    await healthClient.ping();

    const [depth, dlqDepth] = await Promise.all([
      healthClient.lLen(QUEUE_KEY),
      healthClient.lLen(DLQ_KEY),
    ]);

    res.status(200).json({
      status: dlqDepth > 0 ? 'degraded' : 'healthy',
      redis: 'ok',
      depth,
      dlq_depth: dlqDepth,
      last_job_at: lastJobAt,
      jobs_processed: jobsProcessed,
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      redis: 'error: ' + err.message,
      depth: 0,
      dlq_depth: 0,
      last_job_at: lastJobAt,
      jobs_processed: jobsProcessed,
    });
  }
});

app.listen(PORT, () => {
  console.log(JSON.stringify({ event: 'health_server_started', port: PORT, timestamp: new Date().toISOString() }));
});

// ── Worker loop ───────────────────────────────────────────────────────────────
async function processReading(raw) {
  let reading;

  // Poison pill — invalid JSON
  try {
    reading = JSON.parse(raw);
  } catch (err) {
    console.log(JSON.stringify({ event: 'poison_pill', reason: 'invalid JSON', raw, timestamp: new Date().toISOString() }));
    await queueClient.rPush(DLQ_KEY, raw);
    return;
  }

  // Poison pill — missing required fields
  const required = ['sensor_id', 'temperature', 'humidity', 'pressure', 'timestamp'];
  const missing = required.filter(f => reading[f] == null);
  if (missing.length > 0) {
    console.log(JSON.stringify({ event: 'poison_pill', reason: 'missing fields', missing, raw, timestamp: new Date().toISOString() }));
    await queueClient.rPush(DLQ_KEY, raw);
    return;
  }

  // Valid message — process it
  const currDepth = await queueClient.lLen(QUEUE_KEY);
  lastJobAt = new Date().toISOString();
  jobsProcessed++;
  await sleep(200);
  console.log(JSON.stringify({
    event: 'job_processed',
    sensor_id: reading.sensor_id,
    depth: currDepth,
    jobs_processed: jobsProcessed,
    timestamp: lastJobAt,
  }));
}

async function workerLoop() {
  console.log(JSON.stringify({ event: 'worker_started', queue: QUEUE_KEY, timestamp: new Date().toISOString() }));

  while (true) {
    try {
      const result = await queueClient.blPop(QUEUE_KEY, 5);
      if (result) {
        await processReading(result.element);
      }
    } catch (err) {
      console.log(JSON.stringify({ event: 'worker_error', error: err.message, timestamp: new Date().toISOString() }));
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function main() {
  await queueClient.connect();
  await healthClient.connect();
  workerLoop();
}

main().catch(err => {
  console.error(JSON.stringify({ event: 'fatal', error: err.message, timestamp: new Date().toISOString() }));
  process.exit(1);
});