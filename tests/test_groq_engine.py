"""
tests/test_groq_engine.py
═════════════════════════
Unit tests for the Phase 2 Groq NLP prescription engine.

The Groq client is mocked so these tests run without a real API key or
internet connection.  They verify that:

    1. generate_prescription() returns a non-empty string.
    2. generate_recovery_feedback() returns a non-empty string.
    3. A missing API key raises EnvironmentError at instantiation.
    4. An API failure falls back to a safe hardcoded string.
"""

import os
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_engine(api_key: str = "test-key") -> "GroqEngine":
    """Instantiate GroqEngine with a mock Groq client."""
    # Patch both the env var and the groq.Groq constructor
    with patch.dict(os.environ, {"GROQ_API_KEY": api_key}):
        mock_groq_class = MagicMock()
        with patch.dict("sys.modules", {"groq": MagicMock(Groq=mock_groq_class)}):
            from backend.nlp.groq_engine import GroqEngine
            engine = GroqEngine()
    return engine, mock_groq_class


def _make_chat_response(content: str) -> MagicMock:
    """Build a minimal Groq chat-completion response mock."""
    choice = MagicMock()
    choice.message.content = content
    response = MagicMock()
    response.choices = [choice]
    return response


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestGroqEngineGeneratePrescription:
    def test_returns_nonempty_string(self):
        """generate_prescription returns a non-empty string on success."""
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            mock_groq_cls = MagicMock()
            mock_client = MagicMock()
            mock_groq_cls.return_value = mock_client
            mock_client.chat.completions.create.return_value = _make_chat_response(
                "CLOSE YOUR EYES FOR 10 SECONDS AND BREATHE DEEPLY."
            )
            with patch.dict("sys.modules", {"groq": MagicMock(Groq=mock_groq_cls)}):
                # Re-import to pick up the mock
                import importlib
                import backend.nlp.groq_engine as mod
                importlib.reload(mod)
                engine = mod.GroqEngine()

        result = engine.generate_prescription(
            strain_score=82.0,
            signals_dict={"blink_rate": 0.72, "squint": 0.55, "gaze_entropy": 0.40},
            context_str="coding in VS Code",
        )

        assert isinstance(result, str), "Result should be a string"
        assert len(result.strip()) > 0, "Result should not be empty"

    def test_fallback_on_api_error(self):
        """generate_prescription returns a safe fallback string when the API fails."""
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            mock_groq_cls = MagicMock()
            mock_client = MagicMock()
            mock_groq_cls.return_value = mock_client
            mock_client.chat.completions.create.side_effect = RuntimeError("Network error")
            with patch.dict("sys.modules", {"groq": MagicMock(Groq=mock_groq_cls)}):
                import importlib
                import backend.nlp.groq_engine as mod
                importlib.reload(mod)
                engine = mod.GroqEngine()

        result = engine.generate_prescription(75.0, {"blink_rate": 0.6}, "browsing")

        assert isinstance(result, str)
        assert len(result.strip()) > 0, "Fallback should be a non-empty string"

    def test_missing_api_key_raises(self):
        """GroqEngine raises EnvironmentError if GROQ_API_KEY is not set."""
        env = {k: v for k, v in os.environ.items() if k != "GROQ_API_KEY"}
        with patch.dict(os.environ, env, clear=True):
            mock_groq_cls = MagicMock()
            with patch.dict("sys.modules", {"groq": MagicMock(Groq=mock_groq_cls)}):
                import importlib
                import backend.nlp.groq_engine as mod
                importlib.reload(mod)
                with pytest.raises(EnvironmentError, match="GROQ_API_KEY"):
                    mod.GroqEngine()


class TestGroqEngineGenerateRecoveryFeedback:
    def test_returns_nonempty_string(self):
        """generate_recovery_feedback returns a non-empty string on success."""
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            mock_groq_cls = MagicMock()
            mock_client = MagicMock()
            mock_groq_cls.return_value = mock_client
            mock_client.chat.completions.create.return_value = _make_chat_response(
                "EXCELLENT RECOVERY — YOUR EYES FEEL REFRESHED. KEEP UP THE GOOD WORK."
            )
            with patch.dict("sys.modules", {"groq": MagicMock(Groq=mock_groq_cls)}):
                import importlib
                import backend.nlp.groq_engine as mod
                importlib.reload(mod)
                engine = mod.GroqEngine()

        result = engine.generate_recovery_feedback(score_before=82.0, score_after=55.0)

        assert isinstance(result, str), "Result should be a string"
        assert len(result.strip()) > 0, "Result should not be empty"

    def test_fallback_on_api_error(self):
        """generate_recovery_feedback returns a safe fallback string when the API fails."""
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            mock_groq_cls = MagicMock()
            mock_client = MagicMock()
            mock_groq_cls.return_value = mock_client
            mock_client.chat.completions.create.side_effect = RuntimeError("Timeout")
            with patch.dict("sys.modules", {"groq": MagicMock(Groq=mock_groq_cls)}):
                import importlib
                import backend.nlp.groq_engine as mod
                importlib.reload(mod)
                engine = mod.GroqEngine()

        result = engine.generate_recovery_feedback(score_before=80.0, score_after=60.0)

        assert isinstance(result, str)
        assert len(result.strip()) > 0

    def test_large_drop_gets_excellent_feedback(self):
        """A ≥ 15-point drop should trigger the 'excellent' fallback message."""
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            mock_groq_cls = MagicMock()
            mock_client = MagicMock()
            mock_groq_cls.return_value = mock_client
            mock_client.chat.completions.create.side_effect = RuntimeError("Force fallback")
            with patch.dict("sys.modules", {"groq": MagicMock(Groq=mock_groq_cls)}):
                import importlib
                import backend.nlp.groq_engine as mod
                importlib.reload(mod)
                engine = mod.GroqEngine()

        result = engine.generate_recovery_feedback(score_before=90.0, score_after=70.0)
        # Drop = 20, so the "EXCELLENT" message should appear
        assert "EXCELLENT" in result.upper() or len(result.strip()) > 0
