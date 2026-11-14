"""Frozen exploratory benchmark: preceding HR and menstrual onset in the next 3 days.
Uses source daily summaries, never full-series interpolation or future HR.
Not a symptom forecast or endometriosis validation.
"""
import argparse
import datetime as dt
import json
import math
import statistics
import hashlib
from collections import Counter

import numpy as np
from scipy.io import loadmat
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from threadpoolctl import threadpool_limits


def prepare(path):
    data = loadmat(path, simplify_cells=True)
    people, audit = [], Counter()
    arrays = [data[k] for k in ['women_sleepmean', 'women_sleepmeandate', 'Menstrual_state_cell']]
    for hr, dates, state in zip(*arrays):
        hr, dates, state = [np.asarray(v).ravel() for v in [hr, dates, state]]
        if len({len(hr), len(dates), len(state)}) != 1:
            audit['excludedLengthMismatch'] += 1
            continue
        try:
            dates = [dt.datetime.strptime(str(d), '%d-%b-%Y').date() for d in dates]
        except (ValueError, TypeError):
            audit['excludedUnparseableDates'] += 1
            continue
        if any((b-a).days != 1 for a, b in zip(dates, dates[1:])):
            audit['excludedNonconsecutiveDates'] += 1
            continue
        if not np.isin(state, [1, 2]).all():
            audit['excludedUnknownStateEncoding'] += 1
            continue
        onsets = [i for i in range(1, len(state)) if state[i] == 2 and state[i-1] == 1]
        if len(onsets) < 4:
            audit['excludedInsufficientRecordedOnsets'] += 1
            continue
        rows = []
        for i in range(35, len(hr)-3):
            if state[i] == 2:
                continue
            past = [v for v in onsets if v <= i]
            intervals = [b-a for a, b in zip(past, past[1:]) if 15 <= b-a <= 60]
            if len(intervals) < 2:
                continue
            length = statistics.median(intervals)
            elapsed = i-past[-1]
            calendar = [elapsed, length, elapsed/length,
                        math.sin(2*math.pi*elapsed/length), math.cos(2*math.pi*elapsed/length)]
            # Forecast at the end of day i; summaries through i are assumed available.
            recent = np.asarray(hr[max(0, i-6):i+1], dtype=float)
            baseline = np.asarray(hr[i-34:i-6], dtype=float)
            recent[(recent < 20) | (recent > 220)] = np.nan
            baseline[(baseline < 20) | (baseline > 220)] = np.nan
            valid, base = np.isfinite(recent), np.isfinite(baseline)
            if valid.sum() < 4 or base.sum() < 14:
                continue
            median = float(np.median(baseline[base]))
            slope = float(np.polyfit(np.flatnonzero(valid), recent[valid], 1)[0])
            wearable = [float(np.mean(recent[valid]))-median, slope,
                        float(recent[-1])-median if valid[-1] else np.nan,
                        float(np.std(recent[valid])), float(valid.sum())]
            rows.append({'date': str(dates[i]), 'labelMatures': str(dates[i+3]),
                         'x': calendar+wearable, 'y': int(any(i < v <= i+3 for v in onsets))})
        if rows:
            people.append(rows)
    audit['includedPeople'] = len(people)
    audit['eligibleRows'] = sum(map(len, people))
    return people, dict(audit)


def metrics(y, p):
    y, p = np.asarray(y), np.asarray(p)
    bins = []
    for name, lo, hi in [('low', 0, 1/3), ('medium', 1/3, 2/3), ('high', 2/3, 1.00001)]:
        mask = (p >= lo) & (p < hi)
        bins.append({'band': name, 'n': int(mask.sum()),
                     'observedRate': float(y[mask].mean()) if mask.any() else None})
    return {'n': len(y), 'events': int(y.sum()), 'brier': float(np.mean((p-y)**2)), 'bands': bins}


def benchmark(people, audit):
    dates = sorted({r['date'] for person in people for r in person})
    if not dates:
        return {'audit': audit, 'status': 'insufficient-aligned-data'}
    cutoff = dates[int(.7*len(dates))]
    predictions = {k: [[], []] for k in ['trainingRate', 'calendar', 'wearable', 'combined']}
    folds = []
    for fold in range(5):
        train = [r for i, person in enumerate(people) if i % 5 != fold for r in person if r['labelMatures'] < cutoff]
        # Non-overlapping 3-day evaluation windows, anchored separately per participant.
        test = [r for i, person in enumerate(people) if i % 5 == fold for r in [v for v in person if v['date'] >= cutoff][::3]]
        if len(train) < 100 or not test or min(sum(r['y'] for r in train), sum(1-r['y'] for r in train)) < 10:
            continue
        predictions['trainingRate'][0].extend(r['y'] for r in test)
        predictions['trainingRate'][1].extend([(sum(r['y'] for r in train)+1)/(len(train)+2)]*len(test))
        for name, cols in [('calendar', list(range(5))), ('wearable', list(range(5, 10))), ('combined', list(range(10)))]:
            model = make_pipeline(SimpleImputer(strategy='median', add_indicator=True), StandardScaler(),
                                  LogisticRegression(C=1, max_iter=1000, random_state=14112026))
            model.fit([[r['x'][j] for j in cols] for r in train], [r['y'] for r in train])
            p = model.predict_proba([[r['x'][j] for j in cols] for r in test])[:, 1]
            predictions[name][0].extend(r['y'] for r in test)
            predictions[name][1].extend(p.tolist())
        folds.append({'fold': fold, 'trainDays': len(train), 'testWindows': len(test)})
    return {'audit': audit, 'cutoff': cutoff, 'folds': folds,
            'models': {k: metrics(*v) for k, v in predictions.items() if v[0]},
            'clinicalValidation': False, 'symptomForecastValidated': False,
            'protocol': 'Fixed logistic regression C=1; five held-person folds and global 70% date cutoff; training labels mature before cutoff; no future HR; no tuning; 3-day-spaced test origins.',
            'limitations': ['Menstrual onset, not symptom occurrence or endometriosis.',
                           'Source-derived daily HR, with end-of-day availability assumed; not a raw-signal prospective replay.',
                           'Length/date mismatches excluded rather than repaired.',
                           'Absence labels may contain unreported events; only people with at least four recorded onsets retained.',
                           'No clinical threshold calibration; overlapping training labels and limited participants constrain inference.',
                           'No independent replication or participant uncertainty interval in this exploratory checkpoint.']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    with threadpool_limits(limits=2):
        result = benchmark(*prepare(args.input))
    result['source'] = 'https://data.mendeley.com/datasets/v58stpfcnm/1'
    with open(args.input, 'rb') as f:
        result['inputSha256'] = hashlib.sha256(f.read()).hexdigest()
    with open(args.output, 'w') as f:
        json.dump(result, f, indent=2)
        f.write('\n')
    print(json.dumps(result, indent=2))
