const express = require('express');
const redis = require('redis');

const QUEUE_KEY = process.env.QUEUE_KEY || 'sensor:readings:queue';
const DLQ_KEY = `${QUEUE_KEY}:dlq`;
const PORT = process.env.PORT || 3002;

let lastJobAt = null;
let jobsProcessed = 0;

const queueClient = redis.createClient({ url: process.env.REDIS_URL });
const healthClient = redis.createClient({ url: process.env.REDIS_URL });
const pubClient = redis.createClient({ url: process.env.REDIS_URL });

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

  // Look up thresholds from Sensor Registry
  let thresholds;
  try {
    const response = await fetch(`${process.env.SENSOR_REGISTRY_URL}/sensors/${reading.sensor_id}`);
    if (!response.ok) throw new Error(`Registry returned ${response.status}`);
    thresholds = await response.json();
  } catch (err) {
    console.log(JSON.stringify({ event: 'poison_pill', reason: 'sensor not found in registry', sensor_id: reading.sensor_id, timestamp: new Date().toISOString() }));
    await queueClient.rPush(DLQ_KEY, raw);
    return;
  }

  // Check for anomalies
  const anomalies = [];
  if (thresholds.max_temp != null && reading.temperature > thresholds.max_temp)
    anomalies.push({ alert_type: 'HIGH_TEMPERATURE', reading_value: reading.temperature });
  if (thresholds.min_temp != null && reading.temperature < thresholds.min_temp)
    anomalies.push({ alert_type: 'LOW_TEMPERATURE', reading_value: reading.temperature });
  if (thresholds.max_humidity != null && reading.humidity > thresholds.max_humidity)
    anomalies.push({ alert_type: 'HIGH_HUMIDITY', reading_value: reading.humidity });
  if (thresholds.min_humidity != null && reading.humidity < thresholds.min_humidity)
    anomalies.push({ alert_type: 'LOW_HUMIDITY', reading_value: reading.humidity });
  if (thresholds.max_pressure != null && reading.pressure > thresholds.max_pressure)
    anomalies.push({ alert_type: 'HIGH_PRESSURE', reading_value: reading.pressure });
  if (thresholds.min_pressure != null && reading.pressure < thresholds.min_pressure)
    anomalies.push({ alert_type: 'LOW_PRESSURE', reading_value: reading.pressure });

  // Publish alerts
  for (const anomaly of anomalies) {
    const alert = {
      sensor_id: reading.sensor_id,
      message: `${anomaly.alert_type} detected (value: ${anomaly.reading_value})`,
      timestamp: reading.timestamp,
      reading_value: anomaly.reading_value,
      alert_type: anomaly.alert_type,
    };
    await pubClient.publish('alerts', JSON.stringify(alert));
    console.log(JSON.stringify({ event: 'alert_published', ...alert, timestamp: new Date().toISOString() }));
  }

  lastJobAt = new Date().toISOString();
  jobsProcessed++;
  console.log(JSON.stringify({
    event: 'job_processed',
    sensor_id: reading.sensor_id,
    anomalies_found: anomalies.length,
    depth: currDepth,
    jobs_processed: jobsProcessed,
    timestamp: lastJobAt,
  }));

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
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function main() {
  await queueClient.connect();
  await healthClient.connect();
  await pubClient.connect();
  workerLoop();
}

main().catch(err => {
  console.error(JSON.stringify({ event: 'fatal', error: err.message, timestamp: new Date().toISOString() }));
  process.exit(1);
});