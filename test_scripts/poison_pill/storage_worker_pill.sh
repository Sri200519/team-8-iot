echo Adding a batch of malformed Sensor Readings to sensor:readings:queue
for i in {1..50}; do redis-cli  -h redis RPUSH sensor:readings:queue '{"broken_field": $i}'; done
echo DLQ Queue Size Below For storage:dlq Is:
redis-cli -h redis LLEN storage:dlq

curl http://storage-worker:3004/health
echo