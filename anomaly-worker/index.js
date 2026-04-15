async function processReading(reading) {
  // compare against thresholds, publish alert if anomalous
  lastJobAt = new Date().toISOString();
  jobsProcessed++;
}