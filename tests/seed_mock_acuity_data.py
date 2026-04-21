"""
GazeAware — Phase 2.2: Mock Data Seeder
========================================
Injects past data directly into the local SQLite database so you can easily
test the Vision Degradation Tracker without waiting 4 weeks.

Creates 4 weeks of fake test results showing a clear degrading trend.
Run:
    python tests/seed_mock_acuity_data.py
    python backend/vision_acuity/degradation_tracker.py
"""

import os
import sys
from datetime import datetime, timezone, timedelta

# Add project root to sys path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.db import SessionLocal, init_db
from backend.database.models import Session, SignalLog, AcuityLog

def main():
    print("\n  [Seeder] Initializing Database...")
    init_db()
    db = SessionLocal()

    # Create one mock session to tie everything to
    mock_session = Session(start_time=datetime.now(timezone.utc))
    db.add(mock_session)
    db.commit()
    db.refresh(mock_session)
    session_id = mock_session.id
    print(f"  [Seeder] Created mock session #{session_id}")

    # Weekly progression showing worsening acuity and high strain
    # Week 1: 20/20  (Score 1.0)  | Strain 50
    # Week 2: 20/25  (Score 0.8)  | Strain 60
    # Week 3: 20/30  (Score 0.67) | Strain 75
    # Week 4: 20/40  (Score 0.50) | Strain 85 (Now)

    mock_weeks = [
        {"weeks_ago": 4, "strain": 50.0, "fraction": "20/20", "squint": 0.05, "row": 8},
        {"weeks_ago": 3, "strain": 60.0, "fraction": "20/25", "squint": 0.15, "row": 7},
        {"weeks_ago": 2, "strain": 75.0, "fraction": "20/30", "squint": 0.35, "row": 6},
        {"weeks_ago": 1, "strain": 85.0, "fraction": "20/40", "squint": 0.50, "row": 5},
    ]

    print("  [Seeder] Injecting 4 weeks of degrading data...")

    now = datetime.now(timezone.utc)
    for week in mock_weeks:
        past_date = now - timedelta(days=7 * week["weeks_ago"])
        
        # 1. Insert a SignalLog for high strain
        for _ in range(5): # multiple logs for average
            sig = SignalLog(
                session_id=session_id,
                timestamp=past_date,
                strain_score=week["strain"],
                blink_rate=1.5,
                squint_ratio=week["squint"],
                screen_distance=45.0
            )
            db.add(sig)

        # 2. Insert an AcuityLog showing worsened performance
        acuity = AcuityLog(
            timestamp=past_date.isoformat(),
            snellen_fraction=week["fraction"],
            last_row_passed=week["row"],
            distance_cm=60.0,
            cheat_detected=0,
            squint_detected=1 if week["squint"] > 0.2 else 0,
            session_id=session_id
        )
        db.add(acuity)
    
    db.commit()
    db.close()
    
    print("  [Seeder] Success! DB populated.")
    print("  => Now run: python backend/vision_acuity/degradation_tracker.py")

if __name__ == "__main__":
    main()
