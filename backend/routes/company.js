const express = require('express');
const router = express.Router();
const pool = require('../services/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');


// =====================================================
// REGISTER COMPANY
// =====================================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const companyApiKey = crypto.randomBytes(32).toString('hex');

    // Create company
    const companyResult = await pool.query(
      `INSERT INTO companies (name, email, password, api_key)
       VALUES ($1, $2, $3, $4)
       RETURNING id, api_key`,
      [name, email, hashedPassword, companyApiKey]
    );

    const companyId = companyResult.rows[0].id;

    // Create default agent
    const agentApiKey = crypto.randomBytes(32).toString('hex');

    await pool.query(
      `INSERT INTO agents (name, api_key, company_id)
       VALUES ($1, $2, $3)`,
      ['default-agent', agentApiKey, companyId]
    );

    res.json({
      apiKey: companyApiKey,
      companyId: companyId,
      agentApiKey: agentApiKey
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: "Email already registered" });
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});


// =====================================================
// LOGIN COMPANY
// =====================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT * FROM companies WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const company = result.rows[0];

    const valid = await bcrypt.compare(password, company.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Get first agent for this company
    const agentResult = await pool.query(
      `SELECT api_key FROM agents WHERE company_id = $1 LIMIT 1`,
      [company.id]
    );

    res.json({
      apiKey: company.api_key,
      companyId: company.id,
      agentApiKey: agentResult.rows.length
        ? agentResult.rows[0].api_key
        : null
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});


// =====================================================
// GET ALL AGENTS (SECURE)
// =====================================================
router.get('/agents', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: "Company API key required" });
    }

    const companyResult = await pool.query(
      `SELECT id FROM companies WHERE api_key = $1`,
      [apiKey]
    );

    if (companyResult.rows.length === 0) {
      return res.status(403).json({ error: "Invalid company API key" });
    }

    const companyId = companyResult.rows[0].id;

    const agentsResult = await pool.query(
      `SELECT id, name, api_key
       FROM agents
       WHERE company_id = $1
       ORDER BY id ASC`,
      [companyId]
    );

    res.json(agentsResult.rows);

  } catch (err) {
    console.error("Fetch agents error:", err);
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});


// =====================================================
// CREATE NEW AGENT (OPTIONAL FEATURE)
// =====================================================
router.post('/agents/create', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const { name } = req.body;

    if (!apiKey || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const companyResult = await pool.query(
      `SELECT id FROM companies WHERE api_key = $1`,
      [apiKey]
    );

    if (companyResult.rows.length === 0) {
      return res.status(403).json({ error: "Invalid company API key" });
    }

    const companyId = companyResult.rows[0].id;
    const agentApiKey = crypto.randomBytes(32).toString('hex');

    const newAgent = await pool.query(
      `INSERT INTO agents (name, api_key, company_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, api_key`,
      [name, agentApiKey, companyId]
    );

    res.json(newAgent.rows[0]);

  } catch (err) {
    console.error("Create agent error:", err);
    res.status(500).json({ error: "Agent creation failed" });
  }
});


module.exports = router;