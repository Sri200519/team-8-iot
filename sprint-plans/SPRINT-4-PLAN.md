# Sprint 4 Plan — Endless Eight


**Sprint:** 4 — Replication, Scaling, and Polish  
**Dates:** 04.28 → 05.07  
**Written:** 04.28 in class


---


## Goal


We are replicating Ingestion, Dashboard API, and Sensor Registry services, with the command ‘docker compose up --build --scale ingestion=3 dashboard-api=3 sensor-registry=3 -d’. Aside from that, and the Caddy load balancing we will implement and the last few k6 tests, we will implement a basic webpage with UI to demonstrate service logic for the final demo, as well as fix any remaining issues or bugs.


We will write some prewritten scripts that can help set up testing conditions.


---


## Ownership


| Team Member | Files / Directories Owned This Sprint |
| ----------- | ------------------------------------- |
| Eric Gu         | `dashboard-api/` |
| William Hammond | `caddy/` |
| Zaeem           | `dashboard-ui/` |
| Justin          |  `README.md`  |
| Sean            | `k6/` |
| Srikar          |  `sensor-registry/`|
| Nam             |   `ingestion/`          | 
| Nathan          |   `test_scripts/`        | 


---


## Tasks


### William
- [ ] Implement Caddy load balancing


### Eric
- [ ] Scale the dashboard API so it can replicate 
- [ ] Make dashboard API stateless 


### Nam


- [ ] Scale the ingestion service so it can replicate 
- [ ] Make ingestion service stateless 


### Zaeem 


- [ ] Develop unified UI for public demo testing
- [ ] Do end-to-end testing to make sure the api calls are set up smoothly from the front-end to the back-end


### Nathan


- [ ] Develop bash tests for service testing in the public demo


### Sean


- [ ] Develop k6 tests to show scaling improvements and that our system continues to work through replica failures


### Srikar


- [ ] Scale the sensory registry so it can replicate 
- [ ] Make sensory registry stateless 


### Justin 


- [ ] README documentation update 
---


## Risks


We have to be sure that all of us understand how the system works, after having spent a good amount of time segmenting our understanding to specific parts of the system, like services and workers.


---


## Definition of Done


`docker compose up --scale [service]=3` starts successfully. `docker compose ps` shows all replicas as `(healthy)`. k6 scaling comparison shows measurable improvement. Replica failure test shows no dropped requests.




