"""Frozen population-prior/personal-adaptation experiment, not clinical validation."""
import argparse
import json
import numpy as np
from scipy.optimize import minimize
from scipy.special import expit
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from threadpoolctl import threadpool_limits
from cluster_uncertainty import paired_cluster_intervals
from mpis_symptom_benchmark import symptom_metrics


def matrix(rows, cols):
    return np.array([[np.nan if r['x'][j] is None else r['x'][j] for j in cols] for r in rows], dtype=float)


def adapt(x, y, prior, strength=20):
    """MAP-like shrinkage to population coefficients; intercept is also regularized."""
    def loss(w):
        logits = x @ w
        return np.logaddexp(0, logits).sum()-y @ logits + strength/2*np.sum((w-prior)**2)
    def gradient(w):
        return x.T @ (expit(x @ w)-y)+strength*(w-prior)
    fit = minimize(loss, prior, jac=gradient, method='L-BFGS-B', options={'maxiter': 300})
    if not fit.success:
        raise RuntimeError('Personal adaptation did not converge')
    return fit.x


def benchmark(source):
    people = source['people']
    dates = sorted({r['date'] for p in people for r in p['rows']})
    cutoff = dates[int(.7*len(dates))]
    variants = {'history': list(range(4)), 'combined': list(range(4))+[4, 5, 7, 9, 11, 13]+list(range(14, 34))}
    groups = {k: [] for k in variants}
    paired, counts = [], []
    for fold in range(5):
        train = [r for i, p in enumerate(people) if i % 5 != fold for r in p['rows'] if r['date'] < cutoff and r['availableAt'] <= cutoff+'T00:00:00Z']
        if len(train) < 200 or min(sum(r['y'] for r in train), sum(1-r['y'] for r in train)) < 20:
            continue
        fits = {}
        for name, cols in variants.items():
            imputer = SimpleImputer(strategy='median', add_indicator=True, keep_empty_features=True)
            scaler = StandardScaler()
            x = np.clip(scaler.fit_transform(imputer.fit_transform(matrix(train, cols))), -5, 5)
            model = LogisticRegression(C=1, max_iter=1000, random_state=14112026).fit(x, [r['y'] for r in train])
            fits[name] = (imputer, scaler, np.r_[model.intercept_, model.coef_[0]])
        n = 0
        for i, person in enumerate(people):
            if i % 5 != fold:
                continue
            test = [r for r in person['rows'] if r['date'] >= cutoff]
            personal = [r for r in person['rows'] if r['date'] < cutoff and r['availableAt'] <= cutoff+'T00:00:00Z']
            if len(test) < 5:
                continue
            prediction = {}
            for name, cols in variants.items():
                imputer, scaler, prior = fits[name]
                def transform(rows):
                    x = scaler.transform(imputer.transform(matrix(rows, cols)))
                    return np.c_[np.ones(len(rows)), np.clip(x, -5, 5)]
                w = adapt(transform(personal), np.array([r['y'] for r in personal]), prior) if len(personal) >= 10 else prior
                prediction[name] = expit(transform(test) @ w).tolist()
                groups[name].append([(r['y'], p, r['previous']) for r, p in zip(test, prediction[name])])
            paired.append([(r['y'], a, b) for r, a, b in zip(test, prediction['combined'], prediction['history'])])
            n += 1
        counts.append({'fold': fold, 'testPeople': n})
    def summarize(clusters):
        rows = [r for person in clusters for r in person]
        return {'all': symptom_metrics([(y, p) for y, p, old in rows]),
                'newSelection': symptom_metrics([(y, p) for y, p, old in rows if not old])}
    return {'protocol': 'Frozen population logistic C=1 plus personal coefficient adaptation with quadratic shrinkage strength 20; minimum ten earlier personal labels; same held-person/global-date split; no heldout-based selection or calibration.',
            'clinicalValidation': False, 'endometriosisValidated': False, 'activeInPublicApp': False,
            'cutoff': cutoff, 'folds': counts, 'models': {k: summarize(v) for k, v in groups.items()},
            'combinedVsHistory': paired_cluster_intervals(paired),
            'limitations': ['Repeatedly examined cohort: exploratory, not independent validation.',
                           'TIRED selection is not clinical menstrual fatigue.',
                           'Earlier personal labels adapt coefficients; test labels never adapt or calibrate the model.',
                           'Fixed shrinkage is a regularized approximation, not a full hierarchical Bayesian posterior.',
                           'Prior-day receipt is assumed; no real-time prospective deployment.']}


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
    print(json.dumps(result, indent=2))
