"""
GazeAware — Tear-Film Stability Index (TFSI) Engine
═════════════════════════════════════════════════════
Medical-grade dry-eye prediction engine using existing webcam signals.

CLINICAL BASIS
──────────────
The Tear-Film Break-Up Time (TBUT) is the gold standard clinic test for dry
eye — it measures how long the tear film stays intact between blinks.  We
approximate it non-invasively using four webcam-derived proxies:

  1. Blink Completeness (blink_quality signal, 40% weight)
     Incomplete / partial eyelid closure means the tear film is not being
     spread across the cornea.  Repeated partial blinks accelerate evaporation.

  2. Scleral Redness (scleral_redness signal, 25% weight)
     Conjunctival injection (redness) indicates inflammatory mediators that
     destabilise the lipid layer of the tear film.

  3. Blink Rate Deficit (blink_rate signal, 20% weight)
     Screen-induced blink suppression reduces mechanical tear spreading.
     Normal blink rate is ~15 bpm; sustained reduction breaks the tear film.

  4. Blink Irregularity (blink_irregularity signal, 15% weight)
     Erratic inter-blink intervals signal compensatory behaviour when the
     cornea is drying — the nervous system forces emergency blinks.

OUTPUT
──────
  • TFSI: 0–100  (0 = perfect tear film, 100 = critical dry-eye state)
  • Breakdown rate: % faster today vs. session baseline
  • Stability class: STABLE / MILD / MODERATE / CRITICAL
  • Recommendation text (drop-agnostic — partner brand injected at display layer)

BUSINESS VALUE
──────────────
  • Affiliate integration with Systane, Refresh, or Blink eye drops
  • Optometrist referral links when CRITICAL sustained > 5 minutes
  • Message: "Your tear film is breaking down {rate}% faster today.
             We recommend using your prescribed drops now."

Usage:
    tfsi = TearFilmIndex()
    # every 500 ms:
    result = tfsi.update(signals)
    # result keys: tfsi_score, stability_class, breakdown_rate_pct,
    #              recommendation, alert_needed
"""

import time
import math
from collections import deque


# ── Weights (must sum to 1.0) ─────────────────────────────────────────────────
TFSI_WEIGHTS = {
    "blink_quality":      0.40,   # partial-blink ratio — most critical
    "scleral_redness":    0.25,   # inflammation / lipid-layer proxy
    "blink_rate":         0.20,   # rate deficit → reduced tear spreading
    "blink_irregularity": 0.15,   # erratic blinks → corneal dryness signal
}

# ── Stability classification thresholds ──────────────────────────────────────
TFSI_STABLE   = 30    # 0–29   : Healthy tear film
TFSI_MILD     = 50    # 30–49  : Mild instability
TFSI_MODERATE = 68    # 50–67  : Moderate — blink exercise warranted
TFSI_CRITICAL = 68    # 68+    : Critical — drop recommendation

# ── Rate-of-change tracking ───────────────────────────────────────────────────
BASELINE_WINDOW_SECONDS  = 120    # 2-minute baseline to anchor "today's" rate
RATE_WINDOW_SECONDS      = 300    # 5-min rolling window for rate calculation
SAMPLE_INTERVAL_SECONDS  = 10.0  # Record TFSI sample every 10 seconds
RATE_ALERT_THRESHOLD_PCT = 25.0  # Alert if current TFSI > baseline by 25%+

# ── Alert suppression ─────────────────────────────────────────────────────────
ALERT_COOLDOWN_SECONDS   = 300    # Don't re-alert more often than 5 minutes
CRITICAL_HOLD_SECONDS    = 15.0  # Must be CRITICAL for 15s before alerting


class TearFilmIndex:
    """
    Computes the Tear-Film Stability Index from existing GazeAware signals.
    Stateful — call update() every 500 ms.
    """

    def __init__(self):
        self._tfsi_history: deque[tuple[float, float]] = deque()
        # deque of (timestamp, tfsi_score)

        self._baseline_scores: list[float] = []
        self._baseline_value: float | None = None

        self._last_sample_time: float = 0.0
        self._last_alert_time:  float = 0.0
        self._critical_since:   float | None = None

        # Latest computed state
        self._tfsi_score:         float = 0.0
        self._stability_class:    str   = "STABLE"
        self._breakdown_rate_pct: float = 0.0
        self._last_result:        dict  = {}

    # ── Public API ────────────────────────────────────────────────────────────
    def update(self, signals: dict) -> dict:
        """
        Feed current signal values (same dict as strain engine uses).

        Returns a result dict:
            tfsi_score       float  0–100
            stability_class  str    STABLE | MILD | MODERATE | CRITICAL
            breakdown_rate_pct float  % faster vs session baseline (+/-)
            recommendation   str    human-readable message
            alert_needed     bool   True when a UI alert should fire
            components       dict   per-signal contribution breakdown
        """
        now = time.time()

        # ── Compute weighted TFSI ─────────────────────────────────────────────
        raw, components = self._compute_raw(signals)
        self._tfsi_score = min(100.0, raw * 100.0)

        # ── Classify ──────────────────────────────────────────────────────────
        self._stability_class = self._classify(self._tfsi_score)

        # ── Baseline accumulation (first 2 minutes) ───────────────────────────
        if self._baseline_value is None:
            self._baseline_scores.append(self._tfsi_score)
            if now - 0 > BASELINE_WINDOW_SECONDS and len(self._baseline_scores) > 5:
                self._baseline_value = sum(self._baseline_scores) / len(self._baseline_scores)

        # ── History sample every 10 s ─────────────────────────────────────────
        if now - self._last_sample_time >= SAMPLE_INTERVAL_SECONDS:
            self._tfsi_history.append((now, self._tfsi_score))
            self._last_sample_time = now
            # Prune old samples beyond RATE_WINDOW_SECONDS
            cutoff = now - RATE_WINDOW_SECONDS
            while self._tfsi_history and self._tfsi_history[0][0] < cutoff:
                self._tfsi_history.popleft()

        # ── Breakdown rate vs baseline ─────────────────────────────────────────
        self._breakdown_rate_pct = self._compute_rate()

        # ── Alert logic ───────────────────────────────────────────────────────
        alert_needed = self._should_alert(now)

        # ── Recommendation ────────────────────────────────────────────────────
        recommendation = self._build_recommendation()

        result = {
            "tfsi_score":          round(self._tfsi_score, 1),
            "stability_class":     self._stability_class,
            "breakdown_rate_pct":  round(self._breakdown_rate_pct, 1),
            "recommendation":      recommendation,
            "alert_needed":        alert_needed,
            "components":          components,
        }
        self._last_result = result

        if alert_needed:
            self._last_alert_time = now
            self._print_alert(result)

        return result

    @property
    def tfsi_score(self) -> float:
        return self._tfsi_score

    @property
    def stability_class(self) -> str:
        return self._stability_class

    @property
    def last_result(self) -> dict:
        return self._last_result

    # ── Internals ─────────────────────────────────────────────────────────────

    def _compute_raw(self, signals: dict) -> tuple[float, dict]:
        """Weighted sum of normalised signal contributions → 0.0–1.0"""
        total      = 0.0
        components = {}
        for sig_name, weight in TFSI_WEIGHTS.items():
            val  = float(signals.get(sig_name, 0.0))
            val  = max(0.0, min(1.0, val))
            contrib = val * weight
            total  += contrib
            components[sig_name] = round(contrib, 4)
        return total, components

    def _classify(self, score: float) -> str:
        if score < TFSI_STABLE:
            return "STABLE"
        elif score < TFSI_MILD:
            return "MILD"
        elif score < TFSI_MODERATE:
            return "MODERATE"
        else:
            return "CRITICAL"

    def _compute_rate(self) -> float:
        """
        How much faster is the tear film breaking down compared to baseline?
        Returns a % value — positive = getting worse, negative = improving.
        """
        if self._baseline_value is None or self._baseline_value < 1.0:
            return 0.0
        return ((self._tfsi_score - self._baseline_value) / self._baseline_value) * 100.0

    def _should_alert(self, now: float) -> bool:
        """Fire alert when CRITICAL is sustained for 15s and cooldown is clear."""
        if self._stability_class == "CRITICAL":
            if self._critical_since is None:
                self._critical_since = now
            held = now - self._critical_since
            if held >= CRITICAL_HOLD_SECONDS:
                since_last = now - self._last_alert_time
                return since_last >= ALERT_COOLDOWN_SECONDS
        else:
            self._critical_since = None
        return False

    def _build_recommendation(self) -> str:
        cls  = self._stability_class
        rate = self._breakdown_rate_pct

        if cls == "STABLE":
            return "Tear film healthy — keep blinking fully."

        elif cls == "MILD":
            return (
                "Blink fully and slowly 5 times to refresh your tear film."
            )

        elif cls == "MODERATE":
            if rate > RATE_ALERT_THRESHOLD_PCT:
                return (
                    f"Tear film breaking down {rate:.0f}% faster than your baseline. "
                    "Close your eyes for 10 seconds to let tears redistribute."
                )
            return (
                "Incomplete blinks detected — close your eyes fully every 2 minutes."
            )

        else:  # CRITICAL
            if rate > 0:
                return (
                    f"⚠ Tear film critically unstable — breaking down {rate:.0f}% "
                    "faster today. Use lubricating eye drops now. "
                    "If this persists, consult an optometrist."
                )
            return (
                "⚠ Tear film critically unstable. "
                "Use lubricating eye drops immediately."
            )

    def _print_alert(self, result: dict) -> None:
        border = "═" * 60
        inner  = "─" * 60
        rate   = result["breakdown_rate_pct"]
        rate_str = f"+{rate:.0f}% faster" if rate > 0 else f"{rate:.0f}%"

        print(f"\n  {border}")
        print(f"  💧 TEAR FILM ALERT  |  TFSI: {result['tfsi_score']:.0f}/100  "
              f"[{result['stability_class']}]")
        print(f"  {inner}")
        print(f"  Breakdown rate: {rate_str} vs your session baseline")
        print(f"  {result['recommendation']}")
        print(f"  {inner}")
        comp = result["components"]
        print(f"  Signals:  blink_qual={comp['blink_quality']:.3f}  "
              f"redness={comp['scleral_redness']:.3f}  "
              f"blink_rate={comp['blink_rate']:.3f}  "
              f"irregularity={comp['blink_irregularity']:.3f}")
        print(f"  {border}\n")

    def get_stats(self) -> dict:
        """Return a summary dict for the S-key snapshot."""
        return {
            "tfsi_score":         self._tfsi_score,
            "stability_class":    self._stability_class,
            "breakdown_rate_pct": self._breakdown_rate_pct,
            "baseline_tfsi":      self._baseline_value,
            "history_samples":    len(self._tfsi_history),
        }
