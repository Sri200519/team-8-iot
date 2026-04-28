// Sprint 1 — Baseline load test
//
// Run from inside the holmes container:
//   docker compose exec holmes bash
//   k6 run /workspace/k6/sprint-3-poison.js
//
// Or from your host machine if k6 is installed:
//   k6 run k6/sprint-3-poison.js
//

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

const BASE_URL = 'http://ingestion-service:3001'

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(95)', 'p(99)'],
  stages: [
    { duration: '30s', target: 20 },
    { duration: '30s', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.05'],
  },
}

export default function () {
  const isPoisonPill = Math.random() < 0.2

  let payload

  if (isPoisonPill) {
    // Sensor id does not exist
    payload = JSON.stringify({
      sensor_id: "no-good-sensor-1515151515",
      temperature: 999,
      humidity: 50,
      pressure: 1000,
      timestamp: new Date().toISOString()
    })
  } else {
    // Valid request
    payload = JSON.stringify({
      sensor_id: `sensor-${Math.floor(Math.random() * 5)}`,
      temperature: Math.random() * 100,
      humidity: Math.random() * 100,
      pressure: 950 + Math.random() * 100,
      timestamp: new Date().toISOString()
    })
  }

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  }

  const res = http.post(`${BASE_URL}/sensor`, payload, params)

  const ok = check(res, {
    'status is 201 or 202': (r) => r.status === 201 || r.status === 202,
  })

  errorRate.add(!ok)

  sleep(0.5)
}

export function handleSummary(data) {
  const p50 = data.metrics.http_req_duration.values['med']
  const p95 = data.metrics.http_req_duration.values['p(95)']
  const p99 = data.metrics.http_req_duration.values['p(99)']
  const RPS = data.metrics.http_reqs.values['rate']

  return {
    "k6-sprint-3-poison-summary.txt": `
These are the Sprint 3 test results:

The HTTP P(50) REQ DURATION is: ${p50}
    The HTTP P(95) REQ DURATION is: ${p95}
    The HTTP P(99) REQ DURATION is: ${p99}
    The Rate of Requests per Second was: ${RPS}
`
  }
}