# Malformed Data
echo Adding Malformed Data to RPUSH sensor:readings:queue
redis-cli -h redis RPUSH sensor:readings:queue '{"broken_field": null}'
echo DLQ Queue Size Below For sensor:readings:queue Is:
redis-cli -h redis LLEN sensor:readings:queue:dlq
echo 

# Unregistered Sensor ID (if duplicate, change sensor_id to another unregistered sensor ID)
echo POSTING Data with Unregistered SensorID to ingestion /sensor endpoint
curl -X POST http://ingestion:3001/sensor \
  -H "Content-Type: application/json" \
  -d '{"sensor_id": "unregistered-9999", "timestamp": "2025-04-24T12:00:00Z", "temperature": 25, "pressure": 1010, "humidity": 50}'
echo 

echo DLQ Queue Size Below For sensor:readings:queue Is:
redis-cli -h redis LLEN sensor:readings:queue:dlq

  


curl http://anomaly-worker:3002/health
echo
