"""
Signal: Blink Quality Classifier  (Phase 2 — extended)
════════════════════════════════════════════════════════
Classifies every detected blink as Full or Partial by tracking the minimum
EAR (Eye Aspect Ratio) reached during the blink closure phase.

Classification thresholds (from config.py):
    Full blink   → EAR trough < BLINK_FULL_THRESHOLD (0.15)  — eyelid fully closes
    Partial blink → EAR trough in [0.15, 0.22)               — lazy / incomplete closure
    No blink      → EAR never drops below 0.22                — not counted

Rolling window:
    Keeps a 2-minute sliding window of blink events.
    Computes partial_ratio = partial_blinks / total_blinks in that window.

Signal output (0.0 – 1.0):
    0.0 → all blinks in the window are full (healthy)
    1.0 → all blinks in the window are partial (tear film not refreshing)

Warning:
    Prints once per crossing when partial ratio exceeds BLINK_QUALITY_WARNING_RATIO (60%).

EAR Formula:
    EAR = (||p2-p6|| + ||p3-p5||) / (2 × ||p1-p4||)
    p1–p6 = the 6 MediaPipe eye landmark points (outer corner, lid points, inner corner).
"""

import time
from collections import deque
import numpy as np

from backend.config import (
    EAR_BLINK_THRESHOLD,
    BLINK_FULL_THRESHOLD,
    BLINK_PARTIAL_THRESHOLD,
    BLINK_QUALITY_WINDOW_SECONDS,
    BLINK_QUALITY_WARNING_RATIO,
)


# ── MediaPipe Face Mesh landmark indices ──────────────────────────────────────
LEFT_EYE  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33,  160, 158, 133, 153, 144]


def compute_ear(landmarks, eye_indices: list) -> float:
    """
    Compute Eye Aspect Ratio for one eye.

    Args:
        landmarks: MediaPipe NormalizedLandmarkList
        eye_indices: 6 landmark indices [p1, p2, p3, p4, p5, p6]

    Returns:
        EAR value (float)
    """
    pts = [(landmarks[i].x, landmarks[i].y) for i in eye_indices]

    def dist(a, b):
        return np.linalg.norm(np.array(a) - np.array(b))

    vertical_1 = dist(pts[1], pts[5])
    vertical_2 = dist(pts[2], pts[4])
    horizontal = dist(pts[0], pts[3])
    return float((vertical_1 + vertical_2) / (2.0 * horizontal)) if horizontal > 0 else 0.0


class BlinkQualitySignal:
    """
    Tracks blink quality as the partial-blink ratio over a rolling 2-minute window.

    For each blink event, we track the minimum EAR reached (the deepest trough).
    That trough determines whether the blink was Full, Partial, or skipped.

    Output: get_signal_value() → 0.0 (all-full) … 1.0 (all-partial)
    """

    def __init__(self):
        # Rolling window: deque of (timestamp, is_partial: bool)
        self._blink_events: deque = deque()

        # Per-blink tracking — state machine
        self._in_blink: bool = False
        self._blink_min_ear: float = 1.0   # Minimum EAR seen during current blink

        # Warning state — avoid printing every frame
        self._warning_active: bool = False

    # ─────────────────────────────────────────────────────────────────────────
    def feed_ear(self, avg_ear: float) -> None:
        """
        Feed a raw EAR value from the per-frame detection loop.
        This must be called EVERY frame (not just every 500ms) so that fast
        blink troughs (100–300ms) are not missed by the slower update cycle.

        Call this from the same place blink_rate.record_blink() is called.
        """
        if avg_ear < EAR_BLINK_THRESHOLD:
            # Entering / continuing a blink
            if not self._in_blink:
                self._in_blink = True
                self._blink_min_ear = avg_ear
            else:
                # Track the trough (minimum EAR during closure phase)
                self._blink_min_ear = min(self._blink_min_ear, avg_ear)
        else:
            if self._in_blink:
                # Blink just finished — classify by minimum EAR trough
                self._classify_and_record(self._blink_min_ear)
                self._in_blink = False
                self._blink_min_ear = 1.0

    # ─────────────────────────────────────────────────────────────────────────
    def update(self, landmarks) -> float:
        """
        Legacy 500ms update — computes EAR from landmarks and feeds it.
        Kept for backwards compatibility with the test suite.
        NOTE: In main.py, prefer calling feed_ear(avg_ear) per-frame instead.

        Returns current partial blink ratio (0.0 – 1.0).
        """
        try:
            left_ear  = compute_ear(landmarks, LEFT_EYE)
            right_ear = compute_ear(landmarks, RIGHT_EYE)
            avg_ear   = (left_ear + right_ear) / 2.0
            self.feed_ear(avg_ear)
        except Exception:
            pass
        return self.get_signal_value()

    # ─────────────────────────────────────────────────────────────────────────
    def _classify_and_record(self, min_ear: float) -> None:
        """
        Classify the completed blink and add to the rolling window.

        Full blink   : min_ear < BLINK_FULL_THRESHOLD (0.15)
        Partial blink: BLINK_FULL_THRESHOLD ≤ min_ear < BLINK_PARTIAL_THRESHOLD (0.22)
        Below EAR_BLINK_THRESHOLD but above 0.22 = borderline — counted as partial
        """
        now = time.time()

        if min_ear < BLINK_FULL_THRESHOLD:
            is_partial = False   # Full blink — eyelid fully closed
        elif min_ear < BLINK_PARTIAL_THRESHOLD:
            is_partial = True    # Partial blink — lazy / incomplete closure
        else:
            # EAR dropped below EAR_BLINK_THRESHOLD (0.20) but min was ≥ 0.22
            # This is a very shallow blink — treat as partial
            is_partial = True

        self._blink_events.append((now, is_partial))
        self._prune_window(now)
        self._check_warning()

    # ─────────────────────────────────────────────────────────────────────────
    def _prune_window(self, now: float) -> None:
        """Remove events older than the 2-minute rolling window."""
        cutoff = now - BLINK_QUALITY_WINDOW_SECONDS
        while self._blink_events and self._blink_events[0][0] < cutoff:
            self._blink_events.popleft()

    # ─────────────────────────────────────────────────────────────────────────
    def _check_warning(self) -> None:
        """Print and manage the partial-blink-ratio warning."""
        ratio = self.get_signal_value()

        if ratio >= BLINK_QUALITY_WARNING_RATIO:
            if not self._warning_active:
                pct = int(ratio * 100)
                print(
                    f"\n  ⚠️  BLINK QUALITY WARNING: Tear film not refreshing properly "
                    f"({pct}% partial blinks in last 2 min)\n"
                )
                self._warning_active = True
        else:
            # Reset so the warning can fire again if ratio climbs back up
            self._warning_active = False

    # ─────────────────────────────────────────────────────────────────────────
    def get_signal_value(self) -> float:
        """
        Returns partial blink ratio over the rolling 2-minute window.
        0.0 = all full blinks (healthy); 1.0 = all partial (bad tear film).
        """
        self._prune_window(time.time())
        total = len(self._blink_events)
        if total == 0:
            return 0.0
        partial = sum(1 for _, is_partial in self._blink_events if is_partial)
        return round(partial / total, 3)

    # ─────────────────────────────────────────────────────────────────────────
    def get_stats(self) -> dict:
        """Return diagnostic stats for snapshot printing."""
        total = len(self._blink_events)
        partial = sum(1 for _, p in self._blink_events if p)
        return {
            "total_blinks_2min":   total,
            "partial_blinks_2min": partial,
            "partial_ratio":       self.get_signal_value(),
        }
