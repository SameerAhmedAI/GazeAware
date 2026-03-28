"""
GazeAware — NLP Prompt Templates
Builds structured prompts for the prescription engine.
"""


SYSTEM_PROMPT = (
    "You are GazeAware's prescription engine. Generate specific, actionable eye strain "
    "interventions. Never give generic advice. Always name the exercise, give a duration, "
    "and state the expected outcome. Respond in 1–2 sentences only."
)

SIGNAL_DESCRIPTIONS = {
    "blink_rate":        "low blink rate (tear film rupturing)",
    "blink_quality":     "partial blinks only (tear film not refreshing)",
    "screen_distance":   "screen too close (ciliary muscle overloaded)",
    "squint":            "sustained squinting (aperture reduced, corneal dryness)",
    "gaze_entropy":      "erratic eye movement (microsaccade dropout)",
    "blink_irregularity": "irregular blink timing (disrupted ocular rhythm)",
    "posture_lean":      "forward head lean or tilt (cervical strain)",
    "eye_rubbing":       "eye rubbing detected (contamination + corneal risk)",
    "scleral_redness":   "scleral redness detected (conjunctival irritation)",
}


def build_prompt(
    context: str,
    strain_score: float,
    triggered_signals: list[str],
    severity: str,
    time_since_last_min: float,
) -> tuple[str, str]:
    """
    Returns (system_prompt, user_prompt) tuple.
    """
    signal_descs = "; ".join(
        SIGNAL_DESCRIPTIONS.get(s, s) for s in triggered_signals
    )

    user_prompt = (
        f"Context: {context} | "
        f"Strain score: {strain_score:.0f}/100 | "
        f"Severity: {severity} | "
        f"Triggered signals: {signal_descs} | "
        f"Time since last prescription: {time_since_last_min:.0f} minutes.\n\n"
        "Generate a specific prescription."
    )

    return SYSTEM_PROMPT, user_prompt
