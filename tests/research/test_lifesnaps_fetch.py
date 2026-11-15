import binascii
import csv
import io
import pathlib
import sys
import unittest
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]/'research'))
from fetch_lifesnaps_daily import audit, decode_member, read_directory


class LifeSnapsFetch(unittest.TestCase):
    def test_original_zip_directory_and_crc_are_checked(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('fixture/daily_fitbit_sema_df_unprocessed.csv', 'synthetic fixture')
        raw = buffer.getvalue()
        entry = read_directory(raw, len(raw))[0]
        self.assertEqual(decode_member(raw, entry), b'synthetic fixture')
        entry['crc'] = binascii.crc32(b'different') & 0xffffffff
        with self.assertRaisesRegex(ValueError, 'CRC'): decode_member(raw, entry)

    def test_unknown_tiredness_is_not_absence_and_duplicates_fail(self):
        keys = ['id', 'date', 'TIRED', 'rmssd', 'resting_hr', 'nightly_temperature', 'sleep_duration', 'minutesAsleep', 'steps']
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(keys)
        writer.writerow(['synthetic', '2026-01-01', '', *['']*6])
        writer.writerow(['synthetic', '2026-01-02', '0.0', *['']*6])
        result = audit(buffer.getvalue().encode())
        self.assertEqual(result['tiredUnknown'], 1)
        self.assertEqual(result['tiredNotSelected'], 1)
        writer.writerow(['synthetic', '2026-01-02', '1.0', *['']*6])
        with self.assertRaisesRegex(ValueError, 'Duplicate'): audit(buffer.getvalue().encode())
