"""Prepare an authorized local EndoLIST archive for the exact app candidate.

Never commit or share this script's participant-level intermediate output.
It does not execute source R code or infer unreported symptom absence.
"""
import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import math
import os
import pathlib
import re
import zipfile

STEMS = {
    'pelvicPain': {'pelvic pain', 'right pelvic pain', 'left pelvic pain'},
    'fatigue': {'fatigue'},  # Energy has opposite direction: do not conflate it.
    'bloating': {'bloating', 'endo belly'},
    'headache': {'headache'},  # Migraines kept separate, not silently merged.
    'bowelSymptoms': {'painful bowel movement', 'pain before / during bowel movement'},
    'urinarySymptoms': {'urination pain'},
    'nausea': {'nausea'},  # Excludes combined nausea/vomiting instruments.
}
ALL_SYMPTOMS = [*STEMS, 'dailyLifeImpact']


def column_spec(header, symptom):
    stem = header.split('(')[0].strip().lower()
    scale = re.search(r'\(0-[^,]+,\s*(4|10)-worst', header, re.I)
    return int(scale.group(1)) if stem in STEMS[symptom] and scale else None


def severity(value, maximum):
    if not value.strip():
        return None
    number = float(value)
    if not math.isfinite(number) or not 0 <= number <= maximum:
        raise ValueError('Invalid symptom severity; review source locally')
    return number / maximum


def collapse(values, threshold):
    """Any positive proves presence; absence requires every selected item known."""
    positive = lambda v: v > 0 if threshold == 0 else v >= threshold
    if any(v is not None and positive(v) for v in values):
        return True
    if values and all(v is not None for v in values):
        return False
    return None


def prepare(archive):
    people = []
    with zipfile.ZipFile(archive) as z:
        license_name = next(n for n in z.namelist() if n.endswith('/LICENSE.txt'))
        prefix = license_name.removesuffix('LICENSE.txt')
        checked = 0
        for line in z.read(prefix+'SHA256SUMS.txt').decode().splitlines():
            sha, name = line.split(maxsplit=1)
            name = name.strip().lstrip('*')
            if hashlib.sha256(z.read(prefix+name)).hexdigest() != sha:
                raise ValueError('Source checksum mismatch')
            checked += 1
        files = sorted(n for n in z.namelist() if re.search(r'/User\d+\.csv$', n))
        for name in files:
            raw = list(csv.DictReader(io.StringIO(z.read(name).decode('utf-8-sig'))))
            specs = {s: [(h, maximum) for h in raw[0] if (maximum := column_spec(h, s)) is not None] for s in STEMS}
            days = sorted(raw, key=lambda r: int(r['Day in study']))
            numbers = [int(r['Day in study']) for r in days]
            if len(numbers) != len(set(numbers)) or any(d < 1 for d in numbers):
                raise ValueError('Duplicate or invalid study-day index')
            # Dates are a technical coordinate for relative source study days, not actual calendar dates.
            date = lambda number: (dt.date(2020, 1, 1)+dt.timedelta(days=number-1)).isoformat()
            starts = [{'date': date(int(r['Day in study'])),
                       'availableAt': date(int(r['Day in study']))+'T18:00:00Z'}
                      for r in days if r['First day of period'].strip() == '1']
            for task, threshold in [('presence', 0), ('higher_burden', .5)]:
                normalized = []
                for row in days:
                    labels = dict.fromkeys(ALL_SYMPTOMS)
                    for symptom, columns in specs.items():
                        labels[symptom] = collapse([severity(row[h], maximum) for h, maximum in columns], threshold)
                    day = date(int(row['Day in study']))
                    normalized.append({'date': day, 'availableAt': day+'T18:00:00Z', 'symptoms': labels})
                target = date(numbers[-1]+1)
                people.append({'task': task, 'input': {'kind': 'real', 'targetDate': target,
                    'asOf': target+'T00:00:00Z', 'timeZone': 'UTC', 'days': normalized,
                    'cycle': {'regime': 'natural', 'regimeSince': date(numbers[0]),
                              'availableAt': date(numbers[0])+'T18:00:00Z', 'periodStarts': starts}}})
    return {'source': 'KI EndoLIST v1.0.0', 'archiveSha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
            'verifiedFiles': checked, 'participants': len(files), 'people': people}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    report = prepare(args.archive)
    args.output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(args.output.parent, 0o700)
    with os.fdopen(os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 'w') as output:
        json.dump(report, output)
    os.chmod(args.output, 0o600)
    print(json.dumps({k: report[k] for k in ['source', 'verifiedFiles', 'participants']}))
