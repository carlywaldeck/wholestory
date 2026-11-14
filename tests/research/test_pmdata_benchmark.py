import importlib.util
import pathlib
import unittest

path=pathlib.Path(__file__).resolve().parents[2]/"research/pmdata_benchmark.py"
spec=importlib.util.spec_from_file_location("pmdata_benchmark",path)
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
class BenchmarkTests(unittest.TestCase):
 def test_lagged_features_exclude_target_values_and_missing_calendar_days(self):
  rows=[{"date":"2026-01-01","fatigue":2,"reportedAt":"2026-01-01T09:00:00Z","sleepHours":7,"restingHR":60},{"date":"2026-01-02","fatigue":5,"reportedAt":"2026-01-02T09:00:00Z","sleepHours":1,"restingHR":99},{"date":"2026-01-04","fatigue":1,"reportedAt":"2026-01-04T09:00:00Z","sleepHours":9,"restingHR":45}]
  result=p.lagged(rows);self.assertEqual(len(result),1);self.assertEqual(result[0]["x"],[2,7,60]);self.assertEqual(result[0]["y"],5)
 def test_late_journal_label_is_not_a_previous_day_feature(self):
  rows=[{"date":"2026-01-01","fatigue":2,"reportedAt":"2026-01-02T01:00:00Z","sleepHours":7,"restingHR":60},{"date":"2026-01-02","fatigue":3,"reportedAt":"2026-01-02T09:00:00Z","sleepHours":7,"restingHR":60}]
  self.assertEqual(p.lagged(rows),[])
 def test_error_metrics(self):
  self.assertEqual(p.metrics([(1,2),(3,2)]),{"n":2,"mae":1,"rmse":1})
 def test_fit_does_not_mutate_and_clips_to_source_scale(self):
  rows=[{"x":[2,7,None],"y":2},{"x":[4,5,65],"y":4}];before=repr(rows)
  pred=p.fit_ridge(rows,[0,1,2]);self.assertGreaterEqual(pred([1,None,None]),1);self.assertLessEqual(pred([5,24,200]),5);self.assertEqual(before,repr(rows))
 def test_report_does_not_promote_proxy_to_endometriosis_validation(self):
  r=p.benchmark([]);self.assertFalse(r["endometriosisValidated"]);self.assertFalse(r["appForecastEnabled"])
if __name__=="__main__":unittest.main()
