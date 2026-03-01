# 🚀 Log Analytics Engine

A real-time log monitoring and analytics system built using:

- **FastAPI (Backend)**
- **React + Vite (Frontend)**
- **WebSockets for Live Streaming**
- **SQLite Database**
- **Async Background Log Monitoring**

---

# 📌 Project Overview

Log Analytics Engine monitors an `access.log` file in real time, parses new entries, stores them in a database, and:

- Streams live logs instantly to frontend
- Generates analytics dashboard data
- Computes traffic statistics
- Calculates error rates
- Allows users to download generated reports

---

# 🏗 System Architecture
Frontend (React)
│
├── REST → /api/analytics
├── REST → /api/download-report
└── WebSocket → /ws/logs
│
Backend (FastAPI)
│
├── Async background task (tail_log)
│ → Monitor access.log
│ → Parse new lines
│ → Insert into SQLite
│ → Broadcast via WebSocket
│
├── /api/analytics
│ → Return aggregated statistics
│
└── /api/download-report
→ Generate report dynamically


---

# ⚙ Backend (FastAPI)

## 📁 Backend Structure
log_backend/
│
├── api.py
├── core/
│ ├── database.py
│ ├── parser.py
│ ├── models.py
│
├── data/
│ ├── logs/access.log
│ ├── log_analytics.db
│ └── reports/

---

## 🔁 Real-Time Log Monitoring

On application startup:

```python
asyncio.create_task(tail_log())

tail_log() performs:

Open access.log

Seek to end of file

Continuously monitor for new lines

Parse each line using LogParser

Insert into SQLite database

Broadcast new log entry via WebSocket

This enables real-time detection without restarting the server.

🌐 WebSocket Endpoint
ws://127.0.0.1:8000/ws/logs
When frontend connects:

Server accepts connection

Keeps connection alive

Sends new log entries instantly

Used for:

Live log streaming

Real-time UI updates



📊 Analytics Endpoint
GET /api/analytics
Returns structured JSON:

Overview statistics

Total requests

Unique IPs

Error rate

Status distribution

Top endpoints

HTTP method distribution

Hourly & daily traffic

Bandwidth per IP

📄 Report Download Endpoint
GET /api/download-report
Generates a dynamic .txt report including:

Total requests

Error rate

Top IPs

Timestamp

Returns downloadable file via:

FileResponse(...)


🎨 Frontend (React + Vite)
📁 Frontend Structure

log_frontend/
│
├── index.html
├── vite.config.js
├── package.json
│
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── hooks/useAnalyticsData.js
    ├── components/
    └── pages/
    🔄 Data Flow in Frontend
1️⃣ Fetch Analytics
fetch("http://127.0.0.1:8000/api/analytics")

Auto-refreshes every few seconds.

2️⃣ WebSocket Live Logs
const ws = new WebSocket("ws://127.0.0.1:8000/ws/logs")

Handles:

onopen

onmessage

onerror

onclose

Updates live log stream in UI.

3️⃣ Report Download
window.open("http://127.0.0.1:8000/api/download-report")

Triggers backend file generation.

🛠 How to Run the Project
🔹 1. Start Backend

Navigate to backend folder:

cd log_backend

Run:

uvicorn api:app --reload --host 0.0.0.0 --port 8000

Server runs at:

http://127.0.0.1:8000
🔹 2. Start Frontend

Navigate to frontend folder:

cd log_frontend

Install dependencies:

npm install

Run:

npm run dev

Frontend runs at:

http://localhost:5173
🧠 Key Concepts Demonstrated

Async background tasks in FastAPI

Real-time WebSocket communication

Log file tailing

SQLite performance optimization

REST + WebSocket hybrid architecture

Frontend real-time updates

Dynamic report generation

🔥 Core Features

✔ Real-time log monitoring
✔ Live dashboard updates
✔ Error rate calculation
✔ Top IP detection
✔ Traffic distribution analysis
✔ Downloadable analytics report
✔ Scalable async architecture

📦 Technologies Used
Backend

FastAPI

Uvicorn

SQLite3

AsyncIO

Frontend

React

Vite

WebSockets

Fetch API

📈 Future Improvements

Add anomaly detection engine

Add authentication

Deploy with Docker

Add JWT security

Add persistent WebSocket reconnection logic

Add graphical charts (Recharts)

👨‍💻 Author

Log Analytics Engine
Built for learning real-time systems, backend architecture, and WebSocket communication.