# =============================================================================
# core/models.py
# Data model (plain Python dataclass) representing a single parsed log entry.
# Using dataclasses gives us __repr__, __eq__, type hints, and IDE support
# without the overhead of a full ORM.
# =============================================================================

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class LogEntry:
    """
    Represents one row from a web-server access log.

    Each attribute maps 1-to-1 with a column in the SQLite `logs` table
    and a named capture group in the regex pattern.

    Attributes:
        ip        : IPv4 address of the client.
        ident     : RFC 1413 identity of the client (almost always '-').
        user      : Authenticated username, or '-' if anonymous.
        timestamp : Parsed datetime (timezone-aware).
        method    : HTTP verb – GET, POST, PUT, DELETE, etc.
        endpoint  : URL path requested (e.g. '/api/products').
        protocol  : HTTP version string (e.g. 'HTTP/1.1').
        status    : HTTP status code as integer (200, 404, 500 …).
        size      : Response body size in bytes, or 0 if unknown ('-').
        raw_line  : The original unparsed log line, kept for debugging.
    """
    ip:        str
    ident:     str
    user:      str
    timestamp: datetime
    method:    str
    endpoint:  str
    protocol:  str
    status:    int
    size:      int
    raw_line:  str = field(default="", repr=False)   # excluded from repr for brevity

    # ------------------------------------------------------------------
    # Convenience properties – computed from existing fields, not stored
    # ------------------------------------------------------------------

    @property
    def is_error(self) -> bool:
        """True for any 5xx server-side error response."""
        return self.status >= 500

    @property
    def is_client_error(self) -> bool:
        """True for any 4xx client error (404, 403, 401 …)."""
        return 400 <= self.status < 500

    @property
    def is_success(self) -> bool:
        """True for any 2xx or 3xx (success / redirect) response."""
        return self.status < 400

    @property
    def hour(self) -> int:
        """Hour component (0-23) of the request timestamp."""
        return self.timestamp.hour

    def to_db_tuple(self) -> tuple:
        """
        Convert this entry into a tuple matching the INSERT column order
        in DatabaseManager.insert_logs().

        Returns:
            (ip, user, timestamp_iso, method, endpoint, protocol,
             status, size, raw_line)
        """
        return (
            self.ip,
            self.user,
            self.timestamp.isoformat(),   # store as ISO-8601 text in SQLite
            self.method,
            self.endpoint,
            self.protocol,
            self.status,
            self.size,
            self.raw_line,
        )