"""
GazeAware — Groq NLP Prescription Engine  (Phase 2)
═════════════════════════════════════════════════════
Generates personalised eye-strain prescriptions using the Groq cloud
inference API (llama-3.1-8b-instant model).

The engine is a drop-in replacement for the hardcoded rules in
prescription.py — it exposes the same generate_prescription() interface
so the PrescriptionEngine wrapper can call either backend unchanged.

All constants are sourced from backend/config.py — no hardcoded strings
or numbers appear here.
"""

import os
import logging

from backend.config import (
    GROQ_MODEL,
    GROQ_SYSTEM_PROMPT,
    GROQ_RECOVERY_SYSTEM_PROMPT,
    GROQ_MAX_TOKENS,
    GROQ_TEMPERATURE,
)

logger = logging.getLogger(__name__)


class GroqEngine:
    """
    Wraps the Groq Python SDK to generate real-time eye-strain prescriptions
    and post-exercise recovery feedback messages.

    Usage::

        engine = GroqEngine()
        text = engine.generate_prescription(
            strain_score=82.0,
            signals_dict={"blink_rate": 0.7, "squint": 0.6},
            context_str="coding in VS Code",
        )
        feedback = engine.generate_recovery_feedback(score_before=82.0, score_after=55.0)
    """

    def __init__(self) -> None:
        api_key = os.environ.get("GROQ_API_KEY", "").strip()
        if not api_key:
            raise EnvironmentError(
                "GROQ_API_KEY environment variable is not set. "
                "Add it to your .env file and restart the application."
            )

        # Import here so that missing groq package raises a clear ImportError
        # at instantiation time, not at module import time.
        try:
            from groq import Groq  # type: ignore[import]
        except ImportError as exc:
            raise ImportError(
                "The 'groq' package is not installed. "
                "Run: pip install groq"
            ) from exc

        self._client = Groq(api_key=api_key)

    # ─────────────────────────────────────────────────────────────────────────
    def generate_prescription(
        self,
        strain_score: float,
        signals_dict: dict,
        context_str: str,
    ) -> str:
        """
        Ask the LLM to generate a personalised exercise prescription.

        Parameters
        ----------
        strain_score : float
            Current fused strain score (0–100).
        signals_dict : dict
            Raw signal values, e.g. ``{"blink_rate": 0.72, "squint": 0.55}``.
        context_str : str
            Human-readable activity label, e.g. ``"coding in VS Code"``.

        Returns
        -------
        str
            Prescription text in ALL CAPS imperative format (max 2 sentences).
            Falls back to a safe hardcoded message if the API call fails.
        """
        user_prompt = (
            f"The user is currently {context_str}. "
            f"Their eye strain score is {strain_score:.0f}/100 (RED zone). "
            f"Top signals: {self._format_signals(signals_dict)}. "
            "Write the prescription now."
        )

        try:
            response = self._client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": GROQ_SYSTEM_PROMPT},
                    {"role": "user",   "content": user_prompt},
                ],
                max_tokens=GROQ_MAX_TOKENS,
                temperature=GROQ_TEMPERATURE,
            )
            text = response.choices[0].message.content.strip()
            return text if text else self._fallback_prescription()

        except Exception as exc:  # noqa: BLE001
            logger.warning("Groq API call failed: %s — using fallback prescription.", exc)
            return self._fallback_prescription()

    # ─────────────────────────────────────────────────────────────────────────
    def generate_recovery_feedback(
        self,
        score_before: float,
        score_after: float,
    ) -> str:
        """
        Generate a short motivational message after the user completes an
        exercise, reflecting how much their strain score improved.

        Parameters
        ----------
        score_before : float
            Strain score immediately before the exercise.
        score_after : float
            Strain score after the recovery period.

        Returns
        -------
        str
            Encouraging feedback in ALL CAPS (max 2 sentences).
        """
        drop = score_before - score_after
        user_prompt = (
            f"The user's eye strain dropped from {score_before:.0f} to "
            f"{score_after:.0f} (improvement of {drop:.0f} points) after "
            "completing the prescribed eye exercise. "
            "Write a short, motivating recovery confirmation message."
        )

        try:
            response = self._client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": GROQ_RECOVERY_SYSTEM_PROMPT},
                    {"role": "user",   "content": user_prompt},
                ],
                max_tokens=GROQ_MAX_TOKENS,
                temperature=GROQ_TEMPERATURE,
            )
            text = response.choices[0].message.content.strip()
            return text if text else self._fallback_recovery(drop)

        except Exception as exc:  # noqa: BLE001
            logger.warning("Groq API call failed for recovery feedback: %s", exc)
            return self._fallback_recovery(drop)

    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _format_signals(signals: dict) -> str:
        """Return a concise, readable string of the top-3 highest signals."""
        sorted_signals = sorted(signals.items(), key=lambda kv: kv[1], reverse=True)
        top = sorted_signals[:3]
        return ", ".join(f"{k}={v:.2f}" for k, v in top)

    @staticmethod
    def _fallback_prescription() -> str:
        return "CLOSE EYES FULLY, HOLD 3 SECONDS, REPEAT 10 TIMES."

    @staticmethod
    def _fallback_recovery(drop: float) -> str:
        if drop >= 15:
            return "EXCELLENT RECOVERY — YOUR EYES FEEL REFRESHED. CONTINUE WORKING MINDFULLY."
        return "GOOD EFFORT. KEEP BLINKING REGULARLY AND MAINTAIN PROPER SCREEN DISTANCE."
