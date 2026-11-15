"""Prior-day personal features for the official LifeSnaps daily CSV.
No targets are inferred from unanswered mood surveys or from sensor readings.
"""
import argparse
import collections
import csv
import datetime as dt
import hashlib
import io
import json
import math
import os
import pathlib
import statistics

MOODS = ['ALERT', 'HAPPY', 'NEUTRAL', 'RESTED/RELAXED', 'SAD', 'TENSE/ANXIOUS', 'TIRED']
SIGNALS = [('minutesAsleep', 0, 1440, 60), ('resting_hr', 20, 220, 1),
           ('rmssd', .000001, 500, 1), ('nightly_temperature', 20, 45, 1), ('steps', 0, 150000, 1)]
FEATURES = ['previousTiredSelection', 'prior3DayTiredRate', 'prior7DayTiredRate', 'prior7DayReportCount'] + [
    name+suffix for name in ['sleepHours', 'restingHR', 'hrvRmssd', 'nightlyTemperatureC', 'steps']
    for suffix in ['Value', 'ChangeFromPriorMedian']]


def number(value):
    if not value or value.lower() in ('nan', 'na'):
        return None
    n = float(value)
    return n if math.isfinite(n) else None


def tired_label(row):
    moods = [number(row[k]) for k in MOODS]
    if any(v not in (None, 0, 1) for v in moods):
        raise ValueError('Review changed EMA encoding')
    if not any(v == 1 for v in moods):
        return None
    return None if number(row['TIRED']) is None else int(float(row['TIRED']))


def prepare(raw, with_trends=False):
    by = collections.defaultdict(dict)
    quality = collections.Counter()
    for row in raw:
        day = dt.date.fromisoformat(row['date'])
        pid = row['id']
        if day in by[pid]:
            raise ValueError('Duplicate participant/day')
        signals = []
        for name, lo, hi, divisor in SIGNALS:
            value = number(row[name])
            if value is not None and not lo <= value <= hi:
                quality['outOfRange:'+name] += 1
                value = None
            signals.append(None if value is None else value/divisor)
        by[pid][day] = {'label': tired_label(row), 'signals': signals}
    people = []
    for days in by.values():
        examples = []
        for day, current in sorted(days.items()):
            prior_day = day-dt.timedelta(days=1)
            prior = days.get(prior_day)
            if prior is None or prior['label'] is None or current['label'] is None:
                continue
            rates = [[v['label'] for d, v in days.items() if day-dt.timedelta(days=n) <= d < day and v['label'] is not None] for n in [3, 7]]
            features = [prior['label'], statistics.mean(rates[0]), statistics.mean(rates[1]), len(rates[1])]
            for i, value in enumerate(prior['signals']):
                history = [v['signals'][i] for d, v in days.items() if day-dt.timedelta(days=29) <= d < prior_day and v['signals'][i] is not None]
                baseline = statistics.median(history) if len(history) >= 7 else None
                features.extend([value, None if value is None or baseline is None else value-baseline])
            if with_trends:
                for i, value in enumerate(prior['signals']):
                    baseline_values = [v['signals'][i] for d, v in days.items() if day-dt.timedelta(days=31) <= d < day-dt.timedelta(days=3) and v['signals'][i] is not None]
                    baseline = statistics.median(baseline_values) if len(baseline_values) >= 7 else None
                    recent = [v['signals'][i] for d, v in days.items() if day-dt.timedelta(days=3) <= d < day and v['signals'][i] is not None]
                    trend = [((d-day).days, v['signals'][i]) for d, v in days.items() if day-dt.timedelta(days=7) <= d < day and v['signals'][i] is not None]
                    slope = None
                    if len(trend) >= 3:
                        mx, my = statistics.mean(t for t, _ in trend), statistics.mean(v for _, v in trend)
                        slope = sum((t-mx)*(v-my) for t, v in trend)/sum((t-mx)**2 for t, _ in trend)
                    mad = statistics.median(abs(v-baseline) for v in baseline_values) if baseline is not None else None
                    zscore = None if value is None or not mad else max(-5, min(5, (value-baseline)/(1.4826*mad)))
                    features.extend([None if baseline is None or len(recent) < 2 else statistics.mean(recent)-baseline,
                                     slope, zscore, len(recent)])
            examples.append({'date': day.isoformat(), 'availableAt': day.isoformat()+'T23:59:59Z',
                             'featureDate': prior_day.isoformat(), 'x': features, 'y': current['label'],
                             'previous': bool(prior['label']), 'coreSensorsComplete': all(prior['signals'][i] is not None for i in [0, 1, 2])})
        if examples:
            # No participant identifier is needed by the local model/evaluator.
            people.append({'rows': examples})
    names = FEATURES + ([name+suffix for name in ['sleepHours', 'restingHR', 'hrvRmssd', 'nightlyTemperatureC', 'steps']
                         for suffix in ['Recent3Change', 'Slope7Days', 'RobustZ', 'Recent3Coverage']] if with_trends else [])
    return {'people': people, 'features': names, 'quality': dict(quality), 'participantsInSource': len(by),
            'pairedExamples': sum(len(p['rows']) for p in people), 'participantsWithPairs': len(people)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    parser.add_argument('--temporal', action='store_true')
    args = parser.parse_args()
    content = args.csv.read_bytes()
    result = prepare(list(csv.DictReader(io.StringIO(content.decode('utf-8-sig')))), with_trends=args.temporal)
    result['sourceCsvSha256'] = hashlib.sha256(content).hexdigest()
    with os.fdopen(os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 'w') as output:
        json.dump(result, output)
    os.chmod(args.output, 0o600)
    print(json.dumps({k: result[k] for k in ['participantsInSource', 'pairedExamples', 'participantsWithPairs', 'quality']}))
