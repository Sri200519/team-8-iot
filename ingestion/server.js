import express from 'express'
import pkg from 'pg'

const { Pool } = pkg
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
})

const app = express()
const port = 3001

app.use(express.json())

app.get('/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1')
        res.json({
            service: "ingestion-service",
            status: "ok",
            db: "connected"
        })
    } catch (err) {
        res.status(503).json({
            service: "ingestion-service",
            status: "degraded",
            db: "disconnected"
        })
    }
})

app.listen(port, () => {
    console.log(`Ingestion Service listening on port ${port}`)
})