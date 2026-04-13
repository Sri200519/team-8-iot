# Sprint 1 Report — Endless Eight

**Sprint:** 1 — Foundation  
**Tag:** `sprint-1`  
**Submitted:** 4/13/2026
---

## What We Built

For this Sprint 1, we have put together the basic infrastructure for a system that records sensor data relating to temperature, humidity, and pressure from different locations at different times. For the 5 databases and the 5 types of data we will be intending to handle, we have established postgres databases and their respective data schemas.

All services and workers have their own respective /health endpoint that returns an HTTP response with statuses 200 or 503 respectively for if they and their dependencies are healthy or not. We have, additionally, two endpoints that handle GET requests in sensory-registry/ and alert-service/ currently in place that are implemented to return sensor and alert information properly. There is a endpoint that handles POST requests containing sensor data currently inplace for the Dashboard API service as well. There is a synchronous service-to-service HTTP call between the Dashboard and Sensory Registry service that attempts to GET sensor data from the sensor registry service.

We have ensured that you can start up all services, workers, and databases with 'docker compose up', and if you check with 'docker compose ps', you will see that everything is healthy. We have implemented proper k6 testing of our sensor registry GET endpoint, of which the results are indicated below.



---

## Individual Contributions

| Team Member | What They Delivered                                     | Key Commits            |
| ----------- | ------------------------------------------------------- | ---------------------- |
| [Name]      | [e.g. order-service with DB schema, health endpoint]    | [short SHA or PR link] |
| [Name]      | [e.g. restaurant-service, synchronous call integration] |                        |
| [Name]      | [e.g. compose.yml wiring, k6 baseline script]           |                        |

Verify with:

```bash
git log --author="Name" --oneline -- path/to/directory/
```

---

## What Is Working

- [x] `docker compose up` starts all services without errors
- [x] `docker compose ps` shows every service as `(healthy)`
- [x] `GET /health` on every service returns `200` with DB and Redis status
- [x] At least one synchronous service-to-service call works end-to-end
- [x] k6 baseline test runs successfully

---

## What Is Not Working / Cut

We enacted everything we planned to from the Sprint 1 Plan aside from the webpage that has the form for submitting sensor data, making sure that all the required deliverables were put in place. To be honest, a lot of assigned responsibilities in Sprint 1 Plan were kind of reorganized since we had not anticipated the additional services and components being added to our system; when we initially put together the sprint plan on 4/7, we did not realize there would be components to divide among us. Now that we have a complete awareness of the parts and services we have to assemble together, as well as basic infrastructure and division of duties into separate directories, our path forward will be a lot more clearer when we start planning out Sprint 2.

---

## k6 Baseline Results

Script: `k6/sprint-1.js`  
Run: `docker compose exec holmes k6 run /workspace/k6/sprint-1.js`

```
    These are the Sprint 1 k6 test results:

    The HTTP P(50) REQ DURATION is: 0.494083
    The HTTP P(95) REQ DURATION is: 0.7096524999999999
    The HTTP P(99) REQ DURATION is: 0.7652341344888210
    The Rate of Requests per Second was: 28.705596288201683
```

| Metric             | Value |
| ------------------ | ----- |
| p50 response time  | 0.494083  |
| p95 response time  | 0.7096524999999999    |
| p99 response time  | 0.7652341344888210    |
| Requests/sec (avg) | 28.705596288201683   |
| Error rate         | 0 |

These numbers are your baseline. Sprint 2 caching should improve them measurably.

---

Currently, the response times are so low across the board from p50 to p99 because we have yet to introduce expensive operations to our endpoints; currently, our sensor-registry GET endpoint serves only to return mock data, which explains the rapid request per second rate.

## Blockers and Lessons Learned


As expected, probably the largest blockers that we had to deal with has been just communication across our 8-person group. What also added to the troubles was the fact that we had to quickly put together our Sprint 1 Plan by the end of April 7th, but it was only in-class on April 9th when we learned that additional components and services were added to the system we were working on due to the enlarged groups. As a result, much of the preparation and planning that went into creating the Sprint 1 Plan mostly came to be nil; we had to simultaneously restructure our division of work while also deciding on project structure, which was a little chaotic. Hopefully now that our overall directory structure is now planned out, further sprint plans will be less chaotic in practice.
