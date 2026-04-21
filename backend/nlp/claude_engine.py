"""
GazeAware — Claude API Prescription Engine
Implements the PrescriptionEngine interface using Anthropic's Claude API.
Requires ANTHROPIC_API_KEY in environment / .env file.
"""
import os
from backend.nlp.prescription import PrescriptionEngine
from backend.nlp.prompts import build_prompt
from backend.config import CLAUDE_MODEL


class ClaudeEngine(PrescriptionEngine):
    def __init__(self):
        try:
            import anthropic
            self._client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
        except ImportError:
            raise RuntimeError("anthropic package not installed. Run: pip install anthropic")

    def generate(
        self,
        context: str,
        strain_score: float,
        triggered_signals: list[str],
        severity: str,
        time_since_last_min: float,
    ) -> str:
        system_prompt, user_prompt = build_prompt(
            context, strain_score, triggered_signals, severity, time_since_last_min
        )
        message = self._client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=150,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return message.content[0].text.strip()
