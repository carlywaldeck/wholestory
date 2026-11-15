"""Fetch the official open LifeSnaps daily CSV without the 615 MB raw archive.

Only public anonymous GETs. No credentials, access requests or third-party mirrors.
ZIP member CRC validates transfer integrity; the whole archive MD5 is not verified.
"""
import argparse
import binascii
import collections
import csv
import hashlib
import io
import json
import os
import pathlib
import struct
import subprocess
import urllib.parse
import zlib

RECORD = 'https://zenodo.org/api/records/7229547'
SUFFIX = '/daily_fitbit_sema_df_unprocessed.csv'


def get(url, byte_range=None):
    if urllib.parse.urlparse(url).hostname != 'zenodo.org':
        raise ValueError('Unexpected source host')
    command = ['curl', '--fail', '--silent', '--show-error', '--location',
               '--max-time', '25', '--max-filesize', '8388608']
    if byte_range:
        command += ['--range', byte_range]
    result = subprocess.run(command + [url, '-w', '\n%{http_code}'], check=True, capture_output=True).stdout
    body, _, status = result.rpartition(b'\n')
    if status != (b'206' if byte_range else b'200'):
        raise ValueError('Source did not honor expected response/range; no full archive fallback')
    return body


def read_directory(tail, archive_size):
    end = tail.rfind(b'PK\x05\x06')
    if end < 0:
        raise ValueError('ZIP directory not present in bounded tail')
    fields = struct.unpack_from('<4s4H2LH', tail, end)
    offset = fields[6] - (archive_size-len(tail))
    if offset < 0:
        raise ValueError('Directory exceeds bounded tail')
    entries = []
    while tail[offset:offset+4] == b'PK\x01\x02':
        f = struct.unpack_from('<4s6H3L5H2L', tail, offset)
        name = tail[offset+46:offset+46+f[10]].decode('utf-8')
        entries.append({'name': name, 'method': f[4], 'crc': f[7], 'compressed': f[8], 'size': f[9], 'offset': f[16]})
        offset += 46+f[10]+f[11]+f[12]
    return entries


def decode_member(raw, entry):
    f = struct.unpack_from('<4s5H3L2H', raw)
    if f[0] != b'PK\x03\x04' or f[2] & 1 or f[3] != 8 or entry['method'] != 8:
        raise ValueError('Unsupported local ZIP header')
    name = raw[30:30+f[9]].decode('utf-8')
    if name != entry['name']:
        raise ValueError('ZIP member name mismatch')
    start = 30+f[9]+f[10]
    decoder = zlib.decompressobj(-15)
    content = decoder.decompress(raw[start:start+entry['compressed']], 33554433)
    if not decoder.eof or len(content) != entry['size'] or len(content) > 33554432:
        raise ValueError('Incomplete or oversized ZIP member')
    if binascii.crc32(content) & 0xffffffff != entry['crc']:
        raise ValueError('ZIP member CRC mismatch')
    return content


def audit(content):
    rows = list(csv.DictReader(io.StringIO(content.decode('utf-8-sig'))))
    if len({(r['id'], r['date']) for r in rows}) != len(rows):
        raise ValueError('Duplicate participant/date')
    tired = collections.Counter(r['TIRED'] for r in rows)
    if any(value not in ('', '0.0', '1.0') for value in tired):
        raise ValueError('Review changed tiredness encoding')
    known = lambda key: sum(r[key] not in ('', 'nan', 'NaN') for r in rows)
    return {'participantDayRows': len(rows), 'participants': len({r['id'] for r in rows}),
            'tiredLabelsKnown': tired['0.0']+tired['1.0'], 'tiredSelected': tired['1.0'],
            'tiredNotSelected': tired['0.0'], 'tiredUnknown': tired[''],
            'signalKnownRows': {key: known(key) for key in ['rmssd', 'resting_hr', 'nightly_temperature', 'sleep_duration', 'minutesAsleep', 'steps']}}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=pathlib.Path, required=True)
    parser.add_argument('--audit', type=pathlib.Path, required=True)
    args = parser.parse_args()
    meta_raw = get(RECORD)
    meta = json.loads(meta_raw)
    if meta['metadata'].get('access_right') != 'open' or meta['metadata'].get('license', {}).get('id') != 'cc-by-4.0':
        raise ValueError('Review changed access or license')
    file = next(f for f in meta['files'] if f['key'] == 'rais_anonymized.zip')
    url = file['links']['self']
    tail = get(url, '-131072')
    entries = read_directory(tail, file['size'])
    matches = [e for e in entries if e['name'].endswith(SUFFIX)]
    if len(matches) != 1:
        raise ValueError('Expected one original daily CSV')
    entry = matches[0]
    if entry['compressed'] > 8380000 or entry['size'] > 33554432:
        raise ValueError('Review changed file size')
    following = [e['offset'] for e in entries if e['offset'] > entry['offset']]
    stop = min(following)-1
    member = get(url, str(entry['offset'])+'-'+str(stop))
    content = decode_member(member, entry)
    args.cache.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(args.cache, 0o700)
    for name, body in [('daily.csv', content), ('record.json', meta_raw), ('.gitignore', b'*\n')]:
        path = args.cache/name
        path.write_bytes(body)
        os.chmod(path, 0o600)
    report = {'source': 'LifeSnaps official Zenodo release v4', 'url': 'https://zenodo.org/records/7229547',
              'license': 'CC BY 4.0', 'accountRequired': False, 'paymentRequired': False,
              'member': entry['name'], 'memberCrcVerified': True,
              'csvSha256': hashlib.sha256(content).hexdigest(),
              'sourceArchiveMd5': file['checksum'], 'wholeArchiveMd5Verified': False,
              **audit(content), 'endometriosisValidated': False,
              'limitations': ['Tired is an aggregated EMA mood selection, not a clinical fatigue severity score.',
                              'No verified menstrual-cycle, endometriosis or pelvic-pain targets.',
                              'Label and feature timing, units and missingness must be reviewed before forecasting.',
                              'No model was trained or wearable benefit established in this acquisition step.']}
    args.audit.write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report, indent=2))
