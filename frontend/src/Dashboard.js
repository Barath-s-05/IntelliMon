import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import "./App.css";
import useAnimatedNumber from "./hooks/useAnimatedNumber";

const API_BASE = "http://localhost:5000";

function Dashboard() {
  const token = localStorage.getItem("token");

  const [overview, setOverview] = useState({
    totalAgents: 0,
    totalAlerts: 0,
    avgLatency: 0,
    avgErrorRate: 0
  });

  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activePage, setActivePage] = useState("dashboard");

  // ================= ONLINE CHECK =================
  const getStatus = (lastSeen) => {
    if (!lastSeen) return "Offline";
    const serverTime = new Date(lastSeen);
    const diff = Date.now() - serverTime.getTime();
    return diff < 15000 ? "Online" : "Offline";
  };

  // ================= LOAD OVERVIEW =================
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/company/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setOverview);
  }, [token]);

  // ================= LOAD AGENTS =================
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/company/agents`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setAgents(data);
        if (data.length > 0) setSelectedAgent(data[0].id);
      });
  }, [token]);

  // ================= HEARTBEAT REFRESH =================
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      fetch(`${API_BASE}/company/agents`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setAgents(data));
    }, 5000);

    return () => clearInterval(interval);
  }, [token]);

  // ================= SOCKET =================
  useEffect(() => {
    if (!selectedAgent || !token) return;

    const socket = io(API_BASE, { auth: { token } });
    socket.emit("join_agent_room", { agentId: selectedAgent });

    fetch(`${API_BASE}/metrics/history/${selectedAgent}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMetrics(Array.isArray(data) ? data : []));

    fetch(`${API_BASE}/metrics/alerts/${selectedAgent}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setAlerts(Array.isArray(data) ? data : []));

    socket.on("metric_update", (data) => {
      setMetrics(prev => [...prev.slice(-49), data]);

      // ===== STEP 3: Simple Anomaly Detection =====
      if (data.cpu_usage > 80 || data.memory_usage > 85 || data.error_rate > 5 || data.latency > 300) {
        console.warn("⚠ Anomaly Detected:", data);
      }
      socket.on("anomaly_alert", (alert) => {
        setAlerts(prev => [alert, ...prev]);

        console.warn("🚨 Alert received:", alert);
      });
    });

    return () => socket.disconnect();
  }, [selectedAgent, token]);

  const latest = metrics.length ? metrics[metrics.length - 1] : null;
  const selectedAgentObj = agents.find(a => a.id === selectedAgent);

  // ================= UPTIME CALC =================
  const uptime = metrics.length
    ? (
        (metrics.filter(m => m.error_rate < 5).length / metrics.length) * 100
      ).toFixed(1)
    : "100";

  // ================= STEP 1: KPI THRESHOLDS =================
  const cpuDanger = latest?.cpu_usage > 80;
  const memoryWarning = latest?.memory_usage > 85;
  const latencyWarning = latest?.latency > 300;
  const errorDanger = latest?.error_rate > 5;
  const slaBreach = Number(uptime) < 99;

  // ================= ANIMATED VALUES =================
  const animatedLatency = useAnimatedNumber(latest ? latest.latency : 0);
  const animatedCPU = useAnimatedNumber(latest ? latest.cpu_usage : 0);
  const animatedMemory = useAnimatedNumber(latest ? latest.memory_usage : 0);
  const animatedError = useAnimatedNumber(latest ? latest.error_rate : 0);
  const animatedUptime = useAnimatedNumber(Number(uptime));

  // ================= CHART DATA =================
  const createChartData = (label, data, color) => ({
    labels: metrics.map(m =>
      m?.created_at
        ? new Date(m.created_at).toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata"
          })
        : ""
    ),
    datasets: [
      {
        label,
        data,
        borderColor: color,
        tension: 0.4
      }
    ]
  });

  const chartOptions = {
    maintainAspectRatio: false
  };

  const generateAgentScript = (apiKey) => `
  const axios = require("axios");

  const API_KEY = "${apiKey}";
  const API_URL = "${API_BASE}/metrics";

  setInterval(async () => {
    try {
      await axios.post(API_URL, {
        latency: Math.random() * 400,
        error_rate: Math.random() * 10,
        request_count: 100,
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 100
      }, {
        headers: {
          "x-api-key": API_KEY
        }
      });

      console.log("Metric sent");
    } catch (err) {
      console.error("Error sending metric:", err.message);
    }
  }, 5000);
  `;

  if (!token) return <div>Login required</div>;

  return (
    <div className="app-layout">
      <div className="sidebar">
        <h2 className="brand-title">IntelliMon</h2>

        <div className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
          onClick={() => setActivePage("dashboard")}>
          Dashboard
        </div>

        <div className={`nav-item ${activePage === "alerts" ? "active" : ""}`}
          onClick={() => setActivePage("alerts")}>
          Alerts
        </div>

        <div className={`nav-item ${activePage === "info" ? "active" : ""}`}
          onClick={() => setActivePage("info")}>
          Info
        </div>

        <div
          className={`nav-item ${activePage === "install" ? "active" : ""}`}
          onClick={() => setActivePage("install")}
        >
          Install Agent
        </div>

        <div className="nav-item logout"
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}>
          Logout
        </div>
      </div>

      <div className="main-content">

        {activePage === "dashboard" && (
          <>
            {/* ===== STEP 2: SLA BANNER ===== */}
            {slaBreach && (
              <div className="sla-banner">
                ⚠ SLA Breach Detected — Uptime below 99%
              </div>
            )}

            {/* OVERVIEW KPIs */}
            <div className="kpi-grid">
              <div className="glass-card kpi-card">
                <h4>Total Agents</h4>
                <h2>{overview.totalAgents}</h2>
              </div>

              <div className="glass-card kpi-card">
                <h4>Total Alerts</h4>
                <h2>{overview.totalAlerts}</h2>
              </div>

              <div className="glass-card kpi-card">
                <h4>Avg Latency</h4>
                <h2>{overview.avgLatency.toFixed(2)} ms</h2>
              </div>

              <div className="glass-card kpi-card">
                <h4>Avg Error Rate</h4>
                <h2>{overview.avgErrorRate.toFixed(2)}%</h2>
              </div>
            </div>

            {/* Agent Selector + Status */}
            <div className="agent-bar">
              <select
                value={selectedAgent || ""}
                onChange={(e) => setSelectedAgent(Number(e.target.value))}
                className="agent-dropdown"
              >
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>

              {selectedAgentObj && (
                <div className="agent-status">
                  <span
                    className={`status-dot ${
                      getStatus(selectedAgentObj.last_seen) === "Online"
                        ? "online-dot"
                        : "offline-dot"
                    }`}
                  ></span>

                  <span
                    className={
                      getStatus(selectedAgentObj.last_seen) === "Online"
                        ? "online"
                        : "offline"
                    }
                  >
                    {getStatus(selectedAgentObj.last_seen)}
                  </span>

                  <span className="last-seen">
                    {selectedAgentObj.last_seen
                      ? `Last seen ${Math.floor(
                          (Date.now() -
                            new Date(selectedAgentObj.last_seen).getTime()) /
                            1000
                        )}s ago`
                      : ""}
                  </span>
                </div>
              )}
            </div>

            {/* LIVE KPIs */}
            <div className="kpi-grid">
              <div className={`glass-card kpi-card ${latencyWarning ? "warning-glow" : ""}`}>
                <h4>Latency</h4>
                <h2>{animatedLatency.toFixed(2)} ms</h2>
              </div>

              <div className={`glass-card kpi-card ${cpuDanger ? "danger-glow" : ""}`}>
                <h4>CPU Usage</h4>
                <h2>{animatedCPU.toFixed(0)}%</h2>
              </div>

              <div className={`glass-card kpi-card ${memoryWarning ? "warning-glow" : ""}`}>
                <h4>Memory Usage</h4>
                <h2>{animatedMemory.toFixed(0)}%</h2>
              </div>

              <div className={`glass-card kpi-card ${errorDanger ? "danger-glow" : ""}`}>
                <h4>Error Rate</h4>
                <h2>{animatedError.toFixed(1)}%</h2>
              </div>

              <div className={`glass-card kpi-card ${slaBreach ? "danger-glow" : ""}`}>
                <h4>Uptime</h4>
                <h2>{animatedUptime.toFixed(1)}%</h2>
              </div>
            </div>

            {/* CHARTS (Smaller) */}
            <div className="chart-grid">

              <div className="glass-card chart-card">
                <h2>Latency</h2>
                <Line options={chartOptions}
                  data={createChartData("Latency", metrics.map(m => m.latency), "#00f5ff")}
                />
              </div>

              <div className="glass-card chart-card">
                <h2>CPU Usage</h2>
                <Line options={chartOptions}
                  data={createChartData("CPU", metrics.map(m => m.cpu_usage), "#ff9800")}
                />
              </div>

              <div className="glass-card chart-card">
                <h2>Memory Usage</h2>
                <Line options={chartOptions}
                  data={createChartData("Memory", metrics.map(m => m.memory_usage), "#4caf50")}
                />
              </div>

              <div className="glass-card chart-card">
                <h2>Error Rate</h2>
                <Line options={chartOptions}
                  data={createChartData("Error", metrics.map(m => m.error_rate), "#f44336")}
                />
              </div>

            </div>
          </>
        )}

        {activePage === "alerts" && (
          <div className="glass-card alert-box">
            <h2>All Alerts</h2>
            {alerts.length === 0 && <p>No alerts yet.</p>}
            {alerts.map((a, i) => (
              <div key={i} className="alert-item">
                <strong>{a.metric_type}</strong> — {a.metric_value}
                <span className={`severity-badge ${a.severity?.toLowerCase()}`}>
                  {a.severity}
                </span>
              </div>
            ))}
          </div>
        )}

        {activePage === "info" && (
          <div className="glass-card" style={{ padding: 30 }}>
            <h2>System Information</h2>
            <p><strong>Company ID:</strong> {JSON.parse(atob(token.split('.')[1])).companyId}</p>
            <p><strong>Selected Agent ID:</strong> {selectedAgent}</p>
            <p><strong>Backend URL:</strong> {API_BASE}</p>
            <p><strong>Metrics Stored:</strong> {metrics.length}</p>
            <p><strong>JWT Present:</strong> Yes</p>
          </div>
        )}

        {activePage === "install" && (
          <div className="glass-card" style={{ padding: 30 }}>
            <h2>Install IntelliMon Agent</h2>

            {selectedAgentObj && (
              <>
                <p><strong>Agent Name:</strong> {selectedAgentObj.name}</p>
                <p><strong>Agent ID:</strong> {selectedAgentObj.id}</p>

                <div className="api-key-box">
                  <strong>API Key:</strong><br />
                  {selectedAgentObj.api_key}
                </div>

                <div style={{ marginTop: 20 }}>
                  <strong>Run Command:</strong>
                  <div className="command-box">
                    node intellimon-agent.js --api-key={selectedAgentObj.api_key}
                  </div>
                </div>

                <button
                  style={{ marginTop: 20 }}
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `node intellimon-agent.js --api-key=${selectedAgentObj.api_key}`
                    );
                  }}
                >
                  Copy Command
                </button>

                <button
                  style={{ marginTop: 10 }}
                  onClick={() => {
                    const blob = new Blob([generateAgentScript(selectedAgentObj.api_key)], { type: "text/javascript" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "intellimon-agent.js";
                    a.click();
                  }}
                >
                  Download Agent
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default Dashboard;