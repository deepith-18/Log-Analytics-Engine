# =============================================================================
# core/database.py
# Manages the SQLite database lifecycle: schema creation, bulk inserts,
# and all analytical SQL queries consumed by the analytics layer.
#
# Design:
#   - Context manager support (`with DatabaseManager(...) as db`) ensures
#     the connection is always cleanly closed, even on exceptions.
#   - All INSERT operations use parameterised queries to prevent SQL injection.
#   - executemany() for batch inserts is orders of magnitude faster than
#     looping with execute() for large datasets.
#   - WAL journal mode improves concurrent read performance (useful if the
#     engine is later extended to serve a read API alongside ingestion).
# =============================================================================

import sqlite3
from contextlib import contextmanager
from typing import Generator

from config.settings import DB_PATH, BATCH_INSERT_SIZE
from core.models import LogEntry
from utils.logger import get_logger

logger = get_logger(__name__)


class DatabaseManager:
    """
    Thin wrapper around SQLite3 providing schema management and
    all data-access operations for the log analytics engine.

    Example:
        with DatabaseManager() as db:
            db.insert_logs(entries)
            results = db.get_status_distribution()
    """

    def __init__(self, db_path: str = DB_PATH):
        self.db_path   = db_path
        self._conn: sqlite3.Connection | None = None

    # ------------------------------------------------------------------
    # Context manager protocol
    # ------------------------------------------------------------------

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Commit if no exception; rollback happens automatically on error
        if self._conn:
            if exc_type is None:
                self._conn.commit()
            self._conn.close()
            logger.debug("Database connection closed.")
        return False   # do NOT suppress exceptions

    # ------------------------------------------------------------------
    # Connection & schema
    # ------------------------------------------------------------------

    def connect(self) -> None:
        """
        Open a connection and enable performance pragmas.
        Called automatically by __enter__.
        """
        logger.info(f"Connecting to database: {self.db_path}")
        self._conn = sqlite3.connect(self.db_path)

        # Return rows as dict-like objects (access columns by name)
        self._conn.row_factory = sqlite3.Row

        # ---- Performance pragmas ----------------------------------------
        # WAL mode: writers don't block readers and vice versa.
        self._conn.execute("PRAGMA journal_mode=WAL;")
        # Keep temp tables in memory (faster sorts for analytics queries)
        self._conn.execute("PRAGMA temp_store=MEMORY;")
        # Increase cache size to 64 MB (default is only ~2 MB)
        self._conn.execute("PRAGMA cache_size=-65536;")

        self._create_schema()

    def _create_schema(self) -> None:
        """
        Create all tables and indexes if they don't already exist.
        IF NOT EXISTS makes this idempotent – safe to call on every start.

        Table: logs
        -----------
        Stores one row per parsed log line.  The 'timestamp' column is TEXT
        in ISO-8601 format so SQLite's datetime() functions work on it.

        Table: ingestion_runs
        ---------------------
        Audit trail: records each time the engine ingests a log file,
        useful for incremental processing in future enhancements.
        """
        ddl = """
        CREATE TABLE IF NOT EXISTS logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            ip          TEXT    NOT NULL,
            user        TEXT,
            timestamp   TEXT    NOT NULL,
            method      TEXT    NOT NULL,
            endpoint    TEXT    NOT NULL,
            protocol    TEXT,
            status      INTEGER NOT NULL,
            size        INTEGER DEFAULT 0,
            raw_line    TEXT
        );

        -- Index on ip for fast per-IP aggregations
        CREATE INDEX IF NOT EXISTS idx_logs_ip        ON logs(ip);
        -- Index on status for fast status-code queries
        CREATE INDEX IF NOT EXISTS idx_logs_status    ON logs(status);
        -- Index on timestamp for time-series queries
        CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
        -- Composite index for endpoint+status (used by anomaly queries)
        CREATE INDEX IF NOT EXISTS idx_logs_ep_status ON logs(endpoint, status);

        CREATE TABLE IF NOT EXISTS ingestion_runs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            file_path   TEXT NOT NULL,
            started_at  TEXT NOT NULL,
            finished_at TEXT,
            rows_loaded INTEGER DEFAULT 0,
            rows_skipped INTEGER DEFAULT 0
        );
        """
        self._conn.executescript(ddl)
        self._conn.commit()
        logger.debug("Schema verified / created.")

    # ------------------------------------------------------------------
    # Write operations
    # ------------------------------------------------------------------

    def insert_logs(self, entries: list[LogEntry]) -> int:
        """
        Bulk-insert a list of LogEntry objects using executemany().

        Batching controlled by BATCH_INSERT_SIZE (default 500) balances
        memory usage vs. round-trip overhead.

        Args:
            entries: List of fully parsed LogEntry objects.

        Returns:
            Number of rows inserted.
        """
        if not entries:
            logger.warning("insert_logs called with empty list.")
            return 0

        sql = """
        INSERT INTO logs (ip, user, timestamp, method, endpoint,
                          protocol, status, size, raw_line)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """

        # Convert each LogEntry to a plain tuple for executemany()
        tuples = [e.to_db_tuple() for e in entries]

        # Process in batches to keep memory bounded
        total_inserted = 0
        for i in range(0, len(tuples), BATCH_INSERT_SIZE):
            batch = tuples[i : i + BATCH_INSERT_SIZE]
            self._conn.executemany(sql, batch)
            total_inserted += len(batch)

        self._conn.commit()
        logger.info(f"Inserted {total_inserted} log rows into database.")
        return total_inserted

    def record_ingestion_run(self, file_path: str, started_at: str,
                              finished_at: str, rows_loaded: int,
                              rows_skipped: int) -> None:
        """Persist metadata about a completed ingestion run."""
        self._conn.execute(
            """INSERT INTO ingestion_runs
               (file_path, started_at, finished_at, rows_loaded, rows_skipped)
               VALUES (?, ?, ?, ?, ?)""",
            (file_path, started_at, finished_at, rows_loaded, rows_skipped)
        )
        self._conn.commit()

    def clear_logs(self) -> None:
        """Truncate the logs table. Useful for re-ingesting from scratch."""
        self._conn.execute("DELETE FROM logs;")
        self._conn.commit()
        logger.info("Logs table cleared.")

    # ------------------------------------------------------------------
    # Read / Analytics queries
    # ------------------------------------------------------------------

    def get_total_requests(self) -> int:
        """
        SELECT COUNT(*) FROM logs

        Returns the total number of log entries stored.
        """
        row = self._conn.execute("SELECT COUNT(*) AS cnt FROM logs;").fetchone()
        return row["cnt"]

    def get_requests_per_ip(self, limit: int = 20) -> list[dict]:
        """
        Aggregate request counts grouped by IP address, ordered descending.

        SQL explanation:
            GROUP BY ip  → one row per unique IP
            COUNT(*)     → total requests from that IP
            ORDER BY 2 DESC → sort by the count column (2nd column)
            LIMIT ?      → return only the top-N IPs

        Returns:
            List of {"ip": str, "request_count": int} dicts.
        """
        sql = """
        SELECT ip,
               COUNT(*) AS request_count
        FROM   logs
        GROUP  BY ip
        ORDER  BY request_count DESC
        LIMIT  ?;
        """
        rows = self._conn.execute(sql, (limit,)).fetchall()
        return [dict(r) for r in rows]

    def get_status_distribution(self) -> list[dict]:
        """
        Count requests grouped by HTTP status code.

        Returns:
            List of {"status": int, "count": int} dicts.
        """
        sql = """
        SELECT status,
               COUNT(*) AS count
        FROM   logs
        GROUP  BY status
        ORDER  BY count DESC;
        """
        rows = self._conn.execute(sql).fetchall()
        return [dict(r) for r in rows]

    def get_top_endpoints(self, limit: int = 10) -> list[dict]:
        """
        Most frequently requested URL paths.

        Returns:
            List of {"endpoint": str, "hit_count": int} dicts.
        """
        sql = """
        SELECT endpoint,
               COUNT(*) AS hit_count
        FROM   logs
        GROUP  BY endpoint
        ORDER  BY hit_count DESC
        LIMIT  ?;
        """
        rows = self._conn.execute(sql, (limit,)).fetchall()
        return [dict(r) for r in rows]

    def get_requests_per_hour(self) -> list[dict]:
        """
        Time-based aggregation: requests grouped by hour.

        SQLite's strftime('%H', timestamp) extracts the 2-digit hour from
        the ISO-8601 timestamp string stored in the column.

        Returns:
            List of {"hour": str, "count": int} dicts, ordered by hour.
        """
        sql = """
        SELECT strftime('%H', timestamp) AS hour,
               COUNT(*) AS count
        FROM   logs
        GROUP  BY hour
        ORDER  BY hour;
        """
        rows = self._conn.execute(sql).fetchall()
        return [dict(r) for r in rows]

    def get_requests_per_day(self) -> list[dict]:
        """
        Aggregate requests by calendar day (YYYY-MM-DD).

        Returns:
            List of {"day": str, "count": int} dicts.
        """
        sql = """
        SELECT strftime('%Y-%m-%d', timestamp) AS day,
               COUNT(*) AS count
        FROM   logs
        GROUP  BY day
        ORDER  BY day;
        """
        rows = self._conn.execute(sql).fetchall()
        return [dict(r) for r in rows]

    def get_error_rate(self) -> dict:
        """
        Calculate 5xx error rate as a percentage of all requests.

        Uses a CASE expression (conditional aggregation) to count only
        rows where status >= 500 in a single table scan – no subquery needed.

        Returns:
            {"total": int, "errors": int, "error_rate_pct": float}
        """
        sql = """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) AS errors
        FROM   logs;
        """
        row = self._conn.execute(sql).fetchone()
        total  = row["total"]  or 0
        errors = row["errors"] or 0
        return {
            "total":          total,
            "errors":         errors,
            "error_rate_pct": round((errors / total * 100), 2) if total else 0.0
        }

    def get_ip_request_counts(self) -> list[dict]:
        """
        Return ALL IP request counts (no limit) for anomaly detection.
        The anomaly detector applies its own threshold logic.
        """
        sql = """
        SELECT ip, COUNT(*) AS request_count
        FROM   logs
        GROUP  BY ip
        ORDER  BY request_count DESC;
        """
        return [dict(r) for r in self._conn.execute(sql).fetchall()]

    def get_500_errors_by_minute(self) -> list[dict]:
        """
        Count 500 errors grouped by minute (YYYY-MM-DD HH:MM).
        Used by the anomaly detector to find rapid error spikes.

        Returns:
            List of {"minute": str, "error_count": int}.
        """
        sql = """
        SELECT strftime('%Y-%m-%d %H:%M', timestamp) AS minute,
               COUNT(*) AS error_count
        FROM   logs
        WHERE  status = 500
        GROUP  BY minute
        ORDER  BY minute;
        """
        return [dict(r) for r in self._conn.execute(sql).fetchall()]

    def get_endpoint_access_counts(self) -> list[dict]:
        """
        Return all endpoint access counts for suspicious-endpoint detection.
        """
        sql = """
        SELECT endpoint, COUNT(*) AS hit_count
        FROM   logs
        GROUP  BY endpoint
        ORDER  BY hit_count DESC;
        """
        return [dict(r) for r in self._conn.execute(sql).fetchall()]

    def get_method_distribution(self) -> list[dict]:
        """Count requests grouped by HTTP method (GET, POST, DELETE …)."""
        sql = """
        SELECT method, COUNT(*) AS count
        FROM   logs
        GROUP  BY method
        ORDER  BY count DESC;
        """
        return [dict(r) for r in self._conn.execute(sql).fetchall()]

    def get_bandwidth_by_ip(self, limit: int = 10) -> list[dict]:
        """
        Total bytes transferred per IP (SUM of response sizes).

        Returns:
            List of {"ip": str, "total_bytes": int} dicts.
        """
        sql = """
        SELECT ip, SUM(size) AS total_bytes
        FROM   logs
        GROUP  BY ip
        ORDER  BY total_bytes DESC
        LIMIT  ?;
        """
        return [dict(r) for r in self._conn.execute(sql, (limit,)).fetchall()]

    @contextmanager
    def transaction(self) -> Generator:
        """
        Context manager for explicit transaction control.
        Use when you need multiple writes to succeed or fail atomically.

        Example:
            with db.transaction():
                db.clear_logs()
                db.insert_logs(new_entries)
        """
        try:
            yield
            self._conn.commit()
        except Exception:
            self._conn.rollback()
            raise