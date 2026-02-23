require('dotenv').config();
const pool = require('./services/db');

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const metricsRoute = require('./routes/metrics');
const companyRoutes = require('./routes/company');
const incidentRoutes = require('./routes/incidents');

const app = express();
const server = http.createServer(app);

// ================= SOCKET WITH AUTH =================
const io = new Server(server, {
  cors: { origin: "*" }
});

// Socket JWT Auth
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.companyId = decoded.companyId;

    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

// ================= EXPRESS MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ================= ROUTES =================
app.use('/metrics', metricsRoute(io));
app.use('/company', companyRoutes);
app.use('/incidents', incidentRoutes);

// ================= SOCKET ROOMS =================
io.on('connection', (socket) => {
  console.log("Authenticated client connected:", socket.id);

  socket.on("join_agent_room", ({ agentId }) => {
    if (!agentId || !socket.companyId) return;

    const room = `company_${socket.companyId}_agent_${agentId}`;
    socket.join(room);

    console.log(`Joined secure room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ================= HEALTH CHECK =================
app.get('/', (req, res) => {
  res.json({ message: "IntelliMon Backend Running Successfully" });
});

const PORT = 5000;

server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

  try {
    // ================= TABLES =================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        api_key VARCHAR(255) UNIQUE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        api_key VARCHAR(255) UNIQUE,
        company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure last_seen exists (for existing DBs)
    await pool.query(`
      ALTER TABLE agents
      ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        latency FLOAT,
        error_rate FLOAT,
        request_count INT,
        cpu_usage FLOAT,
        memory_usage FLOAT,
        company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        agent_id INT REFERENCES agents(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        metric_type VARCHAR(50),
        metric_value FLOAT,
        anomaly_score FLOAT,
        company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        agent_id INT REFERENCES agents(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Database ready");

    // ================= METRIC RETENTION CLEANUP =================
    setInterval(async () => {
      try {
        await pool.query(`
          DELETE FROM metrics
          WHERE created_at < NOW() - INTERVAL '1 hour'
        `);

        console.log("Old metrics cleaned");
      } catch (err) {
        console.error("Retention cleanup failed:", err.message);
      }
    }, 300000); // every 5 minutes

  } catch (err) {
    console.error("DB Error:", err.message);
  }
});