"""
GazeAware — Local LLM Prescription Engine
==========================================
Generates eye-strain prescriptions using TinyLlama 1.1B
running entirely on CPU via llama-cpp-python.

Drop-in replacement for GroqEngine — exposes identical
generate_prescription() and generate_recovery_feedback()
interface so PrescriptionEngine can call either backend
without any changes.

Model: TinyLlama-1.1B-Chat-v1.0 Q4_K_M GGUF (~669MB)
Location: models/tinyllama.gguf (project root)
"""

import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Path to model file — resolved from project root
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
MODEL_PATH = str(_PROJECT_ROOT / "models" / "tinyllama.gguf")

# Inference settings — tuned for low-resource hardware
_N_CTX      = 512   # context window (keep small for RAM)
_N_THREADS  = 2     # match physical core count (i5-6200U = 2 cores)
_MAX_TOKENS = 80    # prescription text should be short
_TEMPERATURE = 0.3  # low = more focused, deterministic output


class LocalEngine:
    """
    Local LLM prescription engine using TinyLlama via llama-cpp-python.

    Lazy-loads the model on first call to avoid slowing down
    application startup. Model stays loaded in memory for the
    duration of the session.
    """

    # HuggingFace direct download URL for the model
    MODEL_URL = (
        "https://huggingface.co/TheBloke/"
        "TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/"
        "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
    )

    def __init__(self) -> None:
        self._llm = None  # lazy load on first call
        self._model_loaded = False
        self._load_error = None

        # Auto-download model if not present
        if not os.path.exists(MODEL_PATH):
            self._auto_download()

    def _auto_download(self) -> None:
        """
        Download TinyLlama GGUF from HuggingFace if not already present.
        Shows progress in terminal. Non-fatal — sets _load_error on failure.
        """
        import urllib.request

        model_dir = os.path.dirname(MODEL_PATH)
        os.makedirs(model_dir, exist_ok=True)

        print("\n" + "\u2550" * 56)
        print("  [LocalEngine] TinyLlama model not found.")
        print("  [LocalEngine] Auto-downloading (~669MB)...")
        print("  [LocalEngine] This happens only once.")
        print("\u2550" * 56)

        tmp_path = MODEL_PATH + ".download"

        try:
            def _progress(block_num, block_size, total_size):
                if total_size <= 0:
                    return
                downloaded = block_num * block_size
                pct = min(downloaded / total_size * 100, 100)
                mb_done = downloaded / (1024 * 1024)
                mb_total = total_size / (1024 * 1024)
                bar_filled = int(pct / 5)
                bar = "\u2588" * bar_filled + "\u2591" * (20 - bar_filled)
                print(
                    f"\r  [{bar}] {pct:.1f}%  "
                    f"{mb_done:.0f}/{mb_total:.0f} MB",
                    end="", flush=True
                )

            urllib.request.urlretrieve(
                self.MODEL_URL,
                tmp_path,
                reporthook=_progress,
            )

            # Rename temp file to final path only on success
            os.replace(tmp_path, MODEL_PATH)

            print(f"\n  [LocalEngine] Download complete \u2192 {MODEL_PATH}")
            print("\u2550" * 56 + "\n")

        except Exception as exc:
            # Clean up partial download
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass

            self._load_error = (
                f"Auto-download failed: {exc}\n"
                f"Manual download: {self.MODEL_URL}\n"
                f"Save to: {MODEL_PATH}"
            )
            print(f"\n  [LocalEngine] Download failed: {exc}")
            print("  [LocalEngine] Manual download URL:")
            print(f"  {self.MODEL_URL}")
            print(f"  Save to: {MODEL_PATH}")
            print("\u2550" * 56 + "\n")
            logger.error("[LocalEngine] Auto-download failed: %s", exc)

    def _ensure_loaded(self) -> bool:
        """Load model on first call. Returns True if ready."""
        if self._model_loaded:
            return True
        if self._load_error:
            return False
        try:
            from llama_cpp import Llama
            logger.info("[LocalEngine] Loading TinyLlama model — this takes 10-30s on first use...")
            print("\n  [LocalEngine] Loading TinyLlama... (first use only, ~15s)\n")
            self._llm = Llama(
                model_path=MODEL_PATH,
                n_ctx=_N_CTX,
                n_threads=_N_THREADS,
                verbose=False,
            )
            self._model_loaded = True
            logger.info("[LocalEngine] TinyLlama loaded successfully.")
            print("  [LocalEngine] Model ready.\n")
            return True
        except Exception as exc:
            self._load_error = str(exc)
            logger.error("[LocalEngine] Failed to load model: %s", exc)
            return False

    def generate_prescription(
        self,
        strain_score: float,
        signals_dict: dict,
        context_str: str,
    ) -> str:
        """
        Generate a personalised eye-strain prescription using TinyLlama.
        Falls back to hardcoded text if model is unavailable.

        Parameters match GroqEngine.generate_prescription() exactly.
        """
        if not self._ensure_loaded():
            return self._fallback_prescription()

        # Format top signals
        top_signals = sorted(
            signals_dict.items(), key=lambda kv: kv[1], reverse=True
        )[:3]
        signals_str = ", ".join(f"{k}={v:.2f}" for k, v in top_signals)

        # TinyLlama chat format
        prompt = (
            "<|system|>\n"
            "You are an eye health assistant. When given eye strain data, "
            "respond with ONE short, direct eye exercise instruction in "
            "UPPERCASE. Maximum 2 sentences. No explanations.\n"
            "</s>\n"
            "<|user|>\n"
            f"Strain score: {strain_score:.0f}/100. "
            f"Activity: {context_str}. "
            f"Top signals: {signals_str}. "
            "Give one urgent eye exercise instruction.\n"
            "</s>\n"
            "<|assistant|>\n"
        )

        try:
            response = self._llm(
                prompt,
                max_tokens=_MAX_TOKENS,
                temperature=_TEMPERATURE,
                stop=["</s>", "<|user|>", "\n\n"],
                echo=False,
            )
            text = response["choices"][0]["text"].strip()
            if not text or len(text) < 10:
                return self._fallback_prescription()
            return text.upper()
        except Exception as exc:
            logger.warning("[LocalEngine] Inference failed: %s", exc)
            return self._fallback_prescription()

    def generate_recovery_feedback(
        self,
        score_before: float,
        score_after: float,
    ) -> str:
        """
        Generate motivational recovery feedback after exercise completion.
        Parameters match GroqEngine.generate_recovery_feedback() exactly.
        """
        if not self._ensure_loaded():
            return self._fallback_recovery(score_before - score_after)

        drop = score_before - score_after
        prompt = (
            "<|system|>\n"
            "You are an eye health assistant. Give a short motivating "
            "message in UPPERCASE. Maximum 1 sentence.\n"
            "</s>\n"
            "<|user|>\n"
            f"Eye strain dropped from {score_before:.0f} to {score_after:.0f} "
            f"({drop:.0f} points improvement) after exercise.\n"
            "</s>\n"
            "<|assistant|>\n"
        )

        try:
            response = self._llm(
                prompt,
                max_tokens=40,
                temperature=_TEMPERATURE,
                stop=["</s>", "<|user|>", "\n\n"],
                echo=False,
            )
            text = response["choices"][0]["text"].strip()
            if not text or len(text) < 10:
                return self._fallback_recovery(drop)
            return text.upper()
        except Exception as exc:
            logger.warning("[LocalEngine] Recovery inference failed: %s", exc)
            return self._fallback_recovery(drop)

    @staticmethod
    def _fallback_prescription() -> str:
        return "CLOSE EYES FULLY, HOLD 3 SECONDS, REPEAT 10 TIMES."

    @staticmethod
    def _fallback_recovery(drop: float) -> str:
        if drop >= 15:
            return "EXCELLENT RECOVERY — YOUR EYES FEEL REFRESHED."
        return "GOOD EFFORT. KEEP BLINKING REGULARLY."
