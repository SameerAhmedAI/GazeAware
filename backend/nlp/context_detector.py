"""
GazeAware — Context Detector
Reads the currently active application/window title and classifies it
into one of the supported context categories.

Categories: coding | writing | browsing | video | reading | unknown

Methods:
    - Windows: psutil + win32gui (pywin32)
    - Cross-platform fallback: psutil process name matching
"""
import psutil


CONTEXT_MAP = {
    "coding": [
        "code", "pycharm", "intellij", "vscode", "sublime", "vim", "nvim",
        "emacs", "atom", "cursor", "rider", "clion", "goland", "webstorm",
    ],
    "writing": [
        "word", "docs", "notion", "obsidian", "typora", "notepad", "wordpad",
        "libreoffice", "pages", "onenote",
    ],
    "browsing": [
        "chrome", "firefox", "edge", "safari", "brave", "opera", "vivaldi",
    ],
    "video": [
        "vlc", "mpv", "netflix", "youtube", "prime", "disney", "plex",
        "media player", "quicktime", "iina",
    ],
    "reading": [
        "acrobat", "evince", "okular", "foxit", "kindle", "sumatrapdf",
        "zathura", "readium",
    ],
}


def detect_context() -> str:
    """
    Returns the current user context string.
    Checks running processes against the context map.
    """
    try:
        active_processes = {p.name().lower() for p in psutil.process_iter(["name"])}
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        return "unknown"

    for ctx, keywords in CONTEXT_MAP.items():
        for kw in keywords:
            if any(kw in proc for proc in active_processes):
                return ctx

    return "unknown"
