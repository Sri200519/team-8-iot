| Column Name   | Data Type   | Constraints / Notes                 |
| ------------- | ----------- | ----------------------------------- |
| device_id     | VARCHAR(64) | PRIMARY KEY                         |
| sensor_id     | VARCHAR(64) | UNIQUE, FK (optional)               |
| status        | VARCHAR(20) | e.g., active, inactive, maintenance |
| version       | VARCHAR(50) | Firmware or device version          |
| registered_at | TIMESTAMPTZ | NOT NULL, default CURRENT_TIMESTAMP |
| last_seen_at  | TIMESTAMPTZ | Updated on heartbeat/activity       |
| metadata      | JSONB       | Flexible device-specific data       |

```sql
CREATE TABLE devices (
    device_id       VARCHAR(64) PRIMARY KEY,
    
    sensor_id       VARCHAR(64) UNIQUE,
    
    status          VARCHAR(20) NOT NULL,
    
    version         VARCHAR(50),
    
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    last_seen_at    TIMESTAMPTZ,
    
    metadata        JSONB
);
```

## Example Payload:
```json
{
  "deviceId": "dev-12345",
  "sensorId": "sensor-abc-001",
  "status": "active",
  "version": "v1.2.3",
  "registered_at": "2026-04-09T14:30:00Z",
  "last_seen_at": "2026-04-09T15:05:00Z",
  "metadata": {
    "location": "Boston, MA",
    "model": "TS-100",
    "battery_level": 87,
    "firmware_channel": "stable"
  }
}
```