# Sprint 1 Plan — Endless Eight

**Sprint:** 1 — Foundation  
**Dates:** 04.07 → 04.14  
**Written:** 04.07 in class

---

## Goal

We need to establish data schemas for the types of data we will handle. This is something we need to do by the end of the week to get work done. From there, we can then start setting up our directories to structure our project, accomodate for our data types we decide on, and make sure that all our services can properly be initiated with 'docker compose up' with proper health check responses and dependencies.


---

## Ownership

| Team Member | Files / Directories Owned This Sprint           |
| ----------- | ----------------------------------------------- |
| Zaeem Chaudhary      | `front page form, ingestion/`     |
| Srikar Kopparapu      | `GET request for sensor data, ingestion/`               |
| Eric Gu      | `Alert DB, alert/` |
| Justin Manoj   | `Readings DB, storage_worker/`               |
| Sean Young      | `Sensor Registery DB, sensor_registry/`               |
| Nam Pham      | `POST Request for sensor data, dashboard/`           |
| William Hammond      | `worker queue for anomalies, anomaly_worker/`               |
| Nathan Chen      | `worker queue for storage, storage_worker/`               |

Each person must have meaningful commits in the paths they claim. Ownership is verified by:

```bash
git log --author="Name" --oneline -- path/to/directory/
```

---

## Tasks

### Eric, Justin, and Sean

- [ ] Identify data schemas in which data will be stored
- [ ] Use Postgres to establish those respective databases
- [ ] Make sure 'docker compose up' works for databases
- [ ] Make sure /health endpoints exist, returning HTTP 200 and 503 respectively

### Zaeem (Connected with Srikar)

- [ ] Set up an extremely basic webpage with a form in which sensor data, as defined with a data schema we work on together, can be submitted
- [ ] Make sure 'docker compose up' works for ingestion/ service
- [ ] Make sure /health endpoints exist, returning HTTP 200 and 503 respectively

### Srikar (Connected with Zaeem)

- [ ] Establish a GET API for getting sensor data, likely for the purpose of presenting on a webpage
- [ ] Have checks for missing data and the like, with usual HTTP response types to handle different situations
- [ ] Make sure 'docker compose up' works for ingestion/ service
- [ ] Make sure /health endpoints exist, returning HTTP 200 and 503 respectively

### Nam

- [ ] Establish a POST API for submitting sensor data
- [ ] Have checks for missing input data and the like, with usual HTTP response types to handle different situations
- [ ] Make sure 'docker compose up' works for dashboard/ service
- [ ] Make sure /health endpoints exist, returning HTTP 200 and 503 respectively


### William

- [ ] Determine how alerts would conceptually be announced, sharing with team
- [ ] Implement a worker queue for anomalies
- [ ] Make sure 'docker compose up' works for anomaly_worker/ worker
- [ ] Make sure /health endpoints exist, returning HTTP 200 and 503 respectively


### Nathan

- [ ] Determine how alerts would conceptually be announced, sharing with team
- [ ] Implement a worker queue for readings to put in storage
- [ ] Make sure 'docker compose up' works for storage_worker/ worker
- [ ] Make sure /health endpoints exist, returning HTTP 200 and 503 respectively

### Collective
 - [ ] Ensure that 'docker compose up' starts all core services and databases properly
 - [ ] At some point, implement the synchronous service-to-service HTTP call somewhere (likely with the alert system)
 - [ ] Ensure that all services' /health endpoints work properly and every service in compose.yml has a depend healthcheck on redis and databasess

## Risks

We have to get ahang of basically just making 'docker compose up --build' to work for everyone first. Also, divvying the work out between 8 people will be rough to coordinate, we have to communicate in order to avoid merge conflicts and hopefully have more efficient division of work. This is probably the largest risk of our 8-person group for now.

---

## Definition of Done

A TA can clone this repo, check out `sprint-1`, run `docker compose up`, and:

- `docker compose ps` shows every service as `(healthy)`
- `GET /health` on each service returns `200` with DB and Redis status
- The synchronous service-to-service call works end-to-end
- k6 baseline results are included in `SPRINT-1.md`
