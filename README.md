🚀 IntelliMon

IntelliMon is a full-stack monitoring and incident management system built for companies to track system health, detect anomalies, and manage incidents through a secure dashboard.

It includes authentication, metrics tracking, anomaly detection services, and a simulated monitoring engine.

🌐 Live Deployment

Frontend (Vercel):
https://your-frontend.vercel.app

Backend (Render):
https://intellimon.onrender.com

🏗️ Architecture Overview
Frontend (React - Vercel)
        ↓
Backend (Node + Express - Render)
        ↓
PostgreSQL Database (Neon)
        ↓
Monitoring Services & Simulator
🛠️ Tech Stack
Frontend

React.js

Custom Hooks

Glass UI Styling

Fetch API

Environment-based API configuration

Hosted on Vercel

Backend

Node.js

Express.js

JWT Authentication

PostgreSQL (Neon)

Modular service architecture

Hosted on Render

📁 Project Structure
INTELLIMON
│
├── backend
│   ├── middleware
│   │   └── authMiddleware.js
│   │
│   ├── routes
│   │   ├── company.js
│   │   ├── incidents.js
│   │   └── metrics.js
│   │
│   ├── services
│   │   ├── anomalyService.js
│   │   ├── db.js
│   │   └── healthService.js
│   │
│   ├── simulator.js
│   ├── server.js
│   ├── .env
│   └── package.json
│
├── frontend
│   ├── src
│   │   ├── hooks
│   │   ├── Auth.js
│   │   ├── Dashboard.js
│   │   └── App.js
│   │
│   ├── .env.production
│   └── package.json
🔐 Features

Company Registration & Login

JWT-based authentication

Protected API routes

Real-time metric simulation

Incident logging

Anomaly detection service

Health monitoring service

Modular backend design

🔄 Core Backend Modules
authMiddleware.js

Validates JWT token for protected routes.

company.js

Handles:

Company registration

Login

Token generation

metrics.js

Handles:

Metrics ingestion

Metrics retrieval

incidents.js

Handles:

Incident creation

Incident retrieval

anomalyService.js

Implements anomaly detection logic on system metrics.

healthService.js

Tracks system health state.

simulator.js

Simulates system metrics for testing and demo purposes.

⚙️ Environment Variables
Backend (Render)
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_secret_key
PORT=5000
Frontend (Vercel)
REACT_APP_API_URL=https://intellimon.onrender.com

Important:
For Vercel, environment variables must be added in the Vercel dashboard.

🛠️ Running Locally
Clone Repository
git clone https://github.com/your-username/IntelliMon.git
cd IntelliMon
Run Backend
cd backend
npm install
npm start

Runs on:

http://localhost:5000
Run Frontend
cd frontend
npm install
npm start

Runs on:

http://localhost:3000
🔌 API Endpoints
Authentication
POST /company/register
POST /company/login
Metrics
GET /metrics
POST /metrics
Incidents
GET /incidents
POST /incidents
🚀 Deployment Strategy

Frontend:

Hosted on Vercel

Environment variables set in Vercel dashboard

Backend:

Hosted on Render

Environment variables configured in Render

Free tier may sleep after inactivity

🧠 System Flow

Company logs in

JWT token stored in localStorage

Authenticated requests sent to backend

Simulator generates metrics

Anomaly service evaluates metrics

Incidents generated if thresholds crossed

Dashboard visualizes data

🔮 Future Improvements

WebSocket real-time streaming

Role-based access control

Alert notifications (Email / Slack)

ML-based anomaly detection

Multi-tenant isolation

Production monitoring integrations

👨‍💻 Author

Barath S
Computer Science Student
Full Stack Developer
