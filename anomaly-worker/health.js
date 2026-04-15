const express = require('express');
const redis = require('redis');

const app = express();
const client = redis.createClient({ url: process.env.REDIS_URL });

const QUEUE_KEY = 'anomaly:queue';
const DLQ_KEY = 'anomaly:dlq';

let lastJobAt = null;
let jobsProcessed = 0;

app.get('/health', async (req, res) => {
  try {
    // Redis connectivity check
    await client.ping();

    const [depth, dlqDepth] = await Promise.all([
      client.lLen(QUEUE_KEY),
      client.lLen(DLQ_KEY),
    ]);

    res.status(200).json({
      status: 'healthy',
      redis: 'ok',
      depth: depth,
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

app.listen(3000);