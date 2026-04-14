# Endless Eight — IoT Sensor Monitoring Dashboard

**Course:** COMPSCI 426  
**Team:** Eric Gu, Zaeem Chaudhary, Justin Manoj, Sean Young, Srikar Kopparapu, Nam Pham, William Hammond, Nathan Chen
**System:** IoT Sensor Monitoring Dashboard
**Repository:** https://github.com/Sri200519/team-8-iot.git

---

## Team and Service Ownership

| Team Member | Services / Components Owned                            |
| ----------- | ------------------------------------------------------ |
| Zaeem Chaudhary       | `Ingestion Service, Caddy`     |
| Srikar Kopparapu      | `Ingestion Service, Caddy`               |
| Nathan Chen           | `Storage Worker, Sensor Simulator`               |
| Justin Manoj          | `Storage Worker, Sensor Simulator`               |
| Sean Young            | `Sensor Registry Service`               |
| Nam Pham              | `Dashboard Service`           |
| William Hammond       | `Anomaly Worker`               |
| Eric Gu               | `Alert Service` |

> Ownership is verified by `git log --author`. Each person must have meaningful commits in the directories they claim.

---

## How to Start the System

```bash
# Start everything (builds images on first run)
docker compose up --build

# Start with service replicas (Sprint 4)
docker compose up --scale your-service=3

# Verify all services are healthy
docker compose ps

# Stream logs
docker compose logs -f

# Open a shell in the holmes investigation container
docker compose exec holmes bash
```

### Base URLs (development)

```
dashboard-api          http://dashboard-api:3000
ingestion              http://ingestion:3001
alert-service          http://alert-service:3000
sensor-registry        http://sensor-registry:3000
[worker-name]          http://localhost:[port]   (health endpoint only)
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

At any point a bad reading is placed into a queue, it is eventually sorted and handled in a dead letter queue.

Dashboard information is shown via the Dashboard service, which reads from the Readings DB or a closer Redis cache.



---

## API Reference

<!--
  Document every endpoint for every service.
  Follow the format described in the project documentation: compact code block notation, then an example curl and an example response. Add a level-2 heading per service, level-3 per endpoint.
-->

---

### Dashboard API Service

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
curl http://dashboard-api:3000/dashboard?sensor_id=1&timestamp=2026-04-09T15:10:00Z&temperature=23.2&pressure=1012.2&humidity=10.1
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

  Gets all reading data with relation to a sensor, given its  reading id

  Required Parameters:
    id STRING

  Responses:
    IN PROGRESS
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
curl http://sensor-registry:3000/health
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
    IN PROGRESS
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

---

## Sprint History

| Sprint | Tag        | Plan                                              | Report                                    |
| ------ | ---------- | ------------------------------------------------- | ----------------------------------------- |
| 1      | `sprint-1` | [SPRINT-1-PLAN.md](sprint-plans/SPRINT-1-PLAN.md) | [SPRINT-1.md](sprint-reports/SPRINT-1.md) |
| 2      | `sprint-2` | [SPRINT-2-PLAN.md](sprint-plans/SPRINT-2-PLAN.md) | [SPRINT-2.md](sprint-reports/SPRINT-2.md) |
| 3      | `sprint-3` | [SPRINT-3-PLAN.md](sprint-plans/SPRINT-3-PLAN.md) | [SPRINT-3.md](sprint-reports/SPRINT-3.md) |
| 4      | `sprint-4` | [SPRINT-4-PLAN.md](sprint-plans/SPRINT-4-PLAN.md) | [SPRINT-4.md](sprint-reports/SPRINT-4.md) |
