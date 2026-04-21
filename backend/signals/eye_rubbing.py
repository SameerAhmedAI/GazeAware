"""
GazeAware — Eye Rubbing Detection  (Phase 2.1)
═══════════════════════════════════════════════
Uses MediaPipe Hands alongside the existing Face Mesh to detect when the
user's hand/finger landmarks enter the proximity of the eye region.

Method:
    1. Extract wrist (landmark 0) and index fingertip (landmark 8) from each
       detected hand.
    2. Get eye region centre from face mesh: average of left eye corners
       (landmarks 33, 133) and right eye corners (landmarks 362, 263).
    3. Compute normalised Euclidean distance between each selected hand
       landmark and each eye centre.
    4. If any distance < EYE_RUBBING_PROXIMITY_THRESHOLD → increment
       rubbing_counter (up to EYE_RUBBING_COUNTER_MAX).
    5. Signal = min(rubbing_counter / EYE_RUBBING_COUNTER_MAX, 1.0)
    6. Each tick without rubbing → counter decays by EYE_RUBBING_DECAY_PER_TICK.

Output: 0.0 (no rubbing) … 1.0 (persistent rubbing)

Interface contract (unchanged from Phase 0 stub):
    class EyeRubbingSignal:
        def compute(face_landmarks, hand_results) -> float
        def update(face_landmarks, hand_landmarks_list) -> float  ← legacy alias
"""

from __future__ import annotations

import numpy as np

from backend.config import (
    EYE_RUBBING_LEFT_EYE_LANDMARKS,
    EYE_RUBBING_RIGHT_EYE_LANDMARKS,
    EYE_RUBBING_WRIST_IDX,
    EYE_RUBBING_FINGERTIP_IDX,
    EYE_RUBBING_PROXIMITY_THRESHOLD,
    EYE_RUBBING_COUNTER_MAX,
    EYE_RUBBING_DECAY_PER_TICK,
)


class EyeRubbingSignal:
    """
    Real-time eye rubbing detector using MediaPipe Hands + Face Mesh.

    Signal value:
        0.0 → no rubbing / hand far from eyes
        1.0 → persistent active rubbing detected

    State is maintained between ticks; signal decays when rubbing stops.
    All exceptions are caught — this module never crashes the main loop.
    """

    def __init__(self) -> None:
        # Counter that builds up during rubbing and decays when hand is removed
        # Range: 0.0 to EYE_RUBBING_COUNTER_MAX (float for smooth decay)
        self._rubbing_counter: float = 0.0

    # ── Primary interface ─────────────────────────────────────────────────────

    def compute(self, face_landmarks, hand_results) -> float:
        """
        Compute the eye rubbing signal for the current frame.

        Args:
            face_landmarks: MediaPipe Face Mesh landmark list
                            (face_results.multi_face_landmarks[0].landmark)
                            May be None if no face detected.
            hand_results:   MediaPipe Hands result object
                            (the full result from hands.process(rgb))
                            May be None if no hands detected.

        Returns:
            float 0.0–1.0
        """
        try:
            return self._compute_signal(face_landmarks, hand_results)
        except Exception:
            # Decay gracefully on error — never crash
            return self._apply_decay_and_return(rubbing_detected=False)

    def update(self, face_landmarks, hand_landmarks_list) -> float:
        """
        Legacy interface compatible with Phase 0 stub signature.
        Accepts hand_landmarks_list directly (multi_hand_landmarks list).

        Args:
            face_landmarks:      MediaPipe Face Mesh landmark list (may be None)
            hand_landmarks_list: list of hand landmark objects (may be None or [])

        Returns:
            float 0.0–1.0
        """
        try:
            return self._compute_signal_from_lists(face_landmarks, hand_landmarks_list)
        except Exception:
            return self._apply_decay_and_return(rubbing_detected=False)

    # ── Internals ─────────────────────────────────────────────────────────────

    def _compute_signal(self, face_landmarks, hand_results) -> float:
        """
        Core computation using the full hand_results object.
        """
        # Extract multi_hand_landmarks from the results object
        hand_landmarks_list = None
        if hand_results is not None:
            try:
                hand_landmarks_list = hand_results.multi_hand_landmarks
            except AttributeError:
                hand_landmarks_list = None

        return self._compute_signal_from_lists(face_landmarks, hand_landmarks_list)

    def _compute_signal_from_lists(self, face_landmarks, hand_landmarks_list) -> float:
        """
        Core detection logic. Works with landmark lists directly.
        """
        # No face → no rubbing possible; decay and return
        if face_landmarks is None:
            return self._apply_decay_and_return(rubbing_detected=False)

        # No hands detected → no rubbing; decay the counter
        if not hand_landmarks_list:
            return self._apply_decay_and_return(rubbing_detected=False)

        # ── Get eye centres from face mesh ────────────────────────────────────
        left_eye_cx, left_eye_cy = self._get_eye_center(
            face_landmarks, EYE_RUBBING_LEFT_EYE_LANDMARKS
        )
        right_eye_cx, right_eye_cy = self._get_eye_center(
            face_landmarks, EYE_RUBBING_RIGHT_EYE_LANDMARKS
        )

        eye_centers = [
            (left_eye_cx, left_eye_cy),
            (right_eye_cx, right_eye_cy),
        ]

        # ── Check each hand for proximity to either eye center ────────────────
        rubbing_detected = False

        for hand_lm in hand_landmarks_list:
            if hand_lm is None:
                continue

            # Extract the two key landmark indices: wrist + index fingertip
            landmark_indices = [EYE_RUBBING_WRIST_IDX, EYE_RUBBING_FINGERTIP_IDX]

            for lm_idx in landmark_indices:
                try:
                    lm = hand_lm.landmark[lm_idx]
                    lm_x, lm_y = lm.x, lm.y
                except (IndexError, AttributeError):
                    continue

                for (eye_cx, eye_cy) in eye_centers:
                    dist = np.sqrt((lm_x - eye_cx) ** 2 + (lm_y - eye_cy) ** 2)
                    if dist < EYE_RUBBING_PROXIMITY_THRESHOLD:
                        rubbing_detected = True
                        break  # one detection is enough for this landmark

                if rubbing_detected:
                    break  # stop checking more landmarks on this hand

            if rubbing_detected:
                break  # stop checking more hands

        return self._apply_decay_and_return(rubbing_detected=rubbing_detected)

    def _get_eye_center(self, face_landmarks, landmark_indices: list) -> tuple[float, float]:
        """
        Compute the center point of an eye from face mesh landmark indices.

        Args:
            face_landmarks:   MediaPipe Face Mesh landmark list
            landmark_indices: list of int landmark indices to average over

        Returns:
            (cx, cy) in normalised [0, 1] coordinates
        """
        xs = [face_landmarks[i].x for i in landmark_indices]
        ys = [face_landmarks[i].y for i in landmark_indices]
        return float(np.mean(xs)), float(np.mean(ys))

    def _apply_decay_and_return(self, rubbing_detected: bool) -> float:
        """
        Update the rubbing counter and return the current signal value.

        If rubbing_detected is True: increment counter (capped at max).
        If False: apply decay per tick.
        """
        if rubbing_detected:
            # Increment counter — each detection tick raises the counter by 1
            self._rubbing_counter = min(
                self._rubbing_counter + 1.0,
                float(EYE_RUBBING_COUNTER_MAX),
            )
        else:
            # Decay — convert per-tick fraction to counter units
            # EYE_RUBBING_DECAY_PER_TICK is the signal decay, so in counter units:
            #   counter_decay = EYE_RUBBING_DECAY_PER_TICK * EYE_RUBBING_COUNTER_MAX
            counter_decay = EYE_RUBBING_DECAY_PER_TICK * EYE_RUBBING_COUNTER_MAX
            self._rubbing_counter = max(0.0, self._rubbing_counter - counter_decay)

        signal = self._rubbing_counter / EYE_RUBBING_COUNTER_MAX
        return round(min(signal, 1.0), 4)

    def get_signal_value(self) -> float:
        """Return current signal value without updating state (read-only)."""
        return round(min(self._rubbing_counter / EYE_RUBBING_COUNTER_MAX, 1.0), 4)
