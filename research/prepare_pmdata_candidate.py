"""Local-only bridge for the exact TS candidate. Does not export raw rows for sharing.

Retrospective day-end wearable availability is an assumption, not receipt metadata.
PMsys low fatigue scores mean more tired: 1 very tired, 2 more tired than normal.
"""
import argparse
import datetime as dt
import json
import pathlib
from pmdata_benchmark import ROOT, listing, collect_person

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--cache', type=pathlib.Path, required=True)
    p.add_argument('--output', type=pathlib.Path, required=True)
    args = p.parse_args()
    people = []
    for item in listing(ROOT, args.cache):
        if item['attributes'].get('kind') != 'folder':
            continue
        person = collect_person(item, args.cache)
        records = sorted(person['records'], key=lambda r: r['date'])
        days, physiology = [], []
        for r in records:
            labels = dict.fromkeys(['pelvicPain', 'fatigue', 'bloating', 'headache', 'bowelSymptoms', 'urinarySymptoms', 'nausea', 'dailyLifeImpact'])
            labels['fatigue'] = r['fatigue'] <= 2
            days.append({'date': r['date'], 'availableAt': r['reportedAt'], 'symptoms': labels})
            physiology.append({'date': r['date'], 'availableAt': r['date']+'T23:59:59Z', 'source': 'fitbit', 'kind': 'real',
                'sleepHours': r['sleepHours'], 'restingHeartRateBpm': r['restingHR'], 'nightHeartRateBpm': None,
                'hrvRmssdMs': None, 'temperatureDeviationC': None, 'respiratoryRateBpm': None, 'steps': None})
        target = (dt.date.fromisoformat(records[-1]['date'])+dt.timedelta(days=1)).isoformat()
        people.append({'input': {'kind': 'real', 'targetDate': target, 'asOf': target+'T00:00:00Z', 'timeZone': 'UTC', 'days': days},
                       'physiology': physiology})
    args.output.write_text(json.dumps({'people': people}))
    print('Prepared', len(people), 'participants locally; no raw records in public report.')
