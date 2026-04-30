"""
GazeAware — Phase 2.4+: FastAPI Server
======================================
Exposes the real-time strain state, historical DB records, camera feed, and
WebSocket streams to the React dashboard running on localhost.

Architecture rules:
- Never import anything from backend.main — data flows through shared_state only.
- All DB sessions use try/finally to guarantee close() even on exception.
- WebSocket broadcast loops never crash: exceptions are caught and the client
  is removed from the active-set so the loop continues for other clients.
- The FastAPI `app` instance is importable as:
      from backend.api.server import app

CORS is wide-open (*) for development; restrict origins before production deploy.
"""

import asyncio
import copy
from datetime import datetime, timezone
from typing import Any

import cv2
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# ── Shared state bridge (written by main.py, read here) ──────────────────────
from backend.api import shared_state as _state

# ── Database access ───────────────────────────────────────────────────────────
from backend.database.db import SessionLocal
from backend.database.models import (
    Prescription as DBPrescription,
    SignalLog      as DBSignalLog,
    WeeklyReport   as DBWeeklyReport,
)

# ── Vision acuity degradation report ─────────────────────────────────────────
from backend.vision_acuity.degradation_tracker import get_degradation_report

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="GazeAware API",
    description="Real-time eye strain monitoring REST + WebSocket API (Phase 2.4+)",
    version="2.5.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Unrestricted for local dev — restrict before production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════════
# Helper — convert a SQLAlchemy row to a plain dict
# ═══════════════════════════════════════════════════════════════════════════════

def _row_to_dict(row: Any) -> dict:
    """Strip the SQLAlchemy instance-state key and return a plain dict."""
    d = row.__dict__.copy()
    d.pop("_sa_instance_state", None)
    # Convert datetime / date objects to ISO strings so they serialise cleanly
    for k, v in d.items():
        if hasattr(v, "isoformat"):
            d[k] = v.isoformat()
    return d


# ═══════════════════════════════════════════════════════════════════════════════
# REST endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health() -> dict:
    """Liveness probe — confirms the API server is reachable."""
    return {"status": "ok", "phase": "2.5"}


@app.get("/session")
async def session_info() -> dict:
    """Return current session metadata from shared state."""
    s = _state.state
    return {
        "session_id":        s.get("session_id"),
        "session_start":     s.get("session_start"),
        "baseline_complete": s.get("baseline_complete"),
    }


@app.get("/snapshot")
async def snapshot() -> dict:
    """Return a full copy of the current shared state as JSON (frames excluded)."""
    s = copy.copy(_state.state)
    s.pop("latest_frame", None)   # numpy arrays are not JSON-serialisable
    return s


@app.get("/history/prescriptions")
async def history_prescriptions() -> list:
    """Last 50 prescriptions, newest first."""
    db = SessionLocal()
    try:
        rows = (
            db.query(DBPrescription)
            .order_by(DBPrescription.id.desc())
            .limit(50)
            .all()
        )
        return [_row_to_dict(r) for r in rows]
    except Exception:
        return []
    finally:
        db.close()


@app.get("/history/signals")
async def history_signals() -> list:
    """Last 500 signal log rows, newest first (for charting)."""
    db = SessionLocal()
    try:
        rows = (
            db.query(DBSignalLog)
            .order_by(DBSignalLog.id.desc())
            .limit(500)
            .all()
        )
        return [_row_to_dict(r) for r in rows]
    except Exception:
        return []
    finally:
        db.close()


@app.get("/history/acuity")
async def history_acuity() -> list:
    """All acuity log rows, newest first."""
    db = SessionLocal()
    try:
        from sqlalchemy import text
        rows = db.execute(
            text(
                "SELECT id, timestamp, snellen_fraction, last_row_passed, "
                "distance_cm, cheat_detected, squint_detected, session_id "
                "FROM acuity_logs ORDER BY id DESC"
            )
        ).fetchall()
        keys = [
            "id", "timestamp", "snellen_fraction", "last_row_passed",
            "distance_cm", "cheat_detected", "squint_detected", "session_id",
        ]
        return [dict(zip(keys, row)) for row in rows]
    except Exception:
        return []
    finally:
        db.close()


@app.get("/report/degradation")
async def report_degradation() -> dict:
    """Vision degradation analysis from degradation_tracker."""
    try:
        report = get_degradation_report()
        for week in report.get("weekly_data", []):
            for k, v in week.items():
                if hasattr(v, "isoformat"):
                    week[k] = v.isoformat()
        return report
    except Exception as exc:
        return {"error": str(exc)}


@app.get("/report/weekly")
async def report_weekly() -> list:
    """Last 4 rows from the weekly_reports table."""
    db = SessionLocal()
    try:
        rows = (
            db.query(DBWeeklyReport)
            .order_by(DBWeeklyReport.id.desc())
            .limit(4)
            .all()
        )
        return [_row_to_dict(r) for r in rows]
    except Exception:
        return []
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════════
# Fix 3: Control endpoints — set flags consumed by main.py on the next tick
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/controls/prescription")
async def control_prescription() -> dict:
    """Trigger a manual prescription (same as Space key)."""
    _state.state["trigger_prescription"] = True
    return {"status": "triggered", "control": "prescription"}


@app.post("/controls/baseline")
async def control_baseline() -> dict:
    """Force a new baseline calibration (same as B key)."""
    _state.state["trigger_baseline"] = True
    return {"status": "triggered", "control": "baseline"}


@app.post("/controls/tfsi")
async def control_tfsi() -> dict:
    """Trigger a TFSI dry-eye alert (same as T key)."""
    _state.state["trigger_tfsi"] = True
    return {"status": "triggered", "control": "tfsi"}


@app.post("/controls/acuity")
async def control_acuity() -> dict:
    """Trigger the visual acuity test (same as A key)."""
    _state.state["trigger_acuity"] = True
    return {"status": "triggered", "control": "acuity"}


@app.post("/controls/clear_prescription")
async def control_clear_prescription() -> dict:
    """Dismiss the active prescription banner in the UI."""
    _state.state["active_prescription"] = None
    _state.state["prescription_timestamp"] = None
    return {"status": "cleared", "control": "clear_prescription"}


@app.post("/controls/acuity_reset")
async def reset_acuity() -> dict:
    """Reset the acuity test state machine to idle (called by Acuity.jsx Done button)."""
    _state.state["acuity_test_active"] = False
    _state.state["acuity_test_state"] = {
        "phase": "idle",
        "current_line": 0,
        "letters": [],
        "result": None,
        "time_remaining": 0,
    }
    return {"status": "reset"}


# ═══════════════════════════════════════════════════════════════════════════════
# Fix 4: MJPEG camera feed endpoint
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/video_feed")
async def video_feed():
    """Stream the live camera feed as multipart MJPEG at ~10 FPS."""
    async def frame_generator():
        while True:
            frame = _state.state.get("latest_frame")
            if frame is not None:
                try:
                    _, buffer = cv2.imencode(
                        ".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60]
                    )
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n"
                        + buffer.tobytes()
                        + b"\r\n"
                    )
                except Exception:
                    pass
            await asyncio.sleep(0.1)   # 10 FPS is sufficient for display

    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# WebSocket — /ws/strain  (Fix 1: global declarations to avoid scoping bug)
# ═══════════════════════════════════════════════════════════════════════════════

_strain_clients: set[WebSocket] = set()


async def _broadcast_strain():
    """Background task: push strain summary to all /ws/strain clients every 500ms."""
    global _strain_clients   # Fix 1: explicit global reference
    while True:
        await asyncio.sleep(0.5)
        if not _strain_clients:
            continue

        s = _state.state
        payload = {
            "strain_score":      s.get("strain_score", 0.0),
            "zone":              s.get("zone", "GREEN"),
            "tick":              s.get("tick_count", 0),
            "crash_prediction":  s.get("crash_prediction", {
                "will_crash": False,
                "seconds_until_crash": None,
                "confidence": 0.0,
            }),
            "active_prescription": s.get("active_prescription"),
            "tfsi_stability":    s.get("tfsi_stability", 1.0),
            # Fix 2: include events + timestamps in strain broadcast
            "events":            s.get("events", []),
            "last_event":        s.get("last_event"),
            # Fix 2 (timestamp): server-authoritative ISO timestamp for age calc
            "computed_at":       s.get("computed_at"),
            # Fix 2: prescription timestamp
            "prescription_timestamp": s.get("prescription_timestamp"),
            # Fix 3 (blink BPM): raw blinks-per-minute alongside 0-1 signal
            "blink_rate_bpm":    s.get("blink_rate_bpm"),
            # Fix 4: trend slope for crash predictor trajectory display
            "trend_slope":       s.get("trend_slope", 0.0),
            # Fix 4: TFSI sample count for display
            "tfsi_sample_count": s.get("tfsi_sample_count", 0),
            # Fix 5: continuous live status for all signal channels
            "status":            s.get("status", {}),
        }

        disconnected: set[WebSocket] = set()
        for ws in list(_strain_clients):
            try:
                await ws.send_json(payload)
            except WebSocketDisconnect:
                disconnected.add(ws)
            except Exception:
                disconnected.add(ws)

        _strain_clients -= disconnected


@app.on_event("startup")
async def _start_strain_broadcaster():
    asyncio.create_task(_broadcast_strain())


@app.websocket("/ws/strain")
async def ws_strain(websocket: WebSocket):
    """WebSocket endpoint that streams strain score updates every 500ms."""
    global _strain_clients   # Fix 1
    await websocket.accept()
    _strain_clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()   # blocks until client sends or disconnects
    except WebSocketDisconnect:
        pass
    finally:
        _strain_clients.discard(websocket)


# ═══════════════════════════════════════════════════════════════════════════════
# WebSocket — /ws/signals  (Fix 1: global declarations to avoid scoping bug)
# ═══════════════════════════════════════════════════════════════════════════════

_signal_clients: set[WebSocket] = set()


async def _broadcast_signals():
    """Background task: push full signal values to all /ws/signals clients every 500ms."""
    global _signal_clients   # Fix 1: explicit global reference
    while True:
        await asyncio.sleep(0.5)
        if not _signal_clients:
            continue

        s = _state.state
        sigs = s.get("signals", {})
        payload = {
            "blink_rate":        sigs.get("blink_rate", 0.0),
            "blink_quality":     sigs.get("blink_quality", 0.0),
            "screen_distance":   sigs.get("screen_distance", 0.0),
            "squint":            sigs.get("squint", 0.0),
            "gaze_entropy":      sigs.get("gaze_entropy", 0.0),
            "blink_irregularity": sigs.get("blink_irregularity", 0.0),
            "eye_rubbing":       sigs.get("eye_rubbing", 0.0),
            "posture_lean":      sigs.get("posture_lean", 0.0),
            "scleral_redness":   sigs.get("scleral_redness", 0.0),
            "lighting_score":    s.get("lighting_score", 0.0),
            "distance_drift_cm": s.get("distance_drift_cm", 0.0),
            "modifiers":         s.get("modifiers", {}),
            # Fix 3: also expose blink_rate_bpm from signals WS for completeness
            "blink_rate_bpm":    s.get("blink_rate_bpm"),
        }

        disconnected: set[WebSocket] = set()
        for ws in list(_signal_clients):
            try:
                await ws.send_json(payload)
            except WebSocketDisconnect:
                disconnected.add(ws)
            except Exception:
                disconnected.add(ws)

        _signal_clients -= disconnected


@app.on_event("startup")
async def _start_signals_broadcaster():
    asyncio.create_task(_broadcast_signals())


@app.websocket("/ws/signals")
async def ws_signals(websocket: WebSocket):
    """WebSocket endpoint that streams all signal values every 500ms."""
    global _signal_clients   # Fix 1
    await websocket.accept()
    _signal_clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _signal_clients.discard(websocket)
