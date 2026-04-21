
import os
import glob

files_to_check = glob.glob("**/*.py", recursive=True) + glob.glob("**/*.md", recursive=True)
for f in files_to_check:
    if "venv" in f or "scratch" in f: continue
    try:
        with open(f, "r", encoding="utf-8") as file:
            content = file.read()
        if "Phase 4" in content or "PHASE 4" in content:
            content = content.replace("Phase 4", "Phase 2.2").replace("PHASE 4", "PHASE 2.2")
            with open(f, "w", encoding="utf-8") as file:
                file.write(content)
            print(f"Updated {f}")
    except Exception as e:
        print(f"Error reading {f}: {e}")

