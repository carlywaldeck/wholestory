import copy, unittest
from evaluate_mpis_feature_candidate import examples
from mpis_symptom_benchmark import SYMPTOMS

def row(date,pain,answered=True):
 return {'participant':'fictional-a','date':date,'pain':pain,'symptoms':{s:0 for s in SYMPTOMS} if answered else None}
class TemporalFeatureTests(unittest.TestCase):
 def test_future_outcomes_cannot_rewrite_earlier_inputs(self):
  rows=[row('2026-01-01',0),row('2026-01-02',3),row('2026-01-03',0)]
  before=examples(rows,'any_pain')[0]
  changed=copy.deepcopy(rows);changed[1]['pain']=10;changed[2]['pain']=10
  after=examples(changed,'any_pain')[0]
  self.assertEqual(before['x'],after['x']);self.assertEqual(before['date'],'2026-01-02')
 def test_missing_calendar_day_is_not_yesterday(self):
  self.assertEqual(examples([row('2026-01-01',1),row('2026-01-03',3)],'any_pain'),[])
 def test_missing_checklist_is_unknown_not_absence(self):
  self.assertEqual(examples([row('2026-01-01',1,False),row('2026-01-02',3)],'bloating'),[])
 def test_people_are_never_joined_into_a_history(self):
  a=row('2026-01-01',1);b=row('2026-01-02',3);b['participant']='fictional-b'
  self.assertEqual(examples([a,b],'any_pain'),[])
if __name__=='__main__':unittest.main()
