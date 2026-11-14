import datetime as dt
import pathlib
import sys
import unittest
import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / 'research'))
from evaluate_hourly_warning import features
from evaluate_personal_wearable_gate import select_wearables
from evaluate_hourly_calibration import tier, tier_summary


class HourlyWarningTests(unittest.TestCase):
    def test_incomplete_and_future_hours_cannot_change_features(self):
        target = dt.datetime(2026, 1, 8, 15)
        records = [(target-dt.timedelta(hours=i), {'y': i % 2, 'bpm': 60., 'steps': 2.}) for i in range(200, -1, -1)]
        original, old = features(records, target)
        changed = [(t, {'y': 1, 'bpm': 200., 'steps': 9.}) if t >= target-dt.timedelta(hours=3) else (t, r) for t, r in records]
        result, new = features(changed, target)
        np.testing.assert_allclose(original, result, equal_nan=True)
        self.assertEqual(old, new)
        self.assertEqual(original[9], 60.)

    def test_no_prior_reports_remain_unknown(self):
        x, previous = features([], dt.datetime(2026, 1, 1, 15))
        self.assertIsNone(previous)
        self.assertIsNone(x[4])
        self.assertIsNone(x[9])
        self.assertEqual(x[12], 0)

    def test_gate_requires_support_and_earlier_improvement(self):
        y = np.array([0, 1]*10)
        self.assertTrue(select_wearables(y, np.ones(20)*.5, np.array([.1, .9]*10)))
        self.assertFalse(select_wearables(y, np.array([.1, .9]*10), np.ones(20)*.5))
        self.assertFalse(select_wearables(y[:4], np.ones(4)*.5, np.array([.1, .9]*2)))
        self.assertFalse(select_wearables(np.zeros(20), np.ones(20)*.5, np.zeros(20)))

    def test_fixed_relative_cutpoints_and_empty_tiers(self):
        self.assertEqual([tier(v, [.2, .4]) for v in [.1, .2, .3, .4, .9]], [0, 1, 1, 2, 2])
        result = tier_summary([[(1, .5, 2)]])
        self.assertEqual(result['bands'][0]['observedRate'], None)
        self.assertEqual(result['highMinusLowRateInterval'], [None, None])
