# 🚀 IntelliMon

**IntelliMon** is a full-stack monitoring and incident management system designed for companies to track system health, detect anomalies, and manage operational incidents through a secure dashboard.

It features JWT-based authentication, modular backend services, simulated metric generation, anomaly detection logic, and cloud deployment using modern DevOps practices.

---

## 🌐 Live Deployment

- **Frontend (Vercel):**  
  https://your-frontend.vercel.app  

- **Backend (Render):**  
  https://intellimon.onrender.com  

---

## 🏗️ System Architecture


User
↓
React Frontend (Vercel)
↓
Node + Express Backend (Render)
↓
PostgreSQL Database (Neon)
↓
Monitoring Services & Simulator


---

## 🛠️ Tech Stack

### Frontend
- React.js
- Custom Hooks
- Fetch API
- CSS (Glass UI)
- Environment-based API configuration
- Hosted on Vercel

### Backend
- Node.js
- Express.js
- JWT Authentication
- PostgreSQL (Neon DB)
- Modular Service Architecture
- Hosted on Render

---

## 🔐 Features

- Company Registration & Login
- JWT-based authentication
- Protected API routes
- Real-time metric simulation
- Incident creation & tracking
- Anomaly detection service
- Health monitoring service
- Modular backend architecture

---

## 🔌 API Endpoints

### Authentication

POST /company/register
POST /company/login


### Metrics

GET /metrics
POST /metrics


### Incidents

GET /incidents
POST /incidents


---

## ⚙️ Environment Variables

### Backend (Render)


DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_secret_key
PORT=5000


### Frontend (Vercel)


REACT_APP_API_URL=https://intellimon.onrender.com


⚠️ Note:  
Environment variables must be configured in the respective hosting platform dashboards (Render & Vercel).

---

## 🛠️ Running Locally

### 1️⃣ Clone the Repository


git clone https://github.com/your-username/IntelliMon.git

cd IntelliMon


---

### 2️⃣ Run Backend


cd backend
npm install
npm start


Backend runs at:

http://localhost:5000


---

### 3️⃣ Run Frontend


cd frontend
npm install
npm start


Frontend runs at:

http://localhost:3000


---

## 🔄 Application Flow

1. Company registers or logs in
2. Backend generates JWT token
3. Token stored in localStorage
4. Authenticated requests sent to backend
5. Simulator generates system metrics
6. Anomaly service evaluates metrics
7. Incidents generated when thresholds are crossed
8. Dashboard visualizes metrics and incidents

---

## 🚀 Deployment Strategy

- Frontend deployed on **Vercel**
- Backend deployed on **Render**
- PostgreSQL database hosted on **Neon**
- Environment-based configuration for production safety

---

## 🔮 Future Enhancements

- Real-time updates using WebSockets
- Role-based access control
- Email/SMS alert notifications
- ML-based anomaly detection
- Multi-tenant company isolation
- CI/CD automation

---

## 👨‍💻 Author

**Barath S**  
Computer Science Student  
Full Stack Developer  

---

## 📄 License

This project is for educational and demonstration purposes.
