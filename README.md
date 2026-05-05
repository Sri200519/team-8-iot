# Endless Eight — IoT Sensor Monitoring Dashboard


**Course:** COMPSCI 426  
**Team:** Eric Gu, Zaeem Chaudhary, Justin Manoj, Sean Young, Srikar Kopparapu, Nam Pham, William Hammond, Nathan Chen
**System:** IoT Sensor Monitoring Dashboard
**Repository:** https://github.com/Sri200519/team-8-iot.git


---


## Team and Service Ownership


| Team Member | Services / Components Owned                            |
| ----------- | ------------------------------------------------------ |
| Zaeem Chaudhary       | `Sensor Registry Service`     |
| Srikar Kopparapu      | `Device Management Service`               |
| Nathan Chen           | `Ingestion Service`             |
| Justin Manoj          | `Report Generation Worker`               |
| Sean Young            | `Alert Service`               |
| Nam Pham              | `Storage Worker`           |
| William Hammond       | `Anomaly Worker`               |
| Eric Gu               | `Dashboard API` |

> Ownership is verified by `git log --author`. Each person must have meaningful commits in the directories they claim.


---


## How to Start the System


```bash
# Start everything (builds images on first run)
docker compose up --build


# Start with service replicas (Sprint 4)
docker compose up --build --scale ingestion=3 --scale dashboard-api=3 --scale sensor-registry-service=3 -d


# Verify all services are healthy
docker compose ps


# Stream logs
docker compose logs -f


# Open a shell in the holmes investigation container
docker compose exec holmes bash
```


### Base URLs (development)


```
dashboard-api         http://dashboard-api:3000
ingestion             http://ingestion:3001
alert-service         http://alert-service:3000
sensor-registry       http://sensor-registry:3000
Device-management     http://device-management:3000
anomaly-worker        http://anomaly-worker:3002   (health endpoint only)
report-gen-worker     http://report-gen-worker:3000 (health endpoint only)
storage-worker         http://storage-worker:3004   (health endpoint only)
holmes                 (no port — access via exec)
```


> From inside holmes, services are reachable by name:
> `curl http://dashboard-api:3000/health`
>
> See [holmes/README.md](holmes/README.md) for a full tool reference.


---


## System Overview


[One paragraph describing what your system does and how the services interact.
Include which service calls which, what queues exist, and how data flows.]


This system serves to record and present sensor reading data relating to temperature, pressure, and humidity from different locations and different time intervals.


Sensors that have their readings posted in will be read idempotently by the ingestion service and pushed to Redis queue. From this queue, a storage worker will consume it and batch write readings to the Readings DB.


The Anomaly Detection Worker will similarly consume the queue, checking any value thresholds with the Sensory Registry Service for any violations and publishing an alert on Redis when one is detected. The Alert Service listens for when this happens and writes an alert into the Alert DB.
Device information is also kept track of by the Device Management Service, which keeps track of various sensors’ metadata like versions and statuses.


At any point a bad reading is placed into a queue, it is eventually sorted and handled in a dead letter queue.


Dashboard information is shown via the Dashboard service, which reads from the Readings DB or a closer Redis cache.






---


## API Reference






<!--
  Document every endpoint for every service.
  Follow the format described in the project documentation: compact code block notation, then an example curl and an example response. Add a level-2 heading per service, level-3 per endpoint.
-->


—


### Dashboard API Service


### GET /latest-readings/:sensor_id


```
GET /latest-readings/:sensor_id


  Gets latest reading related to a sensor from its sensor_id, will check for cached result.


  Required Parameters:
    sensor_id INT


  Responses:
    404  No Readings Found
    200  Reading Info Returned
```


**Example request:**


```bash
curl http://dashboard-api:3000/latest-readings/sensor_one
```


**Example response (201):**


```json
{
  "readingId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-09T15:10:00Z",
  "sensorId": "sensor-abc-001",
  "temperature": 22.5,
  "pressure": 1013.2,
  "humidity": 48.7
}
```


### POST /dashboard


```
POST /dashboard


  Adds a new sensor reading into the sensor registry DB.


  Required Parameters:
    sensor_id INT
    timestamp STRING
    temperature DOUBLE
    pressure DOUBLE
    humidity DOUBLE


  Responses:
    400  Validation failed, invalid ID and/or missing input fields
    201  Successful sensor reading submission
    500  Failed to submit sensor reading
```


**Example request:**


```bash
curl -X POST http://dashboard-api:3000/dashboard \
  -H "Content-Type: application/json" \
  -d '{"sensor_id":"sensor-1","timestamp":"2026-04-09T15:10:00Z","temperature":23.2,"pressure":1012.2,"humidity":10.1}'
```


**Example response (201):**


```json
{
  "status": "healthy",
  "reading_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```


### GET /health


```
GET /health


  Returns the health status of this service and its dependencies.


  Responses:
    200  Service and all dependencies healthy
    503  One or more dependencies unreachable
```


**Example request:**


```bash
curl http://dashboard-api:3000/health
```


**Example response (200):**


```json
{
  "status": "healthy",
  "db": "ok",
  "redis": "ok"
}
```


**Example response (503):**


```json
{
  "status": "unhealthy",
  "db": "ok",
  "redis": "error: connection refused"
}
```


---


### Ingestion Service


### POST /sensor


```
POST /sensor


  Publishes validated sensor reading data for redis subscribers, avoids publishing any duplicate data based on id and timestamp


  Required Parameters:
    sensor_id INT
    timestamp TIMESTAMPTZ
    temperature DOUBLE
    pressure DOUBLE
    humidity DOUBLE


  Responses:
    400  Missing sensor_id
    200  Duplicate Data, nothing is published
    202  Successfully returned sensor information
    500  Failure to retrieve sensor information
```


**Example request:**


```bash
curl -X POST http://ingestion:3001/sensor \
  -H "Content-Type: application/json" \
  -d '{"sensor_id":"sensor-1","timestamp":"2026-04-09T15:10:00Z","temperature":22.5,"pressure":1013.2,"humidity":48.7}'
```


**Example response (200):**


```json
{
  "readingId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-09T15:10:00Z",
  "sensorId": "sensor-abc-001",
  "temperature": 22.5,
  "pressure": 1013.2,
  "humidity": 48.7
}
```


### GET /data


```
GET /data


  Gets all sensor data from a sensor, given its sensor_id


  Required Parameters:
    sensor_id STRING


  Responses:
    400  Missing sensor_id
    200  Successfully returned sensor information
    500  Failure to retrieve sensor information
```


**Example request:**


```bash
curl http://ingestion:3001/data?sensor_id=1
```


**Example response (200):**


```json
{
  "sensor_id": "sensor-7a8b9c",
  "created_at": "2024-05-20T14:30:00Z",
  "updated_at": "2024-05-20T14:30:00Z",
  "location": "Warehouse Alpha - Sector 4",
  "sensor_type": "climate_monitor",
  "min_temp": 18.5,
  "max_temp": 26.0,
  "min_humidity": 35.0,
  "max_humidity": 60.5,
  "min_pressure": 1005.2,
  "max_pressure": 1022.8
}
```


### GET /health


```
GET /health


  Returns the health status of this service and its dependencies.


  Responses:
    200  Service and all dependencies healthy
    503  One or more dependencies unreachable
```


**Example request:**


```bash
curl http://ingestion:3001/health
```


**Example response (200):**


```json
{
  "status": "healthy",
  "db": "ok",
  "redis": "ok"
}
```


**Example response (503):**


```json
{
  "status": "unhealthy",
  "db": "ok",
  "redis": "error: connection refused"
}
```


---


### Sensor Registry Service


### GET /sensors/:id


```
GET /sensors/:id


  Gets all metadata with relation to a sensor, given its  reading id


  Required Parameters:
    id STRING


  Responses:
    404 Sensor not found
    200 Sensor metadata returned
    500 Failed to fetch metadata
```


**Example request:**


```bash
curl http://sensor-registry-service:3000/sensors/sensor-1
```


**Example response (200):**


```json
{
  "readingId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-09T15:10:00Z",
  "sensorId": "sensor-1",
  "temperature": 22.5,
  "pressure": 1013.2,
  "humidity": 48.7
}
```


### GET /health


```
GET /health


  Returns the health status of this service and its dependencies.


  Responses:
    200  Service and all dependencies healthy
    503  One or more dependencies unreachable
```


**Example request:**


```bash
curl http://sensor-registry-service:3000/health
```


**Example response (200):**


```json
{
  "status": "healthy",
  "db": "ok",
  "redis": "ok"
}
```


**Example response (503):**


```json
{
  "status": "unhealthy",
  "db": "ok",
  "redis": "error: connection refused"
}
```


---


### Alert Service


### GET /alerts


```
GET /alerts


  Returns information on all currently existing alerts stored in the Alerts DB


  Responses:
    The 50 latest Alerts, or Nothing
```


```bash
curl http://alert-service:3000/alerts
```


**Example response:**


```json
{
  "alert_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "sensor_id": "sensor-042",
  "message": "Temperature exceeded upper threshold of 80.0°C (reading: 94.3°C)",
  "timestamp": "2025-04-09T14:22:05Z",
  "reading_value": 94.3,
  "alert_type": "HIGH_TEMPERATURE"
}


```




### GET /health


```
GET /health


  Returns the health status of this service and its dependencies.


  Responses:
    200  Service and all dependencies healthy
    503  One or more dependencies unreachable
```


**Example request:**


```bash
curl http://alert-service:3000/health
```


**Example response (200):**


```json
{
  "status": "healthy",
  "db": "ok",
  "redis": "ok"
}
```


**Example response (503):**


```json
{
  "status": "unhealthy",
  "db": "ok",
  "redis": "error: connection refused"
}
```


---


<!-- Add the rest of your endpoints below. One ### section per endpoint. -->
### Sensor Registry Service


### GET /sensors/:id


```
GET /sensors/:id


  Returns sensor metadata and threshold information for a given sensor.


  Required Parameters:
    id STRING — the sensor ID


  Responses:
    200  Successfully returned sensor information
```


**Example request:**


```bash
curl http://sensor-registry-service:3000/sensors/sensor-042
```


**Example response (200):**


```json
{
  "status": 200,
  "sensor_id": "sensor-042",
  "location": "lab",
  "threshold": 50
}
```


---


### Alert Service


### GET /alerts


```
GET /alerts


  Returns all alerts currently stored in the Alert DB.


  Responses:
    200  Successfully returned alerts
```


**Example request:**


```bash
curl http://alert-service:3000/alerts
```


**Example response (200):**


```json
[]
```


---


### Device Management Service


### POST /devices/register


```
POST /devices/register


  Registers a new device. Idempotent — duplicate requests with the
  same idempotency key return the original record without creating a duplicate.


  Required fields:
    deviceId STRING
    status STRING
    idempotencyKey STRING


  Optional fields:
    sensorId STRING
    version STRING
    metadata OBJECT


  Responses:
    201  Device successfully registered
    200  Duplicate request — original record returned
    400  Missing required fields
    409  Constraint violation (e.g. sensor_id already in use)
    500  Internal server error
```


**Example request:**


```bash
curl -X POST http://device-management-service:3000/devices/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"device-001","sensorId":"sensor-042","status":"active","idempotencyKey":"key-abc-123"}'
```


**Example response (201):**


```json
{
  "device_id": "device-001",
  "sensor_id": "sensor-042",
  "status": "active",
  "version": null,
  "registered_at": "2026-04-20T20:27:26.567Z",
  "last_seen_at": null,
  "metadata": {},
  "idempotency_key": "key-abc-123"
}
```


---


### Report Generation Worker


### GET /health


```
GET /health


  Returns the health status of the report generation worker.


  Responses:
    200  Worker healthy, Redis reachable
    503  Redis unreachable
```


**Example request:**


```bash
curl http://report-gen-worker:3000/health
```


**Example response (200):**


```json
{
  "status": "healthy",
  "service": "report-gen-worker",
  "checked_at": "2026-04-20T20:27:26.567Z",
  "dependencies": {
    "redis": {
      "status": "healthy",
      "latency_ms": 1
    }
  },
  "metrics": {
    "queue_depth": 0,
    "dlq_depth": 0,
    "last_successfully_processed_at": null,
    "jobs_processed_count": 0
  }
}
```


### Storage Worker


### GET /health


```
GET /health


  Returns the health status of the storage worker.


  Responses:
    200  Worker healthy, Redis reachable
    503  Redis unreachable
```


**Example request:**


```bash
curl http://storage-worker:3004/health
```


**Example response (200):**


```json
{
  "status": "healthy",
  "redis": "ok",
  "depth": 0,
  "dlq_depth": 0,
  "last_job_at": "2026-04-20T20:27:26.567Z",
  "jobs_processed": 10
}
```


**Example response (503):**


```json
{
  "status": "unhealthy",
  "redis": "error: connection refused",
  "depth": 0,
  "dlq_depth": 0,
  "last_job_at": null,
  "jobs_processed": 0
}
```




### Anomaly Worker


### GET /health


```
GET /health


  Returns the health status of the anomaly worker and its dependencies.


  Responses:
    200  Worker healthy, Redis reachable
    503  Redis unreachable
```


**Example request:**


```bash
curl http://anomaly-worker:3002/health
```


**Example response (200):**


```json
{
  "status": "healthy",
  "redis": "ok",
  "depth": 0,
  "dlq_depth": 0,
  "last_job_at": "2026-04-20T20:27:26.567Z",
  "jobs_processed": 10
}
```


**Example response (503):**


```json
{
  "status": "unhealthy",
  "redis": "error: connection refused",
  "depth": 0,
  "dlq_depth": 0,
  "last_job_at": null,
  "jobs_processed": 0
}
```


---


---


## Seed Data Steps (Before Running Sprint 4 k6 Tests)


```bash
# 1) Create sensor metadata
curl -X POST http://sensor-registry-service:3000/sensors \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id":"sensor-1",
    "location":"lab-a",
    "type":"climate",
    "min_temp":15,
    "max_temp":30,
    "min_humidity":20,
    "max_humidity":70,
    "min_pressure":980,
    "max_pressure":1040
  }'

# 2) Send a reading
curl -X POST http://ingestion:3001/sensor \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id":"sensor-1",
    "timestamp":"2026-05-04T18:00:00Z",
    "temperature":24.1,
    "pressure":1012.4,
    "humidity":45.8
  }'
```


## Sprint 4 k6 Commands


```bash
# Scaling comparison
k6 run --env BASE_URL=http://localhost:80 --env SCALE=single k6/sprint-4-scale.js
k6 run --env BASE_URL=http://localhost:80 --env SCALE=replicated k6/sprint-4-scale.js

# Replica failure test
k6 run --env BASE_URL=http://localhost:80 k6/sprint-4-replica.js
```


During replica-failure test:


```bash
docker compose ps
docker stop <container-id>
docker compose ps
docker compose up --scale dashboard-api=3 -d
```


## Sprint History

| Sprint | Tag        | Plan                                              | Report                                    |
| ------ | ---------- | ------------------------------------------------- | ----------------------------------------- |
| 1      | `sprint-1` | [SPRINT-1-PLAN.md](sprint-plans/SPRINT-1-PLAN.md) | [SPRINT-1.md](sprint-reports/SPRINT-1.md) |
| 2      | `sprint-2` | [SPRINT-2-PLAN.md](sprint-plans/SPRINT-2-PLAN.md) | [SPRINT-2.md](sprint-reports/SPRINT-2.md) |
| 3      | `sprint-3` | [SPRINT-3-PLAN.md](sprint-plans/SPRINT-3-PLAN.md) | [SPRINT-3.md](sprint-reports/SPRINT-3.md) |
| 4      | `sprint-4` | [SPRINT-4-PLAN.md](sprint-plans/SPRINT-4-PLAN.md) | [SPRINT-4.md](sprint-reports/SPRINT-4.md) |
