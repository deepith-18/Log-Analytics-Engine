# =============================================================================
# tests/test_parser.py
# Unit tests for the LogParser and core components.
# Run with:  python -m pytest tests/ -v
# =============================================================================

import sys
import os
import pytest
from datetime import datetime

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.parser import LogParser
from core.models import LogEntry
from core.database import DatabaseManager
from anomaly.detector import AnomalyDetector, Anomaly
from utils.helpers import parse_timestamp, percentage, format_table


# =============================================================================
# Test fixtures
# =============================================================================

VALID_LOG_LINE = (
    '192.168.1.10 - frank [10/Oct/2024:13:55:36 -0700] '
    '"GET /index.html HTTP/1.1" 200 2326'
)

INVALID_LOG_LINE = "this is not a valid log line at all"

SAMPLE_LOG_CONTENT = """\
192.168.1.1 - alice [10/Oct/2024:14:00:00 -0700] "GET /index.html HTTP/1.1" 200 1234
192.168.1.2 - - [10/Oct/2024:14:00:01 -0700] "POST /api/login HTTP/1.1" 401 200
10.0.0.99 - - [10/Oct/2024:14:00:02 -0700] "GET /admin HTTP/1.1" 403 289
this is a bad line
192.168.1.1 - alice [10/Oct/2024:14:00:04 -0700] "GET /dashboard HTTP/1.1" 500 150
"""


# =============================================================================
# Helper tests
# =============================================================================

class TestHelpers:
    """Tests for utils/helpers.py"""

    def test_parse_timestamp_valid(self):
        """Valid Apache timestamp should parse to a datetime object."""
        raw = "10/Oct/2024:13:55:36 -0700"
        result = parse_timestamp(raw)
        assert isinstance(result, datetime)
        assert result.year == 2024
        assert result.month == 10
        assert result.day == 10
        assert result.hour == 13

    def test_parse_timestamp_invalid(self):
        """Invalid timestamp should return None without raising."""
        result = parse_timestamp("not-a-date")
        assert result is None

    def test_percentage_normal(self):
        assert percentage(50, 200) == 25.0

    def test_percentage_zero_total(self):
        """ZeroDivisionError should never be raised."""
        assert percentage(10, 0) == 0.0

    def test_percentage_zero_part(self):
        assert percentage(0, 100) == 0.0

    def test_format_table_returns_string(self):
        headers = ["Name", "Count"]
        rows    = [("Alice", 42), ("Bob", 7)]
        result  = format_table(headers, rows, col_width=15)
        assert isinstance(result, str)
        assert "Alice" in result
        assert "Count" in result


# =============================================================================
# Parser tests
# =============================================================================

class TestLogParser:
    """Tests for core/parser.py"""

    def test_parse_valid_line(self, tmp_path):
        """A valid log line should produce a LogEntry with correct fields."""
        log_file = tmp_path / "access.log"
        log_file.write_text(VALID_LOG_LINE + "\n")

        parser  = LogParser(str(log_file))
        entries = list(parser.parse())

        assert len(entries) == 1
        entry = entries[0]
        assert isinstance(entry, LogEntry)
        assert entry.ip == "192.168.1.10"
        assert entry.user == "frank"
        assert entry.method == "GET"
        assert entry.endpoint == "/index.html"
        assert entry.status == 200
        assert entry.size == 2326

    def test_parse_skips_invalid_lines(self, tmp_path):
        """Invalid lines should be skipped; valid lines should be parsed."""
        log_file = tmp_path / "access.log"
        log_file.write_text(SAMPLE_LOG_CONTENT)

        parser  = LogParser(str(log_file))
        entries = list(parser.parse())

        # 4 valid lines, 1 invalid line in SAMPLE_LOG_CONTENT
        assert len(entries) == 4
        assert parser.stats["skipped"] == 1

    def test_parse_file_not_found(self):
        """LogParser should raise FileNotFoundError for missing files."""
        with pytest.raises(FileNotFoundError):
            LogParser("/nonexistent/path/access.log")

    def test_parse_empty_file(self, tmp_path):
        """An empty file should produce zero entries without crashing."""
        log_file = tmp_path / "empty.log"
        log_file.write_text("")

        parser  = LogParser(str(log_file))
        entries = list(parser.parse())
        assert entries == []

    def test_parse_500_status(self, tmp_path):
        """500-status lines should be parsed with is_error=True."""
        line = (
            '172.16.0.4 - eve [10/Oct/2024:14:01:30 -0700] '
            '"GET /dashboard HTTP/1.1" 500 200'
        )
        log_file = tmp_path / "access.log"
        log_file.write_text(line + "\n")

        parser  = LogParser(str(log_file))
        entries = list(parser.parse())
        assert len(entries) == 1
        assert entries[0].is_error is True
        assert entries[0].is_success is False


# =============================================================================
# Model tests
# =============================================================================

class TestLogEntry:
    """Tests for core/models.py LogEntry convenience properties."""

    def _make_entry(self, status: int) -> LogEntry:
        return LogEntry(
            ip="1.2.3.4", ident="-", user="-",
            timestamp=datetime.now(),
            method="GET", endpoint="/test",
            protocol="HTTP/1.1",
            status=status, size=100
        )

    def test_is_error(self):
        assert self._make_entry(500).is_error is True
        assert self._make_entry(200).is_error is False

    def test_is_client_error(self):
        assert self._make_entry(404).is_client_error is True
        assert self._make_entry(200).is_client_error is False

    def test_is_success(self):
        assert self._make_entry(200).is_success is True
        assert self._make_entry(500).is_success is False

    def test_to_db_tuple(self):
        entry = self._make_entry(200)
        t = entry.to_db_tuple()
        assert isinstance(t, tuple)
        assert len(t) == 9     # 9 columns in INSERT statement


# =============================================================================
# Database tests
# =============================================================================

class TestDatabaseManager:
    """Integration tests for core/database.py (uses in-memory SQLite)."""

    def _make_entry(self, ip: str, status: int, endpoint: str = "/") -> LogEntry:
        return LogEntry(
            ip=ip, ident="-", user="-",
            timestamp=datetime.fromisoformat("2024-10-10T14:00:00+00:00"),
            method="GET", endpoint=endpoint,
            protocol="HTTP/1.1", status=status, size=1000
        )

    def test_insert_and_count(self):
        """Inserted rows should be retrievable via get_total_requests."""
        with DatabaseManager(db_path=":memory:") as db:
            entries = [self._make_entry("1.2.3.4", 200) for _ in range(5)]
            db.insert_logs(entries)
            assert db.get_total_requests() == 5

    def test_requests_per_ip(self):
        with DatabaseManager(db_path=":memory:") as db:
            entries = (
                [self._make_entry("10.0.0.1", 200)] * 3 +
                [self._make_entry("10.0.0.2", 200)] * 1
            )
            db.insert_logs(entries)
            result = db.get_requests_per_ip()
            # First result should be the IP with most requests
            assert result[0]["ip"] == "10.0.0.1"
            assert result[0]["request_count"] == 3

    def test_status_distribution(self):
        with DatabaseManager(db_path=":memory:") as db:
            entries = (
                [self._make_entry("1.1.1.1", 200)] * 4 +
                [self._make_entry("1.1.1.1", 500)] * 2
            )
            db.insert_logs(entries)
            dist = {r["status"]: r["count"] for r in db.get_status_distribution()}
            assert dist[200] == 4
            assert dist[500] == 2

    def test_clear_logs(self):
        with DatabaseManager(db_path=":memory:") as db:
            db.insert_logs([self._make_entry("1.1.1.1", 200)])
            assert db.get_total_requests() == 1
            db.clear_logs()
            assert db.get_total_requests() == 0

    def test_get_error_rate(self):
        with DatabaseManager(db_path=":memory:") as db:
            entries = (
                [self._make_entry("1.1.1.1", 200)] * 8 +
                [self._make_entry("1.1.1.1", 500)] * 2
            )
            db.insert_logs(entries)
            er = db.get_error_rate()
            assert er["total"] == 10
            assert er["errors"] == 2
            assert er["error_rate_pct"] == 20.0


# =============================================================================
# Anomaly Detector tests
# =============================================================================

class TestAnomalyDetector:
    """Tests for anomaly/detector.py"""

    def _make_entry(self, ip: str, status: int = 200,
                    endpoint: str = "/index.html",
                    ts: str = "2024-10-10T14:00:00+00:00") -> LogEntry:
        return LogEntry(
            ip=ip, ident="-", user="-",
            timestamp=datetime.fromisoformat(ts),
            method="GET", endpoint=endpoint,
            protocol="HTTP/1.1", status=status, size=100
        )

    def test_high_volume_ip_detected(self):
        """An IP with > HIGH_REQUEST_THRESHOLD requests should be flagged."""
        with DatabaseManager(db_path=":memory:") as db:
            # 25 requests from same IP → exceeds default threshold of 20
            entries = [self._make_entry("10.0.0.99", 200)] * 25
            db.insert_logs(entries)

            detector  = AnomalyDetector(db)
            anomalies = detector.detect_all()

            high_vol = [a for a in anomalies if a.anomaly_type == "HIGH_VOLUME_IP"]
            assert len(high_vol) >= 1
            assert high_vol[0].evidence["ip"] == "10.0.0.99"

    def test_no_anomaly_normal_traffic(self):
        """Normal traffic (few requests, no 500s) should produce no anomalies."""
        with DatabaseManager(db_path=":memory:") as db:
            entries = [self._make_entry(f"10.0.0.{i}", 200) for i in range(10)]
            db.insert_logs(entries)

            detector  = AnomalyDetector(db)
            anomalies = detector.detect_all()
            # Should find no HIGH_VOLUME or ERROR_SPIKE anomalies
            types = {a.anomaly_type for a in anomalies}
            assert "HIGH_VOLUME_IP" not in types
            assert "ERROR_SPIKE_500" not in types

    def test_suspicious_endpoint_detected(self):
        """Access to /.env should trigger SUSPICIOUS_ENDPOINT anomaly."""
        with DatabaseManager(db_path=":memory:") as db:
            entries = [self._make_entry("1.2.3.4", 404, "/.env")] * 5
            db.insert_logs(entries)

            detector  = AnomalyDetector(db)
            anomalies = detector.detect_all()

            sus = [a for a in anomalies if a.anomaly_type == "SUSPICIOUS_ENDPOINT"]
            assert len(sus) >= 1
            assert "/.env" in sus[0].evidence["endpoint"]

    def test_anomaly_to_dict(self):
        """Anomaly.to_dict() should return all expected keys."""
        a = Anomaly(
            anomaly_type="TEST", severity="HIGH",
            description="Test", evidence={"k": "v"},
            recommendation="Do something"
        )
        d = a.to_dict()
        assert set(d.keys()) == {"type", "severity", "description",
                                   "evidence", "recommendation"}