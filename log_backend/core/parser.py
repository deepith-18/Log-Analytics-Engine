# =============================================================================
# core/parser.py
# Responsible for reading raw log files line-by-line and transforming each
# line into a LogEntry dataclass using compiled regular expressions.
#
# Design decisions:
#   - Pre-compile the regex once at import time (big speed win for millions
#     of lines vs re.match() on every call).
#   - Generator-based: yields entries one at a time → O(1) memory regardless
#     of file size.  The caller (ingestion pipeline) decides batching.
#   - Bad lines are counted and logged but never raise exceptions, keeping
#     the pipeline resilient against malformed log files.
# =============================================================================

import re
from pathlib import Path
from typing import Generator

from config.settings import LOG_PATTERN
from core.models import LogEntry
from utils.helpers import parse_timestamp
from utils.logger import get_logger

logger = get_logger(__name__)


class LogParser:
    """
    Parses Apache/Nginx Combined Log Format files into LogEntry objects.

    Usage:
        parser  = LogParser("data/logs/access.log")
        entries = list(parser.parse())   # or iterate lazily

    The Combined Log Format looks like:
        127.0.0.1 - frank [10/Oct/2024:13:55:36 -0700] "GET / HTTP/1.1" 200 2326
    """

    def __init__(self, log_path: str):
        """
        Args:
            log_path: Path to the server log file to parse.

        Raises:
            FileNotFoundError: If the log file does not exist.
        """
        self.log_path = Path(log_path)
        if not self.log_path.exists():
            raise FileNotFoundError(f"Log file not found: {self.log_path}")

        # Pre-compile regex once → reused for every line (significant speedup)
        # re.IGNORECASE handles edge cases like "get" vs "GET" in some logs
        self._pattern = re.compile(LOG_PATTERN, re.IGNORECASE)

        # Counters for summary reporting
        self._parsed_count  = 0
        self._skipped_count = 0

        logger.info(f"LogParser initialised → file: {self.log_path}")

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def parse(self) -> Generator[LogEntry, None, None]:
        """
        Lazily read and parse the log file, yielding one LogEntry per line.

        This is a Python generator – it uses `yield` instead of `return`,
        which means the file is read line-by-line without loading it entirely
        into memory.  Crucial for multi-GB production log files.

        Yields:
            LogEntry objects for each successfully parsed line.
        """
        logger.info(f"Starting parse of: {self.log_path}")

        with self.log_path.open("r", encoding="utf-8", errors="replace") as fh:
            for line_number, raw_line in enumerate(fh, start=1):
                raw_line = raw_line.strip()

                # Skip blank lines silently
                if not raw_line:
                    continue

                entry = self._parse_line(raw_line, line_number)
                if entry:
                    self._parsed_count += 1
                    yield entry
                else:
                    self._skipped_count += 1

        logger.info(
            f"Parse complete → parsed: {self._parsed_count}, "
            f"skipped: {self._skipped_count}"
        )

    @property
    def stats(self) -> dict:
        """Return a summary dict after parse() has been exhausted."""
        return {
            "parsed":  self._parsed_count,
            "skipped": self._skipped_count,
            "total":   self._parsed_count + self._skipped_count,
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _parse_line(self, raw_line: str, line_number: int) -> LogEntry | None:
        """
        Apply the compiled regex to one raw log line and build a LogEntry.

        Args:
            raw_line    : A single stripped log line.
            line_number : 1-based line number (for debug messages).

        Returns:
            LogEntry on success, None if regex doesn't match or data is
            invalid (malformed timestamp, non-numeric status code, etc.).
        """
        match = self._pattern.match(raw_line)
        if not match:
            # Log at DEBUG level – too verbose for INFO in large files
            logger.debug(f"Line {line_number}: regex did not match → {raw_line[:80]}")
            return None

        groups = match.groupdict()

        # ---- Timestamp conversion ----------------------------------------
        timestamp = parse_timestamp(groups["timestamp"])
        if timestamp is None:
            logger.warning(f"Line {line_number}: bad timestamp → {groups['timestamp']}")
            return None

        # ---- Status code -------------------------------------------------
        try:
            status = int(groups["status"])
        except ValueError:
            logger.warning(f"Line {line_number}: non-integer status → {groups['status']}")
            return None

        # ---- Response size -----------------------------------------------
        # Apache uses '-' when the response has no body (e.g., 204 No Content)
        raw_size = groups["size"]
        size = int(raw_size) if raw_size.isdigit() else 0

        return LogEntry(
            ip        = groups["ip"],
            ident     = groups["ident"],
            user      = groups["user"],
            timestamp = timestamp,
            method    = groups["method"].upper(),
            endpoint  = groups["endpoint"],
            protocol  = groups["protocol"],
            status    = status,
            size      = size,
            raw_line  = raw_line,
        )