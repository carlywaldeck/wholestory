"""Reproduce the noncommercial public sample; fetch only two published source files."""
import collections
import hashlib
import json
import pathlib
import subprocess

root = pathlib.Path(__file__).resolve().parents[1]
manifest = json.loads((root / "data/pmdata-sample.json").read_text())
sources = []
for source in manifest["originalFiles"]:
    if not source["url"].startswith("https://osf.io/download/"):
        raise ValueError("Unexpected data source")
    raw = subprocess.check_output(["curl", "--fail", "--silent", "--show-error", "--location", "--max-time", "60", source["url"]])
    if hashlib.sha256(raw).hexdigest() != source["sha256"]:
        raise ValueError("Published source changed; review provenance before updating sample.")
    sources.append(json.loads(raw))
sleeps, steps = sources
sleep_by_day = collections.defaultdict(int)
step_by_day = collections.defaultdict(int)
minutes = collections.defaultdict(set)
duplicates = set()
for row in sleeps:
    date = row["dateOfSleep"]
    sleep_by_day[date] = max(sleep_by_day[date], row["minutesAsleep"])
for row in steps:
    date = row["dateTime"][:10]
    if row["dateTime"] in minutes[date]:
        duplicates.add(date)
    minutes[date].add(row["dateTime"])
    step_by_day[date] += int(row["value"])
manifest["days"] = [
    {"date": date,
     "sleepHours": round(sleep_by_day[date] / 60, 4) if date in sleep_by_day else None,
     "steps": step_by_day[date] if len(minutes[date]) == 1440 and date not in duplicates else None}
    for date in sorted(set(sleep_by_day) | set(step_by_day))[:60]
]
manifest["transformation"] = "First 60 calendar dates. Longest sleep episode by Fitbit dateOfSleep; minutesAsleep divided by 60. Daily steps summed only for dates with exactly 1,440 unique minute records and no duplicate timestamps; other days are missing. Original dates retained."
(root / "data/pmdata-sample.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("Prepared", len(manifest["days"]), "public sample dates. No symptom labels added.")
