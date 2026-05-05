# Sprint 4 Report — Endless Eight


**Sprint:** 4 — Replication, Scaling, and Polish  
**Tag:** `sprint-4`  
**Submitted:** 5/4/2026


---


## What We Built


The Dashboard API, Ingestion, and Sensor Registry services had replication implemented through Caddy, with the load balancing working by trying to divide the load equally among the three replicants for each respective service. 


Along the way, final polish work was conducted to fix remaining bugs and create supplementary test scripts to help facilitate the final demo. The final k6 baseline tests were developed with their results below.


---


## Individual Contributions


| Team Member | What They Delivered | Key Commits |
| ----------- | ------------------- | ----------- |
| Nam Pham | Developed Ingestion service to be stateless for replication, aligned DLQ key names | https://github.com/Sri200519/team-8-iot/pull/68 |
| William Hammond    | Developed full Caddy file, implemented load balancing, modified compose.yml | https://github.com/Sri200519/team-8-iot/pull/64 |
| Srikar Kopparapu | Developed sensor registry statelessness for replication | https://github.com/Sri200519/team-8-iot/pull/62 https://github.com/Sri200519/team-8-iot/pull/66 |
| Justin Manoj | Updated documentation for README | https://github.com/Sri200519/team-8-iot/pull/67 |
| Nathan Chen   | Developed test scripts for every relevant test being conducted in the demo | https://github.com/Sri200519/team-8-iot/pull/69 |
| Eric Gu | Developed Dashboard API to be stateless for replication|  https://github.com/Sri200519/team-8-iot/pull/63 |
|Zaeem Chaudhary | In progress work on developing UI for final demo | https://github.com/Sri200519/team-8-iot |
| Sean Young | Developed latest k6 tests for Sprint 4 baseline | https://github.com/Sri200519/team-8-iot/pull/65 |


---


## Starting the System with Replicas


```bash
docker compose up --scale dashboard-api=3 --scale ingestion=3 --scale sensor-registry-service=3 –-build
```


After startup:


```
NAME                                   IMAGE                                  COMMAND                  SERVICE                     CREATED          STATUS                    PORTS
team-8-iot-dashboard-api-1             team-8-iot-dashboard-api               "docker-entrypoint.s…"   dashboard-api               24 seconds ago   Up 17 seconds (healthy)   3000/tcp
team-8-iot-dashboard-api-2             team-8-iot-dashboard-api               "docker-entrypoint.s…"   dashboard-api               24 seconds ago   Up 17 seconds (healthy)   3000/tcp
team-8-iot-dashboard-api-3             team-8-iot-dashboard-api               "docker-entrypoint.s…"   dashboard-api               24 seconds ago   Up 16 seconds (healthy)   3000/tcp
team-8-iot-ingestion-1                 team-8-iot-ingestion                   "docker-entrypoint.s…"   ingestion                   24 seconds ago   Up 15 seconds (healthy)   3001/tcp
team-8-iot-ingestion-2                 team-8-iot-ingestion                   "docker-entrypoint.s…"   ingestion                   24 seconds ago   Up 16 seconds (healthy)   3001/tcp
team-8-iot-ingestion-3                 team-8-iot-ingestion                   "docker-entrypoint.s…"   ingestion                   24 seconds ago   Up 16 seconds (healthy)   3001/tcp
team-8-iot-sensor-registry-service-1   team-8-iot-sensor-registry-service     "docker-entrypoint.s…"   sensor-registry-service     24 seconds ago   Up 16 seconds (healthy)   3000/tcp
team-8-iot-sensor-registry-service-2   team-8-iot-sensor-registry-service     "docker-entrypoint.s…"   sensor-registry-service     24 seconds ago   Up 16 seconds (healthy)   3000/tcp
team-8-iot-sensor-registry-service-3   team-8-iot-sensor-registry-service     "docker-entrypoint.s…"   sensor-registry-service     24 seconds ago   Up 16 seconds (healthy)   3000/tcp
```


---


## What Is Working


- [x] At least [N] services replicated via `--scale`
- [x] Load balancer distributes traffic across replicas (visible in logs)
- [x] Services are stateless — multiple instances run without conflicts
- [x] `docker compose ps` shows all replicas as `(healthy)`
- [x] System is fully complete for team size


---


## What Is Not Working / Cut


We had cut the UI implementation as it was not part of the requirements for Sprint 4, but it will be ready by the final demo.


---


## k6 Results


### Test 1: Scaling Comparison (`k6/sprint-4-scale.js`)


| Metric | 1 replica | 3 replicas | Change |
| ------ | --------- | ---------- | ------ |
| p50    |2.2821784999999997 | 2.447202| +7%~|
| p95    |3.20006475 | 3.3286457499999997| +4%~ |
| p99    |4.8496682899999985| 5.420157149999998 | +11.7%~ |
| RPS    |53.79337600411853 | 53.88120910763721| +0.1%~ |


It is strange that with three replicas the change for these times have somewhat increased, but we think this is explained by the fact that we have little to no simulation involved for our services; the queuing takes place at such a quick rate that even after pumping up the number of simulated users and requests being sent at a time, having either 1 or 3 replicas for the service makes little to no difference.


### Test 2: Replica Failure (`k6/sprint-4-replica.js`)


Timeline:


| Time | Event |
| ---- | ----- |
| 0s   | k6 started, 3 replicas running |
| 42s | Killed replica: `docker stop team-8-iot-dashboard-api-1` |
| 42-55s | Surviving replicas absorbed traffic |
| 55s | Replica restarted: `docker compose up -d` |
| 55-190s | Traffic redistributed, back to normal |


```
running (0m38.2s), 20/20 VUs, 914 complete and 0 interrupted iterations
default   [======>-------------------------------] 20/20 VUs  0m38.2s/3m10.0s
```


During failure — `docker compose ps`:


```
running (0m48.6s), 20/20 VUs, 1329 complete and 0 interrupted iterations
default   [========>-----------------------------] 20/20 VUs  0m48.6s/3m10.0s
```


After restart — `docker compose ps`:


```
NAME                                   IMAGE                                  COMMAND                  SERVICE                     CREATED          STATUS                    PORTS
team-8-iot-dashboard-api-1             team-8-iot-dashboard-api               "docker-entrypoint.s…"   dashboard-api               39 seconds ago   Up 17 seconds (healthy)   3000/tcp
team-8-iot-dashboard-api-2             team-8-iot-dashboard-api               "docker-entrypoint.s…"   dashboard-api               39 seconds ago   Up 17 seconds (healthy)   3000/tcp
team-8-iot-dashboard-api-3             team-8-iot-dashboard-api               "docker-entrypoint.s…"   dashboard-api               39 seconds ago   Up 16 seconds (healthy)   3000/tcp
team-8-iot-ingestion-1                 team-8-iot-ingestion                   "docker-entrypoint.s…"   ingestion                   39 seconds ago   Up 15 seconds (healthy)   3001/tcp
team-8-iot-ingestion-2                 team-8-iot-ingestion                   "docker-entrypoint.s…"   ingestion                   39 seconds ago   Up 16 seconds (healthy)   3001/tcp
team-8-iot-ingestion-3                 team-8-iot-ingestion                   "docker-entrypoint.s…"   ingestion                   39 seconds ago   Up 16 seconds (healthy)   3001/tcp
team-8-iot-sensor-registry-service-1   team-8-iot-sensor-registry-service     "docker-entrypoint.s…"   sensor-registry-service     39 seconds ago   Up 16 seconds (healthy)   3000/tcp
team-8-iot-sensor-registry-service-2   team-8-iot-sensor-registry-service     "docker-entrypoint.s…"   sensor-registry-service     39 seconds ago   Up 16 seconds (healthy)   3000/tcp
team-8-iot-sensor-registry-service-3   team-8-iot-sensor-registry-service     "docker-entrypoint.s…"   sensor-registry-service     39 seconds ago   Up 16 seconds (healthy)   3000/tcp


```


---


## Blockers and Lessons Learned


We learned how we could expand the scope of our service availability through replication after implementing statelessness.
