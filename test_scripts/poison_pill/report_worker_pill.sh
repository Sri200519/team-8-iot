echo Adding Malformed Data to report-gen:queue
redis-cli -h redis RPUSH report-gen:queue '{"broken_field": null}'
echo DLQ Queue Size Below For report-gen:queue Is:
redis-cli -h redis LLEN report-gen:dlq

curl http://report-gen-worker:3000/health
echo