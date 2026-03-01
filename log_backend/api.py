import asyncio
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from core.database import DatabaseManager
from core.parser import LogParser

app = FastAPI()

# -------------------------------
# WebSocket Manager
# -------------------------------

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except:
                self.disconnect(connection)

manager = ConnectionManager()

# -------------------------------
# WebSocket Endpoint
# -------------------------------

@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await manager.connect(websocket)
    print("WebSocket connected")

    try:
        while True:
            await asyncio.sleep(60)
    except WebSocketDisconnect:
        print("WebSocket disconnected")
        manager.disconnect(websocket)

# -------------------------------
# Async Log Tailer (NO THREADS)
# -------------------------------

LOG_FILE = Path("data/logs/access.log")

async def tail_log():
    parser = LogParser(LOG_FILE)

    with DatabaseManager() as db:
        with open(LOG_FILE, "r") as f:
            f.seek(0, 2)

            while True:
                line = f.readline()

                if not line:
                    await asyncio.sleep(1)
                    continue

                entry = parser.parse_line(line.strip())

                if entry:
                    db.insert_logs([entry])

                    message = {
                        "ip": entry.ip,
                        "method": entry.method,
                        "endpoint": entry.endpoint,
                        "status": entry.status,
                        "timestamp": entry.timestamp
                    }

                    await manager.broadcast(message)

# -------------------------------
# Startup Event
# -------------------------------

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(tail_log())

# -------------------------------
# Analytics Endpoint
# -------------------------------

@app.get("/api/analytics")
def get_analytics():
    with DatabaseManager() as db:

        total_requests = db.get_total_requests()
        error_info = db.get_error_rate()

        overview = {
            "total_requests": total_requests,
            "unique_ips": len(db.get_ip_request_counts()),
            "error_rate_pct": error_info["error_rate_pct"],
            "total_errors": error_info["errors"],
        }

        return {
            "overview": overview,
            "requests_per_ip": db.get_requests_per_ip(10),
            "status_distribution": db.get_status_distribution(),
            "top_endpoints": db.get_top_endpoints(10),
            "method_distribution": db.get_method_distribution(),
            "hourly_traffic": db.get_requests_per_hour(),
            "daily_traffic": db.get_requests_per_day(),
            "bandwidth_by_ip": db.get_bandwidth_by_ip(10),
            "anomalies": []
        }

# -------------------------------
# Download Report Endpoint
# -------------------------------

@app.get("/api/download-report")
def download_report():

    report_dir = Path("data/reports")
    report_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = report_dir / f"analytics_report_{timestamp}.txt"

    with DatabaseManager() as db:
        total = db.get_total_requests()
        error = db.get_error_rate()
        top_ips = db.get_requests_per_ip(5)

        with open(report_path, "w", encoding="utf-8") as f:
            f.write("LOG ANALYTICS REPORT\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Generated: {datetime.now()}\n\n")

            f.write("OVERVIEW\n")
            f.write("-" * 30 + "\n")
            f.write(f"Total Requests: {total}\n")
            f.write(f"Total Errors: {error['errors']}\n")
            f.write(f"Error Rate: {error['error_rate_pct']}%\n\n")

            f.write("TOP IPs\n")
            f.write("-" * 30 + "\n")
            for row in top_ips:
                f.write(f"{row['ip']} \u2192 {row['request_count']} requests\n")

    return FileResponse(
        path=str(report_path),   # IMPORTANT: convert to string
        filename=report_path.name,
        media_type="text/plain"
    )

# -------------------------------
# CORS
# -------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)