"""
Signal: Scleral Redness Estimation
Analyses the colour of the eye white (sclera) region to estimate redness.
Marked EXPERIMENTAL — accuracy is webcam-dependent.

Method:
    1. Locate scleral ROI using eye corner landmarks (left/right of iris)
    2. Sample pixel colours in that region
    3. Compute red-channel dominance ratio relative to green/blue
    4. Compare to baseline — deviation indicates redness

Landmarks (scleral ROI approximation):
    Left eye: outer corner (33), inner corner (133), iris edges (468)
    Right eye: outer corner (263), inner corner (362), iris edges (473)
"""
import numpy as np


class ScleralRednessSignal:
    """
    EXPERIMENTAL. Outputs redness deviation score (0–1).
    Score 0 = baseline colour; 1 = significant redness detected.
    """

    def __init__(self):
        self._baseline_redness: float | None = None
        self._samples: list[float] = []
        self._calibrated = False

    def _scleral_roi(self, landmarks, eye_corners: list, frame) -> np.ndarray | None:
        """Extract pixel patch from scleral region."""
        h, w = frame.shape[:2]
        pts = [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in eye_corners]
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        x1, x2 = max(0, min(xs)), min(w, max(xs))
        y1, y2 = max(0, min(ys)), min(h, max(ys))
        if x2 - x1 < 2 or y2 - y1 < 2:
            return None
        return frame[y1:y2, x1:x2]

    def _redness_score(self, patch: np.ndarray) -> float:
        """R / (R + G + B) ratio — higher = more red."""
        r = float(np.mean(patch[:, :, 2]))   # OpenCV uses BGR → index 2 is R
        g = float(np.mean(patch[:, :, 1]))
        b = float(np.mean(patch[:, :, 0]))
        total = r + g + b
        return r / total if total > 0 else 0.33

    def update(self, landmarks, bgr_frame: np.ndarray) -> float:
        """
        Args:
            landmarks: Face Mesh landmark list
            bgr_frame: Full BGR frame from OpenCV
        """
        LEFT_CORNERS = [33, 133]
        RIGHT_CORNERS = [263, 362]

        left_patch = self._scleral_roi(landmarks, LEFT_CORNERS, bgr_frame)
        right_patch = self._scleral_roi(landmarks, RIGHT_CORNERS, bgr_frame)

        scores = []
        for patch in [left_patch, right_patch]:
            if patch is not None and patch.size > 0:
                scores.append(self._redness_score(patch))

        if not scores:
            return 0.0

        current = float(np.mean(scores))

        if not self._calibrated:
            self._samples.append(current)
            if len(self._samples) >= 150:
                self._baseline_redness = float(np.mean(self._samples))
                self._calibrated = True
            return 0.0

        deviation = max(0.0, current - self._baseline_redness)
        return min(1.0, deviation / 0.15)   # 0.15 R-ratio deviation = max score
