import csv
import hashlib
import io
import pathlib
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / 'research'))
from prepare_endolist import collapse, column_spec, prepare, severity


class EndolistPreparation(unittest.TestCase):
    def test_missing_selected_items_do_not_prove_absence(self):
        self.assertIsNone(collapse([], 0))
        self.assertIsNone(collapse([None, 0], 0))
        self.assertIs(collapse([None, .25], 0), True)
        self.assertIs(collapse([0, 0], 0), False)

    def test_burden_threshold_is_not_any_symptom_presence(self):
        self.assertIs(collapse([.25], .5), False)
        self.assertIs(collapse([.5], .5), True)
        self.assertIsNone(collapse([.25, None], .5))

    def test_scale_direction_and_composites_are_not_silently_changed(self):
        self.assertEqual(column_spec('Fatigue (0-no fatigue, 10-worst fatigue)', 'fatigue'), 10)
        self.assertIsNone(column_spec('Energy (0-no energy, 4-most energy)', 'fatigue'))
        self.assertIsNone(column_spec('Nausea / vomiting (0-no nausea / vomit, 10-worst vomiting)', 'nausea'))
        self.assertEqual(severity('2', 4), severity('5', 10))
        self.assertIsNone(severity('', 4))
        with self.assertRaises(ValueError): severity('5', 4)

    def fixture(self, path, corrupt=False):
        prefix = 'fixture/'
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(['User id', 'Day in study', 'First day of period', 'Cycle day', 'Fatigue (0-no fatigue, 4-worst fatigue)'])
        writer.writerow(['999', '1', '1', '999', '0'])
        writer.writerow(['999', '2', '', '999', '2'])
        files = {'LICENSE.txt': b'Synthetic test fixture, not participant records', 'User999.csv': buffer.getvalue().encode()}
        hashes = '\n'.join(hashlib.sha256(v).hexdigest()+' '+k for k, v in files.items())
        if corrupt: files['User999.csv'] += b'bad'
        with zipfile.ZipFile(path, 'w') as archive:
            for name, value in files.items(): archive.writestr(prefix+name, value)
            archive.writestr(prefix+'SHA256SUMS.txt', hashes)

    def test_checksum_and_recorded_period_flags_are_used_without_inferred_phases(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory)/'fixture.zip'
            self.fixture(path)
            result = prepare(path)
            self.assertEqual(result['participants'], 1)
            patient = result['people'][0]['input']
            self.assertEqual(len(patient['cycle']['periodStarts']), 1)
            self.assertEqual(patient['cycle']['periodStarts'][0]['date'], '2020-01-01')
            self.assertEqual(patient['days'][1]['symptoms']['fatigue'], True)
            self.assertIsNone(patient['days'][1]['symptoms']['dailyLifeImpact'])
            self.assertNotIn('cycleDay', patient['days'][1])
            self.fixture(path, corrupt=True)
            with self.assertRaisesRegex(ValueError, 'checksum'): prepare(path)
