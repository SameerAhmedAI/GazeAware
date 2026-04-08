"""
GazeAware — Vitality Ring HUD  (Ghost Overlay)
═══════════════════════════════════════════════
A translucent, always-on-top ring widget that floats in the corner of the
user's screen at ~10 % opacity.  It shows the live strain score via:
  • A colour-coded arc that fills proportionally to the score
  • A numeric readout in the centre
  • A pulsing glow that intensifies as strain climbs

Runs in its own daemon thread — never blocks the main monitoring loop.

Usage:
    from backend.overlay.vitality_ring import VitalityRing
    ring = VitalityRing()
    ring.start()
    ring.update(score=42, zone="YELLOW")
    ring.stop()
"""

import math
import threading
import tkinter as tk
from tkinter import font as tkfont


# ── Geometry ─────────────────────────────────────────────────────────────────
RING_SIZE   = 110          # window width/height in pixels
PADDING     = 8            # ring padding inside canvas
RING_WIDTH  = 14           # arc stroke width
MARGIN      = 20           # distance from screen edge (bottom-right corner)

# ── Appearance ────────────────────────────────────────────────────────────────
BG_COLOUR   = "#0a0a0a"    # near-black canvas background

ZONE_COLOURS = {
    "GREEN":  "#00e5a0",   # vibrant mint-green
    "YELLOW": "#ffcc00",   # warm amber
    "RED":    "#ff3355",   # danger red
}

# The window is born at 10 % opacity; during FORCED RECOVERY the
# forced_recovery_overlay.py takes centre stage — ring can drop to 0 % then.
NORMAL_ALPHA  = 0.10       # 10 % opacity — "ghost" state
HOVER_ALPHA   = 0.80       # 80 % on mouse-enter so it's readable on demand
FADE_STEP     = 0.04       # alpha change per tick when fading

# ── Pulse animation ───────────────────────────────────────────────────────────
PULSE_INTERVAL_MS = 50     # redraw tick (20 fps is plenty for a subtle pulse)


# ══════════════════════════════════════════════════════════════════════════════
class VitalityRing:
    """
    Always-on-top translucent HUD ring.

    Thread-safe: `update()` can be called from any thread.
    """

    def __init__(self):
        self._score: float = 0.0
        self._zone:  str   = "GREEN"
        self._lock   = threading.Lock()
        self._running = False
        self._alpha   = NORMAL_ALPHA
        self._target_alpha = NORMAL_ALPHA
        self._pulse_phase  = 0.0          # 0 → 2π, drives subtle brightness wave
        self._root: tk.Tk | None = None
        self._canvas: tk.Canvas | None = None
        self._thread: threading.Thread | None = None

    # ── Public API ────────────────────────────────────────────────────────────
    def start(self) -> None:
        """Launch the HUD in a background thread."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        """Gracefully destroy the HUD window."""
        self._running = False
        if self._root:
            try:
                self._root.after(0, self._root.destroy)
            except Exception:
                pass

    def update(self, score: float, zone: str) -> None:
        """Thread-safe score+zone update called from the main loop."""
        with self._lock:
            self._score = max(0.0, min(100.0, score))
            self._zone  = zone

    def set_visible(self, visible: bool) -> None:
        """Show/hide the ring (called by forced-recovery overlay)."""
        if self._root:
            try:
                target = NORMAL_ALPHA if visible else 0.0
                self._root.after(0, lambda: self._set_alpha(target))
            except Exception:
                pass

    # ── Internals ─────────────────────────────────────────────────────────────
    def _run(self) -> None:
        """Main tkinter event loop — runs in its own thread."""
        self._root = tk.Tk()
        root = self._root

        # ── Remove window chrome ──────────────────────────────────────────────
        root.overrideredirect(True)          # no title bar / borders
        root.wm_attributes("-topmost", True) # always on top
        root.wm_attributes("-alpha", NORMAL_ALPHA)
        root.configure(bg=BG_COLOUR)

        # ── Position: bottom-right corner ────────────────────────────────────
        sw = root.winfo_screenwidth()
        sh = root.winfo_screenheight()
        x  = sw - RING_SIZE - MARGIN
        y  = sh - RING_SIZE - MARGIN
        root.geometry(f"{RING_SIZE}x{RING_SIZE}+{x}+{y}")

        # ── Canvas ───────────────────────────────────────────────────────────
        self._canvas = tk.Canvas(
            root,
            width=RING_SIZE, height=RING_SIZE,
            bg=BG_COLOUR, highlightthickness=0,
        )
        self._canvas.pack()

        # ── Hover to reveal ───────────────────────────────────────────────────
        root.bind("<Enter>", lambda _: self._fade_to(HOVER_ALPHA))
        root.bind("<Leave>", lambda _: self._fade_to(NORMAL_ALPHA))

        # ── Allow dragging ────────────────────────────────────────────────────
        self._drag_x = self._drag_y = 0
        root.bind("<ButtonPress-1>",   self._on_drag_start)
        root.bind("<B1-Motion>",       self._on_drag_motion)

        # ── Start animation loop ──────────────────────────────────────────────
        self._tick()
        root.mainloop()

    # ── Drag support ──────────────────────────────────────────────────────────
    def _on_drag_start(self, event):
        self._drag_x = event.x_root - self._root.winfo_x()
        self._drag_y = event.y_root - self._root.winfo_y()

    def _on_drag_motion(self, event):
        x = event.x_root - self._drag_x
        y = event.y_root - self._drag_y
        self._root.geometry(f"+{x}+{y}")

    # ── Alpha fade ────────────────────────────────────────────────────────────
    def _fade_to(self, target: float) -> None:
        self._target_alpha = target

    def _set_alpha(self, a: float) -> None:
        self._alpha = a
        if self._root:
            self._root.wm_attributes("-alpha", a)

    # ── Animation tick ────────────────────────────────────────────────────────
    def _tick(self) -> None:
        if not self._running:
            return

        # ── Smooth alpha fade ────────────────────────────────────────────────
        if abs(self._alpha - self._target_alpha) > 0.005:
            step = FADE_STEP if self._alpha < self._target_alpha else -FADE_STEP
            self._alpha = max(0.0, min(1.0, self._alpha + step))
            self._root.wm_attributes("-alpha", self._alpha)

        # ── Update pulse phase ────────────────────────────────────────────────
        self._pulse_phase = (self._pulse_phase + 0.12) % (2 * math.pi)

        # ── Read latest data (thread-safe) ────────────────────────────────────
        with self._lock:
            score = self._score
            zone  = self._zone

        self._draw(score, zone)

        self._root.after(PULSE_INTERVAL_MS, self._tick)

    # ── Drawing ───────────────────────────────────────────────────────────────
    def _draw(self, score: float, zone: str) -> None:
        c = self._canvas
        c.delete("all")

        size    = RING_SIZE
        pad     = PADDING
        x0, y0  = pad, pad
        x1, y1  = size - pad, size - pad

        colour  = ZONE_COLOURS.get(zone, ZONE_COLOURS["GREEN"])
        dark_bg = self._darken(colour, 0.15)

        # ── Background track (full circle, dimmed colour) ─────────────────────
        c.create_arc(
            x0, y0, x1, y1,
            start=90, extent=359.9,
            style=tk.ARC, outline=dark_bg, width=RING_WIDTH,
        )

        # ── Score arc ─────────────────────────────────────────────────────────
        extent = -3.6 * score   # negative = clockwise fill
        if score > 0:
            # Pulse: slightly modulate brightness based on sin wave
            pulse  = 0.85 + 0.15 * math.sin(self._pulse_phase)
            bright = self._modulate_brightness(colour, pulse)
            c.create_arc(
                x0, y0, x1, y1,
                start=90, extent=extent,
                style=tk.ARC, outline=bright, width=RING_WIDTH,
            )

        # ── Glow dot at arc tip ────────────────────────────────────────────────
        if score > 2:
            angle_rad = math.radians(90 + extent)
            cx = (x0 + x1) / 2
            cy = (y0 + y1) / 2
            r  = (x1 - x0) / 2
            tip_x = cx + r * math.cos(angle_rad)
            tip_y = cy - r * math.sin(angle_rad)
            dot_r = RING_WIDTH / 2 + 2
            c.create_oval(
                tip_x - dot_r, tip_y - dot_r,
                tip_x + dot_r, tip_y + dot_r,
                fill=colour, outline="",
            )

        # ── Centre score text ─────────────────────────────────────────────────
        cx = size / 2
        cy = size / 2

        # Score number
        c.create_text(
            cx, cy - 6,
            text=f"{int(score)}",
            fill=colour,
            font=("Consolas", 18, "bold"),
        )
        # Mini label below
        c.create_text(
            cx, cy + 14,
            text=zone,
            fill=self._modulate_brightness(colour, 0.65),
            font=("Consolas", 7),
        )

    # ── Colour helpers ────────────────────────────────────────────────────────
    @staticmethod
    def _hex_to_rgb(hex_c: str) -> tuple[int, int, int]:
        h = hex_c.lstrip("#")
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

    @staticmethod
    def _rgb_to_hex(r, g, b) -> str:
        return f"#{int(r):02x}{int(g):02x}{int(b):02x}"

    def _darken(self, hex_c: str, factor: float) -> str:
        r, g, b = self._hex_to_rgb(hex_c)
        return self._rgb_to_hex(r * factor, g * factor, b * factor)

    def _modulate_brightness(self, hex_c: str, factor: float) -> str:
        r, g, b = self._hex_to_rgb(hex_c)
        return self._rgb_to_hex(
            min(255, r * factor),
            min(255, g * factor),
            min(255, b * factor),
        )


# ══════════════════════════════════════════════════════════════════════════════
# Standalone demo — run this file directly to preview the Vitality Ring
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import sys
    import time

    print("=" * 60)
    print("  GazeAware — Vitality Ring HUD  (standalone demo)")
    print("=" * 60)
    print("  Look at the BOTTOM-RIGHT corner of your screen.")
    print("  The ring starts at 10% opacity — hover it to reveal.")
    print("  Score will cycle GREEN → YELLOW → RED over 18 seconds.")
    print("  Ctrl+C to quit.")
    print("-" * 60 + "\n")

    ring = VitalityRing()
    ring.start()
    time.sleep(0.5)   # let tkinter create the window

    steps = [
        (5,  "GREEN",  "Healthy baseline"),
        (20, "GREEN",  "Mild activity"),
        (42, "YELLOW", "Mild strain"),
        (61, "YELLOW", "Moderate strain"),
        (78, "RED",    "Danger zone"),
        (90, "RED",    "Critical — overlay would fire"),
        (55, "YELLOW", "Recovering..."),
        (18, "GREEN",  "Back to normal"),
    ]

    try:
        for score, zone, label in steps:
            print(f"  Score: {score:3d}/100  [{zone}]  — {label}")
            ring.update(score=score, zone=zone)
            time.sleep(2.2)
    except KeyboardInterrupt:
        pass

    ring.stop()
    print("\n  [Demo] Done. Goodbye!\n")
    sys.exit(0)
