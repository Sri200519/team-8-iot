const express = require('express');
const { createClient } = require('redis');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3004;
const CHANNEL = 'readings:registered';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const redisHealthClient = createClient({ url: process.env.REDIS_URL });
const redisSubClient = createClient({ url: process.env.REDIS_URL });

let lastJobAt = null;
let jobsProcessed = 0;

const app = express();

app.get('/health', async (req, res) => {
  try {
    await redisHealthClient.ping();
    
    res.status(200).json({
      status: 'healthy',
      redis: 'ok',
      depth: 0,
      dlq_depth: 0,
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

async function workerLoop() {
  await redisSubClient.subscribe(CHANNEL, async (message) => {
    try {
      const reading = JSON.parse(message);
      
      const query = `
        INSERT INTO sensor_readings (reading_id, timestamp, sensor_id, temperature, pressure, humidity)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (reading_id) DO NOTHING
      `;
      const values = [
        reading.reading_id,
        reading.timestamp,
        reading.sensor_id,
        reading.temperature,
        reading.pressure,
        reading.humidity
      ];
      
      await pool.query(query, values);
      
      lastJobAt = new Date().toISOString();
      jobsProcessed++;
      
      console.log(JSON.stringify({
        event: 'job_processed',
        sensor_id: reading.sensor_id,
        jobs_processed: jobsProcessed,
        timestamp: lastJobAt,
        action: 'inserted_to_db'
      }));
    } catch (err) {
      console.log(JSON.stringify({ event: 'worker_error', error: err.message, timestamp: new Date().toISOString() }));
    }
  });
  console.log(JSON.stringify({ event: 'worker_started', channel: CHANNEL, timestamp: new Date().toISOString() }));
}

async function main() {
  redisHealthClient.on('error', err => console.error('Redis Health Client Error', err));
  redisSubClient.on('error', err => console.error('Redis Sub Client Error', err));
  
  await redisHealthClient.connect();
  await redisSubClient.connect();
  
  await workerLoop();
  
  app.listen(PORT, () => {
    console.log(JSON.stringify({ event: 'health_server_started', port: PORT, timestamp: new Date().toISOString() }));
  });
}

main().catch(err => {
  console.error(JSON.stringify({ event: 'fatal', error: err.message, timestamp: new Date().toISOString() }));
  process.exit(1);
});
