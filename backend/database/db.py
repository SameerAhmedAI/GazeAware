"""
GazeAware — SQLAlchemy Database Setup
Creates the engine and session factory for local SQLite storage.
"""
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Always resolve to the project root regardless of working directory
# backend/database/db.py → parent = database → parent = backend → parent = project root
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DB_PATH = str(_PROJECT_ROOT / "gazeaware.db")

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    echo=False,
    connect_args={"check_same_thread": False, "timeout": 30},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    """Create all tables if they don't exist."""
    from backend.database import models  # noqa: F401 — registers models
    Base.metadata.create_all(bind=engine)
