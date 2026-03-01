# =============================================================================
# config/settings.py
# Central configuration for the Log Analytics Engine.
# All tunable parameters live here so the system is easy to reconfigure
# without touching business logic.
# =============================================================================

import os

# ---------------------------------------------------------------------------
# Base Paths
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATA_DIR     = os.path.join(BASE_DIR, "data")
LOG_DIR      = os.path.join(DATA_DIR, "logs")
REPORTS_DIR  = os.path.join(DATA_DIR, "reports")
DB_PATH      = os.path.join(DATA_DIR, "log_analytics.db")

# App-level logging (the engine's own log, not the server logs it parses)
APP_LOG_FILE = os.path.join(BASE_DIR, "logs", "engine.log")

# ---------------------------------------------------------------------------
# Log Parsing  –  Apache/Nginx Combined Log Format
# ---------------------------------------------------------------------------
# Pattern breakdown (explained in detail in the README / report):
#   (?P<ip>...)          → named capture group for IP address
#   (?P<timestamp>...)   → datetime string inside [ ]
#   (?P<method>...)      → HTTP verb (GET/POST/PUT …)
#   (?P<endpoint>...)    → URL path
#   (?P<protocol>...)    → HTTP version
#   (?P<status>\d{3})    → 3-digit status code
#   (?P<size>\d+|-)      → response size in bytes, or '-' if unknown
LOG_PATTERN = (
    r'(?P<ip>\d{1,3}(?:\.\d{1,3}){3})\s+'          # Client IP
    r'(?P<ident>[\w\-]+)\s+'                         # RFC 1413 ident (usually -)
    r'(?P<user>[\w\-]+)\s+'                          # Authenticated user
    r'\[(?P<timestamp>[^\]]+)\]\s+'                  # Timestamp in [...]
    r'"(?P<method>[A-Z]+)\s+'                        # HTTP method
    r'(?P<endpoint>\S+)\s+'                          # Requested endpoint
    r'(?P<protocol>HTTP/[\d.]+)"\s+'                 # HTTP protocol version
    r'(?P<status>\d{3})\s+'                          # HTTP status code
    r'(?P<size>\d+|-)'                               # Response size
)

# Datetime format matching the Apache/Nginx log timestamp
TIMESTAMP_FORMAT = "%d/%b/%Y:%H:%M:%S %z"

# ---------------------------------------------------------------------------
# SQLite Database
# ---------------------------------------------------------------------------
DB_SCHEMA_VERSION = 1          # bump when schema changes
BATCH_INSERT_SIZE  = 500       # rows per executemany() call (memory vs speed)

# ---------------------------------------------------------------------------
# Anomaly Detection Thresholds
# ---------------------------------------------------------------------------
# An IP is flagged as high-volume if it sends more than this many requests
HIGH_REQUEST_THRESHOLD = 20

# If 500-errors exceed this % of all requests in a time window, raise a spike
ERROR_SPIKE_THRESHOLD_PERCENT = 10.0   # 10 %

# Minimum absolute 500-errors before % check triggers (avoids false positives
# on very low traffic windows)
ERROR_SPIKE_MIN_COUNT = 5

# Endpoints that are *always* suspicious when accessed by an external IP
SUSPICIOUS_ENDPOINTS = [
    "/admin", "/admin/", "/wp-admin", "/phpmyadmin",
    "/.env", "/etc/passwd", "/config", "/.git",
    "/api/v1/logs", "/server-status"
]

# How many times a suspicious endpoint can be hit before flagging
SUSPICIOUS_ENDPOINT_THRESHOLD = 3

# Time window (minutes) used for spike & window-based analytics
ANALYSIS_WINDOW_MINUTES = 60

# ---------------------------------------------------------------------------
# Report Settings
# ---------------------------------------------------------------------------
REPORT_FILENAME_PREFIX = "analytics_report"
TOP_N_ENDPOINTS        = 10     # top-N endpoints shown in reports
TOP_N_IPS              = 10     # top-N IPs shown in reports