import pathlib
import sys
import unittest
import numpy as np
from scipy.special import expit

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / 'research'))
from evaluate_personal_adaptation import adapt


class PersonalAdaptationTests(unittest.TestCase):
    def test_personal_history_adapts_a_prior_without_mutating_it(self):
        prior = np.zeros(2)
        x = np.c_[np.ones(100), np.tile([-1, 1], 50)]
        y = np.tile([0, 1], 50)
        w = adapt(x, y, prior)
        self.assertGreater(expit(np.array([1, 1]) @ w), .6)
        self.assertLess(expit(np.array([1, -1]) @ w), .4)
        np.testing.assert_array_equal(prior, np.zeros(2))

    def test_stronger_shrinkage_stays_closer_to_population(self):
        x = np.ones((30, 1))
        prior = np.zeros(1)
        weak = adapt(x, np.ones(30), prior, strength=1)
        strong = adapt(x, np.ones(30), prior, strength=100)
        self.assertLess(abs(strong[0]), abs(weak[0]))
