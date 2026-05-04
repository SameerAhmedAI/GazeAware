"""
GazeAware — SQLAlchemy ORM Models
Mirrors the schema defined in Section 9 of the project documentation.
"""

from datetime import datetime, timezone


def _utcnow():
    """Timezone-aware UTC timestamp helper."""
    return datetime.now(timezone.utc)


from sqlalchemy import Column, Integer, Float, String, DateTime, Date, ForeignKey
from backend.database.db import Base


class Session(Base):
    __tablename__ = "sessions"

    id                  = Column(Integer, primary_key=True)
    start_time          = Column(DateTime, default=_utcnow)
    end_time            = Column(DateTime, nullable=True)
    baseline_blink_rate = Column(Float, nullable=True)
    baseline_ear        = Column(Float, nullable=True)
    baseline_distance   = Column(Float, nullable=True)
    peak_strain_score   = Column(Float, default=0.0)
    avg_strain_score    = Column(Float, default=0.0)


class SignalLog(Base):
    __tablename__ = "signal_logs"

    id                  = Column(Integer, primary_key=True)
    session_id          = Column(Integer, ForeignKey("sessions.id"))
    timestamp           = Column(DateTime, default=_utcnow)
    blink_rate          = Column(Float, nullable=True)
    blink_quality       = Column(Float, nullable=True)
    screen_distance     = Column(Float, nullable=True)
    squint_ratio        = Column(Float, nullable=True)
    gaze_entropy        = Column(Float, nullable=True)
    blink_irregularity  = Column(Float, nullable=True)
    eye_rubbing         = Column(Integer, default=0)
    posture_lean        = Column(Float, nullable=True)
    scleral_redness     = Column(Float, nullable=True)
    strain_score        = Column(Float, nullable=True)
    # Phase 1.1 new signals
    lighting_score      = Column(Float, nullable=True)
    distance_drift_cm   = Column(Float, nullable=True)
    blink_partial_ratio = Column(Float, nullable=True)


class Prescription(Base):
    __tablename__ = "prescriptions"

    id                    = Column(Integer, primary_key=True)
    session_id            = Column(Integer, ForeignKey("sessions.id"))
    timestamp             = Column(DateTime, default=_utcnow)
    strain_score          = Column(Float)
    context               = Column(String)
    triggered_signals     = Column(String)
    prescription_text     = Column(String)
    recovery_confirmed    = Column(Integer, default=0)
    recovery_time_seconds = Column(Integer, nullable=True)


class WeeklyReport(Base):
    __tablename__ = "weekly_reports"

    id                   = Column(Integer, primary_key=True)
    week_start           = Column(Date)
    worst_day            = Column(String)
    peak_strain_hour     = Column(Integer)
    avg_daily_strain     = Column(Float)
    total_prescriptions  = Column(Integer)
    habit_recommendation = Column(String)


class AcuityLog(Base):
    __tablename__ = "acuity_logs"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    timestamp        = Column(String, nullable=False)   # ISO-8601 UTC string
    snellen_fraction = Column(String, nullable=True)    # e.g. "20/30"
    last_row_passed  = Column(Integer, nullable=True)   # 1–8 row number
    distance_cm      = Column(Float,  nullable=True)    # mean face distance during test
    cheat_detected   = Column(Integer, default=0)       # 0 or 1
    squint_detected  = Column(Integer, default=0)       # 0 or 1
    session_id       = Column(Integer, ForeignKey("sessions.id"), nullable=True)