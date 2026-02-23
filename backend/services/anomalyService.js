socket.on("metric_update", (data) => {
  setMetrics(prev => {
    const updated = [...prev.slice(-49), data];

    if (updated.length > 10) {
      const latencies = updated.map(m => m.latency);

      const mean =
        latencies.reduce((a, b) => a + b, 0) / latencies.length;

      const variance =
        latencies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
        latencies.length;

      const stdDev = Math.sqrt(variance);

      const zScore =
        stdDev === 0 ? 0 : (data.latency - mean) / stdDev;

      if (Math.abs(zScore) > 2) {
        console.warn("⚠ Statistical Anomaly Detected", {
          value: data.latency,
          zScore: zScore.toFixed(2)
        });
      }
    }

    return updated;
  });
});