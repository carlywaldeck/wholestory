import importlib.util
import pathlib
import unittest

path=pathlib.Path(__file__).resolve().parents[2]/"research/evaluate_bad_days.py"
spec=importlib.util.spec_from_file_location("evaluation",path)
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)

class EvaluationTests(unittest.TestCase):
    def test_synthetic_requires_explicit_mode(self):
        with self.assertRaises(ValueError):e.evaluate(e.synthetic_fixture())
    def test_missing_is_not_negative_and_duplicate_dates_fail(self):
        payload=e.synthetic_fixture();payload["records"][4]["impact"]=None
        rows,excluded=e.examples(e.validate(payload,True),"impact")
        self.assertEqual(excluded["unknown_outcome"],1)
        payload["records"].append(payload["records"][0])
        with self.assertRaises(ValueError):e.validate(payload,True)
    def test_late_features_stay_unknown(self):
        r={"pain":8,"sleepHours":6,"steps":2000,"journalAvailableAt":"2025-01-03T01:00:00Z","wearableAvailableAt":"2025-01-02T01:00:00Z"}
        self.assertEqual(e.features(r,"2025-01-03"),[None,6,2000])
    def test_future_target_measurements_do_not_change_prior_features(self):
        p=e.synthetic_fixture();a,_=e.examples(e.validate(p,True),"impact")
        p["records"][-1]["pain"]=10;p["records"][-1]["steps"]=140000
        b,_=e.examples(e.validate(p,True),"impact")
        self.assertEqual(a[-1]["x"],b[-1]["x"])
    def test_metrics_ties_and_undefined_denominators(self):
        m=e.metrics([(0,.5),(1,.5)])
        self.assertEqual(m["auroc"],.5);self.assertEqual(m["averagePrecision"],.5);self.assertEqual(m["brier"],.25)
        self.assertIsNone(e.metrics([(0,.1)])["sensitivity"])
    def test_pipeline_never_claims_clinical_validation(self):
        r=e.evaluate(e.synthetic_fixture(),allow_synthetic=True)
        self.assertEqual(r["status"],"engineering-demo-only")
        self.assertFalse(r["clinicallyValidated"]);self.assertFalse(r["appForecastEnabled"])
        self.assertGreater(r["results"]["historical_rate"]["evaluatedDays"],0)
    def test_training_preprocessing_does_not_mutate_input(self):
        p=e.synthetic_fixture();before=repr(p)
        e.evaluate(p,allow_synthetic=True)
        self.assertEqual(before,repr(p))

if __name__=="__main__":unittest.main()
