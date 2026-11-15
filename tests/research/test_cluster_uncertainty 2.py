import pathlib
import sys
import unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[2]/'research'))
from cluster_uncertainty import paired_cluster_intervals

class ClusterIntervals(unittest.TestCase):
    def test_identical_model_has_exactly_zero_paired_difference(self):
        r=paired_cluster_intervals([[(1,.8,.8),(0,.2,.2)],[(1,.6,.6),(0,.4,.4)]],replicates=200)
        d=r['intervals']['brierDifferenceVsBaseline']
        self.assertEqual(d['estimate'],0);self.assertEqual(d['lower'],0);self.assertEqual(d['upper'],0)
    def test_preserves_clusters_and_counts_undefined_recall(self):
        r=paired_cluster_intervals([[(0,.1,.9)]*20,[(1,.8,.2)]],replicates=200)
        self.assertEqual(r['participants'],2)
        self.assertLess(r['intervals']['symptomRecall']['definedReplicates'],200)
        self.assertLess(r['intervals']['brierDifferenceVsBaseline']['upper'],0)
    def test_is_reproducible_and_does_not_claim_independent_support(self):
        x=[[(1,.8,.5)],[(0,.2,.5)]]
        self.assertEqual(paired_cluster_intervals(x,200),paired_cluster_intervals(x,200))
        self.assertIsNone(paired_cluster_intervals([x[0]],200)['intervals'])
    def test_rejects_invalid_probabilities(self):
        with self.assertRaises(ValueError):paired_cluster_intervals([[(1,float('nan'),.5)]],200)
if __name__=='__main__':unittest.main()
