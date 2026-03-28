"""
GazeAware — Recovery Verification Loop
Monitors the strain score during and after a prescription exercise
to verify whether recovery actually occurred.

Recovery confirmed:  strain drops ≥ 15 points within the timeout window
Recovery failed:     strain does not drop within timeout → follow-up prompt
"""
import time
from backend.config import STRAIN_CRITICAL


RECOVERY_DROP_THRESHOLD = 15.0    # Points of strain score drop required
RECOVERY_TIMEOUT_SECONDS = 120.0  # Max wait time


class RecoveryVerifier:
    """
    Tracks strain score after a prescription is delivered and
    determines whether recovery was successful.
    """

    def __init__(self, strain_at_prescription: float):
        self._start_score = strain_at_prescription
        self._start_time = time.time()
        self._confirmed = False
        self._recovery_time: float | None = None

    def update(self, current_score: float) -> dict:
        """
        Call every 500ms with the current strain score.

        Returns:
            {
                "status": "monitoring" | "confirmed" | "failed",
                "elapsed_s": float,
                "recovery_time_s": float | None,
            }
        """
        elapsed = time.time() - self._start_time

        drop = self._start_score - current_score
        if drop >= RECOVERY_DROP_THRESHOLD and not self._confirmed:
            self._confirmed = True
            self._recovery_time = elapsed
            return {
                "status": "confirmed",
                "elapsed_s": elapsed,
                "recovery_time_s": round(elapsed, 1),
            }

        if elapsed >= RECOVERY_TIMEOUT_SECONDS:
            return {
                "status": "failed",
                "elapsed_s": elapsed,
                "recovery_time_s": None,
            }

        return {"status": "monitoring", "elapsed_s": elapsed, "recovery_time_s": None}
