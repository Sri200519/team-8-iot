curl -X POST http://ingestion:3001/sensor \
  -H "Content-Type: application/json" \
  -d '{"sensor_id": "unregistered-999", "timestamp": "2025-04-24T12:00:00Z", "temperature": 25, "pressure": 1010, "humidity": 50}'
