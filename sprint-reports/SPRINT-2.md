# Sprint 2 Report — Endless Eight


**Sprint:** 2 — Async Pipelines and Caching  
**Tag:** `sprint-2`  
**Submitted:** 4/20/2026


---


## What We Built


In this sprint, we implemented the remaining service and workers: storage-worker/, report-gen-worker/, anomaly-worker/, and
device-management/. All existing services, ingestion/, sensory-registry/, dashboard-api/, and ingestion also all now properly interact with redis in either enqueuing/publishing data or storing/reading from the database. 


A cache was implemented for the GET /latest_readings/:sensor_id endpoint for the Dashboard API that avoids expensive database reading by checking for a cache hit with a sensor’s readings first. 


Currently, all workers have health endpoints that return all pertinent information as required by the Sprint 2 rubric. The anomaly-worker/ has a working queue that reads off of the 'sensor:readings:queue' queue, of which the device management service enqueues device information to.


The async pipeline currently works by having device information registered first via POST request on the /devices/register endpoint by the Device Management Service. After checking for idempotency, avoiding duplicates, and missing fields, this device registration information is enqueued and read by the anomaly worker, which simulates processing this information by sleeping for 200ms for each task.


All Sprint 2 Tasks were completed.


---


## Individual Contributions


| Team Member | What They Delivered | Key Commits |
| ----------- | ------------------- | ----------- |
| William Hammond | Anomaly Detection Worker — anomaly-worker/ (server.js, Dockerfile, package.json, compose.yml entry)  | https://github.com/Sri200519/team-8-iot/pull/32 a89b340 Merge PR anomaly-worker-dev, 2e471fd fix dockerfile, 804bf58 small fix, 4bcd4f2 added server.js  |
| Srikar Kopparapu | Implemented Device Management Service with idempotent  POST request enqueuing data as part of async pipeline, implemented Storage Worker and its /health endpoint| https://github.com/Sri200519/team-8-iot/pull/39 https://github.com/Sri200519/team-8-iot/pull/41 |
| Nathan Chen   | Implemented POST endpoint for publishing sensor data to redis subscribers | https://github.com/Sri200519/team-8-iot/pull/39 |
| Justin Manoj | Implemented Report Generation Worker and its health/ endpoint | https://github.com/Sri200519/team-8-iot/pull/29 |
| Eric Gu | Implemented GET request for cumulative sensor reading data for dashboard, implemented cache to avoid expensive database reads | https://github.com/Sri200519/team-8-iot/pull/30 |
|Zaeem Chaudhary | Fully implemented GET request for sensor metadata as part of Sensory Registry service, added cache to avoid expensive database reads | https://github.com/Sri200519/team-8-iot/pull/34 |
| Sean Young |Developed both async and cache endpoint k6 tests, fully implemented Alert Service GET /alerts request and subscribing to redis stream for alerts| https://github.com/Sri200519/team-8-iot/pull/40 https://github.com/Sri200519/team-8-iot/pull/37 |
| Nam Pham | | |




---


## What Is Working


- [x] Redis cache in use — repeated reads do not hit the database
- [x] Async pipeline works end-to-end (message published → worker consumes → action taken)
- [x] At least one write path is idempotent (same request twice produces same result)
- [x] Worker logs show pipeline activity in `docker compose logs`
- [x] Worker `GET /health` returns queue depth, DLQ depth, and last-job-at


---


## What Is Not Working / Cut


We were able to sufficiently complete everything required of us from the Sprint 2 plan.


---


## k6 Results


### Test 1: Caching Comparison (`k6/sprint-2-cache.js`)


```
    These are the Sprint 2 Cache k6 test results:


    The HTTP P(50) REQ DURATION is: 3.0772135
    The HTTP P(95) REQ DURATION is: 7.844415700000002
    The HTTP P(99) REQ DURATION is: 16.984987299999975
    The Rate of Requests per Second was: 152.02012587874376
```


| Metric | Sprint 1 Baseline | Sprint 2 Cached | Change |
| ------ | ----------------- | --------------- | ------ |
| p50    | 0.6117735| 3.0772135 | +500% |
| p95    | 0.8523503499999998|7.844415700000002 | +920% |
| p99    | 1.1187116699999995| 16.984987299999975| +1519% |
| RPS    | 28.69024709417929| 152.02012587874376|+529% |




Our times for each of the metrics increased and did not improve; this is not because the caching doesn’t work, however, as we have thoroughly tested it. This is because in Sprint 1, we had mock data that was returned directly, resulting in absurdly low latencies. 


Now that we actually have a working endpoint that returns real data, it was only natural for the times to increase, even with caching.


### Test 2: Async Pipeline Burst (`k6/sprint-2-async.js`)


```
    These are the Sprint 2 Async k6 test results:


    The HTTP P(50) REQ DURATION is: 2.95208
    The HTTP P(95) REQ DURATION is: 4.291033
    The HTTP P(99) REQ DURATION is: 6.617173
    The Rate of Requests per Second was: 30.543248527062985


```


Worker health during the burst (hit `/health` while k6 is running):


```json
{ "status":"healthy","redis":"ok","depth":1336,"dlq_depth":0,"last_job_at":"2026-04-21T03:16:00.599Z","jobs_processed":669 }
```


Idempotency check: 


We can check idempotency using the curl statement in the holmes environment below:
```
curl -X POST http://device-management-service:3000/devices/register \ -H "Content-Type: application/json" \ -d '{ "deviceId": "async-demo-device", "sensorId": "async-demo-sensor", "status": "online", "idempotencyKey": "demo-key-12345" }' 
```


When first used, it will return the device information that was pushed to redis queue, along with a ‘duplicate’ field indicating false, that this is not a duplicate. 


When you resend this curl statement, you get a similar json response with the device information but with the ‘duplicate’ field indicating true, which indicates that this device information was not queued.


---


## Blockers and Lessons Learned


It’s starting to get more chaotic as our separate workers and services begin to intertwine. We are starting to learn the value of segmenting our work output, which simplifies what would be a very overwhelming project from the perspective of a solo programmer.
