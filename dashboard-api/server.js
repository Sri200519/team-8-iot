import express from 'express'
import redis from 'redis'
import { randomUUID } from 'crypto'
import { Pool } from 'pg'

const app = express()
const port = 3000
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
})

app.use(express.json())

app.get('/health', (_req, res) => {
    res.json({
        service: 'Dashboard API'
    })
})

app.post('/dashboard', async (req, res) => {
    const { sensor_id, timestamp, temperature, pressure, humidity } = req.body;

    const missingFields = [];
    if (!sensor_id) missingFields.push('sensor_id');
    if (!timestamp) missingFields.push('timestamp');
    if (temperature === undefined || temperature === null) missingFields.push('temperature');
    if (pressure === undefined || pressure === null) missingFields.push('pressure');
    if (humidity === undefined || humidity === null) missingFields.push('humidity');

    if (missingFields.length > 0) {
        return res.status(400).json({
            error: 'Missing required fields',
            missing: missingFields
        });
    }

    const reading_id = randomUUID();
    try {
        await pool.query(
            `INSERT INTO sensor_readings (reading_id, timestamp, sensor_id, temperature, pressure, humidity)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [reading_id, timestamp, sensor_id, temperature, pressure, humidity]
        )
        return res.status(201).json({
            status: 'success',
            reading_id
        })
    } catch (error) {
        return res.status(500).json({
            error: 'Failed to submit sensor reading',
            details: error.message
        })
    }
})

app.listen(port, () => {
    console.log(`Dashboard API listening on port ${port}`)
})