# Sprint 3 Plan — Endless Eight


**Sprint:** 3 — Reliability and Poison Pills  
**Dates:** 04.21 → 04.28  
**Written:** 04.21 in class


---


## Goal


Our goal for this sprint is to implement a dead letter queue for every worker we have in our pipeline to handle malformed data. Also, we will make sure that every service-to-worker pipeline functions as intended, from start to finish. 


Storage Worker and Anomaly Worker will have the newly implemented DLQ Ingestion will be reworked to not publish and instead enqueue on a Redis queue. Alert Service will start reading alerts published by the Anomaly Worker, communicating with the Sensor Registry Service to determine thresholds. The Report Generation Worker will also start receiving subscribed report requests from the Dashboard API.


---


## Ownership


| Team Member     | Files / Directories Owned This Sprint |
| -----------     | ------------------------------------- |
| Eric Gu         | `dashboard-api/`      |
| William Hammond | `anomaly-worker/`     |
| Zaeem           | `sensor-registry/`    |
| Justin          |  `report-gen-worker/`, `storage-worker/` |
| Sean            | `alert-service/`, `k6/` |
| Srikar          | `device-management/` |
| Nam             |  `storage-worker/`    | 
| Nathan          |  `ingestion/`         | 
---




## Tasks


### Nam
- [ ] Implement Worker queue that works from relevant queue/publisher
- [ ] Implement DLQ and test to make sure it works


### Justin
- [ ] Batch DB Writes-storage worker
- [ ] Queue Consumption (BLPOP)-storage worker


### William
- [X] Have worker communicate with Sensor Registry Service to publish alerts
- [X] Implement DLQ and test to make sure it works


### Eric
- [ ] Create endpoint that publishes a report request for the Report Generation worker to read for Dashboard API


### Sean
- [ ] Handle k6 implementation that tests with valid and malformed inputs
- [ ] Create endpoint to get alerts from Anomaly Worker and writes to database


### Nathan
- [ ] Rework ingestion to enqueue on ‘sensor:readings:queue’
- [ ] Assist with worker DLQ implementation


### Zaeem
- [ ] Add unknown-sensor handling contract for DLQ pipeline and test it
- [ ] Implement POST endpoint for sensor threshold metadata


### Srikar
- [ ] New Firmware Endpoint-device management
- [ ] New Validation Endpoint-device management




---


## Risks
Now that we are actually having more complete communication between services, other services, and their workers, we need to rigorously test to ensure that a bug or some flaw from somewhere won’t break up more complex communications.


---

## Definition of Done
After injecting poison pills, the worker's `/health` shows non-zero `dlq_depth` while status remains healthy. Good messages keep flowing. k6 results show throughput does not collapse.