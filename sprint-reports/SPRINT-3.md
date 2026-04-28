# Sprint 3 Report — Endless Eight


**Sprint:** 3 — Reliability and Poison Pills  
**Tag:** `sprint-3`  
**Submitted:** 4/27/2026


---


## What We Built


In this Sprint, we have fully implemented DLQ queues for all our existing workers: the storage worker, anomaly-detection worker, and report gen worker. 


All our services communicate within a pipeline with one or more workers; the anomaly worker now checks with the sensor registry service for anomaly thresholds, and publishes alerts to the alert service, for example. The Dashboard API now can publish report requests that the report gen worker reads and works with. The establishment of all remaining tables for all the data schemas we are working with has been set with the initialization of ‘docker compose up’.


When a poison pill is injected, failure scenarios relating to missing or invalid data fields are handled by being sent to the DLQ. 


---


## Individual Contributions


| Team Member | What They Delivered | Key Commits |
| ----------- | ------------------- | ----------- |
| Nam Pham | Established DLQ for Storage Worker | https://github.com/Sri200519/team-8-iot/pull/54 |
| William Hammond    | Added DLQ queue to Anomaly Detection Worker, ensured publishing of event and alert data, implemented cache to make thresholds read more efficient  | https://github.com/Sri200519/team-8-iot/pull/44 https://github.com/Sri200519/team-8-iot/pull/50 |
| Srikar Kopparapu | Created multiple POST endpoints in Device Management Service for updating maintenance/version information, Updated database schema for device information, established table creation | https://github.com/Sri200519/team-8-iot/pull/47 |
| Justin Manoj | Changed Storage Worker implementation to work off of redis queue, implemented batch writes of sensor readings to database | https://github.com/Sri200519/team-8-iot/pull/46 |
| Nathan Chen   | Changed ingestion service to be queue-based | https://github.com/Sri200519/team-8-iot/pull/48 |
| Eric Gu | Developed GET endpoint for report generation in Dashboard API|  https://github.com/Sri200519/team-8-iot/pull/51/changes |
|Zaeem Chaudhary | Implemented POST endpoint specifically for sensor metadata, established sensor table creation for sensor registry service | https://github.com/Sri200519/team-8-iot/pull/52 |
| Sean Young | Established alert table creation and insert operations | https://github.com/Sri200519/team-8-iot/pull/53|




---


## What Is Working


- [x] Poison pill handling: malformed messages go to DLQ, worker keeps running
- [x] Worker `GET /health` shows non-zero `dlq_depth` after poison pills are injected
- [x] Worker status remains `healthy` while DLQ fills
- [x] System handles failure scenarios gracefully (no dangling state, no crash loops)
- [x] All services/workers required for team size are implemented


---


## What Is Not Working / Cut


Nothing has been cut from our Sprint 3 Plan.


---


## Poison Pill Demonstration


How to inject a poison pill:


```bash
# From inside holmes:
docker compose exec holmes bash


# Example — publish a malformed message directly to the queue:
redis-cli -h redis RPUSH your-queue '{"this": "is malformed"}'
```


Worker health before injection:


```json
{
  "status": "healthy",
  "queue_depth": 0,
  "dlq_depth": 0,
  "last_job_at": "2025-04-24T..."
}
```


Worker health after injection:


```json
{
  "status": "healthy",
  "queue_depth": 0,
  "dlq_depth": 3,
  "last_job_at": "2025-04-24T..."
}
```


---


## k6 Results: Poison Pill Resilience (`k6/sprint-3-poison.js`)


```
These are the Sprint 3 test results:


The HTTP P(50) REQ DURATION is: 2.972125
    The HTTP P(95) REQ DURATION is: 4.064549199999999
    The HTTP P(99) REQ DURATION is: 6.737023230000001
    The Rate of Requests per Second was: 28.418768650271883
```


| Metric | Normal-only run | Mixed with poison pills | Change |
| ------ | --------------- | ----------------------- | ------ |
| p95    | 1.372224 | 4.064549199999999 | Roughly 200% increase |
| RPS    | 28.624105769356387 | 28.418768650271883| Roughly no change |
| Error rate | 0%| 0%| no change |


[Explain: did throughput hold? Did the worker stay healthy throughout?]


Throughput did hold, though as seen above, it slightly slowed for the p95 group when mixed with poison pills.


---


## Blockers and Lessons Learned


The minor blockers that we dealt with were handling queue key names in redis, along with where data would be published, but we handled that with discussion. We learned mostly the power and value of segmenting services and work through abstracting lesser known processes off to our teammates.
