"""Exploratory new-onset audit; never selects a production alert threshold.

Run with a checksum-verified MPIS cache. Excludes imputation, missing checklists,
and nonconsecutive observations. No participant-level records are exported.
"""
import argparse
import json
import pathlib
from mpis_symptom_benchmark import SYMPTOMS, fetch_data, observed_rows, lagged_rows
from evaluate_bad_days import logistic_predict, metrics

THRESHOLDS = (.05, .10, .15, .20, .30, .50)


def onset_rows(rows, target):
    column = None if target == 'any_pain' else 3 + list(SYMPTOMS).index(target)
    result = []
    for row in rows:
        prior = int(row['x'][0] > 0) if column is None else row['x'][column]
        label = int(row['pain'] > 0) if column is None else (
            None if row['symptoms'] is None else row['symptoms'][target])
        if prior == 0 and label is not None:
            result.append(dict(row, y=label))
    return result


def audit(raw):
    observed, excluded = observed_rows(raw)
    rows = lagged_rows(observed)
    outcomes = []
    for target in ['any_pain', *SYMPTOMS]:
        eligible = onset_rows(rows, target)
        predictions = {'onset_prevalence': [], 'logistic': []}
        people = set()
        event_people = set()
        for held in sorted({r['participant'] for r in eligible}):
            train = [r for r in eligible if r['participant'] != held]
            positives = sum(r['y'] for r in train)
            if len(train) < 20 or positives < 3 or len(train)-positives < 3:
                continue
            prevalence = (positives+1)/(len(train)+2)
            for row in eligible:
                if row['participant'] != held:
                    continue
                predictions['onset_prevalence'].append((row['y'], prevalence))
                predictions['logistic'].append((row['y'], logistic_predict(
                    train, row['x'], list(range(len(row['x']))))))
                people.add(held)
                if row['y']:
                    event_people.add(held)
        outcomes.append({
            'target': target,
            'meaning': 'Pain after explicitly reported zero pain' if target == 'any_pain'
                else 'Checklist selection after prior nonselection, conditional on both checklists answered',
            'eligibleOpportunities': len(eligible),
            'eligibleOnsets': sum(r['y'] for r in eligible),
            'evaluatedPeople': len(people),
            'evaluatedPeopleWithOnsets': len(event_people),
            'excludedForTrainingSupport': len(eligible)-len(predictions['logistic']),
            'models': {name: [metrics(pairs, threshold) for threshold in THRESHOLDS]
                       for name, pairs in predictions.items()},
        })
    return {
        'clinicalValidation': False, 'productionChanged': False,
        'observedRows': len(observed), 'excluded': excluded,
        'method': 'Leave one participant out; train only on onset opportunities. Fixed logistic settings and threshold grid; no threshold selected from results.',
        'limitations': [
            'Small menstrual-symptom intervention dataset, not a confirmed-endometriosis cohort.',
            'Shifted source dates and unknown report receipt times prevent a prospective timing claim.',
            'Checklist nonselection is not clinically confirmed absence; missing checklists remain unknown.',
            'False alerts per 30 evaluated onset opportunities are not alerts per calendar month.',
            'Exploratory comparison, no independent replication or clinical accuracy claim.',
        ],
        'outcomes': outcomes,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    raw, source = fetch_data(args.cache)
    report = audit(raw)
    report['provenance'] = source
    args.output.write_text(json.dumps(report, indent=2)+'\n')
    for outcome in report['outcomes']:
        print(outcome['target'], outcome['eligibleOpportunities'], outcome['eligibleOnsets'])
        if outcome['target'] == 'any_pain':
            for name, results in outcome['models'].items():
                print(name, [(r.get('threshold'), r.get('sensitivity'), r.get('precision'), r.get('falseAlertsPer30EvaluatedDays')) for r in results])
