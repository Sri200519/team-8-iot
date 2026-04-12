| Column Name  | Data Type        | Constraints / Notes                 |
| ------------ | ---------------- | ----------------------------------- |
| sensor_id    | VARCHAR(64)      | PRIMARY KEY                         |
| created_at   | TIMESTAMPTZ      | NOT NULL, default CURRENT_TIMESTAMP |
| updated_at   | TIMESTAMPTZ      | Auto-updated on modification        |
| location     | TEXT             |                                     |
| sensor_type  | VARCHAR(50)      |                                     |
| min_temp     | DOUBLE PRECISION | Lower threshold                     |
| max_temp     | DOUBLE PRECISION | Upper threshold                     |
| min_humidity | DOUBLE PRECISION |                                     |
| max_humidity | DOUBLE PRECISION |                                     |
| min_pressure | DOUBLE PRECISION |                                     |
| max_pressure | DOUBLE PRECISION |                                     |

```sql
CREATE TABLE sensors (
    sensor_id      VARCHAR(64) PRIMARY KEY,
    
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    location       TEXT,
    sensor_type    VARCHAR(50),
    
    min_temp       DOUBLE PRECISION,
    max_temp       DOUBLE PRECISION,
    
    min_humidity   DOUBLE PRECISION,
    max_humidity   DOUBLE PRECISION,
    
    min_pressure   DOUBLE PRECISION,
    max_pressure   DOUBLE PRECISION
);
```

## Example Payload:
```json
{
  "sensor_id": "sensor-7a8b9c",
  "created_at": "2024-05-20T14:30:00Z",
  "updated_at": "2024-05-20T14:30:00Z",
  "location": "Warehouse Alpha - Sector 4",
  "sensor_type": "climate_monitor",
  "min_temp": 18.5,
  "max_temp": 26.0,
  "min_humidity": 35.0,
  "max_humidity": 60.5,
  "min_pressure": 1005.2,
  "max_pressure": 1022.8
}
```
