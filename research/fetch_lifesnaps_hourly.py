"""Bounded anonymous download of official hourly CSV; no full raw-archive extraction."""
import argparse
import csv
import hashlib
import io
import json
import os
import pathlib
from fetch_lifesnaps_daily import get, read_directory, decode_member, RECORD


def fetch(cache, audit_path):
    meta_raw = get(RECORD)
    meta = json.loads(meta_raw)
    if meta['metadata'].get('access_right') != 'open' or meta['metadata'].get('license', {}).get('id') != 'cc-by-4.0':
        raise ValueError('Review changed source access/license')
    file = next(f for f in meta['files'] if f['key'] == 'rais_anonymized.zip')
    entries = read_directory(get(file['links']['self'], '-131072'), file['size'])
    candidates = [e for e in entries if e['name'].endswith('/hourly_fitbit_sema_df_unprocessed.csv')]
    if len(candidates) != 1:
        raise ValueError('Expected one official hourly member')
    entry = candidates[0]
    if entry['compressed'] > 8380000 or entry['size'] > 33554432:
        raise ValueError('Review changed member size')
    stop = min(e['offset'] for e in entries if e['offset'] > entry['offset'])-1
    content = decode_member(get(file['links']['self'], f"{entry['offset']}-{stop}"), entry)
    cache.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(cache, 0o700)
    for name, body in [('hourly.csv', content), ('hourly-source-record.json', meta_raw), ('.gitignore', b'*\n')]:
        path = cache/name
        path.write_bytes(body)
        os.chmod(path, 0o600)
    audit = {'source': 'https://zenodo.org/records/7229547', 'license': 'CC BY 4.0',
             'member': entry['name'], 'memberCrcVerified': True,
             'sourceCsvSha256': hashlib.sha256(content).hexdigest(),
             'sourceArchiveChecksum': file['checksum'], 'wholeArchiveChecksumVerified': False,
             'rows': sum(1 for _ in csv.DictReader(io.StringIO(content.decode()))),
             'accountRequired': False, 'paymentRequired': False,
             'clinicalValidation': False, 'menstrualLabelsPresent': False}
    audit_path.write_text(json.dumps(audit, indent=2)+'\n')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--cache', type=pathlib.Path, required=True)
    p.add_argument('--audit', type=pathlib.Path, required=True)
    args = p.parse_args()
    fetch(args.cache, args.audit)
