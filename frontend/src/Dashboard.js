import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import "./App.css";

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

  // ================= REFRESH AGENT HEARTBEAT =================
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      fetch(`${API_BASE}/company/agents`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setAgents(data));
    }, 5000); // refresh every 5 seconds

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
    });

    return () => socket.disconnect();
  }, [selectedAgent, token]);

  if (!token) return <div>Login required</div>;

  const latest = metrics.length ? metrics[metrics.length - 1] : null;
  const selectedAgentObj = agents.find(a => a.id === selectedAgent);

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

  return (
    <div className="app-layout">
      <div className="sidebar">
        <h2 className="brand-title">IntelliMon</h2>

        <div
          className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
          onClick={() => setActivePage("dashboard")}
        >
          Dashboard
        </div>

        <div
          className={`nav-item ${activePage === "alerts" ? "active" : ""}`}
          onClick={() => setActivePage("alerts")}
        >
          Alerts
        </div>

        <div
          className={`nav-item ${activePage === "info" ? "active" : ""}`}
          onClick={() => setActivePage("info")}
        >
          Info
        </div>

        <div
          className="nav-item logout"
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
        >
          Logout
        </div>
      </div>

      <div className="main-content">

        {activePage === "dashboard" && (
          <>
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

            <div style={{ margin: "20px 0" }}>
              <select
                value={selectedAgent || ""}
                onChange={(e) => setSelectedAgent(Number(e.target.value))}
                style={{ padding: 10 }}
              >
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>

              {selectedAgentObj && (
                <span style={{ marginLeft: 20 }}>
                  Status:{" "}
                  <strong className={
                    getStatus(selectedAgentObj.last_seen) === "Online"
                      ? "online"
                      : "offline"
                  }>
                    {getStatus(selectedAgentObj.last_seen)}
                  </strong>
                </span>
              )}
            </div>

            <div className="kpi-grid">
              <div className="glass-card kpi-card">
                <h4>Latency</h4>
                <h2>{latest ? latest.latency.toFixed(2) : 0} ms</h2>
              </div>

              <div className="glass-card kpi-card">
                <h4>CPU Usage</h4>
                <h2>{latest ? latest.cpu_usage : 0}%</h2>
              </div>

              <div className="glass-card kpi-card">
                <h4>Memory Usage</h4>
                <h2>{latest ? latest.memory_usage : 0}%</h2>
              </div>

              <div className="glass-card kpi-card">
                <h4>Error Rate</h4>
                <h2>{latest ? latest.error_rate : 0}%</h2>
              </div>
            </div>

            <div className="glass-card chart-card">
              <h2>Latency</h2>
              <Line data={createChartData("Latency", metrics.map(m => m.latency), "#00f5ff")} />
            </div>

            <div className="glass-card chart-card">
              <h2>CPU Usage</h2>
              <Line data={createChartData("CPU", metrics.map(m => m.cpu_usage), "#ff9800")} />
            </div>

            <div className="glass-card chart-card">
              <h2>Memory Usage</h2>
              <Line data={createChartData("Memory", metrics.map(m => m.memory_usage), "#4caf50")} />
            </div>

            <div className="glass-card chart-card">
              <h2>Error Rate</h2>
              <Line data={createChartData("Error", metrics.map(m => m.error_rate), "#f44336")} />
            </div>
          </>
        )}

        {/* ================= ALERTS ================= */}
        {activePage === "alerts" && (
          <div className="glass-card alert-box">
            <h2>All Alerts</h2>
            {alerts.length === 0 && <p>No alerts yet.</p>}
            {alerts.map((a, i) => (
              <div key={i} className="alert-item">
                <strong>{a.metric_type}</strong> — {a.metric_value}
              </div>
            ))}
          </div>
        )}

        {/* ================= INFO TAB ================= */}
        {activePage === "info" && (
          <div className="glass-card" style={{ padding: 30 }}>
            <h2>System Information</h2>

            <p><strong>Company ID:</strong> {token ? JSON.parse(atob(token.split('.')[1])).companyId : "N/A"}</p>

            <p><strong>Selected Agent ID:</strong> {selectedAgent || "N/A"}</p>

            <p><strong>Backend URL:</strong> {API_BASE}</p>

            <p><strong>Metrics Stored:</strong> {metrics.length}</p>

            <p><strong>JWT Present:</strong> {token ? "Yes" : "No"}</p>

            <p><strong>Socket Status:</strong> Connected (if dashboard active)</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;