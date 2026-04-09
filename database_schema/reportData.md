## Report Data Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `report_id` | `string` (UUID v4) | ✅ | Unique identifier, generated on write |
| `sensor_id` | `string` | ✅ | ID of the sensor this report covers |
| `created_at` | `string` (ISO 8601) | ✅ | UTC time the report was generated |
| `min_temp` | `float` | ✅ | Minimum temperature over the time range |
| `max_temp` | `float` | ✅ | Maximum temperature over the time range |
| `avg_temp` | `float` | ✅ | Average temperature over the time range |
| `min_humidity` | `float` | ✅ | Minimum humidity over the time range |
| `max_humidity` | `float` | ✅ | Maximum humidity over the time range |
| `avg_humidity` | `float` | ✅ | Average humidity over the time range |
| `min_pressure` | `float` | ✅ | Minimum pressure over the time range |
| `max_pressure` | `float` | ✅ | Maximum pressure over the time range |
| `avg_pressure` | `float` | ✅ | Average pressure over the time range |
| `start_time` | `string` (ISO 8601) | ✅ | Start of the reporting window |
| `end_time` | `string` (ISO 8601) | ✅ | End of the reporting window |

## Sample Payload

```json
{
  "report_id": "a3f1c2d4-91ab-4e77-b123-0e02b2c3d479",
  "sensor_id": "sensor-042",
  "created_at": "2025-04-09T15:00:00Z",
  "min_temp": 18.2,
  "max_temp": 94.3,
  "avg_temp": 52.7,
  "min_humidity": 30.1,
  "max_humidity": 85.4,
  "avg_humidity": 57.8,
  "min_pressure": 1008.3,
  "max_pressure": 1024.7,
  "avg_pressure": 1016.1,
  "start_time": "2025-04-09T00:00:00Z",
  "end_time": "2025-04-09T12:00:00Z"
}
```

```sql
CREATE TABLE reports (
    report_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id       VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    min_temp        FLOAT NOT NULL,
    max_temp        FLOAT NOT NULL,
    avg_temp        FLOAT NOT NULL,
    min_humidity    FLOAT NOT NULL,
    max_humidity    FLOAT NOT NULL,
    avg_humidity    FLOAT NOT NULL,
    min_pressure    FLOAT NOT NULL,
    max_pressure    FLOAT NOT NULL,
    avg_pressure    FLOAT NOT NULL,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_report_sensor_range UNIQUE (sensor_id, start_time, end_time)
);
```