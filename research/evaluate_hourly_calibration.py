"""Earlier-only sigmoid calibration and relative-risk tier evaluation.
No final-test threshold selection; no public model export.
"""
import argparse
import json
import random
import numpy as np
from scipy.special import logit
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from threadpoolctl import threadpool_limits
from evaluate_hourly_warning import prepare, SETTINGS
from cluster_uncertainty import paired_cluster_intervals, percentile
from mpis_symptom_benchmark import symptom_metrics

VARIANTS = {'clock': list(range(4)), 'historyAndClock': list(range(9)),
            'wearableAndClock': list(range(4))+list(range(9, 17)), 'combined': list(range(17))}


def tier(value, boundaries):
    return 0 if value < boundaries[0] else 1 if value < boundaries[1] else 2


def tier_summary(clusters):
    result = []
    for k, name in enumerate(['low', 'medium', 'high']):
        rows = [(y, p) for person in clusters for y, p, band in person if band == k]
        result.append({'band': name, 'n': len(rows), 'symptomReports': sum(y for y, _ in rows),
                       'observedRate': sum(y for y, _ in rows)/len(rows) if rows else None,
                       'meanEstimate': sum(p for _, p in rows)/len(rows) if rows else None})
    # Cluster uncertainty for tier separation, not independent daily-row intervals.
    rng, samples = random.Random(14112026), []
    for _ in range(2000):
        selected = [clusters[rng.randrange(len(clusters))] for _ in clusters]
        low = [y for person in selected for y, _, band in person if band == 0]
        high = [y for person in selected for y, _, band in person if band == 2]
        if low and high:
            samples.append(sum(high)/len(high)-sum(low)/len(low))
    return {'bands': result, 'highMinusLowRateInterval': [percentile(samples, .025), percentile(samples, .975)],
            'interpretation': 'Relative tiers defined by earlier calibration-population prediction tertiles; not fixed clinical probabilities or person-specific risk.'}


def benchmark(people, audit):
    dates = sorted({r['date'] for p in people for r in p})
    training_end, calibration_end = dates[int(.5*len(dates))], dates[int(.7*len(dates))]
    clusters = {k: [] for k in VARIANTS}
    tier_clusters = {k: [] for k in VARIANTS}
    comparisons = {k: [] for k in ['clock', 'historyAndClock']}
    counts = []
    def x(rows, cols):
        return [[np.nan if r['x'][j] is None else r['x'][j] for j in cols] for r in rows]
    for fold in range(5):
        other = [r for i, p in enumerate(people) if i % 5 != fold for r in p]
        train = [r for r in other if r['labelAvailable'] < training_end]
        calibration = [r for r in other if r['origin'] >= training_end and r['labelAvailable'] < calibration_end]
        if any(len(rows) < 100 or min(sum(r['y'] for r in rows), sum(1-r['y'] for r in rows)) < 10 for rows in [train, calibration]):
            continue
        fits = {}
        for name, cols in VARIANTS.items():
            model = HistGradientBoostingClassifier(**SETTINGS).fit(x(train, cols), [r['y'] for r in train])
            raw = model.predict_proba(x(calibration, cols))[:, 1]
            calibrator = LogisticRegression(C=1, max_iter=1000).fit(logit(np.clip(raw, .0001, .9999)).reshape(-1, 1), [r['y'] for r in calibration])
            calibrated = calibrator.predict_proba(logit(np.clip(raw, .0001, .9999)).reshape(-1, 1))[:, 1]
            fits[name] = model, calibrator, np.quantile(calibrated, [1/3, 2/3])
        n = reports = 0
        for i, person in enumerate(people):
            if i % 5 != fold:
                continue
            test = [r for r in person if r['origin'] >= calibration_end]
            if len(test) < 5:
                continue
            predictions = {}
            for name, cols in VARIANTS.items():
                model, calibrator, boundaries = fits[name]
                raw = model.predict_proba(x(test, cols))[:, 1]
                p = calibrator.predict_proba(logit(np.clip(raw, .0001, .9999)).reshape(-1, 1))[:, 1]
                predictions[name] = p
                clusters[name].append([(r['y'], float(v)) for r, v in zip(test, p)])
                tier_clusters[name].append([(r['y'], float(v), tier(v, boundaries)) for r, v in zip(test, p)])
            for baseline in comparisons:
                comparisons[baseline].append([(r['y'], float(a), float(b)) for r, a, b in zip(test, predictions['combined'], predictions[baseline])])
            n += 1
            reports += len(test)
        counts.append({'fold': fold, 'trainReports': len(train), 'calibrationReports': len(calibration), 'testPeople': n, 'testReports': reports})
    return {'audit': audit, 'folds': counts,
            'protocol': 'Five held-person folds; first50% global times train fixed boosted trees, next20% other-person times fit sigmoid C=1 and tercile cutpoints; final30% held-person times evaluate unchanged models/calibrators/cutpoints. No refit or final-test threshold selection.',
            'models': {k: {'metrics': symptom_metrics([r for person in values for r in person]),
                           'relativeTiers': tier_summary(tier_clusters[k])} for k, values in clusters.items()},
            'combinedComparisons': {k: paired_cluster_intervals(v) for k, v in comparisons.items()},
            'clinicalValidation': False, 'endometriosisValidated': False, 'activeInPublicApp': False,
            'limitations': ['Exploratory repeated LifeSnaps use; tiers do not establish menstrual symptom accuracy.',
                           'TIRED mood selection at a later report, not clinical fatigue or guaranteed onset.',
                           'Unknown real receipt/sync; hour aggregates are conservatively lagged.',
                           'Calibration is population-based; participants may have different baseline risks.',
                           'High relative tier can have low absolute probability; symptom severity is not modeled.',
                           'Risk-tier separation does not prove incremental wearable benefit; compare against history and clock.',
                           'No deployment or individual warning decision follows from these results.']}


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
    print(json.dumps({'folds': result['folds'], 'combinedTiers': result['models']['combined']['relativeTiers']}))
