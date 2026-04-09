"""Quick Phase 2.1 verification script."""
import sys
sys.path.insert(0, '.')

print("=== Phase 2.1 Verification ===")

# 1. Config keys
from backend.config import (
    CRASH_PREDICTOR_CHECK_INTERVAL_TICKS, CRASH_PREDICTOR_MIN_CONFIDENCE,
    CRASH_PREDICTOR_DEQUE_MAXLEN, CRASH_PREDICTOR_SCORE_THRESHOLD,
    TFSI_STABILITY_THRESHOLD, TFSI_AUTO_COOLDOWN_SECONDS, TFSI_MIN_WINDOW_READINGS,
    TFSI_AUTO_CHECK_INTERVAL_TICKS,
    EYE_RUBBING_PROXIMITY_THRESHOLD, EYE_RUBBING_COUNTER_MAX, EYE_RUBBING_DECAY_PER_TICK,
    FUSION_WEIGHTS,
)
print("[OK] config.py: all Phase 2.1 keys present")
assert CRASH_PREDICTOR_CHECK_INTERVAL_TICKS == 10
assert CRASH_PREDICTOR_MIN_CONFIDENCE == 0.6
assert TFSI_STABILITY_THRESHOLD == 0.25
assert TFSI_AUTO_COOLDOWN_SECONDS == 300
assert TFSI_MIN_WINDOW_READINGS == 60
assert EYE_RUBBING_PROXIMITY_THRESHOLD == 0.08
print("[OK] config.py: all values match spec")

# 2. Crash predictor
from backend.fusion.crash_predictor import CrashPredictor, CrashPrediction
from collections import deque
cp = CrashPredictor()
# Feed increasing scores (56->95 over 30 entries)
for i in range(30):
    cp.update(56 + i * 1.3)
pred = cp.predict()
assert isinstance(pred, CrashPrediction)
assert pred.will_crash == True, f"Expected will_crash=True, got {pred.will_crash}"
assert 0 <= pred.seconds_until_crash <= 120
assert pred.confidence > 0.6
print(f"[OK] crash_predictor.py: will_crash={pred.will_crash}, eta={pred.seconds_until_crash:.1f}s, R2={pred.confidence:.2f}")

# Test non-crash scenario
cp2 = CrashPredictor()
for i in range(10):
    cp2.update(30.0)  # low stable score
pred2 = cp2.predict()
assert pred2.will_crash == False, "Expected will_crash=False for low stable score"
print(f"[OK] crash_predictor.py: correctly returns will_crash=False for low stable score")

# 3. TFSI Model
from backend.signals.tfsi_model import TFSIModel
tm = TFSIModel()
# Feed all partial (bad) blink readings
for i in range(80):
    tm.feed(0.9)  # high partial ratio
tm._last_trigger_time = 0.0  # reset cooldown for test
stab = tm.compute_tfsi_stability()
trigger = tm.should_auto_trigger()
assert stab < 0.25, f"Expected stability < 0.25, got {stab}"
assert trigger == True, "Expected auto-trigger=True for all-partial window"
print(f"[OK] tfsi_model.py: stability={stab:.2f}, auto_trigger={trigger}")

alert = tm.build_alert_dict()
assert alert["alert_needed"] == True
print(f"[OK] tfsi_model.py: build_alert_dict() returns valid alert")

# Test healthy scenario
tm2 = TFSIModel()
for i in range(80):
    tm2.feed(0.1)  # all full blinks (healthy)
tm2._last_trigger_time = 0.0
stab2 = tm2.compute_tfsi_stability()
trigger2 = tm2.should_auto_trigger()
assert stab2 > 0.25, f"Expected stability > 0.25 for healthy, got {stab2}"
assert trigger2 == False
print(f"[OK] tfsi_model.py: correctly no-trigger for healthy blinks (stability={stab2:.2f})")

# 4. Eye rubbing signal
from backend.signals.eye_rubbing import EyeRubbingSignal

er = EyeRubbingSignal()

# Test: no face/hands -> 0.0
val = er.compute(None, None)
assert val == 0.0, f"Expected 0.0 for None inputs, got {val}"
print(f"[OK] eye_rubbing.py: compute(None, None) = {val}")

# Test: decay behavior
er2 = EyeRubbingSignal()
er2._rubbing_counter = 10.0  # max counter
val1 = er2.get_signal_value()
assert val1 == 1.0, f"Expected 1.0 at max counter, got {val1}"
# Apply decay
er2._apply_decay_and_return(rubbing_detected=False)
val2 = er2.get_signal_value()
assert val2 < 1.0, f"Expected decay, got {val2}"
print(f"[OK] eye_rubbing.py: decay works ({val1:.2f} -> {val2:.2f})")

# 5. Fusion weights unchanged
expected_weights = {
    "blink_rate": 0.30, "blink_quality": 0.15, "screen_distance": 0.15,
    "squint": 0.15, "gaze_entropy": 0.10, "blink_irregularity": 0.05,
    "posture_lean": 0.05, "eye_rubbing": 0.03, "scleral_redness": 0.02,
}
for key, expected in expected_weights.items():
    assert FUSION_WEIGHTS[key] == expected, f"Weight changed for {key}!"
print("[OK] Fusion weights unchanged")

# 6. Eye rubbing contribution calculation
rub_contribution = 0.8 * FUSION_WEIGHTS["eye_rubbing"] * 100
print(f"[OK] Eye rubbing=0.8 contributes {rub_contribution:.1f} strain points (before scaling)")

print()
print("ALL Phase 2.1 CHECKS PASSED")
