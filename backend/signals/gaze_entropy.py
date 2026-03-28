"""
Signal: Gaze Entropy
Measures how erratically the eyes are moving across the screen.

Method: Shannon entropy of gaze point distribution over a sliding window.
    - Low entropy  → focused, stable gaze (healthy)
    - High entropy → erratic, scattered gaze (fatigue)

Formula:
    H = -Σ p(i) * log2(p(i))

Where p(i) is the probability of gaze landing in grid cell i.
Grid: 8x6 = 48 cells mapped to normalised [0,1] iris coordinates.
"""
import numpy as np
from collections import deque


IRIS_CENTER_LEFT = 468
IRIS_CENTER_RIGHT = 473
GRID_COLS = 8
GRID_ROWS = 6
WINDOW_FRAMES = 60  # ~2 seconds at 30 FPS


class GazeEntropySignal:
    """
    Outputs a normalised gaze entropy score (0–1).
    0 = perfectly stable gaze; 1 = maximum erratic movement.
    """

    def __init__(self):
        self._gaze_points: deque = deque(maxlen=WINDOW_FRAMES)
        self._max_entropy = np.log2(GRID_COLS * GRID_ROWS)  # theoretical max

    def _get_iris_center(self, landmarks) -> tuple[float, float]:
        try:
            lx = landmarks[IRIS_CENTER_LEFT].x
            ly = landmarks[IRIS_CENTER_LEFT].y
            rx = landmarks[IRIS_CENTER_RIGHT].x
            ry = landmarks[IRIS_CENTER_RIGHT].y
            return (lx + rx) / 2, (ly + ry) / 2
        except (IndexError, AttributeError):
            return 0.5, 0.5

    def update(self, landmarks) -> float:
        gx, gy = self._get_iris_center(landmarks)
        # Quantise to grid cell
        col = int(np.clip(gx * GRID_COLS, 0, GRID_COLS - 1))
        row = int(np.clip(gy * GRID_ROWS, 0, GRID_ROWS - 1))
        cell = row * GRID_COLS + col
        self._gaze_points.append(cell)
        return self.get_signal_value()

    def get_signal_value(self) -> float:
        if len(self._gaze_points) < 10:
            return 0.0
        cells = np.array(list(self._gaze_points))
        _, counts = np.unique(cells, return_counts=True)
        probs = counts / counts.sum()
        entropy = -np.sum(probs * np.log2(probs + 1e-9))
        return float(min(1.0, entropy / self._max_entropy))
