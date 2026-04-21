"""
GazeAware — Real-Time Prescription Engine  (Phase 2)
══════════════════════════════════════════════════════
Fires exercise prescriptions when strain reaches RED zone (71+) for more
than 10 consecutive seconds (configurable gate), with a 120-second cooldown
between consecutive prescriptions.

Prescription back-ends (controlled by USE_GROQ / GAZEAWARE_USE_GROQ env var):
    True  → GroqEngine  — personalised LLM prescriptions via Groq cloud API
    False → Hardcoded 5-rule engine from Phase 1 (offline / fallback)

The public interface (PrescriptionEngine.update()) is identical regardless of
which back-end is active — main.py and the test suite do not need to change.

Architecture notes
──────────────────
- All thresholds come from backend/config.py — nothing is hardcoded here.
- The 10-second RED gate and 120-second cooldown are always enforced,
  independent of which prescription back-end is selected.
- DB persistence and terminal output are always performed.
"""

import json
import os
import time
import logging
from datetime import datetime, timezone

from backend.database.db import SessionLocal, init_db
from backend.database.models import Prescription as DBPrescription
from backend.config import (
    # Prescription gate / cooldown
    PRESCRIPTION_RED_ZONE_THRESHOLD,
    PRESCRIPTION_RED_ZONE_HOLD_SECONDS,
    PRESCRIPTION_COOLDOWN_SECONDS,
    # Hardcoded-rule thresholds
    PRESCRIPTION_LOW_BLINK_THRESHOLD,
    PRESCRIPTION_HIGH_SQUINT_THRESHOLD,
    PRESCRIPTION_CLOSE_DISTANCE_THRESHOLD,
    PRESCRIPTION_HIGH_ENTROPY_THRESHOLD,
    PRESCRIPTION_CRITICAL_SCORE,
)

logger = logging.getLogger(__name__)

# ── Feature flag — read from environment variable ─────────────────────────────
# Set GAZEAWARE_USE_GROQ=false in .env to revert to hardcoded rules (offline).
USE_GROQ: bool = os.environ.get("GAZEAWARE_USE_GROQ", "true").strip().lower() not in (
    "0", "false", "no", "off",
)


# ── Prescription definitions (hardcoded fallback) ─────────────────────────────
_PRESCRIPTIONS = {
    "low_blink": {
        "title":  "BLINK EXERCISE",
        "text":   "CLOSE EYES FULLY, HOLD 3 SECONDS, REPEAT 10 TIMES",
        "signal": "blink_rate",
    },
    "high_squint": {
        "title":  "RELAX EYES",
        "text":   "RELAX JAW AND FOREHEAD, LOOK AWAY FROM SCREEN NOW",
        "signal": "squint",
    },
    "too_close": {
        "title":  "DISTANCE CHECK",
        "text":   "LEAN BACK, INCREASE DISTANCE TO AT LEAST 50CM",
        "signal": "screen_distance",
    },
    "gaze_entropy": {
        "title":  "FOCUS DRILL",
        "text":   "PICK ONE POINT 6 METERS AWAY, HOLD GAZE FOR 20 SECONDS",
        "signal": "gaze_entropy",
    },
    "critical_palming": {
        "title":  "PALMING — CRITICAL STRAIN",
        "text":   "COVER EYES WITH WARM PALMS FOR 45 SECONDS — PALMING NOW",
        "signal": None,
    },
}


class PrescriptionEngine:
    """
    Unified prescription engine for Phase 1 (hardcoded) and Phase 2 (Groq).

    Usage::

        engine = PrescriptionEngine(session_id)
        # every 500 ms:
        result = engine.update(strain_score, signal_values)
        # result is None (no prescription) or a prescription dict

    Prescription dict keys: key, title, text, triggered_signals
    """

    def __init__(self, session_id: int) -> None:
        self._session_id = session_id
        self._red_zone_since: float | None = None
        self._last_prescription_time: float = 0.0
        self._last_score_at_trigger: float = 0.0
        self._last_prescription_db_id: int | None = None

        init_db()

        # Lazily instantiate GroqEngine only when USE_GROQ is True
        self._groq: object | None = None
        if USE_GROQ:
            try:
                from backend.nlp.groq_engine import GroqEngine
                self._groq = GroqEngine()
                logger.info("PrescriptionEngine: Groq back-end active (model=%s)",
                            os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant"))
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "PrescriptionEngine: Groq initialisation failed (%s) — "
                    "falling back to hardcoded rules.", exc
                )
                self._groq = None

    # ─────────────────────────────────────────────────────────────────────────
    def update(
        self,
        strain_score: float,
        signal_values: dict,
    ) -> dict | None:
        """
        Feed current strain score and signal values.
        Returns a prescription dict if one fires, else None.

        This method name is preserved for backward compatibility.
        Internally it delegates to maybe_prescribe().
        """
        return self.maybe_prescribe(strain_score, signal_values)

    # ─────────────────────────────────────────────────────────────────────────
    def maybe_prescribe(
        self,
        strain_score: float,
        signal_values: dict,
    ) -> dict | None:
        """
        Core gate logic — identical for both Groq and hardcoded back-ends.

        Gate rules (always enforced):
            1. Score must be ≥ RED_ZONE_THRESHOLD (71)
            2. Must have been in RED zone for ≥ RED_ZONE_HOLD_SECONDS (10 s)
            3. At least COOLDOWN_SECONDS (120 s) must have elapsed since last prescription

        Returns
        -------
        dict | None
            Prescription dict with keys: key, title, text, triggered_signals
            None if gate conditions are not met.
        """
        now = time.time()

        # ── Gate 1: Must be in RED zone ───────────────────────────────────────
        if strain_score >= PRESCRIPTION_RED_ZONE_THRESHOLD:
            if self._red_zone_since is None:
                self._red_zone_since = now
        else:
            self._red_zone_since = None
            return None

        # ── Gate 2: Must have been RED for 10+ seconds ────────────────────────
        red_duration = now - self._red_zone_since
        if red_duration < PRESCRIPTION_RED_ZONE_HOLD_SECONDS:
            return None

        # ── Gate 3: Respect cooldown between prescriptions ────────────────────
        if now - self._last_prescription_time < PRESCRIPTION_COOLDOWN_SECONDS:
            return None

        # ── Select prescription text ──────────────────────────────────────────
        prescription = self._generate(strain_score, signal_values)

        # ── Update state ──────────────────────────────────────────────────────
        self._last_prescription_time = now
        self._last_score_at_trigger = strain_score
        self._red_zone_since = None   # Reset gate after firing

        # ── Persist + display ─────────────────────────────────────────────────
        self._save(prescription, strain_score, signal_values)
        self._print_prescription(prescription, strain_score)

        return prescription

    # ─────────────────────────────────────────────────────────────────────────
    def _generate(self, score: float, signals: dict) -> dict:
        """
        Dispatch to Groq or hardcoded rule engine and return a prescription dict.
        """
        if self._groq is not None:
            return self._generate_groq(score, signals)
        return self._select_hardcoded(score, signals)

    # ─────────────────────────────────────────────────────────────────────────
    def _generate_groq(self, score: float, signals: dict) -> dict:
        """Call GroqEngine and wrap its output in the standard prescription dict."""
        try:
            from backend.nlp.context_detector import get_active_context
            context_str = get_active_context()
        except Exception:  # noqa: BLE001
            context_str = "general computer use"

        try:
            text = self._groq.generate_prescription(score, signals, context_str)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Groq generate_prescription raised: %s — using hardcoded fallback.", exc)
            return self._select_hardcoded(score, signals)

        # Determine dominant signal key for triggered_signals list
        dominant_signal = self._dominant_signal(signals)
        return {
            "key":               "groq_generated",
            "title":             "PRESCRIPTION",
            "text":              text,
            "triggered_signals": [dominant_signal],
            "context":           context_str,
        }

    # ─────────────────────────────────────────────────────────────────────────
    def _select_hardcoded(self, score: float, signals: dict) -> dict:
        """Pick prescription based on dominant signal or score (Phase 1 rules)."""

        # Rule 5: Critical palming — score ≥ 90 always wins
        if score >= PRESCRIPTION_CRITICAL_SCORE:
            p = _PRESCRIPTIONS["critical_palming"].copy()
            p["triggered_signals"] = ["strain_score_critical"]
            return p

        # Rule 1: Low blink rate
        if signals.get("blink_rate", 0.0) >= PRESCRIPTION_LOW_BLINK_THRESHOLD:
            p = _PRESCRIPTIONS["low_blink"].copy()
            p["triggered_signals"] = ["blink_rate"]
            return p

        # Rule 2: High squint
        if signals.get("squint", 0.0) >= PRESCRIPTION_HIGH_SQUINT_THRESHOLD:
            p = _PRESCRIPTIONS["high_squint"].copy()
            p["triggered_signals"] = ["squint"]
            return p

        # Rule 3: Too close to screen
        if signals.get("screen_distance", 0.0) >= PRESCRIPTION_CLOSE_DISTANCE_THRESHOLD:
            p = _PRESCRIPTIONS["too_close"].copy()
            p["triggered_signals"] = ["screen_distance"]
            return p

        # Rule 4: High gaze entropy
        if signals.get("gaze_entropy", 0.0) >= PRESCRIPTION_HIGH_ENTROPY_THRESHOLD:
            p = _PRESCRIPTIONS["gaze_entropy"].copy()
            p["triggered_signals"] = ["gaze_entropy"]
            return p

        # Default: general blink exercise
        p = _PRESCRIPTIONS["low_blink"].copy()
        p["triggered_signals"] = ["general_strain"]
        return p

    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _dominant_signal(signals: dict) -> str:
        """Return the key of the highest-valued signal, or 'general_strain'."""
        if not signals:
            return "general_strain"
        return max(signals, key=signals.get)

    # ─────────────────────────────────────────────────────────────────────────
    def _print_prescription(self, prescription: dict, score: float) -> None:
        """Print prescription in CAPS with prominent border."""
        title   = prescription.get("title", "PRESCRIPTION")
        text    = prescription.get("text", "")
        signals = ", ".join(prescription.get("triggered_signals", []))
        context = prescription.get("context", "")
        engine_label = "Groq AI" if self._groq is not None else "hardcoded"

        border = "═" * 56
        inner  = "─" * 56

        print(f"\n  {border}")
        print(f"  ⚠️  PRESCRIPTION TRIGGERED  |  Strain: {score:.0f}/100  [{engine_label}]")
        if context:
            print(f"  Context: {context}")
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
        db = SessionLocal()
        try:
            row = DBPrescription(
                session_id=self._session_id,
                timestamp=datetime.now(timezone.utc),
                strain_score=strain_score,
                context=prescription.get("context", "screen"),
                triggered_signals=json.dumps(
                    prescription.get("triggered_signals", [])
                ),
                prescription_text=prescription["text"],
                recovery_confirmed=0,
                recovery_time_seconds=None,
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            self._last_prescription_db_id = row.id
        finally:
            db.close()

    # ─────────────────────────────────────────────────────────────────────────
    @property
    def last_trigger_score(self) -> float:
        return self._last_score_at_trigger

    @property
    def last_prescription_db_id(self) -> int | None:
        return self._last_prescription_db_id
