"""
GazeAware — NLP Prescription Engine Interface
Defines the abstract interface that both Claude and LLaMA engines implement.
Swappable by design — Claude ↔ LLaMA with no changes to calling code.
"""
from abc import ABC, abstractmethod


class PrescriptionEngine(ABC):
    """Abstract base class for prescription engines."""

    @abstractmethod
    def generate(
        self,
        context: str,
        strain_score: float,
        triggered_signals: list[str],
        severity: str,
        time_since_last_min: float,
    ) -> str:
        """
        Generate a specific, actionable prescription.

        Returns:
            1–2 sentence prescription string.
        """
        ...


def get_engine(use_local: bool = False) -> PrescriptionEngine:
    """Factory — returns the appropriate engine based on preference."""
    if use_local:
        from backend.nlp.llama_engine import LlamaEngine
        return LlamaEngine()
    from backend.nlp.claude_engine import ClaudeEngine
    return ClaudeEngine()
