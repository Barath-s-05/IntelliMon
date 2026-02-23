function calculateHealthScore(metric) {
    let score = 100;

    if (metric.latency > 1000) score -= 30;
    if (metric.error_rate > 5) score -= 25;
    if (metric.cpu_usage > 85) score -= 20;
    if (metric.memory_usage > 90) score -= 20;

    if (score < 0) score = 0;

    let status = "Healthy";
    if (score < 70) status = "Degraded";
    if (score < 40) status = "Critical";

    return { score, status };
}

module.exports = {
    calculateHealthScore
};