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

    id = Column(Integer, primary_key=True)
    start_time = Column(DateTime, default=_utcnow)
    end_time = Column(DateTime, nullable=True)
    baseline_blink_rate = Column(Float, nullable=True)
    baseline_ear = Column(Float, nullable=True)
    baseline_distance = Column(Float, nullable=True)
    peak_strain_score = Column(Float, default=0.0)
    avg_strain_score = Column(Float, default=0.0)


class SignalLog(Base):
    __tablename__ = "signal_logs"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    timestamp = Column(DateTime, default=_utcnow)
    blink_rate = Column(Float, nullable=True)
    blink_quality = Column(Float, nullable=True)
    screen_distance = Column(Float, nullable=True)
    squint_ratio = Column(Float, nullable=True)
    gaze_entropy = Column(Float, nullable=True)
    blink_irregularity = Column(Float, nullable=True)
    eye_rubbing = Column(Integer, default=0)
    posture_lean = Column(Float, nullable=True)
    scleral_redness = Column(Float, nullable=True)
    strain_score = Column(Float, nullable=True)


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    timestamp = Column(DateTime, default=_utcnow)
    strain_score = Column(Float)
    context = Column(String)
    triggered_signals = Column(String)   # JSON list stored as text
    prescription_text = Column(String)
    recovery_confirmed = Column(Integer, default=0)
    recovery_time_seconds = Column(Integer, nullable=True)


class WeeklyReport(Base):
    __tablename__ = "weekly_reports"

    id = Column(Integer, primary_key=True)
    week_start = Column(Date)
    worst_day = Column(String)
    peak_strain_hour = Column(Integer)
    avg_daily_strain = Column(Float)
    total_prescriptions = Column(Integer)
    habit_recommendation = Column(String)
