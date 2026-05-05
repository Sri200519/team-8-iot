import pkg from 'pg'

const { Pool } = pkg
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
})

async function main() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sensor_readings (
                reading_id     UUID PRIMARY KEY,
                timestamp      TIMESTAMPTZ NOT NULL,
                sensor_id      VARCHAR(64) NOT NULL,
                temperature    DOUBLE PRECISION,
                pressure       DOUBLE PRECISION,
                humidity       DOUBLE PRECISION
            );
        `);
        console.log('sensor_readings table created');
    } catch (e) {
        console.error('Failed to initialize sensor_readings table:', e);
        await pool.end();
        process.exit(1);
    }
}

main();