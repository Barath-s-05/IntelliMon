const express = require('express');
const router = express.Router();
const pool = require('../services/db');
const { calculateZScore, isAnomaly } = require('../services/anomalyService');

module.exports = (io) => {

  const validateAgent = async (apiKey) => {
    const result = await pool.query(
      `SELECT id, company_id FROM agents WHERE api_key = $1`,
      [apiKey]
    );

    if (result.rows.length === 0) return null;

    return {
      agentId: result.rows[0].id,
      companyId: result.rows[0].company_id
    };
  };

  const validateCompany = async (apiKey) => {
    const result = await pool.query(
      `SELECT id FROM companies WHERE api_key = $1`,
      [apiKey]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0].id;
  };

  // ===============================
  // POST METRICS
  // ===============================
  router.post('/', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) return res.status(401).json({ error: "Agent API key required" });

      const agent = await validateAgent(apiKey);
      if (!agent) return res.status(403).json({ error: "Invalid agent API key" });

      const {
        latency,
        error_rate,
        request_count,
        cpu_usage,
        memory_usage
      } = req.body;

      await pool.query(
        `INSERT INTO metrics 
         (latency, error_rate, request_count, cpu_usage, memory_usage, company_id, agent_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
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

      const recent = await pool.query(
        `SELECT latency, error_rate
         FROM metrics
         WHERE agent_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [agent.agentId]
      );

      const latencyValues = recent.rows.map(r => r.latency);
      const errorValues = recent.rows.map(r => r.error_rate);

      const latencyZ = calculateZScore(latencyValues, latency);
      const errorZ = calculateZScore(errorValues, error_rate);

      const room = `room_${agent.companyId}_${agent.agentId}`;

      // Latency alert
      if (isAnomaly(latency, latencyZ)) {
        await pool.query(
          `INSERT INTO alerts
           (metric_type, metric_value, anomaly_score, company_id, agent_id)
           VALUES ($1,$2,$3,$4,$5)`,
          ['latency', latency, latencyZ, agent.companyId, agent.agentId]
        );

        io.to(room).emit("anomaly_alert", {
          metric_type: 'latency',
          metric_value: latency,
          anomaly_score: latencyZ,
          created_at: new Date()
        });
      }

      // Error alert
      if (isAnomaly(error_rate, errorZ)) {
        await pool.query(
          `INSERT INTO alerts
           (metric_type, metric_value, anomaly_score, company_id, agent_id)
           VALUES ($1,$2,$3,$4,$5)`,
          ['error_rate', error_rate, errorZ, agent.companyId, agent.agentId]
        );

        io.to(room).emit("anomaly_alert", {
          metric_type: 'error_rate',
          metric_value: error_rate,
          anomaly_score: errorZ,
          created_at: new Date()
        });
      }

      // Emit metric
      io.to(room).emit("metric_update", {
        latency,
        error_rate,
        request_count,
        cpu_usage,
        memory_usage,
        created_at: new Date()
      });

      res.json({ success: true });

    } catch (err) {
      console.error("Metric insert error:", err);
      res.status(500).json({ error: "Metric insert failed" });
    }
  });

  // ===============================
  // GET HISTORY
  // ===============================
  router.get('/history/:agentId', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      const { agentId } = req.params;

      const companyId = await validateCompany(apiKey);
      if (!companyId) return res.status(403).json({ error: "Invalid company API key" });

      const result = await pool.query(
        `SELECT latency, error_rate, request_count,
                cpu_usage, memory_usage, created_at
         FROM metrics
         WHERE company_id = $1
         AND agent_id = $2
         ORDER BY created_at DESC
         LIMIT 50`,
        [companyId, agentId]
      );

      res.json(result.rows.reverse());

    } catch (err) {
      res.status(500).json({ error: "History fetch failed" });
    }
  });

  // ===============================
  // GET ALERTS
  // ===============================
  router.get('/alerts/:agentId', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      const { agentId } = req.params;

      const companyId = await validateCompany(apiKey);
      if (!companyId) return res.status(403).json({ error: "Invalid company API key" });

      const result = await pool.query(
        `SELECT metric_type, metric_value,
                anomaly_score, created_at
         FROM alerts
         WHERE company_id = $1
         AND agent_id = $2
         ORDER BY created_at DESC
         LIMIT 20`,
        [companyId, agentId]
      );

      res.json(result.rows);

    } catch (err) {
      res.status(500).json({ error: "Alert fetch failed" });
    }
  });

  return router;
};