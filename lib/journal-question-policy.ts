/** Provisional product priorities; not clinical scoring or validated weights. */
export const QUESTION_BANK_VERSION="elya-journal-2";
export const SELECTION_POLICY_VERSION="priority-tiers-1";
export const QUESTION_LIMIT=3;
export const QUESTION_ORDER=["clarify","severity","duration","impact","location","bowel","response","help"] as const;
export const QUESTION_BANK={
 clarify:{tier:1,field:"confirmation",kind:"Uncertainty",text:"You mentioned no symptoms and also a symptom. Which describes this entry?",options:["Symptoms present","No symptoms today","Not sure"],eligible:"Conflicting symptom-free statement and symptom report",exclude:"Already resolved"},
 severity:{tier:2,field:"severity",kind:"Severity",text:"How strong was the {symptom}?",options:["Mild","Moderate","Severe","Not sure"],eligible:"Reported symptom without intensity",exclude:"Known severity for this symptom"},
 duration:{tier:2,field:"duration",kind:"Timing",text:"How long did the {symptom} last?",options:["On and off","Still happening","Not sure"],eligible:"Reported symptom without duration",exclude:"Known duration for this symptom"},
 impact:{tier:2,field:"impact",kind:"Daily-life impact",text:"How did your symptoms affect your day?",options:["No change","Slowed me down","Missed activities","Couldn’t do usual activities","Prefer not to answer"],eligible:"Reported symptoms without daily impact",exclude:"Impact already described"},
 location:{tier:3,field:"location",kind:"Location",text:"Where did you feel the pain?",options:[],eligible:"Pain reported without location",exclude:"No pain or fully described entry"},
 bowel:{tier:3,field:"subtype",kind:"Bowel discomfort",text:"Which bowel symptoms did you notice?",options:["Constipation","Diarrhea","Pain with bowel movements","Other","Prefer not to answer"],eligible:"Unspecified bowel symptoms",exclude:"Subtype already provided"},
 response:{tier:3,field:"response",kind:"What helped",text:"How much did it help?",options:["Not at all","A little","Somewhat","A lot","Not sure"],eligible:"Something tried, effect missing",exclude:"Nothing tried or known effect"},
 help:{tier:4,field:"intervention",kind:"Intervention",text:"Did you try anything to help?",options:["Nothing tried","Prefer not to answer"],eligible:"Symptoms with no intervention recorded",exclude:"Intervention or explicit nothing tried"},
} as const;
