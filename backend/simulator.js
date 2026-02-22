const os = require("os");
const fetch = require("node-fetch");

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
  const latency = Math.floor(Math.random() * 300) + 50;
  const errorRate = Math.floor(Math.random() * 5);
  const requestCount = Math.floor(Math.random() * 200);

  const cpuUsage = getCpuUsage();
  const memoryUsage = getMemoryUsage();

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
      },
      body: JSON.stringify({
        latency,
        error_rate: errorRate,
        request_count: requestCount,
        cpu_usage: cpuUsage,
        memory_usage: memoryUsage
      })
    });

    const data = await res.json();
    console.log("Sent metric:", data);

  } catch (err) {
    console.error("Error sending metric:", err.message);
  }
}

setInterval(sendMetric, 3000);

console.log("Simulator running...");