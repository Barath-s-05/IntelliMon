const express = require('express');
const pool = require('../services/db');
const authenticateToken = require('../middleware/authMiddleware');
const { calculateZScore, detectAnomaly } = require('../services/anomalyService');
const { calculateHealthScore } = require('../services/healthService');

module.exports = (io) => {
  const router = express.Router(); // ✅ define router INSIDE factory

  // ================= VALIDATE AGENT =================
  const validateAgent = async (apiKey) => {
    try {
      const result = await pool.query(
        `SELECT id, company_id FROM agents WHERE api_key = $1`,
        [apiKey]
      );

      if (result.rows.length === 0) return null;

      return {
        agentId: result.rows[0].id,
        companyId: result.rows[0].company_id
      };
    } catch (err) {
      console.error("Agent validation error:", err);
      return null;
    }
  };

  // ================= POST METRICS =================
  router.post('/', async (req, res) => {
    console.log("➡️  /metrics hit");

    try {
      const apiKey = req.headers['x-api-key'];

      if (!apiKey) {
        console.log("❌ No API key provided");
        return res.status(401).json({ error: "Agent API key required" });
      }

      const agent = await validateAgent(apiKey);

      if (!agent) {
        console.log("❌ Invalid API key");
        return res.status(403).json({ error: "Invalid agent API key" });
      }

      console.log("✅ Agent validated:", agent);

      const {
        latency,
        error_rate,
        request_count,
        cpu_usage,
        memory_usage
      } = req.body;

      if (
        latency == null ||
        error_rate == null ||
        request_count == null ||
        cpu_usage == null ||
        memory_usage == null
      ) {
        console.log("❌ Missing metric fields");
        return res.status(400).json({ error: "Missing metric fields" });
      }

      console.log("📥 Inserting metric...");

      const insertResult = await pool.query(
        `INSERT INTO metrics 
         (latency, error_rate, request_count, cpu_usage, memory_usage, company_id, agent_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING latency, error_rate, request_count, cpu_usage, memory_usage, created_at`,
        [
          latency,
          error_rate,
          request_count,
          cpu_usage,
          memory_usage,
          agent.companyId,
          agent.agentId
        ]
      );
      // Update agent heartbeat
      await pool.query(
        `UPDATE agents SET last_seen = NOW() WHERE id = $1`,
        [agent.agentId]
      );

      const insertedMetric = insertResult.rows[0];

      console.log("✅ Metric inserted");

      // ================= SOCKET EMIT =================
      const room = `company_${agent.companyId}_agent_${agent.agentId}`;
      io.to(room).emit("metric_update", insertedMetric);

      console.log("📡 Socket emitted to:", room);

      return res.json({ success: true });

    } catch (err) {
      console.error("🔥 METRIC ERROR:", err);
      return res.status(500).json({ error: "Metric insert failed" });
    }
  });

  // ================= GET HISTORY =================
  router.get('/history/:agentId', authenticateToken, async (req, res) => {
    try {
      const companyId = req.company.companyId;
      const { agentId } = req.params;

      const result = await pool.query(
        `SELECT latency, error_rate, request_count,
                cpu_usage, memory_usage, created_at
         FROM metrics
         WHERE company_id=$1 AND agent_id=$2
         ORDER BY created_at DESC
         LIMIT 50`,
        [companyId, agentId]
      );

      return res.json(result.rows.reverse());

    } catch (err) {
      console.error("History fetch error:", err);
      return res.status(500).json({ error: "History fetch failed" });
    }
  });

  // ================= GET ALERTS =================
  router.get('/alerts/:agentId', authenticateToken, async (req, res) => {
    try {
      const companyId = req.company.companyId;
      const { agentId } = req.params;

      const result = await pool.query(
        `SELECT metric_type, metric_value,
                anomaly_score, created_at
         FROM alerts
         WHERE company_id=$1 AND agent_id=$2
         ORDER BY created_at DESC
         LIMIT 20`,
        [companyId, agentId]
      );

      return res.json(result.rows);

    } catch (err) {
      console.error("Alert fetch error:", err);
      return res.status(500).json({ error: "Alert fetch failed" });
    }
  });

  return router;
};