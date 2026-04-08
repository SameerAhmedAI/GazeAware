"""
Tests — Strain Fusion Engine (Phase 2)
"""
import pytest
from backend.fusion.strain_engine import StrainFusionEngine


def test_zero_signals():
    engine = StrainFusionEngine()
    score = engine.compute({})
    assert score == 0.0


def test_all_max_signals():
    engine = StrainFusionEngine()
    all_max = {
        "blink_rate": 1.0, "blink_quality": 1.0, "screen_distance": 1.0,
        "squint": 1.0, "gaze_entropy": 1.0, "blink_irregularity": 1.0,
        "posture_lean": 1.0, "eye_rubbing": 1.0, "scleral_redness": 1.0,
    }
    score = engine.compute(all_max)
    assert score == 100.0


def test_partial_signals():
    engine = StrainFusionEngine()
    half = {k: 0.5 for k in [
        "blink_rate", "blink_quality", "screen_distance", "squint",
        "gaze_entropy", "blink_irregularity", "posture_lean", "eye_rubbing", "scleral_redness",
    ]}
    score = engine.compute(half)
    assert 49.0 <= score <= 51.0


def test_classify_normal():
    engine = StrainFusionEngine()
    assert engine.classify(20.0) == "GREEN"


def test_classify_critical():
    engine = StrainFusionEngine()
    assert engine.classify(80.0) == "RED"
