#!/usr/bin/env python3
"""
Fast outage detection — uses git log + git show to extract snapshots
without gitpython. Works efficiently with blobless clones by batching.

Usage:
  python fast_detect_outages.py /tmp/entergy-outages-cache
"""

import json
import os
import subprocess
import sys
from datetime import datetime, timezone

ORLEANS_PARISH_ZIPS = {
    "70112", "70113", "70114", "70115", "70116", "70117", "70118", "70119",
    "70122", "70124", "70125", "70126", "70127", "70128", "70129", "70130",
    "70131", "70139", "70141", "70142", "70143", "70148",
}

DATA_FILE = "entergy_outages_zipcode.json"
OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "src", "data", "entergyOutages.json",
)

# Thresholds
MIN_CUSTOMERS = 250
MIN_DURATION_MINUTES = 60
MERGE_GAP_HOURS = 2
COOLDOWN_MINUTES = 30


def get_commit_list(repo_path):
    """Get all commits with timestamps, oldest first."""
    result = subprocess.run(
        ["git", "log", "--reverse", "--format=%H %aI", "--", DATA_FILE],
        cwd=repo_path, capture_output=True, text=True
    )
    commits = []
    for line in result.stdout.strip().split("\n"):
        if not line.strip():
            continue
        parts = line.strip().split(" ", 1)
        if len(parts) == 2:
            commits.append((parts[0], parts[1]))
    return commits


def extract_snapshot(repo_path, sha):
    """Extract Orleans Parish data from a single commit using git show."""
    result = subprocess.run(
        ["git", "show", f"{sha}:{DATA_FILE}"],
        cwd=repo_path, capture_output=True, text=True
    )
    if result.returncode != 0:
        return None

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        return None

    records = data if isinstance(data, list) else data.get("data", data.get("records", []))
    if not isinstance(records, list):
        return None

    zip_data = {}
    for rec in records:
        zip_code = str(rec.get("zip", rec.get("zipCode", rec.get("zipcode", ""))))
        if zip_code not in ORLEANS_PARISH_ZIPS:
            continue
        try:
            affected = int(rec.get("customersAffected", rec.get("customers_affected", 0)))
            served = int(rec.get("customersServed", rec.get("customers_served", 0)))
        except (ValueError, TypeError):
            continue
        zip_data[zip_code] = {"customersAffected": affected, "customersServed": served}

    return zip_data if zip_data else None


def detect_events(snapshots):
    """Detect outage events from time-ordered snapshots."""
    if not snapshots:
        return []

    snapshots.sort(key=lambda s: s["time"])

    raw_events = []
    current_event = None
    consecutive_above = 0
    consecutive_below = 0
    snaps_for_start = max(1, MIN_DURATION_MINUTES // 15)
    snaps_for_cooldown = max(1, COOLDOWN_MINUTES // 15)

    for i, snap in enumerate(snapshots):
        total_affected = snap["totalAffected"]
        total_served = snap["totalServed"]

        if total_affected >= MIN_CUSTOMERS:
            consecutive_above += 1
            consecutive_below = 0

            if current_event is None and consecutive_above >= snaps_for_start:
                start_idx = max(0, i - (consecutive_above - 1))
                current_event = {
                    "startTime": snapshots[start_idx]["time"],
                    "endTime": snap["time"],
                    "peakCustomersAffected": 0,
                    "totalServed": 0,
                    "snapshots": [],
                    "affectedZips": set(),
                }

            if current_event is not None:
                current_event["endTime"] = snap["time"]
                current_event["peakCustomersAffected"] = max(
                    current_event["peakCustomersAffected"], total_affected
                )
                current_event["totalServed"] = max(
                    current_event["totalServed"], total_served
                )
                current_event["snapshots"].append({
                    "time": snap["time"],
                    "affected": total_affected,
                })
                for z, d in snap["zipData"].items():
                    if d["customersAffected"] > 0:
                        current_event["affectedZips"].add(z)
        else:
            consecutive_below += 1
            consecutive_above = 0

            if current_event is not None:
                if consecutive_below >= snaps_for_cooldown:
                    raw_events.append(current_event)
                    current_event = None
                else:
                    current_event["snapshots"].append({
                        "time": snap["time"],
                        "affected": total_affected,
                    })

    if current_event is not None:
        raw_events.append(current_event)

    # Merge close events
    merged = []
    for event in raw_events:
        if merged:
            end_prev = datetime.fromisoformat(merged[-1]["endTime"])
            start_cur = datetime.fromisoformat(event["startTime"])
            gap_hours = (start_cur - end_prev).total_seconds() / 3600
            if gap_hours < MERGE_GAP_HOURS:
                prev = merged[-1]
                prev["endTime"] = event["endTime"]
                prev["peakCustomersAffected"] = max(
                    prev["peakCustomersAffected"], event["peakCustomersAffected"]
                )
                prev["totalServed"] = max(prev["totalServed"], event["totalServed"])
                prev["snapshots"].extend(event["snapshots"])
                prev["affectedZips"] |= event["affectedZips"]
                continue
        merged.append(event)

    # Finalize
    finalized = []
    for event in merged:
        snaps = event["snapshots"]
        if not snaps:
            continue

        start = datetime.fromisoformat(event["startTime"])
        end = datetime.fromisoformat(event["endTime"])
        duration_hours = (end - start).total_seconds() / 3600

        total_customer_hours = sum(s["affected"] * 0.25 for s in snaps)
        avg_affected = sum(s["affected"] for s in snaps) / len(snaps)
        peak_pct = (
            (event["peakCustomersAffected"] / event["totalServed"] * 100)
            if event["totalServed"] > 0 else 0
        )

        date_str = start.strftime("%Y-%m-%d")
        event_id = f"{date_str}-outage-{len(finalized) + 1}"

        finalized.append({
            "id": event_id,
            "startTime": event["startTime"],
            "endTime": event["endTime"],
            "durationHours": round(duration_hours, 2),
            "peakCustomersAffected": event["peakCustomersAffected"],
            "avgCustomersAffected": round(avg_affected),
            "totalCustomerHours": round(total_customer_hours),
            "affectedZipCodes": sorted(event["affectedZips"]),
            "percentageWithoutPower": round(peak_pct, 1),
        })

    return finalized


def main():
    repo_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/entergy-outages-cache"

    if not os.path.exists(repo_path):
        print(f"Repo not found at {repo_path}")
        sys.exit(1)

    print("Getting commit list...")
    commits = get_commit_list(repo_path)
    print(f"Found {len(commits)} commits touching {DATA_FILE}")

    # Process in batches, showing progress
    snapshots = []
    zips_found = set()
    batch_size = 100
    total = len(commits)
    last_sha = commits[-1][0] if commits else ""

    for i in range(0, total, batch_size):
        batch = commits[i:i + batch_size]
        if i % 1000 == 0:
            print(f"  Processing commits {i}/{total} ({i*100//total}%)...")

        for sha, timestamp in batch:
            zip_data = extract_snapshot(repo_path, sha)
            if zip_data is None:
                continue

            total_affected = sum(d["customersAffected"] for d in zip_data.values())
            total_served = sum(d["customersServed"] for d in zip_data.values())
            zips_found.update(zip_data.keys())

            snapshots.append({
                "time": timestamp,
                "totalAffected": total_affected,
                "totalServed": total_served,
                "zipData": zip_data,
            })

    print(f"Extracted {len(snapshots)} valid snapshots")
    print(f"Orleans Parish zips found: {sorted(zips_found)}")

    # Detect events
    events = detect_events(snapshots)
    print(f"Detected {len(events)} outage events")

    # Build output
    output = {
        "description": (
            "Entergy electricity outage events affecting Orleans Parish, "
            "detected from automated monitoring of Entergy's DataCapable outage reporting system. "
            "Data source: github.com/patricktrainer/entergy-outages (Apache 2.0 license)."
        ),
        "lastUpdated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "lastProcessedCommit": last_sha,
        "thresholds": {
            "minCustomers": MIN_CUSTOMERS,
            "minDurationMinutes": MIN_DURATION_MINUTES,
        },
        "assumptions": {
            "iceCostResidentialPerCustomerHour": 3.50,
            "iceCostCommercialPerCustomerHour": 45.00,
            "residentialShareOfCustomers": 0.78,
            "commercialShareOfCustomers": 0.22,
            "sources": {
                "iceCosts": (
                    "DOE/LBNL Interruption Cost Estimate (ICE) Calculator, "
                    "2024 values for Southeast census region"
                ),
                "customerMix": (
                    "Entergy New Orleans service territory customer breakdown, "
                    "EIA Form 861 (2023)"
                ),
            },
        },
        "orleansParishZipCodes": sorted(zips_found),
        "events": events,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nWritten to {OUTPUT_PATH}")

    if events:
        total_ch = sum(e["totalCustomerHours"] for e in events)
        max_peak = max(e["peakCustomersAffected"] for e in events)
        print(f"\nSummary:")
        print(f"  Events: {len(events)}")
        print(f"  Total customer-hours: {total_ch:,}")
        print(f"  Largest event: {max_peak:,} customers at peak")
        print(f"  Date range: {events[0]['startTime'][:10]} to {events[-1]['endTime'][:10]}")


if __name__ == "__main__":
    main()
