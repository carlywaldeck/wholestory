import importlib.util
import pathlib
import sys
import unittest
root=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(root/'research'))
spec=importlib.util.spec_from_file_location('mpis',root/'research/mpis_symptom_benchmark.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def row(day,pain=2,imputed='False',checklist=''):
 return {'imputed':imputed,'unique_id':'p','measurement_date':day+' 00:00:00','pain':str(pain),'survey1_question2_response':str(pain),'survey1_question4_response':checklist}
class MPIS(unittest.TestCase):
 def test_unanswered_checklists_stay_unknown(self):
  self.assertIsNone(m.parse_checklist(''))
  self.assertEqual(m.parse_checklist('["Cramps / Krämpfe"]')['cramps'],1)
  self.assertEqual(m.parse_checklist('["Cramps / Krämpfe"]')['bloating'],0)
 def test_imputed_rows_and_unverified_targets_are_excluded(self):
  bad=row('2026-01-03');bad['pain']='9'
  rows,excluded=m.observed_rows([row('2026-01-01'),row('2026-01-02',8,'True'),bad])
  self.assertEqual(len(rows),1);self.assertEqual(excluded,{'imputed_rows':1,'invalid_or_unverified_pain':1})
 def test_only_consecutive_observed_targets_enter(self):
  rows,_=m.observed_rows([row('2026-01-01'),row('2026-01-02',8,'True'),row('2026-01-03')]);self.assertEqual(m.lagged_rows(rows),[])
 def test_target_day_values_cannot_enter_features(self):
  a,_=m.observed_rows([row('2026-01-01',2),row('2026-01-02',9,checklist='Cramps / Krämpfe')]);r=m.lagged_rows(a)[0]
  self.assertEqual(r['x'][0],2);self.assertTrue(all(v is None for v in r['x'][3:]));self.assertEqual(r['pain'],9);self.assertEqual(r['featureDate'],'2026-01-01')
 def test_single_person_is_not_used_to_train_and_test_itself(self):
  r=m.benchmark([row('2026-01-01'),row('2026-01-02')]);self.assertEqual(r['painSeverity'],{});self.assertFalse(r['clinicalValidation']);self.assertFalse(r['appForecastEnabled']);self.assertEqual(r['symptoms'][0]['evaluatedTargets'],0)
 def test_duplicate_observed_days_fail(self):
  with self.assertRaises(ValueError):m.observed_rows([row('2026-01-01'),row('2026-01-01')])
 def test_risk_alert_counts_match_outcomes_and_empty_is_unknown(self):
  r=m.symptom_metrics([(1,.8),(0,.7),(1,.2),(0,.1)])
  for key in ['truePositives','falsePositives','falseNegatives','trueNegatives']:self.assertEqual(r[key],1)
  self.assertEqual(r['accuracy'],.5);self.assertEqual(r['missedSymptomDays'],1)
  self.assertIsNone(m.symptom_metrics([])['accuracy'])
if __name__=='__main__':unittest.main()
