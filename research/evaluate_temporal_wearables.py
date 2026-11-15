"""Single frozen nonlinear/temporal experiment; no hyperparameter search or test tuning."""
import argparse
import collections
import datetime as dt
import json
import pathlib
import numpy as np
import sklearn
from sklearn.ensemble import HistGradientBoostingClassifier
from threadpoolctl import threadpool_limits
from mpis_symptom_benchmark import symptom_metrics
from cluster_uncertainty import paired_cluster_intervals

SETTINGS = dict(max_iter=100, max_leaf_nodes=7, max_depth=3, min_samples_leaf=30,
                learning_rate=.05, l2_regularization=2.0, early_stopping=False, random_state=14112026)


def benchmark(source):
    people = source['people']
    dates = sorted({r['date'] for p in people for r in p['rows']})
    cutoff = dates[int(len(dates)*.7)]
    history = list(range(4))
    sensors = [4, 5, 7, 9, 11, 13] + list(range(14, 34))
    variants = {'history': history, 'wearable': sensors, 'combined': history+sensors}
    clusters = {name: [] for name in variants}
    paired, fold_counts = [], []
    for fold in range(5):
        train = [r for i, p in enumerate(people) if i % 5 != fold for r in p['rows'] if r['date'] < cutoff and r['availableAt'] <= cutoff+'T00:00:00Z']
        if len(train) < 200 or sum(r['y'] for r in train) < 20 or sum(1-r['y'] for r in train) < 20:
            continue
        fits = {}
        for name, cols in variants.items():
            x = np.array([[np.nan if r['x'][j] is None else r['x'][j] for j in cols] for r in train], dtype=float)
            fits[name] = HistGradientBoostingClassifier(**SETTINGS).fit(x, [r['y'] for r in train])
        count = 0
        days = 0
        for i, person in enumerate(people):
            if i % 5 != fold:
                continue
            test = [r for r in person['rows'] if r['date'] >= cutoff]
            if len(test) < 5:
                continue
            predictions = {}
            for name, cols in variants.items():
                x = np.array([[np.nan if r['x'][j] is None else r['x'][j] for j in cols] for r in test], dtype=float)
                predictions[name] = fits[name].predict_proba(x)[:, 1].tolist()
                clusters[name].append([(r['y'], p, r['previous']) for r, p in zip(test, predictions[name])])
            paired.append([(r['y'], p, baseline) for r, p, baseline in zip(test, predictions['combined'], predictions['history'])])
            count += 1
            days += len(test)
        fold_counts.append({'fold': fold, 'trainingDays': len(train), 'testPeople': count, 'testDays': days})
    def summarize(values):
        all_rows = [row for person in values for row in person]
        result = {group: symptom_metrics([(y, p) for y, p, old in all_rows if group == 'all' or (not old if group == 'newSelection' else old)])
                  for group in ['all', 'newSelection', 'continuation']}
        result['experimentalBands'] = []
        for band, lo, hi in [('low', 0, 1/3), ('medium', 1/3, 2/3), ('high', 2/3, 1.00001)]:
            selected = [(y, p) for y, p, _ in all_rows if lo <= p < hi]
            result['experimentalBands'].append({'band': band, 'n': len(selected),
                'observedSymptomRate': sum(y for y, _ in selected)/len(selected) if selected else None,
                'meanEstimate': sum(p for _, p in selected)/len(selected) if selected else None})
        return result
    return {'source': 'LifeSnaps official v4', 'sourceCsvSha256': source['sourceCsvSha256'],
            'clinicalValidation': False, 'endometriosisValidated': False, 'activeInPublicApp': False,
            'cutoffDate': cutoff, 'foldCounts': fold_counts, 'settings': SETTINGS, 'sklearnVersion': sklearn.__version__,
            'features': {name: [source['features'][j] for j in cols] for name, cols in variants.items()},
            'method': 'Same frozen five participant groups/global 70% date cutoff as previous shared study; previous-day-only temporal features; fixed boosted-tree settings; no tuning, no random day splits, no patient ID features. Models use identical held-out days.',
            'models': {name: summarize(values) for name, values in clusters.items()},
            'combinedVsHistoryUncertainty': paired_cluster_intervals(paired),
            'limitations': ['Already repeatedly examined source cohort; this is an exploratory new hypothesis, not independent validation.',
                           'Source outcome is daily TIRED mood selection, not clinical fatigue or menstrual/endometriosis symptom burden.',
                           'Unknown receipt times: prior-day availability is assumed. More recent overnight/same-day signals were not relabeled as future prediction.',
                           'Feature importance or the presence of wearable inputs would not establish useful predictive benefit.',
                           'No raw records, individual predictions, fitted model artifacts or coefficients exported.']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    with threadpool_limits(limits=2):
        report = benchmark(json.loads(args.input.read_text()))
    args.output.write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps({'foldCounts': report['foldCounts'], 'models': {k: v['all'] for k, v in report['models'].items()},
                      'uncertainty': report['combinedVsHistoryUncertainty']}, indent=2))
