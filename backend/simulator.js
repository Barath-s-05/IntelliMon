const os = require("os");

// ✅ Use built-in fetch if Node 18+, fallback to node-fetch if needed
let fetchFn;
try {
  fetchFn = fetch; // Node 18+
} catch {
  fetchFn = require("node-fetch");
}

const API_KEY = "c36721d1da3fd1e30a940b523fa5e49d36705af75655d9bafb5624df25ec1043";
const API_URL = "http://localhost:5000/metrics";

function getCpuUsage() {
  const cpus = os.cpus();

  let idle = 0;
  let total = 0;

  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  });

  return 100 - Math.floor((idle / total) * 100);
}

function getMemoryUsage() {
  const total = os.totalmem();
  const free = os.freemem();
  return Math.floor(((total - free) / total) * 100);
}

async function sendMetric() {
  console.log("🚀 Attempting to send metric...");

  const latency = Math.floor(Math.random() * 300) + 50;
  const errorRate = Math.floor(Math.random() * 5);
  const requestCount = Math.floor(Math.random() * 200);

  const cpuUsage = getCpuUsage();
  const memoryUsage = getMemoryUsage();

  const payload = {
    latency,
    error_rate: errorRate,
    request_count: requestCount,
    cpu_usage: cpuUsage,
    memory_usage: memoryUsage
  };

  console.log("📦 Payload:", payload);

  try {
    const res = await fetchFn(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
      },
      body: JSON.stringify(payload)
    });

    console.log("📡 Response status:", res.status);

    const text = await res.text();
    console.log("📥 Response body:", text);

  } catch (err) {
    console.error("❌ FULL ERROR:", err);
  }
}

setInterval(sendMetric, 3000);

console.log("🟢 Simulator running...");