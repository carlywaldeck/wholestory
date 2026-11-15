import datetime as dt
import pathlib
import sys
import unittest

sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[2]/'research'))
from prepare_lifesnaps_benchmark import MOODS, prepare, tired_label

def fixture():
    result=[]
    for i in range(12):
        day=(dt.date(2026,1,1)+dt.timedelta(days=i)).isoformat()
        row={'id':'synthetic','date':day,'minutesAsleep':'420','resting_hr':'60',
             'rmssd':'40','nightly_temperature':'34','steps':'7000',**dict.fromkeys(MOODS,'0.0')}
        row['TIRED']='1.0' if i%3==0 else '0.0'
        row['NEUTRAL']='0.0' if i%3==0 else '1.0'
        result.append(row)
    return result

class LifeSnapsFeatures(unittest.TestCase):
    def test_nonresponse_and_all_zero_onehots_do_not_become_negative_labels(self):
        row=fixture()[0]
        row.update(dict.fromkeys(MOODS,''))
        self.assertIsNone(tired_label(row))
        row.update(dict.fromkeys(MOODS,'0.0'))
        self.assertIsNone(tired_label(row))
        row['NEUTRAL']='1.0'
        self.assertEqual(tired_label(row),0)

    def test_target_day_sensors_do_not_enter_features_and_sleep_units_are_minutes(self):
        rows=fixture()
        before=prepare(rows)['people'][0]['rows'][-1]
        rows[-1].update({'minutesAsleep':'1','resting_hr':'200','rmssd':'100','steps':'0'})
        after=prepare(rows)['people'][0]['rows'][-1]
        self.assertEqual(before['x'],after['x'])
        self.assertEqual(after['x'][4],7)
        self.assertEqual(after['x'][5],0)
        self.assertLess(after['featureDate'],after['date'])

    def test_nonconsecutive_and_unknown_prior_labels_are_excluded(self):
        rows=fixture()
        rows[4].update(dict.fromkeys(MOODS,''))
        result=prepare(rows)['people'][0]['rows']
        self.assertNotIn(rows[4]['date'],[r['date'] for r in result])
        self.assertNotIn(rows[5]['date'],[r['date'] for r in result])
        del rows[6]
        self.assertNotIn('2026-01-08',[r['date'] for r in prepare(rows)['people'][0]['rows']])

    def test_invalid_hrv_is_unknown_and_duplicate_dates_fail(self):
        rows=fixture();rows[-2]['rmssd']='0'
        result=prepare(rows)
        self.assertIsNone(result['people'][0]['rows'][-1]['x'][8])
        self.assertEqual(result['quality']['outOfRange:rmssd'],1)
        with self.assertRaisesRegex(ValueError,'Duplicate'):prepare(rows+[rows[0]])

    def test_temporal_features_use_actual_prior_dates_and_keep_zero_mad_unknown(self):
        rows=fixture()
        for i,row in enumerate(rows):row['rmssd']=str(40+i)
        before=prepare(rows,with_trends=True)['people'][0]['rows'][-1]
        self.assertEqual(len(before['x']),34)
        self.assertAlmostEqual(before['x'][23],1)
        self.assertIsNone(before['x'][16])
        self.assertEqual(before['x'][17],3)
        rows[-1].update({'rmssd':'499','steps':'150000','minutesAsleep':'1'})
        after=prepare(rows,with_trends=True)['people'][0]['rows'][-1]
        self.assertEqual(before['x'],after['x'])

    def test_default_features_and_targets_are_preserved_when_trends_are_added(self):
        plain=prepare(fixture())['people'][0]['rows']
        temporal=prepare(fixture(),with_trends=True)['people'][0]['rows']
        self.assertEqual([(r['date'],r['y'],r['x']) for r in plain],[(r['date'],r['y'],r['x'][:14]) for r in temporal])
