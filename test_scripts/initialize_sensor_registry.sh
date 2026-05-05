# Run first to 

for i in {1..5}; do
  curl -X POST http://sensor-registry-service:3000/sensors \
    -H "Content-Type: application/json" \
    -d "{
      \"sensor_id\": \"sensor-$i\",
      \"location\": \"Zone $i\",
      \"type\": \"environment\",
      \"min_temp\": 0, \"max_temp\": 50,
      \"min_humidity\": 0, \"max_humidity\": 100,
      \"min_pressure\": 900, \"max_pressure\": 1100
    }"
done
