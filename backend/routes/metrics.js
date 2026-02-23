const express = require("express");
const pool = require("../services/db");
const authenticateToken = require("../middleware/authMiddleware");

module.exports = (io) => {
  const router = express.Router();

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
  router.post("/", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"];

      if (!apiKey) {
        return res.status(401).json({ error: "Agent API key required" });
      }

      const agent = await validateAgent(apiKey);

      if (!agent) {
        return res.status(403).json({ error: "Invalid agent API key" });
      }

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
        return res.status(400).json({ error: "Missing metric fields" });
      }

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

      await pool.query(
        `UPDATE agents SET last_seen = NOW() WHERE id = $1`,
        [agent.agentId]
      );

      const insertedMetric = insertResult.rows[0];

      // Define room BEFORE using it
      const room = `company_${agent.companyId}_agent_${agent.agentId}`;

      // ================= STATISTICAL ANOMALY DETECTION =================
      const history = await pool.query(
        `SELECT latency FROM metrics
         WHERE agent_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [agent.agentId]
      );

      const latencies = history.rows.map(r => r.latency);

      if (latencies.length > 5) {
        const mean =
          latencies.reduce((a, b) => a + b, 0) / latencies.length;

        const variance =
          latencies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
          latencies.length;

        const stdDev = Math.sqrt(variance);

        const zScore =
          stdDev === 0 ? 0 : (latency - mean) / stdDev;

        if (Math.abs(zScore) > 2) {

          const severity =
            Math.abs(zScore) > 3 ? "CRITICAL" : "WARNING";

          const alertInsert = await pool.query(
            `INSERT INTO alerts
             (metric_type, metric_value, anomaly_score, company_id, agent_id)
             VALUES ($1,$2,$3,$4,$5)
             RETURNING *`,
            [
              "latency",
              latency,
              zScore,
              agent.companyId,
              agent.agentId
            ]
          );

          const alertData = {
            ...alertInsert.rows[0],
            severity
          };

          io.to(room).emit("anomaly_alert", alertData);
        }
      }

      // ================= SOCKET EMIT =================
      io.to(room).emit("metric_update", insertedMetric);

      return res.json({ success: true });

    } catch (err) {
      console.error("Metric insert failed:", err);
      return res.status(500).json({ error: "Metric insert failed" });
    }
  });

  // ================= GET HISTORY =================
  router.get("/history/:agentId", authenticateToken, async (req, res) => {
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
  router.get("/alerts/:agentId", authenticateToken, async (req, res) => {
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