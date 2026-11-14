"""Offline research evaluation only. No app forecast endpoint and no clinical claims.

Input: a local JSON object with dataset metadata and normalized daily records.
Run --self-test for synthetic engineering verification; see research/README.md.
"""
import argparse
import datetime as dt
import hashlib
import json
import math
import pathlib
import statistics

FEATURES = ("pain", "sleepHours", "steps")

def date(value):
    return dt.date.fromisoformat(value)

def validate(payload, allow_synthetic=False):
    if payload.get("kind") not in ("real", "synthetic"):
        raise ValueError("Declare dataset kind as real or synthetic.")
    if payload["kind"] == "synthetic" and not allow_synthetic:
        raise ValueError("Synthetic data requires --allow-synthetic; it cannot validate clinical performance.")
    if not payload.get("source") or not payload.get("permission"):
        raise ValueError("Record source and permission to use the data.")
    records = payload.get("records")
    if not isinstance(records, list) or len(records) > 100000:
        raise ValueError("Expected at most 100,000 normalized records.")
    seen = set()
    for r in records:
        if not isinstance(r.get("participant"), str) or not r["participant"]:
            raise ValueError("Each row requires a pseudonymous participant ID.")
        date(r["date"])
        key = (r["participant"], r["date"])
        if key in seen:
            raise ValueError("Duplicate participant/date. Resolve conflicts before evaluation.")
        seen.add(key)
        if r.get("impact") is not None and type(r["impact"]) is not bool:
            raise ValueError("impact must be explicit true, false, or null.")
        for name, maximum in (("pain", 10), ("sleepHours", 24), ("steps", 150000)):
            v = r.get(name)
            if v is not None and (type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= maximum):
                raise ValueError("Invalid " + name)
        if r.get("steps") is not None and int(r["steps"]) != r["steps"]:
            raise ValueError("Steps must be a whole number.")
        # A date-only retrospective export cannot establish real-time availability.
        for name in ("wearableAvailableAt", "journalAvailableAt"):
            if r.get(name):
                parsed = dt.datetime.fromisoformat(r[name].replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    raise ValueError("Availability timestamps require an offset.")
    return sorted(records, key=lambda r: (r["participant"], r["date"]))

def outcome(row, target):
    if target == "impact":
        return None if row.get("impact") is None else int(row["impact"])
    return None if row.get("pain") is None else int(row["pain"] >= 7)

def features(prior, target_date):
    # Research task: forecast after the preceding UTC calendar day has ended.
    # Real deployments must choose a user's local cutoff and record actual arrival times.
    cutoff = dt.datetime.combine(date(target_date), dt.time(), tzinfo=dt.timezone.utc)
    result = []
    for name in FEATURES:
        available = prior.get("journalAvailableAt" if name == "pain" else "wearableAvailableAt")
        late = available and dt.datetime.fromisoformat(available.replace("Z", "+00:00")) > cutoff
        result.append(None if late else prior.get(name))
    return result

def examples(records, target):
    by_key = {(r["participant"], r["date"]): r for r in records}
    rows, excluded = [], {"unknown_outcome": 0, "missing_previous_date": 0, "no_available_features": 0}
    for r in records:
        y = outcome(r, target)
        if y is None:
            excluded["unknown_outcome"] += 1
            continue
        previous = (date(r["date"]) - dt.timedelta(days=1)).isoformat()
        prior = by_key.get((r["participant"], previous))
        if prior is None:
            excluded["missing_previous_date"] += 1
            continue
        values = features(prior, r["date"])
        if all(v is None for v in values):
            excluded["no_available_features"] += 1
            continue
        rows.append({"participant": r["participant"], "date": r["date"], "x": values, "y": y,
                     "labelAvailableAt": r.get("journalAvailableAt")})
    return rows, excluded

def logistic_predict(training, x, selected):
    # Fit every preprocessing parameter on prior training rows only.
    medians, scales = [], []
    for col in selected:
        values = [r["x"][col] for r in training if r["x"][col] is not None]
        center = statistics.median(values) if values else 0
        scale = statistics.pstdev(values) if len(values) > 1 else 1
        medians.append(center)
        scales.append(scale or 1)
    def transform(values):
        v = [1.0]
        for i, col in enumerate(selected):
            missing = values[col] is None
            v += [0.0 if missing else (values[col] - medians[i]) / scales[i], float(missing)]
        return v
    xs = [transform(r["x"]) for r in training]
    weights = [0.0] * len(xs[0])
    sigmoid = lambda z: 1 / (1 + math.exp(-max(-35, min(35, z))))
    for _ in range(180):
        gradient = [0.0] * len(weights)
        for r, values in zip(training, xs):
            error = sigmoid(sum(w * a for w, a in zip(weights, values))) - r["y"]
            for j, value in enumerate(values):
                gradient[j] += error * value / len(training)
        weights = [w - .08 * (g + (.05 * w if j else 0)) for j, (w, g) in enumerate(zip(weights, gradient))]
    return sigmoid(sum(w * a for w, a in zip(weights, transform(x))))

def metrics(pairs, threshold=.5):
    if not pairs:
        return {"evaluatedDays": 0}
    positives = [p for y, p in pairs if y == 1]
    negatives = [p for y, p in pairs if y == 0]
    tp = sum(y == 1 and p >= threshold for y, p in pairs)
    fp = sum(y == 0 and p >= threshold for y, p in pairs)
    fn = len(positives) - tp
    tn = len(negatives) - fp
    divide = lambda a, b: a / b if b else None
    auc = divide(sum(float(p > n) + .5 * (p == n) for p in positives for n in negatives), len(positives) * len(negatives))
    # Group equal scores together to avoid arbitrary tie ordering in average precision.
    ap, seen, hits = 0.0, 0, 0
    for score in sorted(set(p for _, p in pairs), reverse=True):
        group = [y for y, p in pairs if p == score]
        seen += len(group)
        added = sum(group)
        hits += added
        ap += added * hits / seen
    calibration = []
    for lo in (0, .2, .4, .6, .8):
        group = [(y, p) for y, p in pairs if min(4, int(p * 5)) == round(lo * 5)]
        if group:
            calibration.append({"range": [lo, round(lo + .2, 1)], "count": len(group), "meanEstimate": statistics.mean(p for _, p in group), "observedRate": statistics.mean(y for y, _ in group)})
    return {"evaluatedDays": len(pairs), "positiveDays": len(positives), "threshold": threshold,
            "auroc": auc, "averagePrecision": divide(ap, len(positives)),
            "brier": statistics.mean((p-y)**2 for y,p in pairs),
            "sensitivity": divide(tp, tp+fn), "specificity": divide(tn, tn+fp),
            "precision": divide(tp, tp+fp), "falseAlertsPer30EvaluatedDays": 30*fp/len(pairs),
            "missedImpactOrHighPainDays": fn, "calibration": calibration}

def evaluate(payload, target="impact", allow_synthetic=False, min_train=30):
    records = validate(payload, allow_synthetic)
    rows, excluded = examples(records, target)
    predictions = {"historical_rate": [], "previous_outcome": [], "journal_only": [], "journal_and_wearable": []}
    participants, exclusions, tested = {}, 0, []
    for row in rows:
        # Personal forward-in-time evaluation, never a random daily-row split.
        cutoff = dt.datetime.combine(date(row["date"]), dt.time(), tzinfo=dt.timezone.utc)
        def known(r):
            stamp = r.get("labelAvailableAt")
            return not stamp or dt.datetime.fromisoformat(stamp.replace("Z", "+00:00")) <= cutoff
        training = [r for r in rows if r["participant"] == row["participant"] and r["date"] < row["date"] and known(r)]
        count = sum(r["y"] for r in training)
        # Engineering requirement only: not a clinical sample-size calculation.
        if len(training) < min_train or count < 5 or len(training)-count < 5:
            exclusions += 1
            continue
        prior_date = (date(row["date"]) - dt.timedelta(days=1)).isoformat()
        prior = next((r for r in training if r["date"] == prior_date), None)
        rate = (count+1)/(len(training)+2)
        estimates = {"historical_rate": rate, "previous_outcome": float(prior["y"]) if prior else rate,
                     "journal_only": logistic_predict(training, row["x"], [0]),
                     "journal_and_wearable": logistic_predict(training, row["x"], [0,1,2])}
        for model, estimate in estimates.items():
            predictions[model].append((row["y"], estimate))
            participants.setdefault(row["participant"], {}).setdefault(model, []).append((row["y"], estimate))
        tested.append(row)
    report = {"dataset": payload["source"], "kind": payload["kind"], "target": "Explicit next-day daily-life impact" if target == "impact" else "Next-day reported pain >=7/10 (research definition)",
              "status": "engineering-demo-only" if payload["kind"] == "synthetic" else "retrospective-research-only",
              "clinicallyValidated": False, "appForecastEnabled": False,
              "rawDates": len(records), "eligibleExamples": len(rows), "participantsEvaluated": len(participants),
              "excluded": {**excluded, "insufficient_prior_training": exclusions},
              "evaluation": "Personal expanding-window; all training dates precede each evaluated target date. Hyperparameters and threshold fixed in code.",
              "results": {k:metrics(v) for k,v in predictions.items()},
              "perParticipant": {pid:{k:metrics(v) for k,v in models.items()} for pid,models in participants.items()},
              "limitations": ["No evidence of earlier diagnosis or prospective clinical benefit.", "Unknown availability timestamps permit calendar-date ordering only, not verified real-time forecasting.", "Personal temporal evaluation is not validation on new people or devices.", "Missing outcomes are excluded; selective reporting can bias performance.", "Results on public wearable-only or synthetic data cannot validate endometriosis prediction.", "No confidence intervals; participants and days may be dependent. Do not interpret small differences as benefit."]}
    wearable_pairs = sum(r.get("sleepHours") is not None or r.get("steps") is not None for r in records)
    report["wearableDates"] = wearable_pairs
    report["wearableBenefitEstablished"] = False
    return report

def synthetic_fixture():
    start=dt.date(2025,1,1)
    return {"source":"Original synthetic engineering fixture", "permission":"Original fictional data", "kind":"synthetic", "records":[{"participant":"synthetic-1", "date":(start+dt.timedelta(days=i)).isoformat(), "pain":8 if i%7 in (0,1) else 2, "impact":i%7 in (0,1), "sleepHours":6+(i%4)*.3, "steps":4000+(i%5)*500} for i in range(65)]}

if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--input", type=pathlib.Path)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    parser.add_argument("--target", choices=["impact","high-pain"], default="impact")
    parser.add_argument("--allow-synthetic", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args=parser.parse_args()
    if not args.self_test and not args.input:
        parser.error("Provide --input or --self-test")
    payload=synthetic_fixture() if args.self_test else json.loads(args.input.read_text())
    result=evaluate(payload,args.target,args.allow_synthetic or args.self_test)
    result["inputSha256"]=hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2)+"\n")
    print(result["status"]+"; forecast disabled; report written to "+str(args.output))
