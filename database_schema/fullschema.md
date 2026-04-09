Alert Data Schema:
AlertId
SensorId
Message
Timestamp
Reading_value
Alert_type


Sensor Registration Schema:
SensorId
Timestamp (CreatedAt)
Updated_at
Location
Type
Min_temp
Max_temp
Min_humidity
Max_humidity
Min_pressure
Max_pressure


Report Data Schema:
ReportID
SensorId
Timestamp (CreatedAt)
Min_temp
Max_temp
Avg_temp
Min_humidity
Max_humidity
Avg_humidity
Min_pressure
Max_pressure
Avg_pressure
Start_time
End_time


Device Data Schema
DeviceId
SensorId
Status
Version
Registered_at
Last_seen_at
Metadata

Reading Data Schema
ReadingId
Time
SensorId
Temperature
Pressure
Humidity

