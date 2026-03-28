"""
Signal: Eye Rubbing Detection
Uses MediaPipe Hands to detect when the user's hand landmarks
enter the proximity of the eye region on the face.

Method:
    1. Get wrist + fingertip landmarks from MediaPipe Hands
    2. Get bounding box of eye region from Face Mesh
    3. If any hand landmark is within the eye proximity threshold → rubbing detected
"""
import numpy as np


# Face Mesh eye region landmark indices (bounding box approximation)
EYE_REGION_LANDMARKS = [33, 133, 362, 263, 159, 386, 145, 374]

# Detection parameters
PROXIMITY_THRESHOLD_NORM = 0.12   # Normalised coordinate distance


class EyeRubbingSignal:
    """
    Binary + decaying signal for eye rubbing.
    Signal value: 1.0 immediately on detection, decays over 10 seconds.
    """

    def __init__(self, decay_seconds: float = 10.0):
        self.decay_seconds = decay_seconds
        self._last_detected: float | None = None
        import time
        self._time = time

    def update(self, face_landmarks, hand_landmarks_list) -> float:
        """
        Args:
            face_landmarks: MediaPipe Face Mesh result.multi_face_landmarks[0].landmark
            hand_landmarks_list: MediaPipe Hands result.multi_hand_landmarks (list)

        Returns:
            Signal value 0.0–1.0
        """
        if not face_landmarks or not hand_landmarks_list:
            return self.get_signal_value()

        # Build eye bounding box (normalised coords)
        eye_xs = [face_landmarks[i].x for i in EYE_REGION_LANDMARKS]
        eye_ys = [face_landmarks[i].y for i in EYE_REGION_LANDMARKS]
        eye_cx = np.mean(eye_xs)
        eye_cy = np.mean(eye_ys)

        for hand_lm in hand_landmarks_list:
            for lm in hand_lm.landmark:
                dist = np.sqrt((lm.x - eye_cx) ** 2 + (lm.y - eye_cy) ** 2)
                if dist < PROXIMITY_THRESHOLD_NORM:
                    self._last_detected = self._time.time()
                    return 1.0

        return self.get_signal_value()

    def get_signal_value(self) -> float:
        if self._last_detected is None:
            return 0.0
        elapsed = self._time.time() - self._last_detected
        return max(0.0, 1.0 - elapsed / self.decay_seconds)
