"""
GazeAware — TFSI Alert Banner  (Tear-Film Stability Notification)
══════════════════════════════════════════════════════════════════
A slim, always-on-top notification banner that slides down from the top
of the screen when the Tear-Film Stability Index reaches CRITICAL.

Design:
  • 60px-tall dark banner, full screen width, top edge of screen
  • Left:  💧 icon + "TEAR FILM CRITICAL" heading
  • Centre: recommendation text (e.g. "Use lubricating drops now")
  • Right:  TFSI score badge + auto-dismiss countdown ring
  • Slides in over 300 ms, holds for 10 seconds, slides back out

Runs in the same daemon thread context as the OverlayManager.
Thread-safe: show(result) can be called from any thread.
"""

import math
import threading
import time
import tkinter as tk


# ── Banner geometry ───────────────────────────────────────────────────────────
BANNER_HEIGHT    = 72      # px
SLIDE_DURATION   = 0.30    # seconds to fully slide in/out
HOLD_DURATION    = 10.0    # seconds banner stays visible

# ── Colours ───────────────────────────────────────────────────────────────────
BG_COLOUR        = "#0d1a2a"    # very dark blue
BORDER_COLOUR    = "#00b4d8"    # cyan-blue medical accent
CRITICAL_COLOUR  = "#ff6b6b"    # soft red for critical badge
TEXT_COLOUR      = "#e0f0ff"    # near-white
SUBTEXT_COLOUR   = "#7ab8d4"    # muted blue for secondary text
RATE_UP_COLOUR   = "#ff9f43"    # amber for worsening rate
RATE_OK_COLOUR   = "#00e5a0"    # green for stable

# ── Fonts ─────────────────────────────────────────────────────────────────────
TITLE_FONT  = ("Segoe UI", 11, "bold")
BODY_FONT   = ("Segoe UI", 10)
BADGE_FONT  = ("Segoe UI", 20, "bold")
SMALL_FONT  = ("Segoe UI", 8)

TICK_MS     = 16


# ══════════════════════════════════════════════════════════════════════════════
class TFSIAlertBanner:
    """
    Slim top-of-screen banner for tear-film alerts.
    Non-blocking: show() returns immediately.
    """

    def __init__(self):
        self._lock      = threading.Lock()
        self._running   = False
        self._root: tk.Tk | None     = None
        self._canvas: tk.Canvas | None = None
        self._thread: threading.Thread | None = None

        # State
        self._phase         = "idle"   # idle | slidein | hold | slideout
        self._slide_pos     = 0.0      # 0 = fully hidden above screen, 1 = fully visible
        self._hold_start    = 0.0
        self._current_result: dict = {}
        self._sw            = 0
        self._t             = 0.0     # animation time for pulse

    # ── Public API ────────────────────────────────────────────────────────────
    def start_thread(self) -> None:
        if self._running:
            return
        self._running = True
        self._thread  = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def show(self, result: dict) -> None:
        """Trigger the banner with TFSI result data. Thread-safe."""
        with self._lock:
            self._current_result = result.copy()
            self._phase          = "slidein"
            self._slide_pos      = 0.0
            self._hold_start     = 0.0
            self._t              = 0.0

    def stop(self) -> None:
        self._running = False
        if self._root:
            try:
                self._root.after(0, self._root.destroy)
            except Exception:
                pass

    # ── Internals ─────────────────────────────────────────────────────────────
    def _run(self) -> None:
        self._root = tk.Tk()
        root = self._root

        self._sw = root.winfo_screenwidth()
        sh       = root.winfo_screenheight()

        root.overrideredirect(True)
        root.wm_attributes("-topmost", True)
        root.wm_attributes("-alpha",   0.94)
        root.configure(bg=BG_COLOUR)

        # Start fully hidden (alpha 0) at the top of the screen
        self._root.attributes('-alpha', 0.0)
        self._root.withdraw()
        root.geometry(f"{self._sw}x{BANNER_HEIGHT}+0+0")

        self._canvas = tk.Canvas(
            root, width=self._sw, height=BANNER_HEIGHT,
            bg=BG_COLOUR, highlightthickness=0,
        )
        self._canvas.pack()

        self._tick()
        root.mainloop()

    # ── Tick ──────────────────────────────────────────────────────────────────
    def _tick(self) -> None:
        if not self._running:
            return

        with self._lock:
            phase  = self._phase
            result = self._current_result.copy()

        now = time.time()
        self._t += TICK_MS / 1000.0

        if phase == "slidein":
            if self._slide_pos == 0.0:
                self._root.deiconify()
                self._root.attributes('-alpha', 0.0)
                
            self._slide_pos = min(1.0, self._slide_pos + (TICK_MS / 1000.0) / SLIDE_DURATION)
            self._reposition()
            if self._slide_pos >= 1.0:
                with self._lock:
                    self._phase      = "hold"
                    self._hold_start = now

        elif phase == "hold":
            elapsed = now - self._hold_start
            if elapsed >= HOLD_DURATION:
                with self._lock:
                    self._phase = "slideout"

        elif phase == "slideout":
            self._slide_pos = max(0.0, self._slide_pos - (TICK_MS / 1000.0) / SLIDE_DURATION)
            self._reposition()
            if self._slide_pos <= 0.0:
                with self._lock:
                    self._phase = "idle"
                self._canvas.delete("all")
                self._root.withdraw()

        # Draw
        if phase in ("slidein", "hold", "slideout"):
            elapsed_hold = now - self._hold_start if self._hold_start else 0.0
            self._draw(result, elapsed_hold)

        self._root.after(TICK_MS, self._tick)

    def _reposition(self) -> None:
        """Fade in/out based on slide_pos (0 = invisible, 1 = fully visible)."""
        current_alpha = 0.94 * self._slide_pos
        self._root.attributes('-alpha', current_alpha)
        # Force window to top in case other windows covered it
        self._root.attributes('-topmost', 1)

    # ── Drawing ───────────────────────────────────────────────────────────────
    def _draw(self, result: dict, elapsed_hold: float) -> None:
        c  = self._canvas
        sw = self._sw
        bh = BANNER_HEIGHT
        c.delete("all")

        # ── Background ───────────────────────────────────────────────────────
        c.create_rectangle(0, 0, sw, bh, fill=BG_COLOUR, outline="")

        # Bottom border glow line
        c.create_rectangle(0, bh - 3, sw, bh, fill=BORDER_COLOUR, outline="")

        # Left accent stripe
        c.create_rectangle(0, 0, 5, bh, fill=CRITICAL_COLOUR, outline="")

        # ── Left: icon + title ────────────────────────────────────────────────
        c.create_text(
            20, bh // 2 - 8,
            text="💧",
            font=("Segoe UI", 22),
            anchor="w",
        )
        c.create_text(
            60, bh // 2 - 11,
            text="TEAR FILM CRITICAL",
            fill=CRITICAL_COLOUR,
            font=TITLE_FONT,
            anchor="w",
        )
        c.create_text(
            60, bh // 2 + 9,
            text="Dry-Eye Prediction  |  GazeAware Medical",
            fill=SUBTEXT_COLOUR,
            font=SMALL_FONT,
            anchor="w",
        )

        # ── Centre: recommendation (truncated to fit) ─────────────────────────
        rec = result.get("recommendation", "")
        # Truncate for display
        if len(rec) > 75:
            rec = rec[:72] + "…"
        c.create_text(
            sw // 2, bh // 2,
            text=rec,
            fill=TEXT_COLOUR,
            font=BODY_FONT,
            anchor="center",
            width=sw // 2 - 60,
        )

        # ── Right: TFSI score badge ───────────────────────────────────────────
        badge_x = sw - 120
        score   = result.get("tfsi_score", 0)
        rate    = result.get("breakdown_rate_pct", 0.0)
        rate_str = f"+{rate:.0f}% faster" if rate > 0 else f"{rate:.0f}%"
        rate_col = RATE_UP_COLOUR if rate > 10 else RATE_OK_COLOUR

        c.create_text(
            badge_x, bh // 2 - 8,
            text=f"{score:.0f}",
            fill=CRITICAL_COLOUR,
            font=BADGE_FONT,
            anchor="center",
        )
        c.create_text(
            badge_x, bh // 2 + 14,
            text=rate_str,
            fill=rate_col,
            font=SMALL_FONT,
            anchor="center",
        )

        # ── Auto-dismiss countdown arc (far right) ────────────────────────────
        arc_cx  = sw - 38
        arc_cy  = bh // 2
        arc_r   = 18
        remaining = max(0, HOLD_DURATION - elapsed_hold)
        extent    = -360 * (remaining / HOLD_DURATION)

        # Track
        c.create_oval(
            arc_cx - arc_r, arc_cy - arc_r,
            arc_cx + arc_r, arc_cy + arc_r,
            outline="#1a3040", width=4,
        )
        # Fill
        if remaining > 0:
            c.create_arc(
                arc_cx - arc_r, arc_cy - arc_r,
                arc_cx + arc_r, arc_cy + arc_r,
                start=90, extent=extent,
                style=tk.ARC, outline=BORDER_COLOUR, width=4,
            )
        c.create_text(
            arc_cx, arc_cy,
            text=f"{int(remaining)}",
            fill=SUBTEXT_COLOUR,
            font=SMALL_FONT,
        )


# ══════════════════════════════════════════════════════════════════════════════
# Standalone demo
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    banner = TFSIAlertBanner()
    banner.start_thread()
    print("  [Demo] Launching TFSI Alert Banner in 1 second...")
    time.sleep(1)

    test_result = {
        "tfsi_score": 88.5,
        "stability_class": "CRITICAL",
        "breakdown_rate_pct": 42.0,
        "recommendation": "⚠ Tear film critically unstable — breaking down 42% faster today. Use lubricating eye drops now.",
        "alert_needed": True,
    }

    banner.show(test_result)
    
    # Banner stays for 10 seconds, give it 12 to slide out gracefully
    try:
        time.sleep(12)
    except KeyboardInterrupt:
        pass
        
    banner.stop()
    print("  [Demo] Done.")

