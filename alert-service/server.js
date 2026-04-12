import express from "express";
import pkg from "pg";
import { createClient } from "redis";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const { Pool } = pkg;

const db = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432
});

const redis = createClient({
    url: process.env.REDIS_URL
});

let redisConnected = false;

redis.connect().then(() => {
    redisConnected = true;
    console.log("Redis connected");
}).catch(() => {
    console.log("Redis not connected");
});

app.get("/health", async (req, res) => {
    let dbConnected = true;

    try {
        await db.query("SELECT 1");
    }
    catch(err) {
        dbConnected = false;
    }

    const status = dbConnected && redisConnected ? "ok" : "degraded";
    const database = dbConnected ? "connected" : "disconnected";
    const redis = redisConnected ? "connected" : "disconnected";

    res.status(status === "ok" ? 200 : 503).json({
        status,
        database,
        redis
    });
});

app.get("/alerts", async (req, res) => {
    res.json([]);
});

app.listen(PORT, () => {
    console.log(`Alert Service running on port ${PORT}`);
});