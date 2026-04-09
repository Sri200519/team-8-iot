## Alert Data Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `alert_id` | `string` (UUID v4) | ✅ | Unique identifier, generated on write |
| `sensor_id` | `string` | ✅ | ID of the sensor that triggered the alert |
| `message` | `string` | ✅ | Human-readable description of the anomaly |
| `timestamp` | `string` (ISO 8601) | ✅ | UTC time of the original sensor reading |
| `reading_value` | `float` | ✅ | Raw sensor value that was flagged |
| `alert_type` | `string` (enum) | ✅ | Category of anomaly (e.g. `HIGH_TEMPERATURE`) |

## Sample Payload

```json
{
  "alert_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "sensor_id": "sensor-042",
  "message": "Temperature exceeded upper threshold of 80.0°C (reading: 94.3°C)",
  "timestamp": "2025-04-09T14:22:05Z",
  "reading_value": 94.3,
  "alert_type": "HIGH_TEMPERATURE"
}
```
CREATE TABLE alerts (
    alert_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id   VARCHAR(255) NOT NULL,
    message     TEXT NOT NULL,
    timestamp   TIMESTAMPTZ NOT NULL,
    reading_value FLOAT NOT NULL,
    alert_type  VARCHAR(50) NOT NULL
);