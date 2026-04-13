import express from "express";
import pkg from "pg";
import { createClient } from "redis";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const {Pool} = pkg;

const db = new Pool({
    connectionString: process.env.DATABASE_URL
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

app.get("/sensors/:id", async (req, res) => {
    const {id} = req.params;
    res.json({
        sensor_id: id,
        location: "lab",
        threshold: 50
    });
});

app.listen(PORT, () => {
    console.log(`Sensor Registry running on port ${PORT}`);
});