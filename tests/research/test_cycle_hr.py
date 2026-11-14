import datetime as dt
import pathlib
import sys
import tempfile
import unittest

import numpy as np
from scipy.io import savemat

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / 'research'))
from evaluate_cycle_hr import prepare, metrics


class CycleHRTests(unittest.TestCase):
    def source(self, path, future_change=False, mismatch=False):
        n = 220
        hr = 60 + np.sin(np.arange(n)/5)
        if future_change:
            hr[170:] = 120
        state = np.ones(n, dtype=np.uint8)
        for start in range(10, n, 28):
            state[start:start+5] = 2
        values = {}
        for key, value in [('women_sleepmean', hr), ('Menstrual_state_cell', state),
                           ('women_sleepmeandate', np.array([(dt.date(2025, 1, 1)+dt.timedelta(days=i)).strftime('%d-%b-%Y') for i in range(n-int(mismatch))], dtype=object))]:
            cell = np.empty((1, 1), dtype=object)
            cell[0, 0] = value
            # Use two participants so scipy does not squeeze the participant dimension away.
            values[key] = np.vstack([cell, cell])
        savemat(path, values)

    def test_future_hr_cannot_change_earlier_features(self):
        with tempfile.TemporaryDirectory() as tmp:
            a, b = pathlib.Path(tmp)/'a.mat', pathlib.Path(tmp)/'b.mat'
            self.source(a)
            self.source(b, future_change=True)
            before, _ = prepare(a)
            after, _ = prepare(b)
            self.assertGreater(len(before[0]), 0)
            for x, y in zip(before[0], after[0]):
                if x['date'] < '2025-06-20':
                    np.testing.assert_allclose(x['x'], y['x'], equal_nan=True)
                    self.assertEqual(x['y'], y['y'])

    def test_alignment_mismatch_is_excluded(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = pathlib.Path(tmp)/'a.mat'
            self.source(path, mismatch=True)
            people, audit = prepare(path)
            self.assertEqual(people, [])
            self.assertEqual(audit['excludedLengthMismatch'], 2)

    def test_reports_observed_band_rates_without_claiming_calibration(self):
        result = metrics([0, 1, 1], [.1, .4, .8])
        self.assertEqual([b['observedRate'] for b in result['bands']], [0, 1, 1])


if __name__ == '__main__':
    unittest.main()
