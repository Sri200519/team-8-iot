/**
 * Shared Sprint health response: PostgreSQL SELECT 1 + Redis PING.
 * HTTP 200 when all checks pass, 503 otherwise.
 */
export async function runHealthChecks({ serviceName, startTime, pool, redisPing }) {
  const checks = {}
  let healthy = true

  const dbStart = Date.now()
  try {
    await pool.query('SELECT 1')
    checks.database = { status: 'healthy', latency_ms: Date.now() - dbStart }
  } catch (err) {
    checks.database = { status: 'unhealthy', error: err.message }
    healthy = false
  }

  const redisStart = Date.now()
  try {
    const pong = await redisPing()
    if (pong !== 'PONG') throw new Error(`unexpected response: ${pong}`)
    checks.redis = { status: 'healthy', latency_ms: Date.now() - redisStart }
  } catch (err) {
    checks.redis = { status: 'unhealthy', error: err.message }
    healthy = false
  }

  return {
    statusCode: healthy ? 200 : 503,
    body: {
      status: healthy ? 'healthy' : 'unhealthy',
      service: serviceName || 'unknown',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      checks,
    },
  }
}
