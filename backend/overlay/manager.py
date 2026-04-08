"""
GazeAware — Overlay Manager
════════════════════════════
Single façade that owns both overlay objects so main.py only needs
one import.  Starts both background threads, routes score updates,
and decides when to trigger the forced-recovery animation.

Usage (from main.py):
    from backend.overlay.manager import OverlayManager
    overlays = OverlayManager()
    overlays.start()
    # ... inside monitoring loop:
    overlays.update(score=current_score, zone=current_zone)
    # ... on exit:
    overlays.stop()
"""

import time
from backend.overlay.vitality_ring import VitalityRing
from backend.overlay.forced_recovery import ForcedRecoveryOverlay
from backend.overlay.tfsi_alert import TFSIAlertBanner


# Threshold above which the forced-recovery kicks in
FORCED_RECOVERY_THRESHOLD = 60.0    # ← lowered from 90 so it fires at realistic strain

# Don't re-trigger forced recovery more often than this (seconds)
FORCED_RECOVERY_COOLDOWN  = 120.0   # 2 minutes


class OverlayManager:
    """
    Owns and coordinates both overlays.

    Thread-safe: update() is called from the main monitoring thread.
    """

    def __init__(self):
        self._ring     = VitalityRing()
        self._recovery = ForcedRecoveryOverlay(on_complete=self._on_recovery_done)
        self._tfsi_banner = TFSIAlertBanner()

        self._last_forced_time: float = 0.0
        self._forced_active: bool     = False

    # ── Lifecycle ─────────────────────────────────────────────────────────────
    def start(self) -> None:
        """Launch both overlay threads. Call once at startup."""
        self._ring.start()
        self._recovery.start_thread()
        self._tfsi_banner.start_thread()

    def stop(self) -> None:
        """Gracefully shut down both overlays."""
        self._ring.stop()
        self._recovery.stop()
        self._tfsi_banner.stop()

    # ── Per-tick update ───────────────────────────────────────────────────────
    def update(self, score: float, zone: str) -> None:
        """
        Call every 500 ms (or whenever strain score is updated).
        Keeps the ring current and decides whether to trigger forced recovery.
        """
        # Always push to the vitality ring
        self._ring.update(score=score, zone=zone)

        # Check if we should trigger forced recovery
        now = time.time()
        if (
            score >= FORCED_RECOVERY_THRESHOLD
            and not self._forced_active
            and (now - self._last_forced_time) >= FORCED_RECOVERY_COOLDOWN
        ):
            self._trigger_forced_recovery(score)

    # ── Forced recovery ───────────────────────────────────────────────────────
    def _trigger_forced_recovery(self, score: float) -> None:
        print(
            f"\n  [OVERLAY] ⚠️  Strain at {score:.0f}/100 — "
            f"triggering Forced Recovery overlay...\n"
        )
        self._forced_active    = True
        self._last_forced_time = time.time()
        # Dim the vitality ring while full-screen overlay is active
        self._ring.set_visible(False)
        self._recovery.show()

    def _on_recovery_done(self) -> None:
        """Called by ForcedRecoveryOverlay when the animation finishes."""
        self._forced_active = False
        self._ring.set_visible(True)
        print("\n  [OVERLAY] ✓ Recovery exercise complete — ring restored.\n")

    def notify_tfsi_alert(self, tfsi_result: dict) -> None:
        """Show the TFSI medical banner. Called from main loop when alert_needed=True."""
        self._tfsi_banner.show(tfsi_result)

    # ── Convenience property ──────────────────────────────────────────────────
    @property
    def forced_active(self) -> bool:
        return self._forced_active
