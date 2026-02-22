function calculateZScore(values, current) {
    if (values.length < 5) return 0;

    // Use smaller sliding window for stability
    const recent = values.slice(0, 10);

    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;

    const variance = recent.reduce((a, b) => {
        return a + Math.pow(b - mean, 2);
    }, 0) / recent.length;

    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    return (current - mean) / stdDev;
}

// Hybrid detection
function isAnomaly(current, zScore) {
    const ABSOLUTE_THRESHOLD = 1500;   // hard limit
    const Z_THRESHOLD = 2.5;           // statistical limit

    // Only detect upward spikes
    if (current > ABSOLUTE_THRESHOLD) return true;
    if (zScore > Z_THRESHOLD) return true;

    return false;
}

module.exports = {
    calculateZScore,
    isAnomaly
};