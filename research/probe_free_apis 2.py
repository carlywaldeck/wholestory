"""Read-only smoke tests. No account, API key, user health records or paid service.
Oura's sandbox requests use a deliberately fake bearer string, per its error response.
Only aggregate response metadata is saved; sandbox data are not real validation data.
"""
import argparse
import concurrent.futures
import datetime as dt
import json
import pathlib
import subprocess


def probe(endpoint, start, end):
    url = (f"https://api.ouraring.com/v2/sandbox/usercollection/{endpoint}"
           f"?start_date={start}&end_date={end}")
    command = ["curl", "--silent", "--show-error", "--max-time", "15",
               "--header", "Authorization: Bearer wholestory-sandbox",
               "--header", "User-Agent: WholeStory-Research/1.0",
               "--write-out", "\n%{http_code}", url]
    response = subprocess.run(command, capture_output=True, text=True, check=True)
    body, _, status = response.stdout.rpartition("\n")
    payload = json.loads(body)
    rows = payload.get("data", [])
    return {"endpoint": url, "httpStatus": int(status), "dataKind": "vendor-sandbox-sample",
            "returnedRecords": len(rows), "firstRecordFields": sorted(rows[0]) if rows else [],
            "usableForClinicalValidation": False}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=dt.date.fromisoformat, required=True)
    parser.add_argument("--end", type=dt.date.fromisoformat, required=True)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    args = parser.parse_args()
    if not 0 < (args.end - args.start).days <= 7:
        parser.error("Use a window between one and seven days.")
    endpoints = ["daily_sleep", "sleep", "daily_activity", "daily_readiness"]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda e: probe(e, args.start, args.end), endpoints))
    report = {"checkedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
              "accountRequiredForThisProbe": False, "realWearableConnected": False,
              "symptomForecastProvided": False, "results": results}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    for result in results:
        print(result["httpStatus"], result["returnedRecords"], result["endpoint"].split("?")[0])
    if any(r["httpStatus"] != 200 or not r["returnedRecords"] for r in results):
        raise SystemExit("One or more sandbox probes did not return sample records")


if __name__ == "__main__":
    main()
