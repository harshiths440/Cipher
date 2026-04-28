"""
alerts.py — ComplianceX Alert System

In-memory store for Executive → CA alerts.
No database required — resets on server restart (demo-safe).
"""

from __future__ import annotations
import random
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# In-memory store
# ---------------------------------------------------------------------------

alerts_store: list[dict] = []


# ---------------------------------------------------------------------------
# CRUD helpers
# ---------------------------------------------------------------------------

def create_alert(cin: str, payload: dict) -> dict:
    alert = {
        "id":                  f"ALT{random.randint(100000, 999999)}",
        "cin":                 cin,
        "company_name":        payload["company_name"],
        "regulation_title":    payload["regulation_title"],
        "regulation_category": payload["regulation_category"],
        "message":             payload["message"],
        "urgency":             payload.get("urgency", "LOW"),   # "LOW" | "HIGH" | "EMERGENCY"
        "sent_by":             "Executive",
        "sent_at":             datetime.now(timezone.utc).isoformat(),
        "status":              "UNREAD",   # "UNREAD" | "READ" | "ACKNOWLEDGED"
        "acknowledged_at":     None,
        "ca_response":         None,
    }
    alerts_store.append(alert)
    return alert


def get_alerts(cin: str) -> list[dict]:
    """Return all alerts for a given CIN, newest first."""
    return sorted(
        [a for a in alerts_store if a["cin"] == cin],
        key=lambda a: a["sent_at"],
        reverse=True,
    )


def acknowledge_alert(alert_id: str, ca_response: str) -> dict:
    """Mark an alert as ACKNOWLEDGED and store the CA's response."""
    for alert in alerts_store:
        if alert["id"] == alert_id:
            alert["status"]          = "ACKNOWLEDGED"
            alert["ca_response"]     = ca_response
            alert["acknowledged_at"] = datetime.now(timezone.utc).isoformat()
            return alert
    raise KeyError(f"Alert '{alert_id}' not found.")


def mark_read(alert_id: str) -> dict:
    """Mark an alert as READ (intermediate state before ACKNOWLEDGED)."""
    for alert in alerts_store:
        if alert["id"] == alert_id:
            if alert["status"] == "UNREAD":
                alert["status"] = "READ"
            return alert
    raise KeyError(f"Alert '{alert_id}' not found.")
