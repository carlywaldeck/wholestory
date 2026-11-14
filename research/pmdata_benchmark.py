"""Free OSF API collector and real-data next-day fatigue benchmark.
No accounts, API keys, third-party ML service, or app risk predictions.
"""
import argparse
import collections
import concurrent.futures
import csv
import datetime as dt
import hashlib
import io
import json
import math
import pathlib
import statistics
import subprocess
import urllib.parse

ROOT="https://api.osf.io/v2/nodes/vx4bk/files/osfstorage/5e99d05ef135350590d5316d/"

def get(url,cache):
    host=urllib.parse.urlparse(url).hostname
    if host not in ("api.osf.io","osf.io","huggingface.co"):
        raise ValueError("Unexpected source host")
    path=cache/(hashlib.sha256(url.encode()).hexdigest()+".source")
    if path.exists():return path.read_bytes()
    raw=subprocess.check_output(["curl","--globoff","--fail","--silent","--show-error","--location","--max-time","15","--retry","1",url])
    path.write_bytes(raw)
    return raw

def listing(url,cache):
    result=[]
    while url:
        data=json.loads(get(url,cache));result.extend(data["data"]);url=data.get("links",{}).get("next")
    return result

def child(folder,name,cache):
    for item in listing(folder,cache):
        if item["attributes"]["name"]==name:return item
    raise ValueError("Missing source: "+name)

def folder(item):return item["relationships"]["files"]["links"]["related"]["href"]

def collect_person(item,cache):
    pid=item["attributes"]["name"]
    parent=folder(item)
    fitbit=folder(child(parent,"fitbit",cache));pmsys=folder(child(parent,"pmsys",cache))
    files=[child(pmsys,"wellness.csv",cache),child(fitbit,"sleep.json",cache)]
    quality={"invalidFatigueRows":0,"invalidRestingHRRows":0,"missingRestingHRFile":False}
    try:files.append(child(fitbit,"resting_heart_rate.json",cache))
    except ValueError:quality["missingRestingHRFile"]=True
    raw=[]
    for f in files:
        original=f["links"]["download"]
        original_cache=cache/(hashlib.sha256(original.encode()).hexdigest()+".source")
        expected=f["attributes"].get("extra",{}).get("hashes",{}).get("sha256")
        if original_cache.exists():content=original_cache.read_bytes()
        else:
            # Mirror is accepted only if byte-identical to the original repository hash.
            relative=f["attributes"]["materialized_path"].removeprefix("/pmdata/")
            mirror="https://huggingface.co/datasets/aai530-group6/pmdata/resolve/main/"+relative
            try:
                if not expected:raise ValueError("Original SHA-256 unavailable")
                content=get(mirror,cache)
                if hashlib.sha256(content).hexdigest()!=expected:raise ValueError("Mirror differs from original")
                original_cache.write_bytes(content)
            except Exception:
                content=get(original,cache)
        if expected and hashlib.sha256(content).hexdigest()!=expected:raise ValueError("Original source checksum mismatch")
        raw.append(content)
    wellness=list(csv.DictReader(io.StringIO(raw[0].decode("utf-8-sig"))))
    sleep=json.loads(raw[1]);hr=json.loads(raw[2]) if len(raw)>2 else []
    dates={};sources=[]
    for f,content in zip(files,raw):sources.append({"participant":pid,"file":f["attributes"]["name"],"url":f["links"]["download"],"sha256":hashlib.sha256(content).hexdigest()})
    for r in wellness:
        stamp=r["effective_time_frame"].strip().replace(" ","")
        day=dt.datetime.fromisoformat(stamp.replace("Z","+00:00")).date().isoformat()
        try:fatigue=float(r["fatigue"])
        except (ValueError,TypeError):quality["invalidFatigueRows"]+=1;continue
        if not math.isfinite(fatigue) or not 1<=fatigue<=5:quality["invalidFatigueRows"]+=1;continue
        if day not in dates or stamp>dates[day]["reportedAt"]:dates[day]={"participant":pid,"date":day,"fatigue":fatigue,"reportedAt":stamp,"sleepHours":None,"restingHR":None}
    sleeps={}
    for r in sleep:
        day=r["dateOfSleep"]
        minutes=r.get("minutesAsleep")
        if minutes is not None and 0<=minutes<=1440:sleeps[day]=max(sleeps.get(day,0),minutes/60)
    hearts={}
    for r in hr:
        # The original export stores dateTime and a value object with 'value'.
        value=r.get("value")
        if isinstance(value,dict):value=value.get("value")
        if value is None:continue
        value=float(value)
        if not math.isfinite(value) or not 20<=value<=220:quality["invalidRestingHRRows"]+=1;continue
        day=r["dateTime"][:10]
        if day in hearts:raise ValueError("Duplicate resting-HR date")
        hearts[day]=value
    for day,r in dates.items():r["sleepHours"]=sleeps.get(day);r["restingHR"]=hearts.get(day)
    return {"participant":pid,"records":list(dates.values()),"sources":sources,"quality":quality}

def lagged(records):
    by_date={r["date"]:r for r in records};examples=[]
    for current in sorted(records,key=lambda r:r["date"]):
        previous=(dt.date.fromisoformat(current["date"])-dt.timedelta(days=1)).isoformat()
        prior=by_date.get(previous)
        if prior is None:continue
        cutoff=dt.datetime.fromisoformat(current["date"]+"T00:00:00+00:00")
        if dt.datetime.fromisoformat(prior["reportedAt"].replace("Z","+00:00"))>cutoff:continue
        examples.append({"date":current["date"],"y":current["fatigue"],"x":[prior["fatigue"],prior["sleepHours"],prior["restingHR"]],"featureDate":previous})
    return examples

def fit_ridge(training,columns):
    medians=[];scales=[]
    for col in columns:
        values=[r["x"][col] for r in training if r["x"][col] is not None]
        medians.append(statistics.median(values) if values else 0)
        scales.append((statistics.pstdev(values) if len(values)>1 else 0) or 1)
    def transform(x):
        out=[1.0]
        for i,col in enumerate(columns):out.extend([0.0 if x[col] is None else (x[col]-medians[i])/scales[i],float(x[col] is None)])
        return out
    xs=[transform(r["x"]) for r in training];weights=[statistics.mean(r["y"] for r in training)]+[0.0]*(len(xs[0])-1)
    for _ in range(350):
        gradients=[0.0]*len(weights)
        for r,x in zip(training,xs):
            error=sum(a*b for a,b in zip(weights,x))-r["y"]
            for j,v in enumerate(x):gradients[j]+=2*error*v/len(training)
        weights=[w-.04*(g+(.2*w if j else 0)) for j,(w,g) in enumerate(zip(weights,gradients))]
    return lambda x:max(1,min(5,sum(a*b for a,b in zip(weights,transform(x)))))

def metrics(pairs):
    return {"n":len(pairs),"mae":statistics.mean(abs(y-p) for y,p in pairs),"rmse":math.sqrt(statistics.mean((y-p)**2 for y,p in pairs))} if pairs else {"n":0,"mae":None,"rmse":None}

def benchmark(people):
    pooled=collections.defaultdict(list);per_person=[];excluded=[]
    for person in people:
        rows=lagged(person["records"]);cut=int(len(rows)*.7)
        train,test=rows[:cut],rows[cut:]
        if len(train)<30 or len(test)<10:
            excluded.append({"participant":person["participant"],"reason":"fewer than 30 training or 10 held-out targets","eligibleDates":len(rows)});continue
        # Fixed chronological split; medians, scaling and coefficients use training only.
        # All models are compared on identical complete-wearable test rows.
        test=[r for r in test if r["x"][1] is not None and r["x"][2] is not None]
        if len(test)<10:
            excluded.append({"participant":person["participant"],"reason":"fewer than 10 held-out dates with both wearable features","eligibleDates":len(rows)});continue
        average=statistics.mean(r["y"] for r in train)
        journal=fit_ridge(train,[0]);sensors=fit_ridge(train,[1,2]);combined=fit_ridge(train,[0,1,2])
        results=collections.defaultdict(list)
        for r in test:
            estimates={"training_mean":average,"previous_fatigue":r["x"][0],"journal_only":journal(r["x"]),"wearable_only":sensors(r["x"]),"journal_and_wearable":combined(r["x"])}
            for name,pred in estimates.items():results[name].append((r["y"],pred));pooled[name].append((r["y"],pred))
        per_person.append({"participant":person["participant"],"trainingDates":len(train),"testDates":len(test),"lastTrainingTarget":train[-1]["date"],"firstTestTarget":test[0]["date"],"lastTestTarget":test[-1]["date"],"models":{k:metrics(v) for k,v in results.items()}})
    models={k:metrics(v) for k,v in pooled.items()}
    macro={k:statistics.mean(p["models"][k]["mae"] for p in per_person) for k in models} if per_person else {}
    return {"source":"PMData (Simula/OSF vx4bk)","dataKind":"real-world-observational","outcome":"Next-calendar-day reported fatigue score (source scale 1–5)","status":"external-domain-research-benchmark","endometriosisValidated":False,"appForecastEnabled":False,"participantsDownloaded":len(people),"participantsEvaluated":len(per_person),"heldOutDates":sum(p["testDates"] for p in per_person),"method":"Per-person first 70% chronological training; final 30% test; fixed ridge regression; same complete-wearable test dates for all models; no test tuning.","models":models,"macroParticipantMAE":macro,"perParticipant":per_person,"excludedParticipants":excluded,"limitations":["Participants are not an endometriosis cohort; fatigue is not pelvic pain or daily-life interference.","Retrospective export dates do not prove wearable measurements were available in real time.","Complete-wearable test dates can select a nonrepresentative subset; missing outcomes are not imputed.","No confidence intervals or external participant-held-out evaluation; small model differences are not established benefit.","No diagnosis, clinical validation, prospective symptom forecast, or proof of earlier diagnosis."]}

if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("--cache",type=pathlib.Path,required=True);parser.add_argument("--output",type=pathlib.Path,required=True);parser.add_argument("--participants",type=int,default=16);args=parser.parse_args()
    args.cache.mkdir(parents=True,exist_ok=True)
    people=[];errors=[];items=listing(ROOT,args.cache)[:args.participants]
    def load(item):
        try:return collect_person(item,args.cache)
        except Exception as err:return {"participant":item["attributes"]["name"],"error":str(err)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for value in pool.map(load,items):
            if "error" in value:errors.append(value)
            else:people.append(value)
    report=benchmark(people);report["downloadFailures"]=errors;report["qualityByParticipant"]=[{"participant":p["participant"],**p["quality"]} for p in people];report["retrievedAt"]=dt.datetime.now(dt.timezone.utc).isoformat();report["sourceFiles"]=[s for p in people for s in p["sources"]]
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({"participants":report["participantsEvaluated"],"heldOutDates":report["heldOutDates"],"models":report["models"],"downloadFailures":errors},indent=2))
