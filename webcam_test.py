"""
GazeAware — Phase 0 Webcam Test
────────────────────────────────
Opens the webcam and renders MediaPipe Face Mesh landmarks at 30 FPS.

What this verifies:
  ✓ Webcam accessible at the configured index
  ✓ MediaPipe Face Mesh pipeline running
  ✓ 468 facial landmarks rendering live
  ✓ FPS counter stable near 30 FPS
  ✓ EAR (Eye Aspect Ratio) calculated live

Controls:
  Q  → Quit
  S  → Print current FPS and landmark count to console

Run:
    .venv\Scripts\python.exe webcam_test.py
"""

import time
import cv2
import mediapipe as mp
import numpy as np

# ── Configuration ─────────────────────────────────────────────────────────────
WEBCAM_INDEX = 0          # Change to 1, 2, etc. if your camera is not index 0
TARGET_FPS   = 30
WINDOW_NAME  = "GazeAware — Phase 0 Face Mesh Test  |  Press Q to quit"

# MediaPipe eye landmark indices (used in EAR calculation)
LEFT_EYE_IDX  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE_IDX = [33, 160, 158, 133, 153, 144]

# Colours (BGR)
LANDMARK_COLOR   = (0,   220, 120)   # Green-teal dots
CONNECTION_COLOR = (20,  160, 255)   # Blue-orange connections
EAR_TEXT_COLOR   = (255, 255, 255)
FPS_TEXT_COLOR   = (0,   220, 120)
ALERT_COLOR      = (0,    60, 255)   # Red — blink detected


# ── Helper: Eye Aspect Ratio ───────────────────────────────────────────────────
def compute_ear(landmarks, eye_indices: list, img_w: int, img_h: int) -> float:
    """
    EAR = (‖p2–p6‖ + ‖p3–p5‖) / (2 · ‖p1–p4‖)
    Returns the ratio as a float. Lower = more closed.
    """
    def pt(i):
        lm = landmarks[i]
        return np.array([lm.x * img_w, lm.y * img_h])

    p1, p2, p3, p4, p5, p6 = (pt(i) for i in eye_indices)
    vertical   = np.linalg.norm(p2 - p6) + np.linalg.norm(p3 - p5)
    horizontal = 2.0 * np.linalg.norm(p1 - p4)
    return float(vertical / horizontal) if horizontal > 0 else 0.0


# ── Helper: Overlay text ───────────────────────────────────────────────────────
def put_text(frame, text: str, pos: tuple, color=(255, 255, 255),
             scale: float = 0.55, thickness: int = 1):
    cv2.putText(frame, text, pos, cv2.FONT_HERSHEY_SIMPLEX,
                scale, color, thickness, cv2.LINE_AA)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    mp_face_mesh = mp.solutions.face_mesh
    mp_drawing   = mp.solutions.drawing_utils
    mp_styles    = mp.solutions.drawing_styles

    face_mesh = mp_face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,        # Enables iris landmarks (468–477)
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    cap = cv2.VideoCapture(WEBCAM_INDEX)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open webcam at index {WEBCAM_INDEX}.")
        print("  Try changing WEBCAM_INDEX at the top of webcam_test.py")
        return

    cap.set(cv2.CAP_PROP_FPS, TARGET_FPS)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    # ── FPS tracking ─────────────────────────────────────────────────────────
    prev_time   = time.time()
    fps_display = 0.0
    fps_alpha   = 0.1   # exponential moving average smoothing

    # ── Blink tracking ───────────────────────────────────────────────────────
    blink_count   = 0
    in_blink      = False
    EAR_THRESHOLD = 0.20

    print(f"\n{'═'*55}")
    print("  GazeAware — Phase 0 Webcam Test")
    print(f"{'═'*55}")
    print(f"  Camera index : {WEBCAM_INDEX}")
    print(f"  Target FPS   : {TARGET_FPS}")
    print(f"  Landmarks    : 468 + iris refinement")
    print(f"{'─'*55}")
    print("  EAR blink threshold : {:.2f}".format(EAR_THRESHOLD))
    print(f"{'─'*55}")
    print("  Controls:  Q → quit  |  S → snapshot stats")
    print(f"{'═'*55}\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[WARN] Frame capture failed — retrying...")
            continue

        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        results = face_mesh.process(rgb)
        rgb.flags.writeable = True

        # ── FPS calculation (EMA) ─────────────────────────────────────────
        now      = time.time()
        raw_fps  = 1.0 / max(now - prev_time, 1e-6)
        fps_display = fps_alpha * raw_fps + (1 - fps_alpha) * fps_display
        prev_time = now

        # ── Draw landmarks ────────────────────────────────────────────────
        face_detected = False
        left_ear  = 0.0
        right_ear = 0.0
        avg_ear   = 0.0

        if results.multi_face_landmarks:
            face_detected = True
            face_lm = results.multi_face_landmarks[0]

            # Draw full mesh with MediaPipe's built-in style
            mp_drawing.draw_landmarks(
                image=frame,
                landmark_list=face_lm,
                connections=mp_face_mesh.FACEMESH_TESSELATION,
                landmark_drawing_spec=None,
                connection_drawing_spec=mp_styles.get_default_face_mesh_tesselation_style(),
            )
            mp_drawing.draw_landmarks(
                image=frame,
                landmark_list=face_lm,
                connections=mp_face_mesh.FACEMESH_CONTOURS,
                landmark_drawing_spec=None,
                connection_drawing_spec=mp_styles.get_default_face_mesh_contours_style(),
            )
            mp_drawing.draw_landmarks(
                image=frame,
                landmark_list=face_lm,
                connections=mp_face_mesh.FACEMESH_IRISES,
                landmark_drawing_spec=None,
                connection_drawing_spec=mp_styles.get_default_face_mesh_iris_connections_style(),
            )

            # ── EAR computation ───────────────────────────────────────────
            lm = face_lm.landmark
            left_ear  = compute_ear(lm, LEFT_EYE_IDX,  w, h)
            right_ear = compute_ear(lm, RIGHT_EYE_IDX, w, h)
            avg_ear   = (left_ear + right_ear) / 2.0

            # ── Blink detection ───────────────────────────────────────────
            if avg_ear < EAR_THRESHOLD:
                if not in_blink:
                    blink_count += 1
                    in_blink = True
            else:
                in_blink = False

        # ── HUD overlay ───────────────────────────────────────────────────
        # Dark panel background (top-left)
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (310, 230), (15, 15, 15), -1)
        cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)

        put_text(frame, "GazeAware  |  Phase 0",    (12, 28),  (0, 220, 120), 0.65, 2)
        put_text(frame, f"FPS:     {fps_display:5.1f}",        (12, 60),  FPS_TEXT_COLOR)
        put_text(frame, f"Face:    {'DETECTED' if face_detected else 'NOT FOUND'}",
                 (12, 88), (0, 220, 120) if face_detected else (0, 60, 255))
        put_text(frame, f"EAR L:   {left_ear:.3f}",  (12, 116), EAR_TEXT_COLOR)
        put_text(frame, f"EAR R:   {right_ear:.3f}", (12, 144), EAR_TEXT_COLOR)
        put_text(frame, f"EAR avg: {avg_ear:.3f}",   (12, 172), EAR_TEXT_COLOR)
        put_text(frame, f"Blinks:  {blink_count}",   (12, 200), EAR_TEXT_COLOR)

        # Blink flash indicator
        if in_blink:
            cv2.rectangle(frame, (0, 0), (w, h), ALERT_COLOR, 6)
            put_text(frame, "BLINK", (w // 2 - 40, 50), ALERT_COLOR, 1.4, 3)

        # Phase 0 exit condition reminder (bottom bar)
        cv2.rectangle(frame, (0, h - 40), (w, h), (15, 15, 15), -1)
        put_text(frame,
                 "Phase 0 Exit Condition: landmarks visible + FPS stable near 30",
                 (12, h - 14), (150, 150, 150), 0.45)

        cv2.imshow(WINDOW_NAME, frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27:
            break
        elif key == ord('s'):
            print(f"\n[Snapshot]  FPS={fps_display:.1f}  "
                  f"EAR_avg={avg_ear:.3f}  Blinks={blink_count}  "
                  f"Face={'yes' if face_detected else 'no'}")

    cap.release()
    cv2.destroyAllWindows()
    face_mesh.close()
    print(f"\n[Done] Session ended. Total blinks detected: {blink_count}")


if __name__ == "__main__":
    main()
