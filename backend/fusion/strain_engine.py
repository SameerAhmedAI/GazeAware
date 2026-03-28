"""
GazeAware — Strain Fusion Engine
Combines all 9 signal values into a single 0–100 strain score.

Architecture:
    - Each signal outputs a normalised 0–1 value
    - Weighted sum → mapped to 0–100 scale
    - Personal baseline modulates weights during calibration phase

See config.py for weight values (must sum to 1.0).
"""
from backend.config import FUSION_WEIGHTS, STRAIN_MILD, STRAIN_MODERATE, STRAIN_CRITICAL


class StrainFusionEngine:
    """
    Weighted fusion of all 9 signal values → Strain Score (0–100).

    Usage:
        engine = StrainFusionEngine()
        score = engine.compute(signal_values_dict)
    """

    def compute(self, signal_values: dict[str, float]) -> float:
        """
        Args:
            signal_values: dict mapping signal name → 0–1 value
                Keys: blink_rate, blink_quality, screen_distance, squint,
                      gaze_entropy, blink_irregularity, posture_lean,
                      eye_rubbing, scleral_redness

        Returns:
            Strain score 0–100 (float)
        """
        weighted_sum = 0.0
        total_weight = 0.0

        for name, weight in FUSION_WEIGHTS.items():
            value = signal_values.get(name, 0.0)
            weighted_sum += value * weight
            total_weight += weight

        if total_weight == 0:
            return 0.0

        return round((weighted_sum / total_weight) * 100, 1)

    def classify(self, score: float) -> str:
        """Return severity label for a given strain score."""
        if score >= STRAIN_CRITICAL:
            return "critical"
        elif score >= STRAIN_MODERATE:
            return "moderate"
        elif score >= STRAIN_MILD:
            return "mild"
        return "normal"
