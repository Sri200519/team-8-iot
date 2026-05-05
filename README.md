# Endless Eight — IoT Sensor Monitoring Dashboard


**Course:** COMPSCI 426 
**Team Name:** Endless Eight 
**System Name:** IoT Sensor Monitoring Dashboard 
**Team Members:** Eric Gu, Zaeem Chaudhary, Justin Manoj, Sean Young, Srikar Kopparapu, Nam Pham, William Hammond, Nathan Chen 
**Repository:** https://github.com/Sri200519/team-8-iot.git


---


## Team and Service Ownership


| Team Member | Service / Component Ownership |
| ----------- | ----------------------------- |
| Eric Gu | `dashboard-api/` |
| Nam Pham | `ingestion/` |
| Srikar Kopparapu | `sensor-registry/` |
| William Hammond | `caddy/` |
| Sean Young | `k6/` (`sprint-4-scale.js`, `sprint-4-replica.js`) |
| Zaeem Chaudhary | `dashboard-ui/` |
| Nathan Chen | `test_scripts/` |
| Justin Manoj | `README.md`, sprint docs |


> Ownership is verified by `git log --author`. Each person must have meaningful commits in the directories they claim.




---


## How to Start the System


```bash
# Start everything (builds images on first run)
docker compose up --build


# Sprint 4 replicated startup command
docker compose up --build --scale ingestion=3 --scale dashboard-api=3 --scale sensor-registry-service=3 -d


# Verify all services/replicas are healthy
docker compose ps


# Stream logs
docker compose logs -f


# Open shell in Holmes investigation container
docker compose exec holmes bash
```


## Service Access


### Public entrypoint through Caddy


- `http://localhost:80`


### Caddy routes


- `/readings*` -> `ingestion:3001`
- `/dashboard*` -> `dashboard-api:3000`
- `/alerts*` -> `alert-service:3000`
- `/sensors*` -> `sensor-registry-service:3000`
- `/devices*` -> `device-management-service:3000`


### Internal-only endpoints


- `anomaly-worker:3002` (health endpoint)
- `report-gen-worker:3000` (health endpoint)
- `storage-worker:3004` (health endpoint)


---


## System Overview


The system ingests IoT climate readings (temperature, humidity, pressure), validates and enqueues them in Redis, and processes them with worker pipelines. `storage-worker` consumes the queue and batch-persists readings to Postgres. `anomaly-worker` consumes readings, fetches threshold metadata from `sensor-registry-service`, detects violations, and publishes alert events. `alert-service` subscribes to those events and stores alerts in the alert database. `dashboard-api` exposes read/query endpoints for latest readings and report requests. Dead-letter queues are used by workers for malformed or unprocessable messages.


---


## Seed Data Steps (Required Before Demo/k6)


Run these after `docker compose up` so endpoints and k6 tests have data.


### 1. Create a sensor in Sensor Registry


```bash
curl -X POST http://localhost:80/sensors \
 -H "Content-Type: application/json" \
 -d '{
   "sensor_id": "sensor-1",
   "location": "lab-a",
   "type": "climate",
   "min_temp": 15,
   "max_temp": 30,
   "min_humidity": 20,
   "max_humidity": 70,
   "min_pressure": 980,
   "max_pressure": 1040
 }'
```


### 2. Push at least one reading through ingestion

```bash
curl -X POST http://localhost:80/readings/sensor \
 -H "Content-Type: application/json" \
 -d '{
   "sensor_id": "sensor-1",
   "timestamp": "2026-05-04T18:00:00Z",
   "temperature": 24.1,
   "pressure": 1012.4,
   "humidity": 45.8
 }'
```


### 3. Optional: create a device record


```bash
curl -X POST http://localhost:80/devices/register \
 -H "Content-Type: application/json" \
 -d '{
   "deviceId": "device-001",
   "sensorId": "sensor-1",
   "status": "active",
   "idempotencyKey": "seed-key-001"
 }'
```


---


## API Reference


### Dashboard API Service


#### GET `/health`


```bash
curl http://localhost:80/dashboard/health
```


#### GET `/latest-readings/:sensor_id`


```bash
curl http://localhost:80/dashboard/latest-readings/sensor-1
```


#### POST `/dashboard`


```bash
curl -X POST http://localhost:80/dashboard/dashboard \
 -H "Content-Type: application/json" \
 -d '{
   "sensor_id": "sensor-1",
   "timestamp": "2026-05-04T18:05:00Z",
   "temperature": 23.9,
   "pressure": 1012.0,
   "humidity": 46.1
 }'
```


#### POST `/reports/request`


```bash
curl -X POST http://localhost:80/dashboard/reports/request \
 -H "Content-Type: application/json" \
 -d '{
   "sensor_id": "sensor-1",
   "start_time": "2026-05-04T17:00:00Z",
   "end_time": "2026-05-04T18:30:00Z"
 }'
```


### Ingestion Service


#### GET `/health`


```bash
curl http://localhost:80/readings/health
```


#### POST `/sensor`


```bash
curl -X POST http://localhost:80/readings/sensor \
 -H "Content-Type: application/json" \
 -d '{
   "sensor_id": "sensor-1",
   "timestamp": "2026-05-04T18:00:00Z",
   "temperature": 24.1,
   "pressure": 1012.4,
   "humidity": 45.8
 }'
```


#### GET `/data?sensor_id=...`


```bash
curl "http://localhost:80/readings/data?sensor_id=sensor-1"
```


### Sensor Registry Service


#### GET `/health`


```bash
curl http://sensor-registry-service:3000/health
```


#### GET `/sensors/:id`


```bash
curl http://localhost:80/sensors/sensor-1
```


#### POST `/sensors`


```bash
curl -X POST http://localhost:80/sensors \
 -H "Content-Type: application/json" \
 -d '{
   "sensor_id": "sensor-1",
   "location": "lab-a",
   "type": "climate",
   "min_temp": 15,
   "max_temp": 30,
   "min_humidity": 20,
   "max_humidity": 70,
   "min_pressure": 980,
   "max_pressure": 1040
 }'
```


### Alert Service


#### GET `/health`


```bash
curl http://alert-service:3000/health
```


#### GET `/alerts`


```bash
curl http://localhost:80/alerts/alerts
```


### Device Management Service


#### GET `/health`


```bash
curl http://localhost:80/devices/health
```


#### POST `/devices/register`


```bash
curl -X POST http://localhost:80/devices/register \
 -H "Content-Type: application/json" \
 -d '{
   "deviceId": "device-001",
   "sensorId": "sensor-1",
   "status": "active",
   "idempotencyKey": "key-abc-123"
 }'
```


#### GET `/devices/:id`


```bash
curl http://localhost:80/devices/device-001
```


#### POST `/devices/:id/maintenance`


```bash
curl -X POST http://localhost:80/devices/device-001/maintenance \
 -H "Content-Type: application/json" \
 -d '{
   "startTime": "2026-05-05T10:00:00Z",
   "endTime": "2026-05-05T12:00:00Z",
   "reason": "calibration"
 }'
```


#### POST `/devices/:id/firmware`


```bash
curl -X POST http://localhost:80/devices/device-001/firmware \
 -H "Content-Type: application/json" \
 -d '{
   "version": "1.0.2"
 }'
```


### Anomaly Worker


#### GET `/health`


```bash
docker compose exec holmes curl http://anomaly-worker:3002/health
```


### Report Generation Worker


#### GET `/health`


```bash
docker compose exec holmes curl http://report-gen-worker:3000/health
```


### Storage Worker


#### GET `/health`


```bash
docker compose exec holmes curl http://storage-worker:3004/health
```


---


## k6 Tests (Sprint 4)


### Scaling comparison (`k6/sprint-4-scale.js`)


```bash
# from host (if k6 installed)
k6 run --env BASE_URL=http://localhost:80 --env SCALE=single k6/sprint-4-scale.js
k6 run --env BASE_URL=http://localhost:80 --env SCALE=replicated k6/sprint-4-scale.js


# from Holmes
docker compose exec holmes bash
k6 run --env SCALE=single /workspace/k6/sprint-4-scale.js
k6 run --env SCALE=replicated /workspace/k6/sprint-4-scale.js
```


### Replica failure test (`k6/sprint-4-replica.js`)


```bash
# from host (if k6 installed)
k6 run --env BASE_URL=http://localhost:80 k6/sprint-4-replica.js


# from Holmes
docker compose exec holmes bash
k6 run /workspace/k6/sprint-4-replica.js
```


### Replica failure drill during test


```bash
# list replica containers
docker compose ps


# stop one replica during sustained phase
docker stop <container-id>


# verify survivors remain healthy
docker compose ps


# restore desired replica count
docker compose up --scale dashboard-api=3 -d
```


---


## Sprint History


| Sprint | Tag | Plan | Report |
| ------ | --- | ---- | ------ |
| 1 | `sprint-1` | [SPRINT-1-PLAN.md](sprint-plans/SPRINT-1-PLAN.md) | [SPRINT-1.md](sprint-reports/SPRINT-1.md) |
| 2 | `sprint-2` | [SPRINT-2-PLAN.md](sprint-plans/SPRINT-2-PLAN.md) | [SPRINT-2.md](sprint-reports/SPRINT-2.md) |
| 3 | `sprint-3` | [SPRINT-3-PLAN.md](sprint-plans/SPRINT-3-PLAN.md) | [SPRINT-3.md](sprint-reports/SPRINT-3.md) |
| 4 | `sprint-4` | [SPRINT-4-PLAN.md](sprint-plans/SPRINT-4-PLAN.md) | [SPRINT-4.md](sprint-reports/SPRINT-4.md) |
