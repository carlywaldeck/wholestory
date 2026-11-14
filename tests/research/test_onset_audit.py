import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / 'research'))
from onset_audit import onset_rows


class OnsetAudit(unittest.TestCase):
    def row(self, prior_pain=0, pain=2, prior_check=None, current_check=None):
        return {'participant': 'p', 'x': [prior_pain, 0, 1] + [prior_check]*8,
                'pain': pain, 'symptoms': current_check}

    def test_pain_continuation_is_excluded_and_zero_is_explicit(self):
        rows = onset_rows([self.row(), self.row(prior_pain=2), self.row(pain=0)], 'any_pain')
        self.assertEqual([r['y'] for r in rows], [1, 0])

    def test_missing_checklists_are_never_absence(self):
        rows = [self.row(prior_check=None, current_check={'cramps': 1}),
                self.row(prior_check=0),
                self.row(prior_check=0, current_check={'cramps': 1}),
                self.row(prior_check=1, current_check={'cramps': 1})]
        self.assertEqual([r['y'] for r in onset_rows(rows, 'cramps')], [1])

    def test_features_are_not_modified_by_target(self):
        row = self.row()
        result = onset_rows([row], 'any_pain')[0]
        self.assertEqual(result['x'], row['x'])
        self.assertNotIn('y', row)
