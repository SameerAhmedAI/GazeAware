"""
Tests — NLP Engine (Phase 4)
These are integration tests — they require ANTHROPIC_API_KEY in environment.
Run with: pytest tests/test_nlp.py -v
"""
import pytest
from backend.nlp.prompts import build_prompt


def test_build_prompt_returns_tuple():
    system, user = build_prompt(
        context="coding",
        strain_score=72.0,
        triggered_signals=["blink_rate", "squint"],
        severity="moderate",
        time_since_last_min=15.0,
    )
    assert isinstance(system, str) and len(system) > 10
    assert isinstance(user, str) and "coding" in user
    assert "72" in user


def test_build_prompt_unknown_signal():
    system, user = build_prompt(
        context="writing",
        strain_score=55.0,
        triggered_signals=["unknown_signal"],
        severity="mild",
        time_since_last_min=5.0,
    )
    assert "unknown_signal" in user
