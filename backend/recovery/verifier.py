"""
GazeAware — Recovery Verification Loop  (Phase 1)
══════════════════════════════════════════════════
After a prescription fires, monitors the strain score every 500 ms.

Success: strain drops ≥ 15 points within 120 seconds
    → prints "RECOVERED: Strain dropped 87→62. Good job."
    → logs outcome to SQLite (prescriptions table)

Failure: strain does NOT drop within 120 seconds
    → prints "NOT RECOVERED: Try the exercise again."
    → logs outcome to SQLite

Architecture:
    RecoveryVerifier is stateless between prescriptions.
    Create a new instance each time a prescription fires.
"""

import time
from datetime import datetime

from backend.database.db import SessionLocal, init_db
from backend.database.models import Prescription as DBPrescription


# ── Recovery parameters ───────────────────────────────────────────────────────
RECOVERY_DROP_REQUIRED  = 15.0    # Strain points that must drop
RECOVERY_TIMEOUT_SECONDS = 120.0  # Window to achieve recovery


class RecoveryVerifier:
    """
    Tracks strain score after a prescription is delivered.

    Usage:
        verifier = RecoveryVerifier(
            strain_at_prescription=87.0,
            prescription_db_id=42,
        )

        # every 500 ms:
        result = verifier.update(current_score)
        # result: None (still monitoring) or dict with outcome

    Result dict keys:
        status              "confirmed" | "failed"
        start_score         float
        end_score           float
        drop                float
        elapsed_s           float
    """

    def __init__(self, strain_at_prescription: float, prescription_db_id: int | None = None):
        self._start_score     = strain_at_prescription
        self._start_time      = time.time()
        self._db_id           = prescription_db_id
        self._done            = False
        self._min_score_seen  = strain_at_prescription  # Track lowest point

        init_db()

    # ─────────────────────────────────────────────────────────────────────────
    def update(self, current_score: float) -> dict | None:
        """
        Feed the latest strain score.

        Returns:
            None while still monitoring.
            dict with outcome when done (confirmed or failed).
        """
        if self._done:
            return None

        self._min_score_seen = min(self._min_score_seen, current_score)
        elapsed = time.time() - self._start_time
        drop    = self._start_score - current_score

        # ── Recovery confirmed ────────────────────────────────────────────────
        if drop >= RECOVERY_DROP_REQUIRED:
            self._done = True
            result = {
                "status":      "confirmed",
                "start_score": self._start_score,
                "end_score":   current_score,
                "drop":        round(drop, 1),
                "elapsed_s":   round(elapsed, 1),
            }
            self._print_outcome(result)
            self._save_outcome(result)
            return result

        # ── Timeout — recovery failed ─────────────────────────────────────────
        if elapsed >= RECOVERY_TIMEOUT_SECONDS:
            self._done = True
            result = {
                "status":      "failed",
                "start_score": self._start_score,
                "end_score":   current_score,
                "drop":        round(drop, 1),
                "elapsed_s":   round(elapsed, 1),
            }
            self._print_outcome(result)
            self._save_outcome(result)
            return result

        return None  # Still monitoring

    # ─────────────────────────────────────────────────────────────────────────
    def is_done(self) -> bool:
        return self._done

    # ─────────────────────────────────────────────────────────────────────────
    def _print_outcome(self, result: dict) -> None:
        """Print clear terminal feedback on recovery outcome."""
        start = result["start_score"]
        end   = result["end_score"]
        drop  = result["drop"]
        t     = result["elapsed_s"]

        border = "─" * 52

        if result["status"] == "confirmed":
            print(f"\n  {border}")
            print(f"  ✅ RECOVERED: Strain dropped {start:.0f}→{end:.0f}  "
                  f"(−{drop:.0f} pts in {t:.0f}s). Good job.")
            print(f"  {border}\n")
        else:
            print(f"\n  {border}")
            print(f"  ❌ NOT RECOVERED: Strain {start:.0f}→{end:.0f}  "
                  f"(only −{drop:.0f} pts after {t:.0f}s). Try the exercise again.")
            print(f"  {border}\n")

    # ─────────────────────────────────────────────────────────────────────────
    def _save_outcome(self, result: dict) -> None:
        """Update the prescription row in SQLite with recovery outcome."""
        if self._db_id is None:
            return

        db = SessionLocal()
        try:
            row = db.query(DBPrescription).filter(
                DBPrescription.id == self._db_id
            ).first()

            if row:
                row.recovery_confirmed    = 1 if result["status"] == "confirmed" else 0
                row.recovery_time_seconds = int(result["elapsed_s"])
                db.commit()
        finally:
            db.close()
