"""Observed-only, multi-symptom next-day research benchmark. Free Zenodo API.
No imputed targets, LLM-extracted labels, inferred phases or participant IDs as features.
"""
import argparse
import collections
import csv
import datetime as dt
import hashlib
import io
import json
import math
import pathlib
import statistics
import subprocess
from evaluate_bad_days import logistic_predict, metrics as binary_metrics
from cluster_uncertainty import paired_cluster_intervals

API="https://zenodo.org/api/records/21538147"
SYMPTOMS={"cramps":"Cramps / Krämpfe","bloating":"Bloated stomach / Aufgeblähter Bauch","fatigue_or_concentration":"Fatigue or concentration difficulties / Müdigkeit oder Konzentrationsschwierigkeiten","headache":"Headaches / Kopfschmerzen","lower_back_pain":"Back pain in the lower area / Rückenschmerzen im unteren Bereich","bowel_pain":"Painful bowel movements / Schmerzhaftes Stuhlentleeren","nausea_vomiting_or_diarrhea":"Nausea, vomiting or diarrhea / Übelkeit, Erbrechen oder Durchfall","urination_pain":"Painful urination / Schmerzhaftes Wasserlassen"}

def fetch_data(cache):
 cache.mkdir(parents=True,exist_ok=True)
 meta_path=cache/"record.json"
 if not meta_path.exists():subprocess.run(["curl","--fail","--silent","--show-error","--location","--max-time","25",API,"-o",str(meta_path)],check=True)
 meta=json.loads(meta_path.read_text())
 if meta["metadata"].get("access_right")!="open" or meta["metadata"].get("license",{}).get("id")!="cc-by-4.0":raise ValueError("Review changed access/license before proceeding")
 name="cleaned_studyu_data.csv";f=next(x for x in meta['files'] if x['key']==name);path=cache/name
 if not path.exists():subprocess.run(["curl","--fail","--silent","--show-error","--location","--max-time","25",f['links']['self'],"-o",str(path)],check=True)
 raw=path.read_bytes();expected=f.get('checksum')
 if expected and expected!="md5:"+hashlib.md5(raw).hexdigest():raise ValueError("Zenodo source checksum mismatch")
 return list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))),{"api":API,"url":"https://zenodo.org/records/21538147","doi":meta['doi'],"license":"CC BY 4.0","file":name,"sha256":hashlib.sha256(raw).hexdigest(),"checksum":expected}

def parse_checklist(raw):
 if not raw.strip():return None
 try:values=json.loads(raw)
 except ValueError:values=[raw]
 if isinstance(values,str):values=[values]
 if not isinstance(values,list) or not all(isinstance(v,str) for v in values):raise ValueError("Unexpected checklist encoding")
 return {key:int(text in values) for key,text in SYMPTOMS.items()}

def observed_rows(raw):
 result=[];seen=set();excluded=collections.Counter()
 for r in raw:
  if r['imputed'].lower()!='false':excluded['imputed_rows']+=1;continue
  try:
   value=float(r['survey1_question2_response'])
   if not 0<=value<=10 or not math.isfinite(value):raise ValueError()
   if float(r['pain'])!=value:raise ValueError()
   day=dt.date.fromisoformat(r['measurement_date'][:10]).isoformat()
  except (ValueError,TypeError):excluded['invalid_or_unverified_pain']+=1;continue
  key=(r['unique_id'],day)
  if key in seen:raise ValueError('Duplicate observed participant/date')
  seen.add(key)
  result.append({'participant':r['unique_id'],'date':day,'pain':value,'symptoms':parse_checklist(r['survey1_question4_response'])})
 return sorted(result,key=lambda r:(r['participant'],r['date'])),dict(excluded)

def lagged_rows(rows):
 by=collections.defaultdict(dict)
 for r in rows:by[r['participant']][r['date']]=r
 result=[]
 for pid,days in by.items():
  for day,r in sorted(days.items()):
   target_date=dt.date.fromisoformat(day);prior_day=(target_date-dt.timedelta(days=1)).isoformat();prior=days.get(prior_day)
   if not prior:continue
   history=[x['pain'] for date,x in days.items() if target_date-dt.timedelta(days=7)<=dt.date.fromisoformat(date)<target_date]
   features=[prior['pain'],statistics.mean(history),len(history)]+[None if prior['symptoms'] is None else prior['symptoms'][key] for key in SYMPTOMS]
   result.append({'participant':pid,'date':day,'featureDate':prior_day,'x':features,'pain':r['pain'],'symptoms':r['symptoms']})
 return result

def ridge(training):
 # Fixed code settings for an exploratory run; this is not a preregistered study.
 columns=[0,1,2]
 centers=[statistics.mean(r['x'][j] for r in training) for j in columns]
 scales=[statistics.pstdev(r['x'][j] for r in training) or 1 for j in columns]
 def trans(x):return [1]+[(x[j]-centers[i])/scales[i] for i,j in enumerate(columns)]
 xs=[trans(r['x']) for r in training];w=[statistics.mean(r['y'] for r in training),0,0,0]
 for _ in range(300):
  g=[0.0]*4
  for r,x in zip(training,xs):
   error=sum(a*b for a,b in zip(w,x))-r['y']
   for j,v in enumerate(x):g[j]+=2*error*v/len(training)
  w=[a-.04*(b+(.2*a if j else 0)) for j,(a,b) in enumerate(zip(w,g))]
 return lambda x:max(0,min(10,sum(a*b for a,b in zip(w,trans(x)))))

def regression_metrics(pairs):
 return {'n':len(pairs),'mae':statistics.mean(abs(y-p) for y,p in pairs),'rmse':math.sqrt(statistics.mean((y-p)**2 for y,p in pairs))} if pairs else {'n':0,'mae':None,'rmse':None}

def symptom_metrics(pairs):
 result=binary_metrics(pairs)
 n=len(pairs);tp=sum(y==1 and p>=.5 for y,p in pairs);fp=sum(y==0 and p>=.5 for y,p in pairs);fn=sum(y==1 and p<.5 for y,p in pairs);tn=n-tp-fp-fn
 result.update({'truePositives':tp,'falsePositives':fp,'falseNegatives':fn,'trueNegatives':tn,'accuracy':(tp+tn)/n if n else None,'majorityClassAccuracy':max(sum(y for y,_ in pairs),n-sum(y for y,_ in pairs))/n if n else None})
 result['missedSymptomDays']=result.pop('missedImpactOrHighPainDays', None)
 return result

def benchmark(raw):
 observed,excluded=observed_rows(raw);rows=lagged_rows(observed);participants=sorted(set(r['participant'] for r in rows));pain=collections.defaultdict(list);tasks={key:{'historical_rate':[],'previous_report':[],'transition_probability':[],'logistic':[]} for key in ['any_pain',*SYMPTOMS]};cluster_rows={key:collections.defaultdict(list) for key in tasks}; onset_rows={key:[] for key in tasks}; continuation_rows={key:[] for key in tasks}
 for held in participants:
  train=[dict(r,y=r['pain']) for r in rows if r['participant']!=held];test=[r for r in rows if r['participant']==held]
  if len(train)>=30:
   fit=ridge(train);mean=statistics.mean(r['y'] for r in train)
   for r in test:
    for name,pred in [('training_mean',mean),('previous_pain',r['x'][0]),('prior_7day_mean',r['x'][1]),('ridge',fit(r['x']))]:pain[name].append((r['pain'],pred))
  for target in tasks:
   def label(r):return int(r['pain']>0) if target=='any_pain' else None if r['symptoms'] is None else r['symptoms'][target]
   tr=[dict(r,y=label(r)) for r in train if label(r) is not None];te=[r for r in test if label(r) is not None]
   positives=sum(r['y'] for r in tr)
   if len(tr)<20 or positives<3 or len(tr)-positives<3:continue
   prevalence=(positives+1)/(len(tr)+2)
   for r in te:
    old=int(r['x'][0]>0) if target=='any_pain' else r['x'][3+list(SYMPTOMS).index(target)]
    conditional=[t for t in tr if (int(t['x'][0]>0) if target=='any_pain' else t['x'][3+list(SYMPTOMS).index(target)])==old] if old is not None else []
    transition=(sum(t['y'] for t in conditional)+4*prevalence)/(len(conditional)+4)
    predictions={'transition_probability':transition,'historical_rate':prevalence,'previous_report':prevalence if old is None else float(old),'logistic':logistic_predict(tr,r['x'],list(range(len(r['x']))))}
    for name,pred in predictions.items():tasks[target][name].append((label(r),pred))
    cluster_rows[target][held].append((label(r),predictions['transition_probability'],predictions['previous_report']))
    if old is not None:(continuation_rows if old else onset_rows)[target].append((label(r),predictions['transition_probability']))
 outcome=[]
 for target,models in tasks.items():
  pairs=models['logistic'];pos=sum(y for y,_ in pairs);eligible=[r for r in rows if target=='any_pain' or r['symptoms'] is not None];people=len(set(r['participant'] for r in eligible));eligible_positive=sum(int(r['pain']>0) if target=='any_pain' else r['symptoms'][target] for r in eligible)
  outcome.append({'symptom':target,'targetMeaning':'Any reported menstrual pain next day' if target=='any_pain' else 'Selected checklist symptom next day, conditional on an answered checklist','eligibleTargets':len(eligible),'eligiblePositiveTargets':eligible_positive,'excludedForTrainingSupport':len(eligible)-len(pairs),'evaluatedTargets':len(pairs),'positiveTargets':pos,'negativeTargets':len(pairs)-pos,'participantsWithTarget':people,'supportStatus':'exploratory-only' if pos>=20 and len(pairs)-pos>=20 and people>=10 else 'insufficient-for-stable-estimation','models':{name:symptom_metrics(v) for name,v in models.items()},'transitionVsPreviousReportUncertainty':paired_cluster_intervals(list(cluster_rows[target].values())),'onsetOpportunitiesAfterReportedAbsence':symptom_metrics(onset_rows[target]),'continuationOpportunitiesAfterReportedPresence':symptom_metrics(continuation_rows[target])})
 return {'source':'MPIS Study Data','dataKind':'real-self-reported-menstrual-symptoms','rawRows':len(raw),'observedRows':len(observed),'excluded':excluded,'participantsWithObservedRows':len(set(r['participant'] for r in observed)),'consecutiveObservedPairs':len(rows),'participantsWithPairs':len(participants),'severePainTargets':sum(r['pain']>=7 for r in rows),'painSeverity':{name:regression_metrics(v) for name,v in pain.items()},'symptoms':outcome,'method':'Leave-one-participant-out. Features from observed preceding calendar dates only; no current/future outcomes, imputed rows, inferred phases or LLM labels. Dates were changed by the source authors.','status':'exploratory-menstrual-symptom-research','clinicalValidation':False,'appForecastEnabled':False,'limitations':['Not a confirmed-endometriosis cohort; no wearable measurements are included.','Only 304 of 2160 released rows are directly observed; imputed rows are excluded entirely.','Checklists are available on a selected subset of observed days. Unanswered checklists are unknown; unselected entries within an answered checklist are coded not selected, not clinically confirmed absent.','The intervention trial and selective reporting limit applicability to natural symptom forecasting.','Only five severe-pain targets in paired observations; severe-flare performance cannot be established.','Participant-held-out evaluation is not prospective clinical validation. Source date shifting and unknown arrival times limit real-time interpretation.','Hyperparameters fixed for an exploratory run; participant-cluster bootstrap intervals are unadjusted exploratory estimates, not independent replication.']}

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--cache',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path,required=True);args=p.parse_args()
 raw,source=fetch_data(args.cache);result=benchmark(raw);result['provenance']=source;result['generatedAt']=dt.datetime.now(dt.timezone.utc).isoformat();args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({k:result[k] for k in ['observedRows','consecutiveObservedPairs','participantsWithPairs','painSeverity']},indent=2));print([(x['symptom'],x['evaluatedTargets'],x['positiveTargets'],x['supportStatus']) for x in result['symptoms']])
