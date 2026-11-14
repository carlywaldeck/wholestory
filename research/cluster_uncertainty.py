"""Participant-cluster bootstrap for paired, held-out probability forecasts.
Resample complete people, not dependent daily rows. Aggregate-only output.
Exploratory intervals do not replace independent/prospective validation.
"""
import math
import random


def percentile(values, q):
    if not values:
        return None
    values=sorted(values); index=(len(values)-1)*q; lo=math.floor(index); hi=math.ceil(index)
    return values[lo]+(values[hi]-values[lo])*(index-lo)


def paired_cluster_intervals(clusters, replicates=2000, seed=14112026):
    """clusters: list of complete participant lists of (label, risk, baseline)."""
    if replicates < 100:
        raise ValueError('Use at least 100 bootstrap replicates.')
    groups=[]
    for rows in clusters:
        if not rows:
            continue
        stats=[0,0,0,0,0.0,0.0]
        for y,p,b in rows:
            if y not in (0,1) or not all(math.isfinite(v) and 0<=v<=1 for v in (p,b)):
                raise ValueError('Expected binary outcomes and finite probabilities.')
            tp=int(y==1 and p>=.5);fp=int(y==0 and p>=.5);fn=int(y==1 and p<.5)
            for j,v in enumerate((tp,fp,fn,1-tp-fp-fn,(p-y)**2,(b-y)**2)):
                stats[j]+=v
        groups.append(stats)
    def scores(stats):
        tp,fp,fn,tn,error,baseline_error=stats;n=tp+fp+fn+tn
        return {'brier':error/n,'brierDifferenceVsBaseline':(error-baseline_error)/n,
                'alertPrecision':tp/(tp+fp) if tp+fp else None,
                'symptomRecall':tp/(tp+fn) if tp+fn else None,
                'falseAlertsPer30EvaluatedDays':30*fp/n}
    if len(groups)<2:
        return {'participants':len(groups),'replicates':0,'intervals':None,'status':'insufficient-independent-participants'}
    pooled=scores([sum(g[j] for g in groups) for j in range(6)])
    rng=random.Random(seed);samples={key:[] for key in pooled}
    for _ in range(replicates):
        selected=[groups[rng.randrange(len(groups))] for _ in groups]
        values=scores([sum(g[j] for g in selected) for j in range(6)])
        for key,value in values.items():
            if value is not None:samples[key].append(value)
    return {'participants':len(groups),'replicates':replicates,'seed':seed,'confidenceLevel':.95,
            'method':'Percentile participant-cluster bootstrap; complete people sampled with replacement; fixed alert threshold 0.5.',
            'comparison':'Model Brier minus baseline Brier; negative favors model. Unadjusted exploratory intervals across multiple outcomes.',
            'intervals':{key:{'estimate':value,'lower':percentile(samples[key],.025),'upper':percentile(samples[key],.975),'definedReplicates':len(samples[key])} for key,value in pooled.items()}}
