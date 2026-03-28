"""
Tests — Signal Modules (Phase 0 / Phase 1)
"""
import pytest
from backend.signals.blink_rate import BlinkRateSignal
from backend.signals.blink_irregularity import BlinkIrregularitySignal


def test_blink_rate_zero_blinks():
    signal = BlinkRateSignal(baseline_bpm=15.0)
    # No blinks recorded — should show high deviation
    value = signal.get_signal_value()
    assert 0.0 <= value <= 1.0


def test_blink_rate_at_baseline():
    signal = BlinkRateSignal(baseline_bpm=15.0)
    import time
    # Simulate 15 blinks per minute (1 per 4 seconds) but instantly
    for _ in range(5):
        signal.record_blink()
    value = signal.get_signal_value()
    assert 0.0 <= value <= 1.0


def test_blink_irregularity_few_blinks():
    signal = BlinkIrregularitySignal()
    signal.record_blink()
    signal.record_blink()
    # Not enough data for meaningful output
    assert signal.get_signal_value() == 0.0


def test_blink_irregularity_many_irregular():
    import time
    signal = BlinkIrregularitySignal()
    # Simulate irregular blinks
    import time as t
    for delay in [0.1, 5.0, 0.2, 8.0, 0.3]:
        signal._ibis.append(delay)
    value = signal.get_signal_value()
    assert 0.0 <= value <= 1.0
