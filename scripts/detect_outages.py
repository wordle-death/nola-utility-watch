#!/usr/bin/env python3
"""
Detect discrete outage events from the patricktrainer/entergy-outages repo.

Walks git history chronologically, extracts zip-level snapshots, filters to
Orleans Parish, and detects events where customersAffected exceeds a threshold
for a sustained period.

Usage:
  python detect_outages.py --full          # Process entire git history
  python detect_outages.py --incremental   # Process only new commits since last run
  python detect_outages.py --full --min-customers 1000 --min-duration 120
"""

import argparse
import json
import os
import sys
import tempfile
from collections import defaultdict
from datetime import datetime, timezone

try:
    from git import Repo
except ImportError:
    print("Error: gitpython is required. Install with: pip install gitpython")
    sys.exit(1)

# Orleans Parish zip codes (residential areas)
ORLEANS_PARISH_ZIPS = {
    "70112", "70113", "70114", "70115", "70116", "70117", "70118", "70119",
    "70122", "70124", "70125", "70126", "70127", "70128", "70129", "70130",
    "70131", "70139", "70141", "70142", "70143", "70148",
}

REPO_URL = "https://github.com/patricktrainer/entergy-outages.git"
DATA_FILE = "entergy_outages_zipcode.json"
OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "src", "data", "entergyOutages.json",
)

# Default thresholds
DEFAULT_MIN_CUSTOMERS = 250
DEFAULT_MIN_DURATION_MINUTES = 60
DEFAULT_MERGE_GAP_HOURS = 2
DEFAULT_COOLDOWN_MINUTES = 30


def parse_args():
    parser = argparse.ArgumentParser(description="Detect Entergy outage events")
    parser.add_argument("--full", action="store_true", help="Process entire git history")
    parser.add_argument("--incremental", action="store_true", help="Process only new commits")
    parser.add_argument("--min-customers", type=int, default=DEFAULT_MIN_CUSTOMERS)
    parser.add_argument("--min-duration", type=int, default=DEFAULT_MIN_DURATION_MINUTES,
                        help="Minimum duration in minutes")
    parser.add_argument("--merge-gap", type=float, default=DEFAULT_MERGE_GAP_HOURS,
                        help="Merge events with gaps smaller than this (hours)")
    parser.add_argument("--repo-path", type=str, default=None,
                        help="Path to existing clone of entergy-outages repo")
    return parser.parse_args()


def clone_or_pull_repo(repo_path=None):
    """Clone the entergy-outages repo or pull if it exists."""
    if repo_path and os.path.exists(repo_path):
        print(f"Using existing repo at {repo_path}")
        repo = Repo(repo_path)
        print("Pulling latest changes...")
        repo.remotes.origin.pull()
        return repo, repo_path

    # Use a persistent cache directory so we don't re-clone each time
    cache_dir = os.path.join(tempfile.gettempdir(), "entergy-outages-cache")
    if os.path.exists(cache_dir):
        print(f"Using cached repo at {cache_dir}")
        repo = Repo(cache_dir)
        print("Pulling latest changes...")
        try:
            repo.remotes.origin.pull()
        except Exception as e:
            print(f"Pull failed ({e}), re-cloning...")
            import shutil
            shutil.rmtree(cache_dir)
            return clone_or_pull_repo(None)
        return repo, cache_dir

    print(f"Cloning {REPO_URL} to {cache_dir}...")
    repo = Repo.clone_from(REPO_URL, cache_dir)
    return repo, cache_dir


def extract_snapshot(commit):
    """Extract Orleans Parish zip data from a single commit."""
    try:
        blob = commit.tree / DATA_FILE
        data = json.loads(blob.data_stream.read().decode("utf-8"))
    except (KeyError, json.JSONDecodeError):
        return None

    # Handle both list and dict formats
    records = data if isinstance(data, list) else data.get("data", data.get("records", []))
    if not isinstance(records, list):
        return None

    result = {}
    for rec in records:
        zip_code = str(rec.get("zip", rec.get("zipCode", rec.get("zipcode", ""))))
        if zip_code not in ORLEANS_PARISH_ZIPS:
            continue
        customers_affected = rec.get("customersAffected", rec.get("customers_affected", 0))
        customers_served = rec.get("customersServed", rec.get("customers_served", 0))
        try:
            customers_affected = int(customers_affected)
            customers_served = int(customers_served)
        except (ValueError, TypeError):
            continue
        result[zip_code] = {
            "customersAffected": customers_affected,
            "customersServed": customers_served,
        }

    return result if result else None


def get_commit_time(commit):
    """Get commit timestamp as datetime."""
    return datetime.fromtimestamp(commit.committed_date, tz=timezone.utc)


def detect_events(snapshots, min_customers, min_duration_minutes, merge_gap_hours, cooldown_minutes):
    """
    Detect outage events from time-ordered snapshots.

    An event starts when total Orleans Parish customersAffected exceeds min_customers
    for min_duration_minutes. It ends when the count drops below min_customers for
    cooldown_minutes.
    """
    if not snapshots:
        return []

    # Sort by time
    snapshots.sort(key=lambda s: s["time"])

    raw_events = []
    current_event = None
    consecutive_above = 0
    consecutive_below = 0
    snapshots_for_min_duration = max(1, min_duration_minutes // 15)
    snapshots_for_cooldown = max(1, cooldown_minutes // 15)

    for snap in snapshots:
        total_affected = snap["totalAffected"]
        total_served = snap["totalServed"]

        if total_affected >= min_customers:
            consecutive_above += 1
            consecutive_below = 0

            if current_event is None and consecutive_above >= snapshots_for_min_duration:
                # Start new event (backdate to when threshold was first crossed)
                start_idx = snapshots.index(snap) - (consecutive_above - 1)
                start_time = snapshots[max(0, start_idx)]["time"]
                current_event = {
                    "startTime": start_time,
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
                if consecutive_below >= snapshots_for_cooldown:
                    # End the event
                    raw_events.append(current_event)
                    current_event = None
                else:
                    # Still within cooldown, keep event open
                    current_event["snapshots"].append({
                        "time": snap["time"],
                        "affected": total_affected,
                    })

    # Close any ongoing event
    if current_event is not None:
        raw_events.append(current_event)

    # Merge events with small gaps
    merged = []
    for event in raw_events:
        if merged and _gap_hours(merged[-1], event) < merge_gap_hours:
            # Merge into previous
            prev = merged[-1]
            prev["endTime"] = event["endTime"]
            prev["peakCustomersAffected"] = max(
                prev["peakCustomersAffected"], event["peakCustomersAffected"]
            )
            prev["totalServed"] = max(prev["totalServed"], event["totalServed"])
            prev["snapshots"].extend(event["snapshots"])
            prev["affectedZips"] |= event["affectedZips"]
        else:
            merged.append(event)

    # Finalize events
    finalized = []
    for event in merged:
        snaps = event["snapshots"]
        if not snaps:
            continue

        start = datetime.fromisoformat(event["startTime"])
        end = datetime.fromisoformat(event["endTime"])
        duration_hours = (end - start).total_seconds() / 3600

        # Calculate total customer-hours (each snapshot covers ~15 min = 0.25 hr)
        total_customer_hours = sum(s["affected"] * 0.25 for s in snaps)
        avg_affected = sum(s["affected"] for s in snaps) / len(snaps)
        peak_pct = (
            (event["peakCustomersAffected"] / event["totalServed"] * 100)
            if event["totalServed"] > 0 else 0
        )

        # Generate ID from date
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


def _gap_hours(event_a, event_b):
    """Hours between end of event_a and start of event_b."""
    end_a = datetime.fromisoformat(event_a["endTime"])
    start_b = datetime.fromisoformat(event_b["startTime"])
    return (start_b - end_a).total_seconds() / 3600


def load_existing_output():
    """Load existing output file if it exists."""
    if os.path.exists(OUTPUT_PATH):
        with open(OUTPUT_PATH) as f:
            return json.load(f)
    return None


def build_output(events, thresholds, last_commit_sha, zips_found):
    """Build the output JSON structure."""
    return {
        "description": (
            "Entergy electricity outage events affecting Orleans Parish, "
            "detected from automated monitoring of Entergy's DataCapable outage reporting system. "
            "Data source: github.com/patricktrainer/entergy-outages (Apache 2.0 license)."
        ),
        "lastUpdated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "lastProcessedCommit": last_commit_sha,
        "thresholds": thresholds,
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


def main():
    args = parse_args()

    if not args.full and not args.incremental:
        print("Specify --full or --incremental")
        sys.exit(1)

    # Load existing data for incremental mode
    existing = load_existing_output()
    last_processed_commit = None
    if args.incremental and existing:
        last_processed_commit = existing.get("lastProcessedCommit")
        print(f"Incremental mode: processing commits after {last_processed_commit[:8]}...")

    # Clone/pull repo
    repo, repo_path = clone_or_pull_repo(args.repo_path)

    # Collect commits to process
    print("Collecting commits...")
    all_commits = list(repo.iter_commits("main", reverse=True))
    print(f"Total commits in repo: {len(all_commits)}")

    if last_processed_commit and args.incremental:
        # Find the index of the last processed commit
        start_idx = None
        for i, c in enumerate(all_commits):
            if c.hexsha == last_processed_commit:
                start_idx = i + 1
                break
        if start_idx is not None:
            all_commits = all_commits[start_idx:]
            print(f"Processing {len(all_commits)} new commits")
        else:
            print(f"Warning: last processed commit {last_processed_commit[:8]} not found, processing all")

    if not all_commits:
        print("No new commits to process")
        return

    # Extract snapshots
    print(f"Extracting snapshots from {len(all_commits)} commits...")
    snapshots = []
    zips_found = set()
    last_sha = all_commits[-1].hexsha

    for i, commit in enumerate(all_commits):
        if i % 5000 == 0 and i > 0:
            print(f"  Processed {i}/{len(all_commits)} commits...")

        snap_data = extract_snapshot(commit)
        if snap_data is None:
            continue

        commit_time = get_commit_time(commit)
        total_affected = sum(d["customersAffected"] for d in snap_data.values())
        total_served = sum(d["customersServed"] for d in snap_data.values())
        zips_found.update(snap_data.keys())

        snapshots.append({
            "time": commit_time.isoformat(),
            "totalAffected": total_affected,
            "totalServed": total_served,
            "zipData": snap_data,
        })

    print(f"Extracted {len(snapshots)} valid snapshots")
    print(f"Orleans Parish zips found in data: {sorted(zips_found)}")

    # Detect events
    thresholds = {
        "minCustomers": args.min_customers,
        "minDurationMinutes": args.min_duration,
    }
    events = detect_events(
        snapshots,
        min_customers=args.min_customers,
        min_duration_minutes=args.min_duration,
        merge_gap_hours=args.merge_gap,
        cooldown_minutes=DEFAULT_COOLDOWN_MINUTES,
    )

    # For incremental mode, merge with existing events
    if args.incremental and existing and existing.get("events"):
        existing_events = existing["events"]
        # Check if last existing event was ongoing and might connect with new events
        if existing_events and events:
            last_existing_end = datetime.fromisoformat(existing_events[-1]["endTime"])
            first_new_start = datetime.fromisoformat(events[0]["startTime"])
            gap = (first_new_start - last_existing_end).total_seconds() / 3600
            if gap < args.merge_gap:
                # Merge last existing with first new
                merged = existing_events[-1]
                new = events[0]
                merged["endTime"] = new["endTime"]
                merged["durationHours"] = round(
                    (datetime.fromisoformat(merged["endTime"]) -
                     datetime.fromisoformat(merged["startTime"])).total_seconds() / 3600, 2
                )
                merged["peakCustomersAffected"] = max(
                    merged["peakCustomersAffected"], new["peakCustomersAffected"]
                )
                merged["avgCustomersAffected"] = round(
                    (merged["avgCustomersAffected"] + new["avgCustomersAffected"]) / 2
                )
                merged["totalCustomerHours"] += new["totalCustomerHours"]
                merged["affectedZipCodes"] = sorted(
                    set(merged["affectedZipCodes"]) | set(new["affectedZipCodes"])
                )
                merged["percentageWithoutPower"] = max(
                    merged["percentageWithoutPower"], new["percentageWithoutPower"]
                )
                events = events[1:]  # Remove first new event (merged)

        events = existing_events + events

    print(f"Detected {len(events)} outage events")

    # Build and write output
    output = build_output(events, thresholds, last_sha, zips_found)
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Written to {OUTPUT_PATH}")

    # Summary
    if events:
        total_customer_hours = sum(e["totalCustomerHours"] for e in events)
        max_peak = max(e["peakCustomersAffected"] for e in events)
        print(f"\nSummary:")
        print(f"  Events: {len(events)}")
        print(f"  Total customer-hours: {total_customer_hours:,}")
        print(f"  Largest event: {max_peak:,} customers at peak")
        print(f"  Date range: {events[0]['startTime'][:10]} to {events[-1]['endTime'][:10]}")


if __name__ == "__main__":
    main()
