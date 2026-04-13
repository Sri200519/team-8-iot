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
    const reading_id = randomUUID();
    await pool.query(
        `INSERT INTO sensor_readings (reading_id, timestamp, sensor_id, temperature, pressure, humidity)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [reading_id, timestamp, sensor_id, temperature, pressure, humidity]
    )
    return res.status(200).json({
        status: 'success',
        reading_id
    })
})

app.listen(port, () => {
    console.log(`Dashboard API listening on port ${port}`)
})