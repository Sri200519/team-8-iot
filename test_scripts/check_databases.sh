#!/bin/bash
psql postgres://user:pass@ingestion-db:5432/ingestion-db -c "SELECT * FROM sensor_readings"
psql postgres://user:pass@sensor-registry:5432/sensor-registry-db -c "SELECT * FROM sensors"
psql postgres://user:pass@alert:5432/alert-db -c "SELECT * FROM alerts"
psql postgres://user:pass@device:5432/device-db -c "SELECT * FROM devices"
psql postgres://user:pass@device:5432/device-db -c "SELECT * FROM maintenance_schedules"

# Freezes terminal for some reason
# psql postgres://user:pass@report:5432/report-db -c "SELECT * FROM reports;"