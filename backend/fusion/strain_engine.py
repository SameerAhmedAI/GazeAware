"""
GazeAware — Live Strain Score Engine  (Phase 1)
════════════════════════════════════════════════
Combines all 9 signal values into a single 0–100 strain score,
updated every 500 ms.

Score zones:
    GREEN   0–40   → relaxed / healthy
    YELLOW 41–70   → mild / moderate strain
    RED    71–100  → danger zone

Usage:
    engine = StrainFusionEngine()
    score, zone, label = engine.compute_and_print(signal_dict, baseline)
"""

import time
from collections import deque
from backend.config import FUSION_WEIGHTS


# ── Zone boundaries (Phase 1 spec) ───────────────────────────────────────────
ZONE_GREEN  = (0,  40)
ZONE_YELLOW = (41, 70)
ZONE_RED    = (71, 100)


class StrainFusionEngine:
    """
    Weighted fusion of 9 signal values → Strain Score (0–100).

    All signal values are expected as 0–1 floats where:
        0 = perfectly healthy
        1 = worst / maximum strain

    The score is calculated as deviation from personal baseline when
    baseline is available, otherwise uses absolute values.
    """

    def __init__(self):
        self._history: deque = deque(maxlen=10)   # last 10 scores (5 s)
        self._last_compute_time: float = 0.0
        self.current_score: float = 0.0
        self.current_zone: str = "GREEN"

    # ─────────────────────────────────────────────────────────────────────────
    def compute(
        self,
        signal_values: dict,
        baseline: dict | None = None,
        modifiers: dict | None = None,
    ) -> float:
        """
        Compute weighted strain score with optional post-fusion modifiers.

        Args:
            signal_values: dict mapping signal name → 0–1 value
                Keys: blink_rate, blink_quality, screen_distance, squint,
                      gaze_entropy, blink_irregularity, posture_lean,
                      eye_rubbing, scleral_redness
            baseline: Optional personal baseline dict from BaselineCalibrator.
                      When provided, scores are relative deviations.
            modifiers: Optional dict of multipliers applied AFTER weighted fusion.
                      Example: {"lighting": 1.15, "distance_drift": 1.08}
                      Each value ≥ 1.0 amplifies the final score.

        Returns:
            Strain score 0–100 (float, rounded to 1 dp)
        """
        weighted_sum = 0.0
        total_weight  = 0.0

        for name, weight in FUSION_WEIGHTS.items():
            raw_val = float(signal_values.get(name, 0.0))
            raw_val = max(0.0, min(1.0, raw_val))

            # (Signal values are already 0-1 normalized by their respective modules)

            weighted_sum += raw_val * weight
            total_weight += weight

        if total_weight == 0:
            return 0.0

        score = (weighted_sum / total_weight) * 100.0

        # ── Apply post-fusion modifiers (lighting, distance drift, etc.) ────────
        if modifiers:
            for mod_name, mod_val in modifiers.items():
                if mod_val and mod_val > 1.0:
                    score *= mod_val

        score = round(min(100.0, score), 1)
        self.current_score = score
        self.current_zone  = self.classify(score)
        self._history.append(score)
        self._last_compute_time = time.time()
        return score

    # ─────────────────────────────────────────────────────────────────────────
    def classify(self, score: float) -> str:
        """Return zone name: GREEN / YELLOW / RED."""
        if score >= 71:
            return "RED"
        elif score >= 41:
            return "YELLOW"
        return "GREEN"

    # ─────────────────────────────────────────────────────────────────────────
    def zone_label(self, zone: str) -> str:
        labels = {
            "GREEN":  "HEALTHY",
            "YELLOW": "MILD STRAIN",
            "RED":    "DANGER ZONE",
        }
        return labels.get(zone, zone)

    # ─────────────────────────────────────────────────────────────────────────
    def print_live(self, score: float, zone: str, extra: str = "") -> None:
        """
        Print strain score to terminal in a clear, colour-coded format.
        Example: Strain Score: 87/100 — DANGER ZONE
        """
        zone_emoji = {"GREEN": "🟢", "YELLOW": "🟡", "RED": "🔴"}.get(zone, "⚪")
        label = self.zone_label(zone)
        bar = self._score_bar(score)
        msg = f"  {zone_emoji}  Strain Score: {score:5.1f}/100  [{bar}]  — {label}"
        if extra:
            msg += f"  | {extra}"
        print(msg)

    # ─────────────────────────────────────────────────────────────────────────
    def _score_bar(self, score: float, width: int = 20) -> str:
        """ASCII progress bar representing 0–100 strain score."""
        filled = int((score / 100.0) * width)
        bar = "█" * filled + "░" * (width - filled)
        return bar

    # ─────────────────────────────────────────────────────────────────────────
    def compute_and_print(
        self,
        signal_values: dict,
        baseline: dict | None = None,
        extra: str = "",
        modifiers: dict | None = None,
    ) -> tuple[float, str, str]:
        """
        Compute score, classify, print to terminal, return (score, zone, label).

        Args:
            signal_values: see compute()
            baseline:      see compute()
            extra:         extra text appended to the live terminal line
            modifiers:     see compute() — dict of post-fusion multipliers
        """
        score = self.compute(signal_values, baseline, modifiers)
        zone  = self.classify(score)
        label = self.zone_label(zone)

        # Include modifier summary in extra line if any are active (clean emoji format)
        if modifiers:
            active_parts = []
            for k, v in modifiers.items():
                if v and v > 1.0:
                    icon = "💡" if k == "light" else "📏" if k == "drift" else f"{k}:"
                    active_parts.append(f"{icon}{v:.2f}×")
            if active_parts:
                extra += "  " + " ".join(active_parts)

        self.print_live(score, zone, extra)
        return score, zone, label

    # ─────────────────────────────────────────────────────────────────────────
    def get_trend(self) -> str:
        """Return trend arrow based on recent history: ↑ ↓ →"""
        if len(self._history) < 4:
            return "→"
        recent = list(self._history)
        delta = recent[-1] - recent[-4]
        if delta > 3:
            return "↑"
        elif delta < -3:
            return "↓"
        return "→"
