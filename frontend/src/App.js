import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import "./App.css";

const API_BASE = "http://localhost:5000";

function App() {
  const apiKey = localStorage.getItem("apiKey");
  const companyId = localStorage.getItem("companyId");
  const agentApiKey = localStorage.getItem("agentApiKey");

  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activePage, setActivePage] = useState("dashboard");

  // ================= LOAD AGENTS =================
  useEffect(() => {
    if (!apiKey) return;

    fetch(`${API_BASE}/company/agents`, {
      headers: { "x-api-key": apiKey }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAgents(data);
          if (data.length > 0) {
            setSelectedAgent(data[0].id);
          }
        }
      })
      .catch(() => setAgents([]));
  }, [apiKey]);

  // ================= SOCKET + DATA =================
  useEffect(() => {
    if (!selectedAgent || !apiKey || !companyId) return;

    const socket = io(API_BASE);

    socket.emit("join_room", {
      companyId,
      agentId: selectedAgent
    });

    fetch(`${API_BASE}/metrics/history/${selectedAgent}`, {
      headers: { "x-api-key": apiKey }
    })
      .then(res => res.json())
      .then(data => {
        setMetrics(Array.isArray(data) ? data : []);
      });

    fetch(`${API_BASE}/metrics/alerts/${selectedAgent}`, {
      headers: { "x-api-key": apiKey }
    })
      .then(res => res.json())
      .then(data => {
        setAlerts(Array.isArray(data) ? data : []);
      });

    socket.on(
      `metric_update_${companyId}_${selectedAgent}`,
      (data) => {
        setMetrics(prev => [...prev.slice(-49), data]);
      }
    );

    socket.on(
      `anomaly_alert_${companyId}_${selectedAgent}`,
      (alert) => {
        setAlerts(prev => [alert, ...prev]);
      }
    );

    return () => socket.disconnect();
  }, [selectedAgent, apiKey, companyId]);

  if (!apiKey) return <div>Login required</div>;

  const latest = metrics.length ? metrics[metrics.length - 1] : null;

  const createChartData = (label, data, color) => ({
    labels: metrics.map(m =>
      new Date(m.created_at).toLocaleTimeString()
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
        <h2>IntelliMon</h2>

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
          className={`nav-item ${activePage === "settings" ? "active" : ""}`}
          onClick={() => setActivePage("settings")}
        >
          Settings
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
            <select
              value={selectedAgent || ""}
              onChange={(e) => setSelectedAgent(Number(e.target.value))}
              style={{ marginBottom: 20, padding: 10 }}
            >
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>

            <div className="kpi-grid">
              <div className="glass-card kpi-card">
                <h4>Latency</h4>
                <h2>{latest ? latest.latency.toFixed(2) : 0} ms</h2>
              </div>

              <div className="glass-card kpi-card">
                <h4>Error Rate</h4>
                <h2>{latest ? latest.error_rate : 0}%</h2>
              </div>

              <div className="glass-card kpi-card">
                <h4>CPU Usage</h4>
                <h2>{latest ? latest.cpu_usage : 0}%</h2>
              </div>

              <div className="glass-card kpi-card">
                <h4>Memory Usage</h4>
                <h2>{latest ? latest.memory_usage : 0}%</h2>
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
              <Line data={createChartData("Error Rate", metrics.map(m => m.error_rate), "#f44336")} />
            </div>
          </>
        )}

        {activePage === "alerts" && (
          <div className="glass-card alert-box">
            <h2>All Alerts</h2>
            {alerts.length === 0 && <p>No alerts yet</p>}
            {alerts.map((a, i) => (
              <div key={i} className="alert-item">
                <strong>{a.metric_type}</strong> — {a.metric_value}
              </div>
            ))}
          </div>
        )}

        {activePage === "settings" && (
          <div className="glass-card">
            <h2>Workspace Settings</h2>
            <p><strong>Company ID:</strong> {companyId}</p>
            <p><strong>Agent API Key:</strong></p>
            <div className="api-key-box">{agentApiKey}</div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;