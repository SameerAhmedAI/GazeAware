"""
GazeAware — Weekly Report Generator
Analyses the past 7 days of signal_logs and generates a plain-language summary.
"""
import os
import sys
import pandas as pd
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from backend.database.db import engine

# Import groq
try:
    from groq import Groq
except ImportError:
    Groq = None

def generate_weekly_report():
    print("Generating Weekly Report...")
    
    # 1. Fetch data from DB
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    
    # Query using pandas
    query = f"""
    SELECT 
        date(timestamp) as daydate, 
        strain_score,
        timestamp
    FROM signal_logs
    WHERE timestamp >= '{seven_days_ago.strftime('%Y-%m-%d %H:%M:%S')}'
    """
    
    try:
        df = pd.read_sql(query, con=engine)
    except Exception as e:
        print(f"Error querying database: {e}")
        return

    if df.empty:
        print("Not enough data in the database over the last 7 days to generate a report.")
        # Create some dummy data just to demonstrate the feature if DB is totally empty
        print("Using sample data to demonstrate report functionality...\n")
        df = pd.DataFrame({
            'daydate': [(now - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)],
            'strain_score': [45.2, 58.1, 72.4, 30.5, 85.0, 42.1, 60.3]
        })
    else:
        df['strain_score'] = pd.to_numeric(df['strain_score'], errors='coerce')
        df = df.dropna(subset=['strain_score'])

    if df.empty:
        print("Not enough valid strain data.")
        return

    # 2. Calculate stats
    max_strain = df['strain_score'].max()
    min_strain = df['strain_score'].min()
    avg_strain = df['strain_score'].mean()
    
    # Group by day
    day_stats = df.groupby('daydate')['strain_score'].mean().reset_index()
    if day_stats.empty:
        print("Insufficient daily data.")
        return

    best_day_row = day_stats.loc[day_stats['strain_score'].idxmin()]
    worst_day_row = day_stats.loc[day_stats['strain_score'].idxmax()]
    
    best_day = best_day_row['daydate']
    worst_day = worst_day_row['daydate']
    
    report_data = f"""
GazeAware Weekly Summary:
- Max Strain: {max_strain:.1f}/100
- Min (Lowest) Strain: {min_strain:.1f}/100
- Average Strain: {avg_strain:.1f}/100
- Best Day (Lowest Strain): {best_day} (Avg: {best_day_row['strain_score']:.1f})
- Worst Day (Highest Strain): {worst_day} (Avg: {worst_day_row['strain_score']:.1f})
"""

    print("\n" + "="*55)
    print(" 📊 GAZEAWARE WEEKLY STRAIN REPORT")
    print("="*55)
    print(report_data.strip())
    print("="*55)
    
    # 3. Call Groq API
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        # Load from .env file directly if it wasn't exported in the terminal
        try:
            env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
            if os.path.exists(env_path):
                with open(env_path, 'r') as f:
                    for line in f:
                        if line.startswith('GROQ_API_KEY='):
                            api_key = line.split('=', 1)[1].strip().strip('"').strip("'")
                            break
        except Exception:
            pass

    if not api_key:
        print("\n[Groq API Key not found in .env files, skipping AI recommendations.]")
        return
        
    if Groq is None:
        print("\n[Groq library not installed, skipping AI recommendations.]")
        return

    print("\nGenerating AI Recommendations from Groq...")
    
    system_prompt = (
        "You are an expert optometrist and ergonomic health advisor. "
        "Review the provided digital eye strain data summary for the user's past 7 days. "
        "Give exactly 3 concise, highly actionable recommendations to improve their eye health "
        "and reduce strain. Do not use filler text. Keep each recommendation to one short paragraph."
    )
    
    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here is my 7-day strain report:\n{report_data}"}
            ],
            max_tokens=256,
            temperature=0.7
        )
        recommendations = response.choices[0].message.content.strip()
        print("\n 🤖 AI EXPERT RECOMMENDATIONS:")
        print("-" * 55)
        print(recommendations)
        print("-" * 55 + "\n")
    except Exception as e:
        print(f"\nFailed to get Groq recommendations: {e}")

if __name__ == "__main__":
    generate_weekly_report()
