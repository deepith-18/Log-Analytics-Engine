# =============================================================================
# analytics/engine.py
# Runs all analytical computations against the stored log data and returns
# structured result dictionaries.
#
# The AnalyticsEngine does NOT write to the database – it is purely a
# read/compute layer that calls DatabaseManager queries and post-processes
# the results (percentages, rankings, enrichment).
#
# Separation of concerns:
#   DatabaseManager  → raw SQL queries
#   AnalyticsEngine  → business logic on top of query results
#   ReportGenerator  → formatting and presentation
# =============================================================================

from config.settings import TOP_N_ENDPOINTS, TOP_N_IPS
from core.database import DatabaseManager
from utils.helpers import percentage
from utils.logger import get_logger

logger = get_logger(__name__)


class AnalyticsEngine:
    """
    Computes analytics metrics from stored log data.

    Args:
        db: Open DatabaseManager instance.

    Example:
        with DatabaseManager() as db:
            engine  = AnalyticsEngine(db)
            results = engine.run_all()
    """

    def __init__(self, db: DatabaseManager):
        self.db = db

    def run_all(self) -> dict:
        """
        Execute every analytics computation and return a unified dict.

        Returns:
            {
              "total_requests"      : int,
              "requests_per_ip"     : list[dict],
              "status_distribution" : list[dict],   # enriched with %
              "top_endpoints"       : list[dict],   # enriched with %
              "hourly_traffic"      : list[dict],
              "daily_traffic"       : list[dict],
              "method_distribution" : list[dict],   # enriched with %
              "error_rate"          : dict,
              "bandwidth_by_ip"     : list[dict],
            }
        """
        logger.info("Running full analytics suite …")

        total = self.db.get_total_requests()

        results = {
            "total_requests":      total,
            "requests_per_ip":     self._top_ips(total),
            "status_distribution": self._status_dist(total),
            "top_endpoints":       self._top_endpoints(total),
            "hourly_traffic":      self._hourly_traffic(total),
            "daily_traffic":       self.db.get_requests_per_day(),
            "method_distribution": self._method_dist(total),
            "error_rate":          self.db.get_error_rate(),
            "bandwidth_by_ip":     self.db.get_bandwidth_by_ip(TOP_N_IPS),
        }

        logger.info("Analytics complete.")
        return results

    # ------------------------------------------------------------------
    # Private enrichment methods
    # Each method calls the raw DB query and adds derived fields.
    # ------------------------------------------------------------------

    def _top_ips(self, total: int) -> list[dict]:
        """
        Fetch top IPs and add a 'percentage' field showing their share
        of total traffic.  Also adds a 'rank' field.

        Example output row:
            {"rank": 1, "ip": "192.168.1.10",
             "request_count": 42, "percentage": 12.5}
        """
        raw = self.db.get_requests_per_ip(limit=TOP_N_IPS)
        enriched = []
        for rank, row in enumerate(raw, start=1):
            enriched.append({
                "rank":          rank,
                "ip":            row["ip"],
                "request_count": row["request_count"],
                "percentage":    percentage(row["request_count"], total),
            })
        return enriched

    def _status_dist(self, total: int) -> list[dict]:
        """
        Add percentage and human-readable category to each status code row.

        HTTP status families:
            1xx → Informational
            2xx → Success
            3xx → Redirection
            4xx → Client Error
            5xx → Server Error
        """
        raw = self.db.get_status_distribution()
        enriched = []
        for row in raw:
            status = row["status"]
            # Determine the status family label
            if 100 <= status < 200:   category = "Informational"
            elif 200 <= status < 300: category = "Success"
            elif 300 <= status < 400: category = "Redirection"
            elif 400 <= status < 500: category = "Client Error"
            else:                     category = "Server Error"

            enriched.append({
                "status":     status,
                "category":   category,
                "count":      row["count"],
                "percentage": percentage(row["count"], total),
            })
        return enriched

    def _top_endpoints(self, total: int) -> list[dict]:
        """Add rank and percentage to each endpoint row."""
        raw = self.db.get_top_endpoints(limit=TOP_N_ENDPOINTS)
        enriched = []
        for rank, row in enumerate(raw, start=1):
            enriched.append({
                "rank":      rank,
                "endpoint":  row["endpoint"],
                "hit_count": row["hit_count"],
                "percentage": percentage(row["hit_count"], total),
            })
        return enriched

    def _hourly_traffic(self, total: int) -> list[dict]:
        """
        Enrich hourly traffic with percentage and a simple bar visualisation.
        The bar is scaled to 40 characters for the CLI report.
        """
        raw = self.db.get_requests_per_hour()
        enriched = []
        max_count = max((r["count"] for r in raw), default=1)

        for row in raw:
            bar_len = int((row["count"] / max_count) * 40)
            enriched.append({
                "hour":       row["hour"],
                "count":      row["count"],
                "percentage": percentage(row["count"], total),
                "bar":        "█" * bar_len,
            })
        return enriched

    def _method_dist(self, total: int) -> list[dict]:
        """Add percentage to each HTTP method row."""
        raw = self.db.get_method_distribution()
        return [
            {
                "method":     r["method"],
                "count":      r["count"],
                "percentage": percentage(r["count"], total),
            }
            for r in raw
        ]