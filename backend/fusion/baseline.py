"""
GazeAware — Personal Baseline Calibration  (Phase 1)
═════════════════════════════════════════════════════
Silently observes the user for 60 seconds on first run, records their
personal resting-state values, then saves the baseline to SQLite.

On subsequent runs the saved baseline is loaded automatically — the user
never sees a calibration prompt.

Baseline captures:
    blink_rate      — blinks per minute
    ear             — eye aspect ratio (proxy for normal eye opening)
    screen_distance — cm from screen

All future strain scores are relative deviations from these values.
"""

import time
import numpy as np
from datetime import datetime

from backend.config import BASELINE_DURATION_SECONDS
from backend.database.db import SessionLocal, init_db
from backend.database.models import Session as DBSession


# Force 60-second calibration per Phase 1 spec
CALIBRATION_SECONDS = 60


class BaselineCalibrator:
    """
    Phase 1 baseline: 60-second silent observation.

    Usage:
        cal = BaselineCalibrator()
        cal.load_or_start(session_id)

        # every 500 ms:
        cal.add_sample(blink_rate, ear, distance_cm, dt=0.5)

        if cal.is_ready:
            baseline = cal.baseline   # dict of personal averages
    """

    def __init__(self):
        self._samples: dict[str, list[float]] = {
            "blink_rate":     [],
            "ear":            [],
            "screen_distance": [],
        }
        self._elapsed: float = 0.0
        self.is_ready: bool = False
        self.baseline: dict[str, float] = {}
        self._session_id: int | None = None
        self._loaded_from_db: bool = False

    # ─────────────────────────────────────────────────────────────────────────
    def load_or_start(self, session_id: int) -> bool:
        """
        Try to load baseline from the most recent DB session.
        Returns True if loaded from DB, False if fresh calibration needed.
        """
        self._session_id = session_id
        init_db()

        db = SessionLocal()
        try:
            # Look for the last session that has a saved baseline
            prev = (
                db.query(DBSession)
                  .filter(
                      DBSession.baseline_blink_rate.isnot(None),
                      DBSession.id != session_id,
                  )
                  .order_by(DBSession.id.desc())
                  .first()
            )
            if prev and prev.baseline_blink_rate:
                self.baseline = {
                    "blink_rate":     prev.baseline_blink_rate,
                    "ear":            prev.baseline_ear or 0.30,
                    "screen_distance": prev.baseline_distance or 60.0,
                }
                self.is_ready = True
                self._loaded_from_db = True
                print(
                    f"\n  [Baseline] ✅ Loaded from previous session: "
                    f"blink={self.baseline['blink_rate']:.1f} bpm  "
                    f"EAR={self.baseline['ear']:.3f}  "
                    f"dist={self.baseline['screen_distance']:.0f} cm\n"
                )
                return True
        finally:
            db.close()

        # No prior baseline — need to calibrate
        progress_chars = CALIBRATION_SECONDS // 5
        print(f"\n  [Baseline] 🔄 No prior baseline found.")
        print(f"  [Baseline] Observing for {CALIBRATION_SECONDS}s — sit normally, work naturally...")
        print(f"  [Baseline] Progress: [{'░' * progress_chars}] 0%\n")
        return False

    # ─────────────────────────────────────────────────────────────────────────
    def add_sample(
        self,
        blink_rate: float,
        ear: float,
        distance_cm: float,
        dt: float = 0.5,
    ) -> None:
        """
        Feed a measurement sample during the calibration window.
        dt = seconds since last call (default 0.5 for 500 ms loop).
        """
        if self.is_ready:
            return

        # Sanity-filter obviously bad values
        if blink_rate >= 0 and ear > 0.05 and distance_cm > 10:
            self._samples["blink_rate"].append(blink_rate)
            self._samples["ear"].append(ear)
            self._samples["screen_distance"].append(distance_cm)

        self._elapsed += dt

        # Print progress every 10 seconds
        if int(self._elapsed) % 10 == 0 and int(self._elapsed) > 0:
            pct = min(100, int(self._elapsed / CALIBRATION_SECONDS * 100))
            filled = pct // 5
            bar = "█" * filled + "░" * (20 - filled)
            print(f"  [Baseline] [{bar}] {pct}%  ({self._elapsed:.0f}s elapsed)")

        if self._elapsed >= CALIBRATION_SECONDS:
            self._finalise()

    # ─────────────────────────────────────────────────────────────────────────
    def _finalise(self) -> None:
        """Average all samples and save to DB."""
        for key, vals in self._samples.items():
            self.baseline[key] = float(np.mean(vals)) if vals else self._defaults()[key]

        self.is_ready = True
        self._save_to_db()

        print(f"\n  [Baseline] ✅ Calibration complete!")
        print(f"  [Baseline]    Blink rate  : {self.baseline['blink_rate']:.1f} bpm")
        print(f"  [Baseline]    EAR         : {self.baseline['ear']:.3f}")
        print(f"  [Baseline]    Distance    : {self.baseline['screen_distance']:.0f} cm\n")

    # ─────────────────────────────────────────────────────────────────────────
    def _defaults(self) -> dict:
        return {"blink_rate": 15.0, "ear": 0.30, "screen_distance": 60.0}

    # ─────────────────────────────────────────────────────────────────────────
    def _save_to_db(self) -> None:
        """Write baseline values into the current session row."""
        if self._session_id is None:
            return
        db = SessionLocal()
        try:
            session_row = db.query(DBSession).filter(DBSession.id == self._session_id).first()
            if session_row:
                session_row.baseline_blink_rate = self.baseline["blink_rate"]
                session_row.baseline_ear        = self.baseline["ear"]
                session_row.baseline_distance   = self.baseline["screen_distance"]
                db.commit()
        finally:
            db.close()

    # ─────────────────────────────────────────────────────────────────────────
    def get_progress(self) -> float:
        """Return calibration progress 0.0 – 1.0."""
        if self.is_ready:
            return 1.0
        return min(1.0, self._elapsed / CALIBRATION_SECONDS)

    # ─────────────────────────────────────────────────────────────────────────
    def get_signal_baselines(self) -> dict:
        """
        Return baseline values normalised to 0–1 scale for each signal,
        so the StrainFusionEngine can use them for deviation scoring.
        """
        if not self.is_ready:
            return {}

        # Express baseline as normalised values comparable to signal outputs
        normal_blink_bpm = self.baseline["blink_rate"]
        return {
            "blink_rate":      0.0,   # At baseline = 0 strain
            "blink_quality":   0.0,
            "screen_distance": 0.0,
            "squint":          0.0,
            "gaze_entropy":    0.3,   # Mild entropy is normal
            "blink_irregularity": 0.0,
            "posture_lean":    0.0,
            "eye_rubbing":     0.0,
            "scleral_redness": 0.0,
        }
