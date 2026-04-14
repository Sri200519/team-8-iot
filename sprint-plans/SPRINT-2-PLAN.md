# Sprint 2 Plan — Endless 8


**Sprint:** 2 — Async Pipelines and Caching  
**Dates:** 04.14 → 04.21  
**Written:** 04.14 in class

---


## Goal


By the end of this sprint, we will have all the rest of our services and workers implemented with their respective health checks. storage-worker/, report-gen-worker/, anomaly-worker/, and device-management/ will be the new directories we add to the project as planned.


We will have two Redis caches implemented for dashboard-api/ and sensor-registry/, respectively, that they will read from. We will also demonstrate an async flow using Redis queue/pub-sub with workers consuming messages and logging output in `docker compose logs`. We will also implement an idempotent write path on ingestion so that duplicate writes do not create duplicate data.

 
There will be a further developed K6 test that will give us a baseline for our Sprint 2 release.


---


## Ownership


| Team Member | Files / Directories Owned This Sprint |
| ----------- | ------------------------------------- |
| Eric Gu         | `dashboard-api/` |
| William Hammond | `anomaly-worker/` |
| Zaeem           | `sensor-registry/` |
| Justin          |  `report-gen-worker/`  |
| Sean            | `alert-service/, ‘k6/` |
| Srikar          |  `device-management/`         |
| Nam             |   `storage-worker/`          | 
| Nathan          |   `ingestion/`        | 


---


## Tasks


### William, Nam, Justin


- [ ] Implement Health Endpoint for respective worker
- [ ] Health endpoint must have Redis connectivity check, curr queue depth, curr DLQ queue depth, timestamp of last successfully processed job, count of jobs processed


### Nathan


- [ ] Handle dupe requests, implement idempotency
- [ ] Ensure that processed reading information is Redis-enqueued


### Eric


- [ ] Implement a Redis cache for Dashboard API
- [ ] Ensure that processed information is Redis-enqueued


### Zaeem


- [ ] Implement a Redis cache for sensor configs, Sensor Registry
- [ ] Fully implement GET request that gets sensor metadata: thresholds, location, type


### Sean


- [ ] Develop GET request for alert service that can query alerts
- [ ] Run two k6 tests and report results


### Srikar


- [ ] Implement one write endpoint (e.g., POST /devices/register)
- [ ] Add idempotency key support to device registration endpoint
- [ ] Implement GET /health


---


## Risks


Merging over someone else’s code.
Redis failure or instability breaking ingestion, workers, and APIs.
Schema mismatches between the different services


---


## Definition of Done


A TA can trigger an action, watch the queue flow in Docker Compose logs, hit the worker's `/health` to see queue depth and last-job-at, and review k6 results showing the caching improvement.