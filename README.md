# 🚀 Log Analytics Engine

A real-time log monitoring and analytics system built using **FastAPI**, **React**, **WebSockets**, and **SQLite**. This system tails a server log file, parses entries in the background, streams them to a dashboard instantly, and provides historical analytics.

---

## 📌 Project Overview

The **Log Analytics Engine** monitors an `access.log` file in real time. It utilizes an asynchronous background task to parse new log entries and store them in a SQLite database. 

**Key Capabilities:**
- 📡 **Live Streaming:** Pushes new log entries to the frontend via WebSockets.
- 📊 **Analytics Dashboard:** Visualizes traffic stats, error rates, and top endpoints.
- 📂 **Report Generation:** Allows users to download processed log reports.
- ⚡ **High Performance:** Uses `aiofiles` and non-blocking I/O for efficient log tailing.

---

## 🏗 System Architecture

```mermaid
graph TD
    User[User / Browser]
    LogFile[access.log]
    
    subgraph Frontend [React + Vite]
        UI[Dashboard UI]
        WS_Client[WebSocket Client]
        API_Client[Fetch API]
    end

    subgraph Backend [FastAPI]
        API[REST Endpoints]
        WS_Server[WebSocket Endpoint]
        BgTask[Async Tail Task]
        DB[(SQLite Database)]
    end

    User --> UI
    UI --> API_Client
    UI --> WS_Client
    
    API_Client --> API
    WS_Client <--> WS_Server
    
    BgTask -->|Monitor & Parse| LogFile
    BgTask -->|Insert| DB
    BgTask -->|Broadcast| WS_Server
    API -->|Query Stats| DB
    API -->|Generate File| User

📦 Technologies Used
Backend

    Framework: FastAPI

    Server: Uvicorn

    Database: SQLite3

    Concurrency: Python AsyncIO

    Protocol: WebSockets

Frontend

    Framework: React.js

    Build Tool: Vite

    Styling: CSS Modules / Standard CSS

    State Management: React Hooks

⚙️ Backend Structure
code Text

backend/
│
├── main.py             # Entry point (API, WebSocket, DB, Tailing logic)
├── log_generator.py    # Script to simulate fake server traffic
├── requirements.txt    # Python dependencies
├── access.log          # Target log file (auto-created)
└── log_analytics.db    # SQLite database (auto-created)

🎨 Frontend Structure
code Text

frontend/
│
├── src/
│   ├── App.jsx         # Main Dashboard Component
│   ├── App.css         # Dashboard Styling
│   └── main.jsx        # React Entry point
├── vite.config.js      # Vite Configuration
└── package.json        # Node dependencies

🚀 Getting Started
Prerequisites

    Python 3.8+

    Node.js 16+ & npm

1️⃣ Setup Backend

    Navigate to the backend folder:
    code Bash

    cd backend

    Create a virtual environment (optional but recommended):
    code Bash

    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate

    Install dependencies:
    code Bash

    pip install -r requirements.txt

    Start the server:
    code Bash

    uvicorn main:app --reload --host 0.0.0.0 --port 8000

    The API will be available at http://127.0.0.1:8000

2️⃣ Generate Traffic (Optional)

To see the dashboard light up with data, run the log generator in a separate terminal:
code Bash

cd backend
python log_generator.py

3️⃣ Setup Frontend

    Navigate to the frontend folder:
    code Bash

    cd frontend

    Install dependencies:
    code Bash

    npm install

    Start the development server:
    code Bash

    npm run dev

    Open your browser at http://localhost:5173

📡 API Endpoints
REST API
Method	Endpoint	Description
GET	/api/analytics	Returns aggregated stats (Total requests, Error rate, etc.)
GET	/api/download-report	Generates and downloads a .txt summary report
WebSocket
Protocol	Endpoint	Description
WS	/ws/logs	Real-time stream of parsed log lines
🧠 Key Concepts Demonstrated

    Async Background Tasks: Using asyncio.create_task to run the tail_log() function concurrently with the API server.

    WebSocket Broadcasting: Maintaining a list of active connections and broadcasting data instantly when a file change is detected.

    Log Parsing: Using Regex to parse raw Apache/Nginx style log lines into structured JSON objects.

    Hybrid Architecture: Combining standard REST API calls (for historical data) with WebSockets (for live updates).

📈 Future Improvements

    Add JWT Authentication for the dashboard.

    Implement detailed charts using Recharts or Chart.js.

    Dockerize the application for easy deployment.

    Add Anomaly Detection (alerting on high error rates).

👨‍💻 Author

Log Analytics Engine
Built for learning real-time systems, backend architecture, and WebSocket communication.
