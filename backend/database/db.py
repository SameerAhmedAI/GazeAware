"""
GazeAware — SQLAlchemy Database Setup
Creates the engine and session factory for local SQLite storage.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DB_PATH = "gazeaware.db"
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    """Create all tables if they don't exist."""
    from backend.database import models  # noqa: F401 — registers models
    Base.metadata.create_all(bind=engine)
