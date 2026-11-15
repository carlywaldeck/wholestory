"""Exploratory held-person-out lag-feature ablation. Not the production personal model.
Observed records only; no wearable features, generated dates, inferred cycle phase or imputed outcomes.
"""
import argparse, collections, datetime as dt, json, pathlib, statistics
from mpis_symptom_benchmark import fetch_data, observed_rows, SYMPTOMS, symptom_metrics
from evaluate_bad_days import logistic_predict
from cluster_uncertainty import paired_cluster_intervals

def examples(observed,target):
 by=collections.defaultdict(dict)
 for r in observed:by[r['participant']][r['date']]=r
 def label(r):return int(r['pain']>0) if target=='any_pain' else None if r['symptoms'] is None else r['symptoms'][target]
 out=[]
 for pid,days in by.items():
  for date,row in sorted(days.items()):
   day=dt.date.fromisoformat(date);previous=days.get((day-dt.timedelta(days=1)).isoformat());y=label(row)
   if not previous or y is None or label(previous) is None:continue
   rates=[];n=0
   for window in [3,7]:
    hist=[label(r) for t,r in days.items() if day-dt.timedelta(days=window)<=dt.date.fromisoformat(t)<day and label(r) is not None]
    rates.append(statistics.mean(hist) if hist else None);n=len(hist)
   baseline=[label(previous),*rates,n]
   extra=[previous['pain']]+[None if previous['symptoms'] is None else previous['symptoms'][k] for k in SYMPTOMS if k!=target]
   out.append({'participant':pid,'date':date,'y':y,'x':baseline+extra})
 return out

def evaluate(raw):
 observed,excluded=observed_rows(raw);results=[]
 for target in ['any_pain','fatigue_or_concentration','bloating']:
  rows=examples(observed,target);clusters=collections.defaultdict(list);base=[];candidate=[];onset_base=[];onset_candidate=[]
  for person in sorted(set(r['participant'] for r in rows)):
   train=[r for r in rows if r['participant']!=person];test=[r for r in rows if r['participant']==person]
   if len(train)<20 or min(sum(r['y'] for r in train),sum(not r['y'] for r in train))<3:continue
   # One fixed candidate, no parameter selection on held-out outcomes.
   for row in test:
    b=logistic_predict(train,row['x'],list(range(4)));c=logistic_predict(train,row['x'],list(range(len(row['x']))))
    base.append((row['y'],b));candidate.append((row['y'],c));clusters[person].append((row['y'],c,b))
    if row['x'][0]==0:onset_base.append((row['y'],b));onset_candidate.append((row['y'],c))
  uncertainty=paired_cluster_intervals(list(clusters.values()))
  results.append({'symptom':target,'baseline':symptom_metrics(base),'candidate':symptom_metrics(candidate),'afterReportedAbsence':{'baseline':symptom_metrics(onset_base),'candidate':symptom_metrics(onset_candidate)},'candidateVsBaseline':uncertainty,'promoteToProduction':False,'reason':'Exploratory population-model ablation with small selected samples; requires independent confirmation and evaluation of the actual personal learner.'})
 return {'observedRows':len(observed),'excluded':excluded,'candidate':'Add earlier cross-symptom reports to recent same-symptom history','tasks':results,'wearableEvidence':False,'clinicalValidation':False,'limitations':['LOPO trains on other people, including dates later than held-person dates; this is retrospective cross-person evaluation, not simulated live deployment.','Date-shifted intervention study; report receipt times unavailable.','Checklists are selectively answered; mixed fatigue/concentration label is not isolated fatigue.','These data do not justify changing an independently fitted personal learner or its risk thresholds.']}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--cache',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args();raw,source=fetch_data(a.cache);r=evaluate(raw);r['source']=source;a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
