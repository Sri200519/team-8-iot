// Sprint 4 — Scaling test
//
// Run from inside the holmes container:
//   docker compose exec holmes bash
//   k6 run --env SCALE=single /workspace/k6/sprint-4-scale.js
//   k6 run --env SCALE=replicated /workspace/k6/sprint-4-scale.js
//

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

const BASE_URL = __ENV.BASE_URL || 'http://caddy:80';
const SCALE = __ENV.SCALE || 'single';

const TARGET = SCALE === 'replicated' ? 50 : 20;

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(95)', 'p(99)'],
  stages: [
    { duration: '30s', target: 20 },
    { duration: '60s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/dashboard/latest-readings/sensor-1`);

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!ok);
  sleep(0.5);
}

export function handleSummary(data) {
  const p50 = data.metrics.http_req_duration.values['med'];
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const p99 = data.metrics.http_req_duration.values['p(99)'];
  const RPS = data.metrics.http_reqs.values['rate'];

  return {
    [`k6-sprint-4-scale-${SCALE}.txt`]: `
These are the Sprint 4 Scale Test Results For ${SCALE}:

HTTP P(50): ${p50}
HTTP P(95): ${p95}
HTTP P(99): ${p99}
Requests Per Second: ${RPS}
`,
  };
}