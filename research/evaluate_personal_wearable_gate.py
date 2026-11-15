"""Earlier-only selection of wearable use; held-out outcomes never choose a model."""
import argparse
import json
import numpy as np
from scipy.special import expit
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from threadpoolctl import threadpool_limits
from evaluate_personal_adaptation import adapt, matrix
from cluster_uncertainty import paired_cluster_intervals
from mpis_symptom_benchmark import symptom_metrics

VARIANTS = {'history': list(range(4)), 'combined': list(range(4))+[4, 5, 7, 9, 11, 13]+list(range(14, 34))}


def supported(rows, minimum=100):
    return len(rows) >= minimum and min(sum(r['y'] for r in rows), sum(1-r['y'] for r in rows)) >= 10


def select_wearables(validation, history, combined):
    """Frozen gate: adequate earlier outcomes and >=0.005 Brier improvement."""
    if len(validation) < 20 or min(sum(validation), len(validation)-sum(validation)) < 5:
        return False
    return float(np.mean((np.asarray(combined)-validation)**2)) <= float(np.mean((np.asarray(history)-validation)**2))-.005


def fit_population(rows, cols):
    imputer = SimpleImputer(strategy='median', add_indicator=True, keep_empty_features=True)
    scaler = StandardScaler()
    x = np.clip(scaler.fit_transform(imputer.fit_transform(matrix(rows, cols))), -5, 5)
    fit = LogisticRegression(C=1, max_iter=1000, random_state=14112026).fit(x, [r['y'] for r in rows])
    return imputer, scaler, np.r_[fit.intercept_, fit.coef_[0]]


def predict(fit, personal, test, cols):
    imputer, scaler, prior = fit
    def transform(rows):
        return np.c_[np.ones(len(rows)), np.clip(scaler.transform(imputer.transform(matrix(rows, cols))), -5, 5)]
    w = adapt(transform(personal), np.array([r['y'] for r in personal]), prior) if len(personal) >= 10 else prior
    return expit(transform(test) @ w).tolist()


def benchmark(source):
    people = source['people']
    dates = sorted({r['date'] for p in people for r in p['rows']})
    inner, cutoff = dates[int(.5*len(dates))], dates[int(.7*len(dates))]
    clusters, gated_clusters, counts = [], [], {'eligiblePeople': 0, 'wearableSelectedPeople': 0, 'wearableSelectedDays': 0, 'totalTestDays': 0}
    models = {k: [] for k in ['history', 'gated']}
    def before(rows, boundary):
        return [r for r in rows if r['date'] < boundary and r['availableAt'] <= boundary+'T00:00:00Z']
    for fold in range(5):
        other = [r for i, p in enumerate(people) if i % 5 != fold for r in p['rows']]
        early, final = before(other, inner), before(other, cutoff)
        if not supported(early) or not supported(final):
            continue
        early_fits = {k: fit_population(early, cols) for k, cols in VARIANTS.items()}
        final_fits = {k: fit_population(final, cols) for k, cols in VARIANTS.items()}
        for i, person in enumerate(people):
            if i % 5 != fold:
                continue
            rows = person['rows']
            test = [r for r in rows if r['date'] >= cutoff]
            if len(test) < 5:
                continue
            personal_early, personal_final = before(rows, inner), before(rows, cutoff)
            validation = [r for r in rows if inner <= r['date'] < cutoff and r['availableAt'] <= cutoff+'T00:00:00Z']
            use = False
            if validation:
                prior_predictions = {k: predict(early_fits[k], personal_early, validation, cols) for k, cols in VARIANTS.items()}
                use = select_wearables(np.array([r['y'] for r in validation]), prior_predictions['history'], prior_predictions['combined'])
            history = predict(final_fits['history'], personal_final, test, VARIANTS['history'])
            gated = predict(final_fits['combined'], personal_final, test, VARIANTS['combined']) if use else history
            pair = [(r['y'], a, b) for r, a, b in zip(test, gated, history)]
            clusters.append(pair)
            if use:
                gated_clusters.append(pair)
            for k, values in [('history', history), ('gated', gated)]:
                models[k].extend((r['y'], p, r['previous']) for r, p in zip(test, values))
            counts['eligiblePeople'] += 1
            counts['totalTestDays'] += len(test)
            counts['wearableSelectedPeople'] += int(use)
            counts['wearableSelectedDays'] += len(test)*int(use)
    return {'clinicalValidation': False, 'activeInPublicApp': False, 'counts': counts,
            'protocol': 'Global 50% dates: fit selection models and earlier personal adaptation. 50–70% dates: held-person validation gate (>=20 labels, >=5/class, >=0.005 Brier improvement). Refit at 70%; evaluate later held-person days. C=1, personal shrinkage=20, no tuning.',
            'models': {k: {'all': symptom_metrics([(y, p) for y, p, old in rows]),
                           'newSelection': symptom_metrics([(y, p) for y, p, old in rows if not old])} for k, rows in models.items()},
            'gatedVsHistory': paired_cluster_intervals(clusters),
            'selectedPeopleOnly': paired_cluster_intervals(gated_clusters),
            'limitations': ['Exploratory reuse of LifeSnaps, not independent validation.',
                           'Outcome is TIRED mood selection, not clinical menstrual fatigue.',
                           'Earlier validation gate is a model-selection heuristic, not proof of an individual benefit.',
                           'Sparse earlier labels may make useful personalized selection impossible.',
                           'Date ordering assumes prior-day availability; real-time receipt unknown.']}


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--input', required=True)
    p.add_argument('--output', required=True)
    args = p.parse_args()
    with open(args.input) as f:
        source = json.load(f)
    with threadpool_limits(limits=2):
        result = benchmark(source)
    with open(args.output, 'w') as f:
        json.dump(result, f, indent=2)
        f.write('\n')
    print(json.dumps(result['counts']))
