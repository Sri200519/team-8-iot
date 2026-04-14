| Column Name | Data Type        | Constraints / Notes               |
| ----------- | ---------------- | --------------------------------- |
| reading_id  | UUID             | PRIMARY KEY                       |
| timestamp   | TIMESTAMPTZ      | NOT NULL                          |
| sensor_id   | VARCHAR(64)      | INDEXED, identifies source sensor |
| temperature | DOUBLE PRECISION | Measured temperature              |
| pressure    | DOUBLE PRECISION | Measured pressure                 |
| humidity    | DOUBLE PRECISION | Measured humidity                 |

```sql 
CREATE TABLE sensor_readings (
    reading_id     UUID PRIMARY KEY,
    
    timestamp      TIMESTAMPTZ NOT NULL,
    
    sensor_id      VARCHAR(64) NOT NULL,
    
    temperature    DOUBLE PRECISION,
    
    pressure       DOUBLE PRECISION,
    
    humidity       DOUBLE PRECISION
);
```

## Example Payload:
```json
{
  "readingId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-09T15:10:00Z",
  "sensorId": "sensor-abc-001",
  "temperature": 22.5,
  "pressure": 1013.2,
  "humidity": 48.7
}
```