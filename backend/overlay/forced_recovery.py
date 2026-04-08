"""
GazeAware — Forced Recovery Overlay  (Ghost Overlay)
══════════════════════════════════════════════════════
When strain hits 90/100 the screen is gently dimmed and a calming
"Follow the Ball" animation floats over *everything* (Excel, VS Code, etc.).

Behaviour:
  • Full-screen semi-transparent dark veil over all windows
  • A glowing ball orbits a smooth Lissajous / sinusoidal path
  • Soft pulsing instructions guide the user through 20 seconds of
    smooth eye movement (the clinical "pursuit" exercise)
  • Countdown timer + "RECOVERY COMPLETE" flash on finish
  • The user can dismiss early with Escape — but a confirmation nudge
    appears first so they feel the friction intentionally
  • After dismissal the veil fades out gracefully

Runs in its own daemon thread.  Thread-safe public API:
    overlay = ForcedRecoveryOverlay(on_complete_callback)
    overlay.show()          ← triggers the veil + animation
    overlay.hide()          ← hides (also called automatically when done)
"""

import math
import threading
import time
import tkinter as tk


# ── Timing ────────────────────────────────────────────────────────────────────
EXERCISE_DURATION_SECONDS = 20   # total pursuit animation time
TICK_MS                   = 16   # ~60 fps for smooth ball motion
FADE_ALPHA_STEP           = 0.04 # opacity change per tick during fade in/out

# ── Veil appearance ───────────────────────────────────────────────────────────
VEIL_COLOUR      = "#050510"      # very dark navy, not pure black
VEIL_MAX_ALPHA   = 0.82           # 82 % opacity — enough to dim without blinding

# ── Ball ─────────────────────────────────────────────────────────────────────
BALL_RADIUS      = 22             # pixels
BALL_COLOUR      = "#00e5ff"      # electric cyan
BALL_GLOW_COLOUR = "#0077aa"      # darker halo behind ball
PATH_COLOUR      = "#1a2a3a"      # faint ghost trail colour
TRAIL_POINTS     = 28             # how many past positions to ghost

# ── Typography ────────────────────────────────────────────────────────────────
TITLE_FONT      = ("Segoe UI", 28, "bold")
BODY_FONT       = ("Segoe UI", 14)
COUNTDOWN_FONT  = ("Segoe UI", 64, "bold")
HINT_FONT       = ("Segoe UI", 12)

# Instruction cycle shown above the ball
INSTRUCTIONS = [
    "Follow the glowing ball with your eyes only",
    "Keep your head still — move only your eyes",
    "Breathe slowly in … and out …",
    "Let your eye muscles fully relax",
    "Almost there — you're doing great",
]


# ══════════════════════════════════════════════════════════════════════════════
class ForcedRecoveryOverlay:
    """
    Full-screen dimming overlay with a smooth ball-pursuit animation.
    Automatically disappears after EXERCISE_DURATION_SECONDS seconds.

    Thread-safe: show() / hide() may be called from any thread.
    """

    def __init__(self, on_complete=None):
        """
        Parameters
        ----------
        on_complete : callable | None
            Called (in the overlay thread) when the exercise finishes or
            the user deliberately dismisses it.
        """
        self._on_complete  = on_complete
        self._lock         = threading.Lock()
        self._running      = False
        self._visible      = False
        self._alpha        = 0.0
        self._target_alpha = 0.0
        self._dismiss_requested = False

        self._root:   tk.Tk    | None = None
        self._canvas: tk.Canvas | None = None
        self._thread: threading.Thread | None = None

        # animation state
        self._t          = 0.0          # time parameter driving ball path
        self._start_time = 0.0
        self._trail: list[tuple[float, float]] = []
        self._phase      = "idle"       # idle | fadein | running | fadeout
        self._confirm_visible = False

    # ── Public API ────────────────────────────────────────────────────────────
    def start_thread(self) -> None:
        """Must be called once to launch the background tkinter thread."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def show(self) -> None:
        """Trigger the forced-recovery animation from any thread."""
        with self._lock:
            if self._phase in ("fadein", "running"):
                return          # already showing
            self._phase             = "fadein"
            self._t                 = 0.0
            self._trail             = []
            self._dismiss_requested = False
            self._confirm_visible   = False
            self._start_time        = time.time()

    def hide(self) -> None:
        """Force-hide overlay from any thread (e.g. recovery confirmed)."""
        with self._lock:
            if self._phase not in ("idle",):
                self._phase = "fadeout"

    # ── Internals ─────────────────────────────────────────────────────────────
    def _run(self) -> None:
        self._root = tk.Tk()
        root = self._root

        sw = root.winfo_screenwidth()
        sh = root.winfo_screenheight()
        self._sw = sw
        self._sh = sh

        root.overrideredirect(True)
        root.wm_attributes("-topmost", True)
        root.wm_attributes("-alpha", 0.0)
        root.configure(bg=VEIL_COLOUR)
        root.geometry(f"{sw}x{sh}+0+0")

        self._canvas = tk.Canvas(
            root, width=sw, height=sh,
            bg=VEIL_COLOUR, highlightthickness=0,
        )
        self._canvas.pack()

        # Key bindings
        root.bind("<Escape>", self._on_escape)
        root.focus_force()

        self._tick()
        root.mainloop()

    # ── Escape handling ───────────────────────────────────────────────────────
    def _on_escape(self, _event=None) -> None:
        with self._lock:
            if not self._confirm_visible:
                self._confirm_visible = True   # show "press Esc again to skip"
            else:
                # Second Esc — honour the dismiss
                self._dismiss_requested = True
                self._phase = "fadeout"

    # ── Tick ──────────────────────────────────────────────────────────────────
    def _tick(self) -> None:
        if not self._running:
            return

        with self._lock:
            phase   = self._phase
            dismiss = self._dismiss_requested
            start   = self._start_time

        now     = time.time()
        elapsed = now - start if start else 0.0

        # ── Phase transitions ─────────────────────────────────────────────────
        if phase == "fadein":
            self._alpha = min(VEIL_MAX_ALPHA, self._alpha + FADE_ALPHA_STEP)
            self._root.wm_attributes("-alpha", self._alpha)
            if self._alpha >= VEIL_MAX_ALPHA:
                with self._lock:
                    self._phase = "running"
                self._root.focus_force()

        elif phase == "running":
            # Advance animation time
            self._t += TICK_MS / 1000.0   # seconds
            if elapsed >= EXERCISE_DURATION_SECONDS or dismiss:
                with self._lock:
                    self._phase = "fadeout"

        elif phase == "fadeout":
            self._alpha = max(0.0, self._alpha - FADE_ALPHA_STEP)
            self._root.wm_attributes("-alpha", self._alpha)
            if self._alpha <= 0.0:
                with self._lock:
                    self._phase = "idle"
                self._canvas.delete("all")
                if self._on_complete:
                    self._on_complete()

        # Draw frame
        if phase in ("fadein", "running", "fadeout"):
            self._draw(elapsed, phase)

        self._root.after(TICK_MS, self._tick)

    # ── Drawing ───────────────────────────────────────────────────────────────
    def _draw(self, elapsed: float, phase: str) -> None:
        c   = self._canvas
        sw  = self._sw
        sh  = self._sh
        c.delete("all")

        with self._lock:
            confirm_visible = self._confirm_visible

        # ── Background veil is the window itself  ────────────────────────────
        # (tk window bg handles it; draw subtle gradient with rectangles)
        strips = 8
        for i in range(strips):
            y0 = (sh * i) // strips
            y1 = (sh * (i + 1)) // strips
            factor = 1.0 - (i / strips) * 0.3
            lvl = int(5 * factor)
            lvl2 = int(16 * factor)
            col = f"#{lvl:02x}{lvl:02x}{lvl2:02x}"
            c.create_rectangle(0, y0, sw, y1, fill=col, outline="")

        # ── Compute ball position  ────────────────────────────────────────────
        # Smooth figure-8 Lissajous  (a=1, b=2 → two loops per pass)
        margin_x = sw * 0.20
        margin_y = sh * 0.25
        range_x  = sw - 2 * margin_x
        range_y  = sh - 2 * margin_y

        cx_center = sw / 2
        cy_center = sh / 2

        speed = 0.55   # radians per second
        bx = cx_center + (range_x / 2) * math.sin(speed * self._t)
        by = cy_center + (range_y / 2) * math.sin(speed * self._t * 2 + math.pi / 4)

        # ── Ghost trail  ─────────────────────────────────────────────────────
        self._trail.append((bx, by))
        if len(self._trail) > TRAIL_POINTS:
            self._trail.pop(0)

        for i, (tx, ty) in enumerate(self._trail):
            ratio  = i / TRAIL_POINTS
            radius = BALL_RADIUS * ratio * 0.55
            alpha_factor = ratio ** 2
            r = int(0x00 * alpha_factor)
            g = int(0xe5 * alpha_factor * 0.5)
            b = int(0xff * alpha_factor * 0.6)
            trail_col = f"#{r:02x}{g:02x}{b:02x}"
            if radius >= 2:
                c.create_oval(
                    tx - radius, ty - radius,
                    tx + radius, ty + radius,
                    fill=trail_col, outline="",
                )

        # ── Glow halo ────────────────────────────────────────────────────────
        for halo_r, halo_alpha in [(BALL_RADIUS * 2.8, 0.3), (BALL_RADIUS * 1.8, 0.6)]:
            halo_col = BALL_GLOW_COLOUR
            c.create_oval(
                bx - halo_r, by - halo_r, bx + halo_r, by + halo_r,
                fill=halo_col, outline="",
            )

        # ── Ball ──────────────────────────────────────────────────────────────
        pulse = 1.0 + 0.12 * math.sin(self._t * 4)
        br    = BALL_RADIUS * pulse
        c.create_oval(
            bx - br, by - br, bx + br, by + br,
            fill=BALL_COLOUR, outline="#ffffff", width=2,
        )

        # ── Countdown ring (top-centre)  ─────────────────────────────────────
        remaining = max(0, EXERCISE_DURATION_SECONDS - elapsed)
        arc_extent = -360 * (remaining / EXERCISE_DURATION_SECONDS)

        ring_cx = sw // 2
        ring_r  = 52
        ring_y  = 60
        ring_x0 = ring_cx - ring_r
        ring_x1 = ring_cx + ring_r

        # Track ring
        c.create_arc(
            ring_x0, ring_y - ring_r, ring_x1, ring_y + ring_r,
            start=90, extent=359.9,
            style=tk.ARC, outline="#1a3040", width=6,
        )
        # Filled ring
        c.create_arc(
            ring_x0, ring_y - ring_r, ring_x1, ring_y + ring_r,
            start=90, extent=arc_extent,
            style=tk.ARC, outline=BALL_COLOUR, width=6,
        )

        # ── Title & instructions  ─────────────────────────────────────────────
        c.create_text(
            sw // 2, 22,
            text="👁  EYE RECOVERY  👁",
            fill=BALL_COLOUR, font=TITLE_FONT, anchor="n",
        )

        instr_idx = min(int(elapsed / (EXERCISE_DURATION_SECONDS / len(INSTRUCTIONS))),
                        len(INSTRUCTIONS) - 1)
        c.create_text(
            sw // 2, ring_y + ring_r + 18,
            text=INSTRUCTIONS[instr_idx],
            fill="#a0c8e0", font=BODY_FONT,
        )

        # ── Countdown seconds  ────────────────────────────────────────────────
        c.create_text(
            ring_cx, ring_y,
            text=f"{int(remaining)}",
            fill="#ffffff" if remaining > 5 else "#ff6666",
            font=COUNTDOWN_FONT,
            anchor="center",
        )

        # ── Escape hint  ──────────────────────────────────────────────────────
        if confirm_visible:
            c.create_rectangle(
                sw // 2 - 260, sh - 80, sw // 2 + 260, sh - 30,
                fill="#1a0010", outline="#ff4466", width=2,
            )
            c.create_text(
                sw // 2, sh - 55,
                text="Press Esc again to skip — your eyes will thank you later",
                fill="#ff8899", font=HINT_FONT,
            )
        else:
            c.create_text(
                sw // 2, sh - 50,
                text="Press Esc to dismiss early",
                fill="#304050", font=HINT_FONT,
            )

        # ── Completion flash  ─────────────────────────────────────────────────
        if remaining <= 0 and phase == "running":
            c.create_text(
                sw // 2, sh // 2 - 60,
                text="✓  RECOVERY COMPLETE",
                fill="#00ff88",
                font=("Segoe UI", 36, "bold"),
            )

    # ── Cleanup on external stop  ─────────────────────────────────────────────
    def stop(self) -> None:
        self._running = False
        if self._root:
            try:
                self._root.after(0, self._root.destroy)
            except Exception:
                pass


# ══════════════════════════════════════════════════════════════════════════════
# Standalone demo — run this file directly to preview the animation
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import sys

    print("="*60)
    print("  GazeAware — Forced Recovery Overlay  (standalone demo)")
    print("="*60)
    print("  The full-screen 'Follow the Ball' animation will appear")
    print("  in 1 second and run for 20 seconds.")
    print("  Press Esc (twice) to dismiss early.")
    print("-"*60 + "\n")

    done_event = threading.Event()

    def on_done():
        print("\n  [Demo] Exercise complete — closing.")
        done_event.set()

    overlay = ForcedRecoveryOverlay(on_complete=on_done)
    overlay.start_thread()

    time.sleep(0.8)   # give tkinter a moment to create the window
    overlay.show()
    print("  [Demo] Overlay triggered — watch your screen!")

    # Wait until the animation finishes (or user force-quits)
    try:
        done_event.wait(timeout=40)
    except KeyboardInterrupt:
        pass

    overlay.stop()
    print("  [Demo] Done. Goodbye!\n")
    sys.exit(0)
