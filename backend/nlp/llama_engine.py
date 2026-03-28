"""
GazeAware — Local LLaMA Prescription Engine (Offline Fallback)
Implements the PrescriptionEngine interface using a locally quantized
LLaMA model via llama-cpp-python.

Model file: assets/models/llama-3.2-3b-instruct.Q4_K_M.gguf (~2GB)
"""
from backend.nlp.prescription import PrescriptionEngine
from backend.nlp.prompts import build_prompt


class LlamaEngine(PrescriptionEngine):
    def __init__(self, model_path: str = "assets/models/llama-3.2-3b-instruct.Q4_K_M.gguf"):
        try:
            from llama_cpp import Llama
            self._llm = Llama(
                model_path=model_path,
                n_ctx=512,
                n_threads=4,
                verbose=False,
            )
        except ImportError:
            raise RuntimeError(
                "llama-cpp-python not installed. Run: pip install llama-cpp-python"
            )

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
        full_prompt = f"<s>[INST] {system_prompt}\n\n{user_prompt} [/INST]"
        result = self._llm(full_prompt, max_tokens=120, stop=["</s>"])
        return result["choices"][0]["text"].strip()
