require('dotenv').config();
const pool = require('./services/db');

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const metricsRoute = require('./routes/metrics');
const companyRoutes = require('./routes/company');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

app.use('/metrics', metricsRoute(io));
app.use('/company', companyRoutes);

// ================= SOCKET ROOMS =================
io.on('connection', (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join_room", ({ companyId, agentId }) => {
    const room = `room_${companyId}_${agentId}`;
    socket.join(room);
    console.log(`Joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log("Client disconnected:", socket.id);
  });
});

app.get('/', (req, res) => {
  res.json({ message: "IntelliMon Backend Running Successfully" });
});

const PORT = 5000;

server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        api_key VARCHAR(255) UNIQUE,
        company_id INT REFERENCES companies(id) ON DELETE CASCADE
      );
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

  } catch (err) {
    console.error("DB Error:", err.message);
  }
});