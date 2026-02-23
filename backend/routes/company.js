const express = require('express');
const router = express.Router();
const pool = require('../services/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/authMiddleware');

// ================= REGISTER =================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const companyApiKey = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      `INSERT INTO companies (name, email, password, api_key)
       VALUES ($1,$2,$3,$4)
       RETURNING id`,
      [name, email, hashedPassword, companyApiKey]
    );

    const companyId = result.rows[0].id;

    const agentApiKey = crypto.randomBytes(32).toString('hex');

    await pool.query(
      `INSERT INTO agents (name, api_key, company_id)
       VALUES ($1,$2,$3)`,
      ['default-agent', agentApiKey, companyId]
    );

    res.json({ message: "Registered successfully" });

  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// ================= LOGIN =================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT * FROM companies WHERE email=$1`,
      [email]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const company = result.rows[0];

    const valid = await bcrypt.compare(password, company.password);
    if (!valid)
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { companyId: company.id },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ token });

  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// ================= GET AGENTS =================
router.get('/agents', authenticateToken, async (req, res) => {
  try {
    const companyId = req.company.companyId;

    const result = await pool.query(
      `SELECT id, name, api_key, last_seen
       FROM agents
       WHERE company_id=$1`,
      [companyId]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

// ================= INFO ENDPOINT =================
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const companyId = req.company.companyId;

    const company = await pool.query(
      `SELECT id, name, email, api_key
       FROM companies
       WHERE id=$1`,
      [companyId]
    );

    const agents = await pool.query(
      `SELECT id, name, api_key, last_seen
       FROM agents
       WHERE company_id=$1`,
      [companyId]
    );

    res.json({
      company: company.rows[0],
      agents: agents.rows
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch info" });
  }
});

// ================= COMPANY OVERVIEW =================
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const companyId = req.company.companyId;

    const agentCount = await pool.query(
      `SELECT COUNT(*) FROM agents WHERE company_id=$1`,
      [companyId]
    );

    const alertCount = await pool.query(
      `SELECT COUNT(*) FROM alerts WHERE company_id=$1`,
      [companyId]
    );

    const avgMetrics = await pool.query(
      `SELECT AVG(latency) as avg_latency,
              AVG(error_rate) as avg_error
       FROM metrics
       WHERE company_id=$1`,
      [companyId]
    );

    res.json({
      totalAgents: Number(agentCount.rows[0].count) || 0,
      totalAlerts: Number(alertCount.rows[0].count) || 0,
      avgLatency: Number(avgMetrics.rows[0].avg_latency) || 0,
      avgErrorRate: Number(avgMetrics.rows[0].avg_error) || 0
    });

  } catch (err) {
    console.error("Overview error:", err);
    res.status(500).json({ error: "Overview fetch failed" });
  }
});

module.exports = router;