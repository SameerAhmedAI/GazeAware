"""
GazeAware — Context Detector  (Phase 2)
════════════════════════════════════════
Identifies the currently focused Windows application by reading the
foreground window's process name via the Win32 API.

Public interface
----------------
    get_active_context() -> str
        Returns a human-readable activity label for the focused process,
        sourced from PROCESS_CONTEXT_MAP in config.py.

Windows implementation
----------------------
    Uses ctypes to call:
        - user32.GetForegroundWindow()          → HWND of focused window
        - user32.GetWindowThreadProcessId()     → PID of owning process
        - psutil.Process(pid).name()            → process executable name

Fallback
--------
    If the Win32 call fails (no focused window, AccessDenied, etc.) the
    function falls back to scanning all running processes and returns the
    first match it finds in PROCESS_CONTEXT_MAP, then PROCESS_CONTEXT_DEFAULT.
"""

import ctypes
import ctypes.wintypes
import logging

import psutil

from backend.config import PROCESS_CONTEXT_MAP, PROCESS_CONTEXT_DEFAULT

logger = logging.getLogger(__name__)


def get_active_context() -> str:
    """
    Return a human-readable string describing what the user is currently doing.

    Strategy (Windows):
        1. GetForegroundWindow → HWND
        2. GetWindowThreadProcessId → PID
        3. psutil.Process(pid).name() → exe filename (lowercase)
        4. Look up in PROCESS_CONTEXT_MAP (config.py)
        5. Fall back to PROCESS_CONTEXT_DEFAULT

    Returns
    -------
    str
        One of the mapped context strings or PROCESS_CONTEXT_DEFAULT.
    """
    # ── Primary path: foreground window PID ──────────────────────────────────
    try:
        hwnd = ctypes.windll.user32.GetForegroundWindow()
        if hwnd:
            pid = ctypes.wintypes.DWORD()
            ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            process_name = psutil.Process(pid.value).name().lower()
            context = PROCESS_CONTEXT_MAP.get(process_name)
            if context:
                return context
    except (psutil.NoSuchProcess, psutil.AccessDenied, OSError) as exc:
        logger.debug("get_active_context foreground path failed: %s", exc)

    # ── Fallback: scan all running processes ──────────────────────────────────
    try:
        running = {p.name().lower() for p in psutil.process_iter(["name"])}
        for proc_name, label in PROCESS_CONTEXT_MAP.items():
            if proc_name in running:
                return label
    except (psutil.NoSuchProcess, psutil.AccessDenied) as exc:
        logger.debug("get_active_context fallback scan failed: %s", exc)

    return PROCESS_CONTEXT_DEFAULT


# ---------------------------------------------------------------------------
# Legacy alias — kept so any existing code that calls detect_context() still
# works unchanged.
# ---------------------------------------------------------------------------
def detect_context() -> str:  # noqa: D401
    """Alias for get_active_context() — preserved for backward compatibility."""
    return get_active_context()
