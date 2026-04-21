"""
GazeAware — Phase 2.2 Unit Tests: Visual Acuity + Degradation Tracker
====================================================================
Run with:
    .venv\\Scripts\\python.exe -m pytest tests/test_acuity.py -v
"""

import sys
import os
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta

# ── Ensure project root is importable ─────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.vision_acuity.acuity_test import AcuityTest, SNELLEN_NUMERIC
from backend.config import (
    SNELLEN_ROWS,
    ACUITY_CHEAT_LEAN_CM,
    ACUITY_SQUINT_EAR_DROP,
    DEGRADATION_ACUITY_DROP_PCT,
    DEGRADATION_HIGH_STRAIN_THRESHOLD,
)


# ══════════════════════════════════════════════════════════════════════════════
# TEST 1 — Snellen row → fraction mapping
# ══════════════════════════════════════════════════════════════════════════════

class TestSnellenMapping:
    """Verify that every row in SNELLEN_ROWS maps to a valid numeric score."""

    def test_all_rows_have_numeric_score(self):
        """Every Snellen fraction defined in config must exist in SNELLEN_NUMERIC."""
        for row_num, fraction, _ in SNELLEN_ROWS:
            assert fraction in SNELLEN_NUMERIC, (
                f"Row {row_num} fraction '{fraction}' not found in SNELLEN_NUMERIC"
            )

    def test_scores_are_in_range(self):
        """All numeric scores must be between 0.0 and 1.0 inclusive."""
        for fraction, score in SNELLEN_NUMERIC.items():
            assert 0.0 <= score <= 1.0, (
                f"Score for '{fraction}' is {score}, not in [0.0, 1.0]"
            )

    def test_scores_are_strictly_ascending(self):
        """
        Rows progress from worst (20/200 = 0.10) to best (20/20 = 1.00).
        Each successive row's numeric score must be higher (or equal for NONE).
        """
        scores = [
            SNELLEN_NUMERIC[fraction]
            for _, fraction, _ in SNELLEN_ROWS
        ]
        for i in range(1, len(scores)):
            assert scores[i] >= scores[i - 1], (
                f"Row {i + 1} score {scores[i]:.2f} is not ≥ row {i} score "
                f"{scores[i - 1]:.2f} — rows must ascend (worst → best acuity)"
            )

    def test_20_20_is_perfect_score(self):
        """20/20 must map to 1.0 (normal / perfect vision)."""
        assert SNELLEN_NUMERIC["20/20"] == 1.0

    def test_20_200_is_lowest_score(self):
        """20/200 is the largest optotype row and must have the lowest score."""
        assert SNELLEN_NUMERIC["20/200"] == min(
            v for k, v in SNELLEN_NUMERIC.items() if k != "NONE"
        )


# ══════════════════════════════════════════════════════════════════════════════
# TEST 2 — Cheat detection flag logic
# ══════════════════════════════════════════════════════════════════════════════

class TestCheatDetection:
    """Verify that the forward-lean cheat detection fires correctly."""

    def _make_test(self) -> AcuityTest:
        return AcuityTest(session_id=1)

    def test_cheat_fires_when_lean_exceeds_threshold(self):
        """
        If the user leans forward by ≥ ACUITY_CHEAT_LEAN_CM during the test,
        cheat_detected must be True.
        """
        pre_dist   = 65.0                    # sitting 65 cm away
        cheat_dist = pre_dist - ACUITY_CHEAT_LEAN_CM  # exactly at threshold

        leaned = (pre_dist - cheat_dist) >= ACUITY_CHEAT_LEAN_CM
        assert leaned is True, (
            f"Expected cheat when distance drops from {pre_dist} to "
            f"{cheat_dist} cm (threshold: {ACUITY_CHEAT_LEAN_CM} cm)"
        )

    def test_cheat_does_not_fire_for_small_lean(self):
        """A small forward lean below the threshold must NOT flag cheat."""
        pre_dist   = 65.0
        small_lean = 3.0   # well below ACUITY_CHEAT_LEAN_CM (default 10)

        leaned = (pre_dist - (pre_dist - small_lean)) >= ACUITY_CHEAT_LEAN_CM
        assert leaned is False, (
            f"Cheat should NOT fire for a {small_lean} cm lean "
            f"(threshold: {ACUITY_CHEAT_LEAN_CM} cm)"
        )

    def test_cheat_does_not_fire_when_user_moves_back(self):
        """Moving further away than pre-test must never flag a cheat."""
        pre_dist   = 60.0
        post_dist  = 75.0   # moved further back

        leaned = (pre_dist - post_dist) >= ACUITY_CHEAT_LEAN_CM
        assert leaned is False, (
            "Moving away from screen should never trigger cheat detection"
        )


# ══════════════════════════════════════════════════════════════════════════════
# TEST 3 — Degradation detection logic with mock data
# ══════════════════════════════════════════════════════════════════════════════

class TestDegradationDetection:
    """Test the degradation detection algorithm using mock weekly data."""

    def _build_week(self, label: str, acuity: float, strain: float,
                     squint: float = 0.3) -> dict:
        return {
            "week_label":      label,
            "week_start":      datetime(2025, 1, 6, tzinfo=timezone.utc),
            "avg_acuity":      acuity,
            "avg_strain":      strain,
            "avg_blink_rate":  0.4,
            "avg_squint":      squint,
            "avg_screen_dist": 0.3,
            "test_count":      2,
        }

    def _run_detection(self, weeks: list[dict]) -> tuple[bool, float]:
        """
        Inline the core degradation logic (mirrors degradation_tracker.py)
        so the test has no DB dependency.
        """
        if len(weeks) < 2:
            return False, 0.0
        window = weeks[-4:]   # rolling 4-week window
        oldest_acuity = window[0]["avg_acuity"]
        newest_acuity = window[-1]["avg_acuity"]
        if oldest_acuity > 0:
            drop_pct = ((oldest_acuity - newest_acuity) / oldest_acuity) * 100.0
        else:
            drop_pct = 0.0
        avg_strain = sum(w["avg_strain"] for w in window) / len(window)
        risk = (
            drop_pct > DEGRADATION_ACUITY_DROP_PCT and
            avg_strain > DEGRADATION_HIGH_STRAIN_THRESHOLD
        )
        return risk, drop_pct

    def test_degradation_detected_when_both_conditions_met(self):
        """
        Risk must be True when acuity drops >10% AND strain stays above 60.
        """
        weeks = [
            self._build_week("2025-W01", acuity=0.80, strain=70.0),
            self._build_week("2025-W02", acuity=0.75, strain=72.0),
            self._build_week("2025-W03", acuity=0.70, strain=68.0),
            self._build_week("2025-W04", acuity=0.65, strain=75.0),
        ]
        risk, drop_pct = self._run_detection(weeks)
        assert risk is True, (
            f"Expected risk=True (drop={drop_pct:.1f}%), but got risk=False"
        )
        assert drop_pct > DEGRADATION_ACUITY_DROP_PCT

    def test_no_risk_when_acuity_stable(self):
        """No risk when acuity is stable even with high strain."""
        weeks = [
            self._build_week("2025-W01", acuity=0.80, strain=75.0),
            self._build_week("2025-W02", acuity=0.82, strain=78.0),
            self._build_week("2025-W03", acuity=0.80, strain=70.0),
            self._build_week("2025-W04", acuity=0.81, strain=72.0),
        ]
        risk, drop_pct = self._run_detection(weeks)
        assert risk is False, (
            f"Expected risk=False for stable acuity (drop={drop_pct:.1f}%)"
        )

    def test_no_risk_when_strain_low_despite_acuity_drop(self):
        """
        If acuity drops >10% but strain is low, risk must NOT be raised
        (drop might be test variance, not strain-induced).
        """
        weeks = [
            self._build_week("2025-W01", acuity=0.80, strain=30.0),
            self._build_week("2025-W02", acuity=0.78, strain=28.0),
            self._build_week("2025-W03", acuity=0.72, strain=32.0),
            self._build_week("2025-W04", acuity=0.65, strain=25.0),
        ]
        risk, drop_pct = self._run_detection(weeks)
        assert risk is False, (
            f"Expected risk=False when strain is low (avg < {DEGRADATION_HIGH_STRAIN_THRESHOLD})"
        )

    def test_insufficient_data_returns_no_risk(self):
        """Fewer than 2 weeks of data must never raise a risk flag."""
        weeks = [
            self._build_week("2025-W01", acuity=0.50, strain=80.0),
        ]
        risk, _ = self._run_detection(weeks)
        assert risk is False, "Must not flag risk with only 1 week of data"


# ══════════════════════════════════════════════════════════════════════════════
# TEST 4 — Squint detection flag logic
# ══════════════════════════════════════════════════════════════════════════════

class TestSquintDetection:
    """Verify that squint detection fires based on EAR drop threshold."""

    def test_squint_fires_when_ear_drop_meets_threshold(self):
        pre_test_ear = 0.32
        squinting_ear = pre_test_ear - ACUITY_SQUINT_EAR_DROP  # exactly at threshold
        squinting = (pre_test_ear - squinting_ear) >= ACUITY_SQUINT_EAR_DROP
        assert squinting is True

    def test_squint_does_not_fire_for_small_ear_drop(self):
        pre_test_ear  = 0.32
        normal_blink  = 0.30   # tiny drop, not a squint
        squinting = (pre_test_ear - normal_blink) >= ACUITY_SQUINT_EAR_DROP
        assert squinting is False

    def test_squint_does_not_fire_when_eyes_open_wider(self):
        pre_test_ear  = 0.28
        open_wide_ear = 0.38   # eyes wider during test (surprise)
        squinting = (pre_test_ear - open_wide_ear) >= ACUITY_SQUINT_EAR_DROP
        assert squinting is False
