"""Audit public candidate data without inventing chronology or calling it clinical evidence."""
import argparse, concurrent.futures, csv, hashlib, io, json, pathlib, subprocess
BASE='https://huggingface.co/datasets/haammar/fem-state'
API='https://huggingface.co/api/datasets/haammar/fem-state/tree/main?recursive=true'

def fetch(url,path):
 if not path.exists():subprocess.run(['curl','--fail','--silent','--show-error','--location','--max-time','30',url,'-o',str(path)],check=True)
 return path.read_bytes()

def inspect_csv(raw):
 rows=list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))));columns=list(rows[0]) if rows else []
 # Never assume adjacent CSV rows are consecutive days.
 dates=[c for c in columns if c.lower() in ('date','measurement_date','day_in_study','timestamp','study_day')]
 return {'rows':len(rows),'columns':columns,'timeColumns':dates,'sha256':hashlib.sha256(raw).hexdigest()}

def audit(cache):
 cache.mkdir(parents=True,exist_ok=True)
 tree=json.loads(fetch(API,cache/'tree.json'));readme=fetch(BASE+'/raw/main/README.md',cache/'README.md').decode()
 files=[r['path'] for r in tree if r['path'].startswith('data/') and r['path'].endswith('.csv')]
 def one(name):return dict(file=name,**inspect_csv(fetch(BASE+'/resolve/main/'+name,cache/pathlib.Path(name).name)))
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:reports=list(pool.map(one,files))
 return {'source':BASE,'candidate':'CycleBench / fem-state','files':len(reports),'rows':sum(r['rows'] for r in reports),'reports':reports,
 'declaredLicense':'openrail' if 'license: openrail' in readme else 'unknown','realPatientProvenanceVerified':False,
 'forecastEvaluationAllowed':False,'appTrainingAllowed':False,
 'reasons':['The inspected documentation does not establish study recruitment, original source provenance, consent or imputation procedures.','Time columns are absent in the inspected CSV files.' if reports and all(not r['timeColumns'] for r in reports) else 'Time semantics and arrival timestamps need review.','File grouping alone cannot establish a unique real participant or consecutive calendar dates.','The documented symptom scale 0–5 disagrees with the viewer showing values up to 6; units and coding need a codebook.'],
 'decision':'Quarantine from real-data validation. Do not infer dates, merge with EndoLIST, or claim wearable warning accuracy.'}

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--cache',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args();r=audit(a.cache);a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k!='reports'},indent=2))
