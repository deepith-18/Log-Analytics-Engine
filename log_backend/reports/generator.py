# =============================================================================
# reports/generator.py
# Formats analytics results and anomaly findings into a human-readable
# text report and saves it to disk.
#
# The report is plain-text so it can be:
#   - Emailed without attachments
#   - Committed to a git repo for historical comparison
#   - Parsed programmatically (structured sections)
#
# Design: ReportGenerator takes pre-computed dicts from AnalyticsEngine
# and AnomalyDetector.  It does NO database access – pure formatting.
# =============================================================================

from datetime import datetime

from utils.helpers import generate_report_path, format_table
from utils.logger import get_logger

logger = get_logger(__name__)

# Severity → visual icon mapping for CLI/report
SEVERITY_ICONS = {
    "CRITICAL": "🔴 CRITICAL",
    "HIGH":     "🟠 HIGH",
    "MEDIUM":   "🟡 MEDIUM",
    "LOW":      "🟢 LOW",
}


class ReportGenerator:
    """
    Renders analytics and anomaly data into a formatted text report.

    Args:
        analytics_results : dict returned by AnalyticsEngine.run_all()
        anomalies         : list returned by AnomalyDetector.detect_all()
        source_file       : Path to the original log file (shown in header)
        ingestion_stats   : Summary from IngestionPipeline.run()

    Example:
        gen  = ReportGenerator(results, anomalies, "access.log", ingest_stats)
        path = gen.generate()
        print(f"Report saved to: {path}")
    """

    def __init__(self, analytics_results: dict, anomalies: list,
                 source_file: str, ingestion_stats: dict):
        self.results        = analytics_results
        self.anomalies      = anomalies
        self.source_file    = source_file
        self.ingestion_stats= ingestion_stats
        self.generated_at   = datetime.now()

    def generate(self) -> str:
        """
        Build the full report string, write it to disk, and return the path.

        Returns:
            Absolute path to the saved report file.
        """
        report_path = generate_report_path()
        content     = self._build_report()

        with open(report_path, "w", encoding="utf-8") as f:
            f.write(content)

        logger.info(f"Report written to: {report_path}")
        return report_path

    def print_to_console(self) -> None:
        """Print the full report to stdout (for CLI use)."""
        print(self._build_report())

    # ------------------------------------------------------------------
    # Report building
    # ------------------------------------------------------------------

    def _build_report(self) -> str:
        """Assemble all report sections into one string."""
        sections = [
            self._header(),
            self._ingestion_summary(),
            self._overview(),
            self._requests_per_ip(),
            self._status_distribution(),
            self._top_endpoints(),
            self._method_distribution(),
            self._hourly_traffic(),
            self._daily_traffic(),
            self._bandwidth(),
            self._error_rate(),
            self._anomalies(),
            self._footer(),
        ]
        return "\n".join(sections)

    def _divider(self, char: str = "=", width: int = 80) -> str:
        return char * width

    def _section_title(self, title: str) -> str:
        return (
            f"\n{self._divider()}\n"
            f"  {title}\n"
            f"{self._divider()}\n"
        )

    # ------------------------------------------------------------------
    # Individual sections
    # ------------------------------------------------------------------

    def _header(self) -> str:
        return (
            f"{self._divider('█')}\n"
            f"{'LOG ANALYTICS ENGINE — ANALYTICS REPORT'.center(80)}\n"
            f"{self._divider('█')}\n"
            f"  Generated  : {self.generated_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"  Source Log : {self.source_file}\n"
            f"{self._divider('─')}\n"
        )

    def _ingestion_summary(self) -> str:
        s = self.ingestion_stats
        lines = [
            self._section_title("INGESTION SUMMARY"),
            f"  Rows Loaded  : {s.get('rows_loaded', 'N/A')}",
            f"  Rows Skipped : {s.get('rows_skipped', 'N/A')}",
            f"  Duration     : {s.get('duration_seconds', 'N/A')} seconds",
        ]
        return "\n".join(lines)

    def _overview(self) -> str:
        r = self.results
        er = r["error_rate"]
        lines = [
            self._section_title("TRAFFIC OVERVIEW"),
            f"  Total Requests  : {r['total_requests']:,}",
            f"  Total 5xx Errors: {er['errors']:,}",
            f"  Error Rate      : {er['error_rate_pct']}%",
            f"  Unique IPs      : {len(r['requests_per_ip'])} (shown, may be more)",
        ]
        return "\n".join(lines)

    def _requests_per_ip(self) -> str:
        rows = [
            (d["rank"], d["ip"], d["request_count"], f"{d['percentage']}%")
            for d in self.results["requests_per_ip"]
        ]
        table = format_table(
            headers=["Rank", "IP Address", "Requests", "% of Total"],
            rows=rows,
            col_width=22
        )
        return self._section_title("TOP IPs BY REQUEST COUNT") + table

    def _status_distribution(self) -> str:
        rows = [
            (d["status"], d["category"], d["count"], f"{d['percentage']}%")
            for d in self.results["status_distribution"]
        ]
        table = format_table(
            headers=["Status", "Category", "Count", "Percentage"],
            rows=rows,
            col_width=20
        )
        return self._section_title("HTTP STATUS CODE DISTRIBUTION") + table

    def _top_endpoints(self) -> str:
        rows = [
            (d["rank"], d["endpoint"][:35], d["hit_count"], f"{d['percentage']}%")
            for d in self.results["top_endpoints"]
        ]
        table = format_table(
            headers=["Rank", "Endpoint", "Hits", "% of Total"],
            rows=rows,
            col_width=22
        )
        return self._section_title("TOP ENDPOINTS BY HIT COUNT") + table

    def _method_distribution(self) -> str:
        rows = [
            (d["method"], d["count"], f"{d['percentage']}%")
            for d in self.results["method_distribution"]
        ]
        table = format_table(
            headers=["HTTP Method", "Count", "Percentage"],
            rows=rows,
            col_width=22
        )
        return self._section_title("HTTP METHOD DISTRIBUTION") + table

    def _hourly_traffic(self) -> str:
        lines = [self._section_title("HOURLY TRAFFIC DISTRIBUTION")]
        for d in self.results["hourly_traffic"]:
            bar  = d["bar"]
            line = f"  Hour {d['hour']}:00  [{bar:<40}] {d['count']:>5} req ({d['percentage']}%)"
            lines.append(line)
        return "\n".join(lines)

    def _daily_traffic(self) -> str:
        rows = [(d["day"], d["count"]) for d in self.results["daily_traffic"]]
        table = format_table(
            headers=["Date", "Request Count"],
            rows=rows,
            col_width=25
        )
        return self._section_title("DAILY TRAFFIC BREAKDOWN") + table

    def _bandwidth(self) -> str:
        rows = [
            (d["ip"], f"{d['total_bytes']:,} bytes",
             f"{d['total_bytes'] / 1024:.2f} KB")
            for d in self.results["bandwidth_by_ip"]
        ]
        table = format_table(
            headers=["IP Address", "Total Bytes", "Total KB"],
            rows=rows,
            col_width=22
        )
        return self._section_title("BANDWIDTH CONSUMPTION BY IP") + table

    def _error_rate(self) -> str:
        er = self.results["error_rate"]
        lines = [
            self._section_title("ERROR RATE ANALYSIS"),
            f"  Total Requests : {er['total']:,}",
            f"  5xx Errors     : {er['errors']:,}",
            f"  Error Rate     : {er['error_rate_pct']}%",
        ]
        # Contextual interpretation
        rate = er["error_rate_pct"]
        if rate == 0:
            lines.append("  Status         : ✅ Excellent – no server errors detected.")
        elif rate < 1:
            lines.append("  Status         : ✅ Healthy – error rate below 1%.")
        elif rate < 5:
            lines.append("  Status         : ⚠️  Warning – error rate 1-5%, investigate.")
        else:
            lines.append("  Status         : ❌ Critical – error rate above 5%!")
        return "\n".join(lines)

    def _anomalies(self) -> str:
        lines = [self._section_title("ANOMALY DETECTION REPORT")]

        if not self.anomalies:
            lines.append("  ✅ No anomalies detected. System appears healthy.")
            return "\n".join(lines)

        lines.append(f"  ⚠️  {len(self.anomalies)} anomaly(ies) detected:\n")

        for i, anomaly in enumerate(self.anomalies, start=1):
            icon = SEVERITY_ICONS.get(anomaly.severity, anomaly.severity)
            lines.append(f"  [{i}] {icon}")
            lines.append(f"      Type        : {anomaly.anomaly_type}")
            lines.append(f"      Description : {anomaly.description}")
            lines.append(f"      Evidence    : {anomaly.evidence}")
            lines.append(f"      Suggestion  : {anomaly.recommendation}")
            lines.append(f"      {self._divider('─', 70)}")

        return "\n".join(lines)

    def _footer(self) -> str:
        return (
            f"\n{self._divider()}\n"
            f"{'END OF REPORT'.center(80)}\n"
            f"{self._divider()}\n"
            f"  Engine     : Log Analytics Engine v1.0\n"
            f"  Author     : Final Year CSE Project\n"
            f"  Timestamp  : {self.generated_at.isoformat()}\n"
            f"{self._divider('█')}\n"
        )