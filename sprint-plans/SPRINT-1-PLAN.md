# Sprint 1 Plan — Endless Eight

**Sprint:** 1 — Foundation  
**Dates:** 04.07 → 04.14  
**Written:** 04.07 in class

---

## Goal

We need to establish data schemas for the types of data we will handle. This is something we need to do by the end of the week to get work done. From there, we can then start setting up our directories to structure our project and accomodate for our decided datatypes.


---

## Ownership

| Team Member | Files / Directories Owned This Sprint           |
| ----------- | ----------------------------------------------- |
| Eric Gu      | `Alert DB, alert/` |
| Zaeem Chaudhary      | `front pages, maybe api/`     |
| Justin Manoj   | `Readings DB, storage_worker/`               |
| Sean Young      | `Sensor Registery DB, sensor_registry/`               |
| Srikar Kopparapu      | `GET request for sensor data, api/`               |
| Nam Pham      | `POST Request for sensor data, api/`           |
| William Hammond      | `worker queue for anomalies, anomaly_worker/`               |
| Nathan Chen      | `alert service, alert/`               |

Each person must have meaningful commits in the paths they claim. Ownership is verified by:

```bash
git log --author="Name" --oneline -- path/to/directory/
```

---

## Tasks

### Eric, Justin, and Sean

- [ ] Identify data schemas in which data will be stored
- [ ] Identify a type of database to be used, and implement them respectively

### Zaeem

- [ ] Set up a webpage with a form in which sensor data, as defined with a data schema we work on together, can be submitted
- [ ] Set up another page in which sensor data can be read for the Dashboard API, can have a mock example for demo potentially 

### Srikar

- [ ] Establish a GET API for getting sensor data, likely for the purpose of presenting on a webpage
- [ ] Have checks for missing data and the like, with usual HTTP response types to handle different situations

### Nam

- [ ] Establish a POST API for submitting sensor data
- [ ] Have checks for missing input data and the like, with usual HTTP response types to handle different situations

### William

- [ ] Determine how alerts would conceptually be announced, sharing with team
- [ ] Implement a worker queue for anomalies

### Nathan

- [ ] Determine how alerts would conceptually be announced, sharing with team
- [ ] Implement a worker queue for alerts
## Risks

We have to get ahang of basically just making 'docker compose up --build' to work for everyone first. Also, divvying the work out between 8 people may be rough to coordinate, have to communicate in order to avoid merge conflicts and hopefully have more efficient division of work.

---

## Definition of Done

A TA can clone this repo, check out `sprint-1`, run `docker compose up`, and:

- `docker compose ps` shows every service as `(healthy)`
- `GET /health` on each service returns `200` with DB and Redis status
- The synchronous service-to-service call works end-to-end
- k6 baseline results are included in `SPRINT-1.md`
