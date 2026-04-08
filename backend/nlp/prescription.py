"""
GazeAware — Real-Time Prescription Engine  (Phase 1)
═════════════════════════════════════════════════════
Fires hardcoded exercise prescriptions when strain reaches RED zone (71+)
for more than 10 consecutive seconds.

5 prescription rules (hardcoded, Claude API integration comes in Phase 2):

    1. Low blink rate      → "CLOSE EYES FULLY, HOLD 3 SECONDS, REPEAT 10 TIMES"
    2. High squint ratio   → "RELAX JAW AND FOREHEAD, LOOK AWAY FROM SCREEN NOW"
    3. Too close to screen → "LEAN BACK, INCREASE DISTANCE TO AT LEAST 50CM"
    4. High gaze entropy   → "PICK ONE POINT 6 METERS AWAY, HOLD GAZE FOR 20 SECONDS"
    5. Critical strain 90+ → "COVER EYES WITH WARM PALMS FOR 45 SECONDS — PALMING NOW"

When no single trigger wins, the most severe general rule fires.
"""

import time
from datetime import datetime, timezone

from backend.database.db import SessionLocal, init_db
from backend.database.models import Prescription as DBPrescription


# ── Red-zone persistence gate ─────────────────────────────────────────────────
RED_ZONE_THRESHOLD    = 71.0
RED_ZONE_HOLD_SECONDS = 10.0    # Must stay RED for this long before firing
COOLDOWN_SECONDS      = 120.0   # Minimum gap between consecutive prescriptions

# ── Signal thresholds that trigger specific rules ─────────────────────────────
LOW_BLINK_THRESHOLD  = 0.50    # blink_rate signal > this = "too low"
HIGH_SQUINT_THRESHOLD = 0.50   # squint signal > this = "too much squinting"
CLOSE_DISTANCE_THRESHOLD = 0.55  # screen_distance signal > this = "too close"
HIGH_ENTROPY_THRESHOLD  = 0.65  # gaze_entropy signal > this = scattered


# ── Prescription definitions ──────────────────────────────────────────────────
PRESCRIPTIONS = {
    "low_blink": {
        "title":   "BLINK EXERCISE",
        "text":    "CLOSE EYES FULLY, HOLD 3 SECONDS, REPEAT 10 TIMES",
        "signal":  "blink_rate",
    },
    "high_squint": {
        "title":   "RELAX EYES",
        "text":    "RELAX JAW AND FOREHEAD, LOOK AWAY FROM SCREEN NOW",
        "signal":  "squint",
    },
    "too_close": {
        "title":   "DISTANCE CHECK",
        "text":    "LEAN BACK, INCREASE DISTANCE TO AT LEAST 50CM",
        "signal":  "screen_distance",
    },
    "gaze_entropy": {
        "title":   "FOCUS DRILL",
        "text":    "PICK ONE POINT 6 METERS AWAY, HOLD GAZE FOR 20 SECONDS",
        "signal":  "gaze_entropy",
    },
    "critical_palming": {
        "title":   "PALMING — CRITICAL STRAIN",
        "text":    "COVER EYES WITH WARM PALMS FOR 45 SECONDS — PALMING NOW",
        "signal":  None,  # Score-triggered, not signal-triggered
    },
}


class PrescriptionEngine:
    """
    Phase 1 hardcoded prescription engine.

    Usage:
        engine = PrescriptionEngine(session_id)
        # every 500 ms:
        result = engine.update(strain_score, signal_values)
        # result is None (no prescription) or a prescription dict
    """

    def __init__(self, session_id: int):
        self._session_id       = session_id
        self._red_zone_since:  float | None = None
        self._last_prescription_time: float = 0.0
        self._last_score_at_trigger:  float = 0.0
        self._triggered = False

        init_db()

    # ─────────────────────────────────────────────────────────────────────────
    def update(
        self,
        strain_score: float,
        signal_values: dict,
    ) -> dict | None:
        """
        Feed current strain score and signal values.
        Returns a prescription dict if one fires, else None.

        Prescription dict keys:
            key, title, text, triggered_signals
        """
        now = time.time()

        # Track consecutive RED zone time
        if strain_score >= RED_ZONE_THRESHOLD:
            if self._red_zone_since is None:
                self._red_zone_since = now
        else:
            self._red_zone_since = None
            return None

        # Check how long we've been in RED
        red_duration = now - self._red_zone_since
        if red_duration < RED_ZONE_HOLD_SECONDS:
            return None

        # Respect cooldown between prescriptions
        since_last = now - self._last_prescription_time
        if since_last < COOLDOWN_SECONDS:
            return None

        # Select the appropriate prescription
        prescription = self._select(strain_score, signal_values)

        # Record fire time and score
        self._last_prescription_time  = now
        self._last_score_at_trigger   = strain_score
        self._red_zone_since          = None   # Reset gate after firing

        # Persist to DB
        self._save(prescription, strain_score, signal_values)

        # Print to terminal in CAPS with border
        self._print_prescription(prescription, strain_score)

        return prescription

    # ─────────────────────────────────────────────────────────────────────────
    def _select(self, score: float, signals: dict) -> dict:
        """Pick prescription based on dominant signal or score."""

        # Rule 5: Critical palming — score ≥ 90 always wins
        if score >= 90.0:
            p = PRESCRIPTIONS["critical_palming"].copy()
            p["triggered_signals"] = ["strain_score_critical"]
            return p

        # Rule 1: Low blink rate
        if signals.get("blink_rate", 0.0) >= LOW_BLINK_THRESHOLD:
            p = PRESCRIPTIONS["low_blink"].copy()
            p["triggered_signals"] = ["blink_rate"]
            return p

        # Rule 2: High squint
        if signals.get("squint", 0.0) >= HIGH_SQUINT_THRESHOLD:
            p = PRESCRIPTIONS["high_squint"].copy()
            p["triggered_signals"] = ["squint"]
            return p

        # Rule 3: Too close to screen
        if signals.get("screen_distance", 0.0) >= CLOSE_DISTANCE_THRESHOLD:
            p = PRESCRIPTIONS["too_close"].copy()
            p["triggered_signals"] = ["screen_distance"]
            return p

        # Rule 4: High gaze entropy
        if signals.get("gaze_entropy", 0.0) >= HIGH_ENTROPY_THRESHOLD:
            p = PRESCRIPTIONS["gaze_entropy"].copy()
            p["triggered_signals"] = ["gaze_entropy"]
            return p

        # Default: use general blink exercise (most universally helpful)
        p = PRESCRIPTIONS["low_blink"].copy()
        p["triggered_signals"] = ["general_strain"]
        return p

    # ─────────────────────────────────────────────────────────────────────────
    def _print_prescription(self, prescription: dict, score: float) -> None:
        """Print prescription in CAPS with prominent border."""
        title = prescription["title"]
        text  = prescription["text"]
        signals = ", ".join(prescription.get("triggered_signals", []))

        border = "═" * 56
        inner  = "─" * 56

        print(f"\n  {border}")
        print(f"  ⚠️  PRESCRIPTION TRIGGERED  |  Strain: {score:.0f}/100")
        print(f"  {inner}")
        print(f"  === {title} ===")
        print(f"  {text}")
        print(f"  {inner}")
        print(f"  Triggered by: {signals}")
        print(f"  {border}\n")

    # ─────────────────────────────────────────────────────────────────────────
    def _save(
        self,
        prescription: dict,
        strain_score: float,
        signal_values: dict,
    ) -> None:
        """Persist prescription record to SQLite."""
        import json
        db = SessionLocal()
        try:
            row = DBPrescription(
                session_id        = self._session_id,
                timestamp         = datetime.now(timezone.utc),
                strain_score      = strain_score,
                context           = "screen",
                triggered_signals = json.dumps(
                    prescription.get("triggered_signals", [])
                ),
                prescription_text = prescription["text"],
                recovery_confirmed = 0,
                recovery_time_seconds = None,
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            # Return the DB-assigned id so RecoveryVerifier can update it
            self._last_prescription_db_id = row.id
        finally:
            db.close()

    # ─────────────────────────────────────────────────────────────────────────
    @property
    def last_trigger_score(self) -> float:
        return self._last_score_at_trigger

    # ─────────────────────────────────────────────────────────────────────────
    @property
    def last_prescription_db_id(self) -> int | None:
        return getattr(self, "_last_prescription_db_id", None)
