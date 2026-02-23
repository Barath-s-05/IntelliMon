const express = require('express');
const router = express.Router();
const pool = require('../services/db');
const authenticateToken = require('../middleware/authMiddleware');

// ================= GET ALL INCIDENTS =================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const companyId = req.company.companyId;

    const result = await pool.query(
      `SELECT i.id, i.title, i.severity, i.status,
              i.created_at, i.resolved_at,
              a.name AS agent_name
       FROM incidents i
       JOIN agents a ON i.agent_id = a.id
       WHERE i.company_id=$1
       ORDER BY i.created_at DESC`,
      [companyId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("INCIDENT FETCH ERROR:", err);
    res.status(500).json({ error: "Incident fetch failed" });
  }
});

// ================= RESOLVE INCIDENT =================
router.patch('/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const companyId = req.company.companyId;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE incidents
       SET status='RESOLVED',
           resolved_at=NOW()
       WHERE id=$1 AND company_id=$2
       RETURNING *`,
      [id, companyId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Incident not found" });

    res.json({ success: true, incident: result.rows[0] });

  } catch (err) {
    console.error("INCIDENT RESOLVE ERROR:", err);
    res.status(500).json({ error: "Incident resolve failed" });
  }
});

module.exports = router;