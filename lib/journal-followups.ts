import type {Fact} from "./model";
/** Local question selection, adapted from the supplied Endometriosis.org consultation guide, pp.3–6. Not diagnosis or clinical triage. */
export const followupQuestions={
 location:{id:"location",text:"Where do you feel the pain?",kind:"Location"},
 severity:{id:"severity",text:"How intense does the pain feel, in your own words?",kind:"Severity"},
 impact:{id:"impact",text:"What, if anything, did this change about your day?",kind:"Daily-life impact"},
 timing:{id:"timing",text:"When did this start, and how long has it lasted?",kind:"Timing"},
 relief:{id:"relief",text:"What have you tried for this, if anything?",kind:"Intervention"},
 outcome:{id:"outcome",text:"What changed after you tried that, if anything?",kind:"What helped"},
 cycle:{id:"cycle",text:"Did this happen during your period or at another time?",kind:"Menstrual context"},
 symptoms:{id:"symptoms",text:"What physical symptoms would you like to record?",kind:"Uncertainty"},
 priority:{id:"priority",text:"What would you most want your clinician to understand about this?",kind:"Uncertainty"},
} as const;
export type FollowupQuestion=typeof followupQuestions[keyof typeof followupQuestions];
export type FollowupTurn={question:FollowupQuestion;answer:string;skipped?:boolean};
export function nextJournalQuestion(original:string,turns:FollowupTurn[]):FollowupQuestion|null{
 if(turns.length>=3)return null;
 const asked=new Set(turns.map(t=>t.question.id));
 const text=[original,...turns.map(t=>t.answer)].join(" ").toLowerCase();
 if(/^(?:no symptoms|symptom.free|nothing to report)\b/i.test(original.trim()))return null;
 const has=(pattern:RegExp)=>pattern.test(text);
 const pain=has(/pain|cramp|ache|hurt|stabb|burning|throbb/)&&!has(/\b(?:no|without|not having|don.t have|do not have) (?:any )?(?:pain|cramps)\b/);
 const symptoms=pain||has(/fatigue|tired|bloat|bowel|constipat|diarrh|nausea|headache|bleed|urinar/);
 const tried=has(/ibuprofen|paracetamol|acetaminophen|naproxen|medicat|medicine|painkiller|heat|heating|rest|stretch|took|tried|used a/);
 const outcome=has(/help(?:ed|s)?|relie(?:f|ved)|no change|did(?:n.t| not) work|made.*worse|nothing changed|no difference|no benefit/);
 const candidates:FollowupQuestion[]=[];
 if(tried&&!outcome)candidates.push(followupQuestions.outcome);
 if(!symptoms)candidates.push(followupQuestions.symptoms);
 if(pain&&!has(/abdomen|abdominal|pelvi[sc]|lower back|left|right|belly|stomach|leg|thigh|rectal|groin/))candidates.push(followupQuestions.location);
 if(!has(/missed|cancel|work|school|class|walk|sleep|bed|exercise|interfer|couldn.t|could not|daily|no impact|usual activities/))candidates.push(followupQuestions.impact);
 if(pain&&!has(/\b(?:mild|moderate|severe|unbearable|intense|[0-9]+\s*(?:\/\s*10|out of\s*10))\b/))candidates.push(followupQuestions.severity);
 if(!has(/\b(?:\d+|one|two|three|several|a few)\s+(?:hours?|minutes?|days?|weeks?)\b|all day|morning|evening|afternoon|started|lasted|since/))candidates.push(followupQuestions.timing);
 if(symptoms&&!tried&&!has(/nothing tried|haven.t tried|didn.t try|not tried/))candidates.push(followupQuestions.relief);
 if(pain&&!has(/period|menstrua|cycle/))candidates.push(followupQuestions.cycle);
 const next=candidates.find(q=>!asked.has(q.id));
 if(next)return next;
 return turns.length===0?followupQuestions.priority:null;
}
export function followupFact(turn:FollowupTurn):Fact|null{
 const answer=turn.answer.trim();if(!answer||turn.skipped)return null;
 const value=turn.question.kind==="Severity"&&/^\d+$/.test(answer)?"Reported intensity: "+answer:answer;
 const uncertain=/\b(?:not sure|don.t know|do not know|can.t remember|cannot remember)\b/i.test(answer);
 return {kind:uncertain?"Uncertainty":turn.question.kind,value:value.slice(0,500),quote:answer};
}
