// Sprint 4 — Scaling test
//
// Run from inside the holmes container:
//   docker compose exec holmes bash
//   k6 run /workspace/k6/sprint-4-scale.js
//
// Or from your host machine if k6 is installed:
//   k6 run k6/sprint-4-scale.js
//
// Replace TARGET_URL with your main read endpoint.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");

// ── Configuration ─────────────────────────────────────────────────────────────
// Update this URL to point to your main read endpoint.
// From inside the holmes container, use the service name (not localhost).
const TARGET_URL = "http://sensor-registry-service:3000/sensors/sensor-1";

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(95)', 'p(99)'],
  stages: [
    { duration: "30s", target: 20 }, // ramp up to 20 VUs
    { duration: "60s", target: 50 }, // sustain
    { duration: "10s", target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests under 500ms
    errors: ["rate<0.01"],            // less than 1% error rate
  },
};

export default function () {
  const res = http.get(TARGET_URL);

  const ok = check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  errorRate.add(!ok);
  sleep(0.5);
}

export function handleSummary(data) {
  const p50 = data.metrics.http_req_duration.values['med'];
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const p99 = data.metrics.http_req_duration.values['p(99)'];
  const RPS = data.metrics.http_reqs.values["rate"];


  return {
    "k6-sprint-1-summary.txt": `
    These are the Sprint 4 k6 test results:

    The HTTP P(50) REQ DURATION is: ${p50}
    The HTTP P(95) REQ DURATION is: ${p95}
    The HTTP P(99) REQ DURATION is: ${p99}
    The Rate of Requests per Second was: ${RPS}
    `
  };
}
