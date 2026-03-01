# =============================================================================
# anomaly/detector.py
# Statistical anomaly detection against the stored log data.
#
# Three detection strategies are implemented:
#
#   1. High-Volume IP Detection (Threshold-Based)
#      Any IP exceeding HIGH_REQUEST_THRESHOLD requests is flagged.
#      Simple but effective for detecting brute-force, scrapers, or DDoS.
#
#   2. 500-Error Spike Detection (Z-Score / IQR hybrid)
#      Groups 500 errors by minute and uses the Inter-Quartile Range (IQR)
#      method to identify minutes with abnormally high error counts.
#      IQR is more robust to outliers than simple mean + stddev (z-score)
#      because it uses the median-based spread.
#
#      IQR = Q3 - Q1
#      Outlier threshold = Q3 + 1.5 * IQR   (Tukey fence)
#      Any minute with count > fence is flagged as a spike.
#      Falls back to absolute threshold if sample is too small.
#
#   3. Suspicious Endpoint Access Detection
#      Checks for accesses to known sensitive paths (/.env, /admin, etc.).
#      Flags any endpoint from the SUSPICIOUS_ENDPOINTS list that has been
#      accessed more than SUSPICIOUS_ENDPOINT_THRESHOLD times.
# =============================================================================

import statistics
from dataclasses import dataclass, field
from typing import Literal

from config.settings import (
    HIGH_REQUEST_THRESHOLD,
    ERROR_SPIKE_THRESHOLD_PERCENT,
    ERROR_SPIKE_MIN_COUNT,
    SUSPICIOUS_ENDPOINTS,
    SUSPICIOUS_ENDPOINT_THRESHOLD,
)
from core.database import DatabaseManager
from utils.logger import get_logger

logger = get_logger(__name__)

# Severity levels for anomalies
Severity = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


@dataclass
class Anomaly:
    """
    Represents a single detected anomaly event.

    Attributes:
        anomaly_type : Short code identifying the detection rule.
        severity     : LOW / MEDIUM / HIGH / CRITICAL.
        description  : Human-readable explanation.
        evidence     : Supporting data (IP address, count, etc.).
        recommendation: Suggested remediation action.
    """
    anomaly_type:   str
    severity:       Severity
    description:    str
    evidence:       dict = field(default_factory=dict)
    recommendation: str  = ""

    def to_dict(self) -> dict:
        return {
            "type":           self.anomaly_type,
            "severity":       self.severity,
            "description":    self.description,
            "evidence":       self.evidence,
            "recommendation": self.recommendation,
        }


class AnomalyDetector:
    """
    Runs all anomaly detection rules and returns a list of Anomaly objects.

    Args:
        db: Open DatabaseManager instance.

    Example:
        with DatabaseManager() as db:
            detector  = AnomalyDetector(db)
            anomalies = detector.detect_all()
            for a in anomalies:
                print(a.severity, a.description)
    """

    def __init__(self, db: DatabaseManager):
        self.db = db

    def detect_all(self) -> list[Anomaly]:
        """
        Run every detection rule and return combined anomaly list.

        Returns:
            List of Anomaly objects (may be empty if logs are clean).
        """
        logger.info("Running anomaly detection …")
        anomalies: list[Anomaly] = []

        anomalies.extend(self._detect_high_volume_ips())
        anomalies.extend(self._detect_500_spike())
        anomalies.extend(self._detect_suspicious_endpoints())

        logger.info(f"Anomaly detection complete → {len(anomalies)} anomaly(ies) found.")
        return anomalies

    # ------------------------------------------------------------------
    # Rule 1: High-Volume IP
    # ------------------------------------------------------------------

    def _detect_high_volume_ips(self) -> list[Anomaly]:
        """
        Flag any IP whose total request count exceeds HIGH_REQUEST_THRESHOLD.

        Severity scaling:
            count >= 4× threshold → CRITICAL
            count >= 2× threshold → HIGH
            count >= threshold    → MEDIUM
        """
        anomalies = []
        ip_counts  = self.db.get_ip_request_counts()

        for row in ip_counts:
            count = row["request_count"]
            ip    = row["ip"]

            if count < HIGH_REQUEST_THRESHOLD:
                continue   # below threshold → not anomalous

            # Determine severity based on how far over the threshold the IP is
            ratio = count / HIGH_REQUEST_THRESHOLD
            if   ratio >= 4: severity = "CRITICAL"
            elif ratio >= 2: severity = "HIGH"
            else:            severity = "MEDIUM"

            anomalies.append(Anomaly(
                anomaly_type   = "HIGH_VOLUME_IP",
                severity       = severity,
                description    = (
                    f"IP {ip} sent {count} requests "
                    f"(threshold: {HIGH_REQUEST_THRESHOLD})."
                ),
                evidence       = {"ip": ip, "request_count": count,
                                   "threshold": HIGH_REQUEST_THRESHOLD,
                                   "ratio": round(ratio, 2)},
                recommendation = (
                    f"Investigate {ip}. If traffic is illegitimate, "
                    "add to firewall blocklist or rate-limit via nginx/iptables."
                ),
            ))
            logger.warning(f"[HIGH_VOLUME_IP] {ip} → {count} requests (severity: {severity})")

        return anomalies

    # ------------------------------------------------------------------
    # Rule 2: 500-Error Spike (IQR method)
    # ------------------------------------------------------------------

    def _detect_500_spike(self) -> list[Anomaly]:
        """
        Detect minutes with an abnormally high count of 500 errors using
        the Tukey IQR fence method.

        Why IQR instead of mean + 2σ?
        - IQR is based on medians and quartiles → not influenced by extreme
          outliers (the very spike we're looking for).
        - mean + 2σ can be dragged upward by the outlier itself, making it
          less sensitive.

        Algorithm:
            1. Collect per-minute 500 error counts.
            2. Compute Q1 (25th percentile) and Q3 (75th percentile).
            3. IQR = Q3 - Q1.
            4. Upper fence = Q3 + 1.5 * IQR.
            5. Any minute with count > upper_fence is a spike.

        Falls back to a simple absolute threshold check when there are
        fewer than 4 data points (statistics.quantiles needs ≥ 4).
        """
        anomalies = []
        minute_errors = self.db.get_500_errors_by_minute()

        if not minute_errors:
            return anomalies   # no 500 errors at all → nothing to detect

        counts  = [r["error_count"] for r in minute_errors]
        minutes = [r["minute"]      for r in minute_errors]

        # Need at least 4 data points for meaningful quartile computation
        if len(counts) < 4:
            # Simple fallback: flag any minute exceeding ERROR_SPIKE_MIN_COUNT
            fence = ERROR_SPIKE_MIN_COUNT
            method = "absolute_threshold"
        else:
            # IQR fence calculation
            q1, q3 = statistics.quantiles(counts, n=4)[0], statistics.quantiles(counts, n=4)[2]
            iqr    = q3 - q1
            fence  = q3 + 1.5 * iqr
            method = "IQR_tukey"

        logger.debug(f"500-error spike detection: method={method}, fence={fence:.1f}")

        for minute, count in zip(minutes, counts):
            if count > fence and count >= ERROR_SPIKE_MIN_COUNT:
                severity = "CRITICAL" if count >= fence * 2 else "HIGH"
                anomalies.append(Anomaly(
                    anomaly_type   = "ERROR_SPIKE_500",
                    severity       = severity,
                    description    = (
                        f"500-error spike at {minute}: {count} errors "
                        f"(fence: {fence:.1f}, method: {method})."
                    ),
                    evidence       = {
                        "minute":      minute,
                        "error_count": count,
                        "fence":       round(fence, 2),
                        "method":      method,
                    },
                    recommendation = (
                        "Check application logs around this timestamp. "
                        "Possible causes: deployment failure, database outage, "
                        "memory exhaustion, or uncaught exception."
                    ),
                ))
                logger.warning(f"[ERROR_SPIKE_500] {minute} → {count} errors (fence: {fence:.1f})")

        return anomalies

    # ------------------------------------------------------------------
    # Rule 3: Suspicious Endpoint Access
    # ------------------------------------------------------------------

    def _detect_suspicious_endpoints(self) -> list[Anomaly]:
        """
        Flag access to sensitive/dangerous paths defined in SUSPICIOUS_ENDPOINTS.

        Any access to these paths is noteworthy; repeated access is alarming.
        Severity:
            count >= 10 → HIGH
            count >= 3  → MEDIUM
            count >= 1  → LOW
        """
        anomalies = []
        endpoint_counts = self.db.get_endpoint_access_counts()

        # Build a lookup dict for O(1) checks: {endpoint: hit_count}
        ep_map = {row["endpoint"]: row["hit_count"] for row in endpoint_counts}

        for sus_path in SUSPICIOUS_ENDPOINTS:
            count = ep_map.get(sus_path, 0)
            if count == 0:
                continue   # this suspicious path was never hit → skip

            if count >= 10:   severity = "HIGH"
            elif count >= SUSPICIOUS_ENDPOINT_THRESHOLD: severity = "MEDIUM"
            else:             severity = "LOW"

            anomalies.append(Anomaly(
                anomaly_type   = "SUSPICIOUS_ENDPOINT",
                severity       = severity,
                description    = (
                    f"Sensitive endpoint '{sus_path}' was accessed {count} time(s)."
                ),
                evidence       = {
                    "endpoint":  sus_path,
                    "hit_count": count,
                    "threshold": SUSPICIOUS_ENDPOINT_THRESHOLD,
                },
                recommendation = (
                    f"Review who accessed '{sus_path}'. "
                    "If not a legitimate user, block via WAF or firewall. "
                    "Consider moving admin interfaces behind VPN."
                ),
            ))
            logger.warning(f"[SUSPICIOUS_ENDPOINT] '{sus_path}' hit {count} time(s) (severity: {severity})")

        return anomalies