function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values) {
  const avg = mean(values);
  const squareDiffs = values.map(value => {
    const diff = value - avg;
    return diff * diff;
  });
  return Math.sqrt(mean(squareDiffs));
}

function calculateZScore(values, newValue) {
  if (!values || values.length < 5) return 0; // avoid cold start instability
  const sd = stdDev(values);
  if (sd === 0) return 0;
  return (newValue - mean(values)) / sd;
}

function detectAnomaly(metricType, value, zScore) {
  // HARD THRESHOLDS
  if (metricType === "latency" && value > 1500)
    return { isAnomaly: true, severity: "CRITICAL" };

  if (metricType === "error_rate" && value > 10)
    return { isAnomaly: true, severity: "CRITICAL" };

  // Z-SCORE BASED
  if (zScore > 3)
    return { isAnomaly: true, severity: "CRITICAL" };

  if (zScore > 2)
    return { isAnomaly: true, severity: "HIGH" };

  if (zScore > 1.5)
    return { isAnomaly: true, severity: "MEDIUM" };

  return { isAnomaly: false };
}

module.exports = {
  calculateZScore,
  detectAnomaly
};