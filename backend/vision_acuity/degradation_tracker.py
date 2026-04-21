"""
GazeAware — Phase 2.2: Vision Degradation Tracker
=================================================
Queries `acuity_logs` and `signal_logs` from the local SQLite database to
build a longitudinal picture of the user's visual acuity over time.

Weekly aggregation
------------------
For each ISO calendar week that has at least one acuity test:
  - avg_acuity_score   : mean of SNELLEN_NUMERIC[fraction] for all tests
  - avg_strain_score   : mean of signal_logs.strain_score for that week
  - avg_blink_rate     : mean of signal_logs.blink_rate
  - avg_squint         : mean of signal_logs.squint_ratio
  - avg_screen_dist    : mean of signal_logs.screen_distance

Degradation detection
---------------------
Uses a 4-week rolling window. If:
  1. Acuity score dropped > DEGRADATION_ACUITY_DROP_PCT % over the window, AND
  2. Mean strain score over the same window is > DEGRADATION_HIGH_STRAIN_THRESHOLD
then the function flags "Vision Degradation Risk" and builds an advisory message.

Public API
----------
    from backend.vision_acuity.degradation_tracker import get_degradation_report
    report = get_degradation_report()   # → dict (see below for schema)
"""

import sys
import os
import warnings
from datetime import datetime, timezone, timedelta
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))))

from sqlalchemy import text

from backend.config import (
    DEGRADATION_WEEK_SAMPLE_DAYS,
    DEGRADATION_ROLLING_WEEKS,
    DEGRADATION_ACUITY_DROP_PCT,
    DEGRADATION_HIGH_STRAIN_THRESHOLD,
)
from backend.database.db import SessionLocal, init_db

# ── Snellen fraction → numeric score ──────────────────────────────────────────
SNELLEN_NUMERIC: dict[str, float] = {
    "20/200": 0.10,
    "20/100": 0.20,
    "20/70":  0.29,
    "20/50":  0.40,
    "20/40":  0.50,
    "20/30":  0.67,
    "20/25":  0.80,
    "20/20":  1.00,
    "NONE":   0.00,
}


# ══════════════════════════════════════════════════════════════════════════════
def _iso_week_label(dt: datetime) -> str:
    """Return 'YYYY-WW' string for the ISO week of a datetime."""
    iso = dt.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def _week_start(dt: datetime) -> datetime:
    """Return the Monday of the ISO week containing *dt* (midnight UTC)."""
    return (dt - timedelta(days=dt.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0)


# ══════════════════════════════════════════════════════════════════════════════
def get_weekly_acuity_data() -> list[dict[str, Any]]:
    """
    Return a list of weekly summary dicts sorted oldest → newest.

    Each dict:
        week_label      : str      "2025-W12"
        week_start      : datetime
        avg_acuity      : float    mean numeric acuity score (0–1)
        avg_strain      : float    mean strain score (0–100)
        avg_blink_rate  : float    mean blink_rate signal (0–1)
        avg_squint      : float    mean squint_ratio signal (0–1)
        avg_screen_dist : float    mean screen_distance signal (0–1)
        test_count      : int      number of acuity tests that week
    """
    try:
        init_db()
        db = SessionLocal()

        # ── Pull all acuity test rows ──────────────────────────────────────────
        acuity_rows = db.execute(
            text("SELECT timestamp, snellen_fraction FROM acuity_logs "
                 "ORDER BY timestamp ASC")
        ).fetchall()

        # ── Pull all signal_log rows ───────────────────────────────────────────
        signal_rows = db.execute(
            text("SELECT timestamp, strain_score, blink_rate, "
                 "squint_ratio, screen_distance "
                 "FROM signal_logs ORDER BY timestamp ASC")
        ).fetchall()

        db.close()

    except Exception as exc:
        warnings.warn(f"[DegradationTracker] DB read failed: {exc}")
        return []

    if not acuity_rows:
        return []

    # ── Group acuity tests by week ────────────────────────────────────────────
    week_acuity: dict[str, list[float]] = {}
    week_starts: dict[str, datetime] = {}

    for row in acuity_rows:
        try:
            # timestamp may be stored as ISO string or datetime object
            ts_raw = row[0]
            if isinstance(ts_raw, str):
                ts = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
            else:
                ts = ts_raw
            fraction = row[1] or "NONE"
            score = SNELLEN_NUMERIC.get(fraction, 0.0)
            label = _iso_week_label(ts)
            week_acuity.setdefault(label, []).append(score)
            if label not in week_starts:
                week_starts[label] = _week_start(ts)
        except Exception:
            continue

    # ── Group signal logs by week ──────────────────────────────────────────────
    week_signals: dict[str, dict[str, list[float]]] = {}

    for row in signal_rows:
        try:
            ts_raw = row[0]
            if isinstance(ts_raw, str):
                ts = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
            else:
                ts = ts_raw
            label = _iso_week_label(ts)
            bucket = week_signals.setdefault(label, {
                "strain": [], "blink": [], "squint": [], "dist": []
            })
            if row[1] is not None:
                bucket["strain"].append(float(row[1]))
            if row[2] is not None:
                bucket["blink"].append(float(row[2]))
            if row[3] is not None:
                bucket["squint"].append(float(row[3]))
            if row[4] is not None:
                bucket["dist"].append(float(row[4]))
        except Exception:
            continue

    # ── Build weekly summary list ──────────────────────────────────────────────
    def safe_mean(lst: list) -> float:
        return float(sum(lst) / len(lst)) if lst else 0.0

    summaries: list[dict] = []
    for label in sorted(week_acuity.keys()):
        sig = week_signals.get(label, {})
        summaries.append({
            "week_label":      label,
            "week_start":      week_starts.get(label),
            "avg_acuity":      round(safe_mean(week_acuity[label]), 4),
            "avg_strain":      round(safe_mean(sig.get("strain", [])), 2),
            "avg_blink_rate":  round(safe_mean(sig.get("blink", [])), 4),
            "avg_squint":      round(safe_mean(sig.get("squint", [])), 4),
            "avg_screen_dist": round(safe_mean(sig.get("dist", [])), 4),
            "test_count":      len(week_acuity[label]),
        })

    return summaries


# ══════════════════════════════════════════════════════════════════════════════
def get_degradation_report() -> dict[str, Any]:
    """
    Analyse weekly data and detect if a Vision Degradation Risk exists.

    Returns
    -------
    dict with keys:
        risk_detected       : bool
        summary_text        : str   — human-readable advisory
        acuity_drop_pct     : float — % drop over rolling window (positive = worse)
        avg_strain_window   : float — mean strain over rolling window
        avg_squint_window   : float — mean squint over rolling window
        weeks_analysed      : int
        oldest_week         : str | None
        newest_week         : str | None
        weekly_data         : list[dict]  — full week-by-week breakdown
    """
    weekly = get_weekly_acuity_data()

    base_report: dict[str, Any] = {
        "risk_detected":     False,
        "summary_text":      "",
        "acuity_drop_pct":   0.0,
        "avg_strain_window": 0.0,
        "avg_squint_window": 0.0,
        "weeks_analysed":    len(weekly),
        "oldest_week":       weekly[0]["week_label"]  if weekly else None,
        "newest_week":       weekly[-1]["week_label"] if weekly else None,
        "weekly_data":       weekly,
    }

    if len(weekly) < 2:
        base_report["summary_text"] = (
            "Not enough data yet. Complete at least 2 visual acuity tests "
            "in separate weeks to enable trend tracking."
        )
        return base_report

    # ── Rolling window: take the last DEGRADATION_ROLLING_WEEKS entries ─────
    window = weekly[-DEGRADATION_ROLLING_WEEKS:]

    oldest_acuity = window[0]["avg_acuity"]
    newest_acuity = window[-1]["avg_acuity"]

    # Drop is positive when vision gets worse (acuity score decreases)
    if oldest_acuity > 0:
        drop_pct = ((oldest_acuity - newest_acuity) / oldest_acuity) * 100.0
    else:
        drop_pct = 0.0

    avg_strain  = float(sum(w["avg_strain"]  for w in window) / len(window))
    avg_squint  = float(sum(w["avg_squint"]  for w in window) / len(window))
    avg_acuity  = float(sum(w["avg_acuity"]  for w in window) / len(window))

    # Convert numeric acuity back to approximate Snellen for the message
    # Find closest matching fraction
    def acuity_to_snellen(score: float) -> str:
        best_frac = "20/200"
        best_diff = float("inf")
        for frac, val in SNELLEN_NUMERIC.items():
            if frac == "NONE":
                continue
            diff = abs(val - score)
            if diff < best_diff:
                best_diff = diff
                best_frac = frac
        return best_frac

    approx_current = acuity_to_snellen(newest_acuity)
    approx_oldest  = acuity_to_snellen(oldest_acuity)

    base_report["acuity_drop_pct"]   = round(drop_pct, 1)
    base_report["avg_strain_window"] = round(avg_strain, 1)
    base_report["avg_squint_window"] = round(avg_squint, 4)

    # ── Degradation detection ─────────────────────────────────────────────────
    risk = (drop_pct > DEGRADATION_ACUITY_DROP_PCT and
            avg_strain > DEGRADATION_HIGH_STRAIN_THRESHOLD)

    base_report["risk_detected"] = risk

    if risk:
        weeks_span = len(window)
        squint_pct = round(avg_squint * 100, 1)
        base_report["summary_text"] = (
            f"Your estimated visual acuity dropped ~{drop_pct:.0f}% over the last "
            f"{weeks_span} week(s) (from ~{approx_oldest} to ~{approx_current}). "
            f"This correlates with high strain scores (avg {avg_strain:.0f}/100) "
            f"and increased squinting ({squint_pct}% frequency). "
            f"Consider consulting an eye specialist and increasing your screen "
            f"break frequency."
        )
    elif drop_pct > DEGRADATION_ACUITY_DROP_PCT:
        # Drop detected but strain not elevated — may be fatigue-based
        base_report["summary_text"] = (
            f"Minor acuity drop of ~{drop_pct:.0f}% detected over the last "
            f"{len(window)} week(s). Strain scores are within normal range "
            f"(avg {avg_strain:.0f}/100). Monitor over the coming weeks."
        )
    elif avg_strain > DEGRADATION_HIGH_STRAIN_THRESHOLD:
        # High strain but acuity holding steady — warn proactively
        base_report["summary_text"] = (
            f"Consistently high strain scores (avg {avg_strain:.0f}/100) detected "
            f"but acuity is stable at ~{approx_current}. "
            f"Your acuity may be compensating through increased squinting "
            f"({round(avg_squint * 100, 1)}%). Maintain regular breaks."
        )
    else:
        base_report["summary_text"] = (
            f"Vision appears stable. Estimated acuity ~{approx_current}. "
            f"Average strain {avg_strain:.0f}/100 over the last {len(window)} week(s). "
            f"Keep maintaining regular eye breaks."
        )

    return base_report


# ── CLI convenience for quick inspection ──────────────────────────────────────
if __name__ == "__main__":
    import sys
    # Force UTF-8 output to avoid charmap errors on Windows terminals
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")
        
    report = get_degradation_report()
    print("\n  -- Vision Degradation Report --------------------------")
    print(f"  Risk Detected:  {report['risk_detected']}")
    print(f"  Acuity Drop:    {report['acuity_drop_pct']:.1f}%")
    print(f"  Avg Strain:     {report['avg_strain_window']:.1f}/100")
    print(f"  Weeks analysed: {report['weeks_analysed']}")
    print(f"\n  {report['summary_text']}")
    print()
