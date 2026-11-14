"""Three-hour-ahead TIRED-report experiment using official hourly LifeSnaps data.
Frozen feature set/settings; not menstrual or endometriosis validation.
"""
import argparse
import collections
import csv
import datetime as dt
import hashlib
import json
import math
import statistics
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from threadpoolctl import threadpool_limits
from prepare_lifesnaps_benchmark import tired_label, number
from cluster_uncertainty import paired_cluster_intervals
from mpis_symptom_benchmark import symptom_metrics

SETTINGS = dict(max_iter=100, max_leaf_nodes=7, max_depth=3, min_samples_leaf=30,
                learning_rate=.05, l2_regularization=2, early_stopping=False, random_state=14112026)


def features(records, target):
    origin = target-dt.timedelta(hours=3)
    # An hour's aggregate is usable only after that hour finishes.
    past = [(t, r) for t, r in records if t+dt.timedelta(hours=1) <= origin]
    prior_reports = [(t, r['y']) for t, r in past if r['y'] is not None and t >= origin-dt.timedelta(days=7)]
    last = prior_reports[-1] if prior_reports else None
    last24 = [(t, y) for t, y in prior_reports if t >= origin-dt.timedelta(hours=24)]
    history = [math.sin(2*math.pi*target.hour/24), math.cos(2*math.pi*target.hour/24),
               math.sin(2*math.pi*target.weekday()/7), math.cos(2*math.pi*target.weekday()/7),
               last[1] if last else None, (origin-last[0]).total_seconds()/3600 if last else None,
               statistics.mean(y for _, y in last24) if last24 else None, len(last24),
               statistics.mean(y for _, y in prior_reports) if prior_reports else None]
    sensor = []
    for key in ['bpm', 'steps']:
        recent = [(t, r[key]) for t, r in past if t >= origin-dt.timedelta(hours=6) and r[key] is not None]
        baseline = [r[key] for t, r in past if origin-dt.timedelta(days=7) <= t < origin-dt.timedelta(hours=6) and r[key] is not None]
        vals = [v for _, v in recent]
        mean = statistics.mean(vals) if len(vals) >= 3 else None
        base = statistics.median(baseline) if len(baseline) >= 24 else None
        slope = None
        if len(vals) >= 3:
            times = [(t-origin).total_seconds()/3600 for t, _ in recent]
            slope = float(np.polyfit(times, vals, 1)[0])
        sensor.extend([mean, mean-base if mean is not None and base is not None else None, slope, len(vals)])
    return history+sensor, last[1] if last else None


def prepare(path):
    grouped = collections.defaultdict(lambda: collections.defaultdict(list))
    raw = open(path, 'rb').read()
    for r in csv.DictReader(raw.decode().splitlines()):
        t = dt.datetime.fromisoformat(r['date'][:10])+dt.timedelta(hours=int(float(r['hour'])))
        hr, steps = number(r['bpm']), number(r['steps'])
        grouped[r['id']][t].append({'y': tired_label(r), 'bpm': hr if hr is not None and 20 <= hr <= 220 else None,
                                   'steps': math.log1p(steps) if steps is not None and 0 <= steps <= 20000 else None})
    people, duplicates = [], 0
    for _, hours in sorted(grouped.items()):
        duplicates += sum(len(v) > 1 for v in hours.values())
        records = sorted((t, v[0]) for t, v in hours.items() if len(v) == 1)
        rows = []
        for t, r in records:
            if r['y'] is None:
                continue
            x, previous = features(records, t)
            rows.append({'date': t.isoformat(), 'origin': (t-dt.timedelta(hours=3)).isoformat(),
                         'labelAvailable': (t+dt.timedelta(hours=1)).isoformat(),
                         'x': x, 'y': r['y'], 'previous': previous})
        if rows:
            people.append(rows)
    return people, {'sourceSha256': hashlib.sha256(raw).hexdigest(), 'duplicateHoursExcluded': duplicates,
                    'peopleWithReports': len(people), 'reportHours': sum(map(len, people))}


def benchmark(people, audit):
    times = sorted({r['date'] for p in people for r in p})
    cutoff = times[int(.7*len(times))]
    variants = {'historyAndClock': list(range(9)), 'wearableAndClock': list(range(4))+list(range(9, 17)), 'combined': list(range(17))}
    clusters = {k: [] for k in variants}
    paired, counts = [], []
    for fold in range(5):
        train = [r for i, p in enumerate(people) if i % 5 != fold for r in p if r['labelAvailable'] < cutoff]
        if len(train) < 200 or min(sum(r['y'] for r in train), sum(1-r['y'] for r in train)) < 20:
            continue
        fits = {}
        for name, cols in variants.items():
            x = [[np.nan if r['x'][j] is None else r['x'][j] for j in cols] for r in train]
            fits[name] = HistGradientBoostingClassifier(**SETTINGS).fit(x, [r['y'] for r in train])
        n = days = 0
        for i, person in enumerate(people):
            if i % 5 != fold:
                continue
            test = [r for r in person if r['origin'] >= cutoff]
            if len(test) < 5:
                continue
            preds = {}
            for name, cols in variants.items():
                x = [[np.nan if r['x'][j] is None else r['x'][j] for j in cols] for r in test]
                preds[name] = fits[name].predict_proba(x)[:, 1]
                clusters[name].append([(r['y'], float(p), r['previous']) for r, p in zip(test, preds[name])])
            paired.append([(r['y'], float(a), float(b)) for r, a, b in zip(test, preds['combined'], preds['historyAndClock'])])
            n += 1
            days += len(test)
        counts.append({'fold': fold, 'trainReports': len(train), 'testPeople': n, 'testReports': days})
    def summarize(groups):
        rows = [r for person in groups for r in person]
        return {'all': symptom_metrics([(y, p) for y, p, old in rows]),
                'newSelectionAfterKnownAbsence': symptom_metrics([(y, p) for y, p, old in rows if old == 0])}
    return {'audit': audit, 'cutoff': cutoff, 'settings': SETTINGS, 'folds': counts,
            'models': {k: summarize(v) for k, v in clusters.items()}, 'combinedVsHistory': paired_cluster_intervals(paired),
            'clinicalValidation': False, 'endometriosisValidated': False, 'activeInPublicApp': False,
            'protocol': '3-hour minimum lead before target report hour; only completed earlier hourly HR/steps; fixed five participant folds and global 70% time cutoff; no tuning.',
            'limitations': ['TIRED mood report, not a diagnosed or menstrual symptom outcome.',
                           'Same people/source as prior daily research, not independent external validation.',
                           'Local clock anonymization and unknown sync/receipt constrain prospective interpretation.',
                           'Report timing uses survey STARTED_TS in source preprocessing, not confirmed completion time.',
                           'No data means unknown; duplicate source hours excluded; EDA/temperature excluded for timing/processing ambiguity.',
                           'Unanswered hours are not symptom-free. Earlier labels can be repeated within target reports and dependent observations require participant-level uncertainty.']}


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--input', required=True)
    p.add_argument('--output', required=True)
    args = p.parse_args()
    with threadpool_limits(limits=2):
        result = benchmark(*prepare(args.input))
    with open(args.output, 'w') as f:
        json.dump(result, f, indent=2)
        f.write('\n')
    print(json.dumps({'audit': result['audit'], 'folds': result['folds'], 'models': {k: v['all']['brier'] for k, v in result['models'].items()}}))
