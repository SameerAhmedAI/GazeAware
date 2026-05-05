"""
GazeAware — Phase 2.4: FastAPI Server
"""

import asyncio
import copy
import math
import time
import cv2
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.api import shared_state as _state
from backend.database.db import SessionLocal
from backend.database.models import (
    Prescription as DBPrescription,
    SignalLog      as DBSignalLog,
    WeeklyReport   as DBWeeklyReport,
)
from backend.vision_acuity.degradation_tracker import get_degradation_report

app = FastAPI(title="GazeAware API", version="2.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _safe_float(value, fallback=None):
    try:
        f = float(value)
        if math.isinf(f) or math.isnan(f):
            return fallback
        return f
    except (TypeError, ValueError):
        return fallback


def _row_to_dict(row: Any) -> dict:
    d = row.__dict__.copy()
    d.pop("_sa_instance_state", None)
    for k, v in d.items():
        if hasattr(v, "isoformat"):
            d[k] = v.isoformat()
    return d


# ── REST endpoints ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "phase": "2.4"}


@app.get("/session")
async def session_info() -> dict:
    s = _state.state
    return {
        "session_id":        s.get("session_id"),
        "session_start":     s.get("session_start"),
        "baseline_complete": s.get("baseline_complete"),
    }


@app.get("/snapshot")
async def snapshot() -> dict:
    return copy.copy(_state.state)


@app.get("/history/prescriptions")
async def history_prescriptions() -> list:
    db = SessionLocal()
    try:
        rows = db.query(DBPrescription).order_by(DBPrescription.id.desc()).limit(50).all()
        return [_row_to_dict(r) for r in rows]
    except Exception:
        return []
    finally:
        db.close()


@app.get("/history/signals")
async def history_signals() -> list:
    db = SessionLocal()
    try:
        rows = db.query(DBSignalLog).order_by(DBSignalLog.id.desc()).limit(500).all()
        return [_row_to_dict(r) for r in rows]
    except Exception:
        return []
    finally:
        db.close()


@app.get("/history/acuity")
async def history_acuity() -> list:
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
        keys = ["id", "timestamp", "snellen_fraction", "last_row_passed",
                "distance_cm", "cheat_detected", "squint_detected", "session_id"]
        return [dict(zip(keys, row)) for row in rows]
    except Exception:
        return []
    finally:
        db.close()


@app.get("/report/degradation")
async def report_degradation() -> dict:
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
    db = SessionLocal()
    try:
        rows = db.query(DBWeeklyReport).order_by(DBWeeklyReport.id.desc()).limit(4).all()
        return [_row_to_dict(r) for r in rows]
    except Exception:
        return []
    finally:
        db.close()


@app.get("/report/session_summary")
async def session_summary() -> dict:
    """
    Compute a live session summary from signal_logs and prescriptions tables.
    """
    db = SessionLocal()
    try:
        from sqlalchemy import text

        # Total sessions
        sessions = db.execute(
            text("SELECT id, start_time, end_time, "
                 "peak_strain_score, avg_strain_score "
                 "FROM sessions ORDER BY id DESC LIMIT 20")
        ).fetchall()

        # Prescription counts by type
        rx_rows = db.execute(
            text("SELECT context, COUNT(*) as cnt "
                 "FROM prescriptions GROUP BY context")
        ).fetchall()

        # Acuity results
        acuity_rows = db.execute(
            text("SELECT snellen_fraction, last_row_passed, "
                 "timestamp FROM acuity_logs ORDER BY id DESC")
        ).fetchall()

        # Signal averages across all logs
        signal_avgs = db.execute(
            text("SELECT "
                 "AVG(strain_score) as avg_strain, "
                 "MAX(strain_score) as peak_strain, "
                 "AVG(blink_rate) as avg_blink, "
                 "AVG(squint_ratio) as avg_squint, "
                 "AVG(screen_distance) as avg_dist "
                 "FROM signal_logs")
        ).fetchone()

        session_list = []
        for s in sessions:
            session_list.append({
                "id":         s[0],
                "start_time": str(s[1]),
                "end_time":   str(s[2]) if s[2] else None,
                "peak_strain": round(s[3] or 0, 1),
                "avg_strain":  round(s[4] or 0, 1),
            })

        rx_by_type = {}
        for r in rx_rows:
            context = r[0] or "AUTO"
            if context == "FORCED_VIA_DASHBOARD":
                rx_by_type["forced"] = r[1]
            elif str(context).startswith("ACUITY_TEST"):
                rx_by_type["acuity"] = r[1]
            else:
                rx_by_type["auto"] = r[1]

        acuity_list = []
        for a in acuity_rows:
            acuity_list.append({
                "fraction":  a[0],
                "last_row":  a[1],
                "timestamp": str(a[2]),
            })

        return {
            "sessions":       session_list,
            "rx_by_type":     rx_by_type,
            "acuity_results": acuity_list,
            "signal_averages": {
                "avg_strain":  round(float(signal_avgs[0] or 0), 1),
                "peak_strain": round(float(signal_avgs[1] or 0), 1),
                "avg_blink":   round(float(signal_avgs[2] or 0), 3),
                "avg_squint":  round(float(signal_avgs[3] or 0), 3),
                "avg_dist":    round(float(signal_avgs[4] or 0), 3),
            },
        }
    except Exception as exc:
        return {"error": str(exc)}
    finally:
        db.close()


# ── Action endpoints ───────────────────────────────────────────────────────────

@app.post("/actions/force_prescription")
async def force_prescription() -> dict:
    _state.state["action_force_prescription"] = True
    return {
        "status":    "queued",
        "action":    "force_prescription",
        "message":   "Prescription will trigger on next engine tick (~500ms)",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/actions/trigger_acuity")
async def trigger_acuity() -> dict:
    _state.state["action_trigger_acuity"] = True
    return {
        "status":    "queued",
        "action":    "trigger_acuity",
        "message":   "Acuity test will launch in OpenCV window on next tick",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/actions/trigger_tfsi")
async def trigger_tfsi() -> dict:
    _state.state["action_trigger_tfsi"] = True
    return {
        "status":    "queued",
        "action":    "trigger_tfsi",
        "message":   "TFSI stability check will run on next tick",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/actions/trigger_recovery")
async def trigger_recovery() -> dict:
    """
    Manually trigger the forced-recovery ball-tracking overlay immediately,
    regardless of the current strain level.  The main loop consumes this flag
    on the next 500ms tick and calls overlays._trigger_forced_recovery().
    """
    _state.state["action_trigger_recovery"] = True
    return {
        "status":    "queued",
        "action":    "trigger_recovery",
        "message":   "Forced-recovery ball exercise will launch on next tick",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── MJPEG camera feed ──────────────────────────────────────────────────────────

def _generate_frames():
    while True:
        frame = _state.state.get("latest_frame")
        if frame is None:
            time.sleep(0.05)
            continue
        try:
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n'
                + buffer.tobytes()
                + b'\r\n'
            )
        except Exception:
            pass
        time.sleep(0.033)


@app.get("/video_feed")
async def video_feed():
    return StreamingResponse(
        _generate_frames(),
        media_type="multipart/x-mixed-replace;boundary=frame"
    )


# ── WebSocket /ws/strain ───────────────────────────────────────────────────────

_strain_clients: set[WebSocket] = set()


async def _broadcast_strain():
    global _strain_clients
    while True:
        await asyncio.sleep(0.5)
        if not _strain_clients:
            continue
        s = _state.state
        crash = s.get("crash_prediction", {})
        payload = {
            "strain_score":    _safe_float(s.get("strain_score"), 0.0),
            "zone":            s.get("zone", "GREEN"),
            "tick":            int(s.get("tick_count", 0)),
            "crash_prediction": {
                "will_crash":          bool(crash.get("will_crash", False)),
                "seconds_until_crash": _safe_float(crash.get("seconds_until_crash"), None),
                "confidence":          _safe_float(crash.get("confidence"), 0.0),
            },
            "active_prescription": s.get("active_prescription"),
            "tfsi_stability":  _safe_float(s.get("tfsi_stability"), 1.0),
        }
        disconnected: set[WebSocket] = set()
        for ws in list(_strain_clients):
            try:
                await ws.send_json(payload)
            except Exception:
                disconnected.add(ws)
        _strain_clients -= disconnected


@app.on_event("startup")
async def _start_strain_broadcaster():
    asyncio.create_task(_broadcast_strain())


@app.websocket("/ws/strain")
async def ws_strain(websocket: WebSocket):
    await websocket.accept()
    _strain_clients.add(websocket)
    try:
        while True:
            try:
                await websocket.receive_text()
            except Exception:
                break
    except WebSocketDisconnect:
        pass
    finally:
        _strain_clients.discard(websocket)


# ── WebSocket /ws/signals ──────────────────────────────────────────────────────

_signal_clients: set[WebSocket] = set()


async def _broadcast_signals():
    global _signal_clients
    while True:
        await asyncio.sleep(0.5)
        if not _signal_clients:
            continue
        s = _state.state
        sigs = s.get("signals", {})
        payload = {
            "blink_rate":         _safe_float(sigs.get("blink_rate"),         0.0),
            "blink_quality":      _safe_float(sigs.get("blink_quality"),      0.0),
            "screen_distance":    _safe_float(sigs.get("screen_distance"),    0.0),
            "squint":             _safe_float(sigs.get("squint"),             0.0),
            "gaze_entropy":       _safe_float(sigs.get("gaze_entropy"),       0.0),
            "blink_irregularity": _safe_float(sigs.get("blink_irregularity"), 0.0),
            "eye_rubbing":        _safe_float(sigs.get("eye_rubbing"),        0.0),
            "posture_lean":       _safe_float(sigs.get("posture_lean"),       0.0),
            "scleral_redness":    _safe_float(sigs.get("scleral_redness"),    0.0),
            "lighting_score":     _safe_float(s.get("lighting_score"),        0.0),
            "distance_drift_cm":  _safe_float(s.get("distance_drift_cm"),     0.0),
            "modifiers":          s.get("modifiers", {}),
        }
        disconnected: set[WebSocket] = set()
        for ws in list(_signal_clients):
            try:
                await ws.send_json(payload)
            except Exception:
                disconnected.add(ws)
        _signal_clients -= disconnected


@app.on_event("startup")
async def _start_signals_broadcaster():
    asyncio.create_task(_broadcast_signals())


@app.websocket("/ws/signals")
async def ws_signals(websocket: WebSocket):
    await websocket.accept()
    _signal_clients.add(websocket)
    try:
        while True:
            try:
                await websocket.receive_text()
            except Exception:
                break
    except WebSocketDisconnect:
        pass
    finally:
        _signal_clients.discard(websocket)