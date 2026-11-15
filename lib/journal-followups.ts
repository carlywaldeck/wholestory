import {spokenQuestion} from "./conversation-voice-config";
import type {Fact} from "./model";
import {QUESTION_BANK,QUESTION_BANK_VERSION,QUESTION_ORDER,QUESTION_LIMIT} from "./journal-question-policy";
export type QuestionId=keyof typeof QUESTION_BANK;
export type FollowupQuestion={id:string;type:QuestionId;version:string;text:string;spokenText:string;kind:Fact["kind"];symptom?:string;tier:number;field:string;options:readonly string[];optional:true;sensitive:boolean;answerFormat:"choice-or-text";eligible:string;exclude:string};
export type FollowupTurn={question:FollowupQuestion;answer:string;skipped?:boolean;status?:"answered"|"skipped"|"declined"|"not-applicable"|"unknown"};
export type JournalContext={selected?:string[];symptomFree?:boolean;absent?:string[]};
const patterns:[string,RegExp][]=[["Pelvic pain / cramps",/\b(?:cramps?|pelvic pain|pain|ache)\b/i],["Fatigue",/\b(?:fatigue|tired|exhausted)\b/i],["Bloating",/\b(?:bloating|bloated)\b/i],["Bowel symptoms",/\b(?:bowel|constipation|diarrhea)\b/i],["Headache",/\bheadache\b/i]];
function reported(text:string,pattern:RegExp){return text.split(/[.!?;\n]|\bbut\b/i).some(clause=>{const match=clause.match(pattern);return !!match&&!/\b(?:no|without|not having|did not have|not experiencing)\s+(?:any\s+)?$/i.test(clause.slice(0,match.index))&&!/^\s*(?:was |were |is |are )?(?:absent|not present)/i.test(clause.slice((match.index??0)+match[0].length));});}
export function nextJournalQuestion(original:string,turns:FollowupTurn[],context:JournalContext={}):FollowupQuestion|null{
 if(turns.length>=QUESTION_LIMIT)return null;
 const answered=(type:QuestionId,symptom?:string)=>turns.some(t=>t.question.type===type&&(!symptom||t.question.symptom===symptom||!t.question.symptom));
 const resolution=turns.find(t=>t.question.type==="clarify"&&t.status!=="skipped");
 const free=context.symptomFree||/\bno symptoms(?: today)?\b|symptom.free|nothing to report/i.test(original);
 const symptoms=[...new Set([...(context.selected??[]),...patterns.filter(([,p])=>reported(original,p)).map(([label])=>label)])].filter(label=>!(context.absent??[]).includes(label));
 const q=(type:QuestionId,symptom?:string):FollowupQuestion=>({...QUESTION_BANK[type],id:type+(symptom?":"+symptom:""),type,version:QUESTION_BANK_VERSION,symptom,spokenText:spokenQuestion(type,symptom),text:QUESTION_BANK[type].text.replace("{symptom}",symptom?.toLowerCase()??"symptom"),optional:true,answerFormat:"choice-or-text",sensitive:type==="bowel"});
 if(free&&symptoms.length&&!resolution&&!answered("clarify"))return q("clarify");
 if(resolution?.answer==="Not sure"||resolution?.answer==="No symptoms today"||free&&!symptoms.length)return null;
 if(!symptoms.length)return null;
 const bothersome=original.split(/[.!?\n]/).find(clause=>/most bothersome|worst|bothers me most/i.test(clause))??"";
 symptoms.sort((a,b)=>Number(patterns.find(([l])=>l===b)?.[1].test(bothersome)??false)-Number(patterns.find(([l])=>l===a)?.[1].test(bothersome)??false));
 const text=[original,...turns.filter(t=>!t.skipped&&t.status!=="declined"&&t.status!=="not-applicable").map(t=>t.answer)].join(" ");
 const severity=/\b(mild|moderate|severe|\d+\s*(?:\/\s*10|out of\s*10))\b/i;
 const duration=/\b(?:\d+|one|two|three|several|a few)\s*(?:minutes?|hours?|days?)\b|all day|on and off|still happening/i;
 const impact=/missed|class|slowed|couldn.t do|could not do|no change|no impact|usual activities|interrupted|cancelled/i.test(text)||answered("impact");
 const tried=/\b(?:heat|rest|ibuprofen|naproxen|paracetamol|acetaminophen|tried|took|stretch|medicine|medication)\b/i.test(text)||turns.some(t=>t.question.type==="help"&&t.answer&&!/nothing tried|prefer not|not applicable/i.test(t.answer));
 const response=/helped|relief|no relief|no benefit|not at all|a little|somewhat|a lot|no difference|didn.t help/i.test(text)||answered("response");
 const known=(pattern:RegExp,symptom:string)=>{if(symptoms.length===1)return pattern.test(original);const p=patterns.find(([l])=>l===symptom)?.[1];return original.split(/[.!?;\n]|,\s*|\s+and\s+/).some(c=>p?.test(c)&&pattern.test(c));};
 const candidates:FollowupQuestion[]=[];
 for(const symptom of symptoms){if(!known(severity,symptom)&&!answered("severity",symptom))candidates.push(q("severity",symptom));if(!known(duration,symptom)&&!answered("duration",symptom))candidates.push(q("duration",symptom));}
 if(!impact)candidates.push(q("impact"));
 // Do not extend a complete daily description into an intake questionnaire.
 const complete=symptoms.every(s=>known(severity,s)||answered("severity",s))&&symptoms.every(s=>known(duration,s)||answered("duration",s))&&impact&&tried&&response;
 if(!complete&&symptoms.includes("Pelvic pain / cramps")&&!/pelvic|abdomen|abdominal|back|left|right|belly|stomach|groin/i.test(text)&&!answered("location"))candidates.push(q("location"));
 if(symptoms.includes("Bowel symptoms")&&!/constipat|diarrhea|pain with bowel movements/i.test(text)&&!answered("bowel"))candidates.push(q("bowel"));
 if(tried&&!response&&!answered("response")&&!/nothing tried/i.test(text))candidates.push(q("response"));
 if(!tried&&!answered("help"))candidates.push(q("help"));
 const most= bothersome?symbolsMost():null;
 function symbolsMost(){return symptoms.find(s=>patterns.find(([l])=>l===s)?.[1].test(bothersome))??null;}
 return candidates.sort((a,b)=>a.tier-b.tier||(most?Number(b.symptom===most)-Number(a.symptom===most):0)||(symptoms.length>1?Number(b.type==="impact")-Number(a.type==="impact"):0)||QUESTION_ORDER.indexOf(a.type)-QUESTION_ORDER.indexOf(b.type)||symptoms.indexOf(a.symptom??"")-symptoms.indexOf(b.symptom??""))[0]??null;
}
export function followupFact(turn:FollowupTurn):Fact|null{
 if(turn.skipped||turn.status&&turn.status!=="answered"||!turn.answer.trim()||/^(Not sure|Prefer not to answer|Not applicable)$/i.test(turn.answer)||turn.question.type==="clarify")return null;
 return {kind:turn.question.kind,value:(turn.question.symptom?turn.question.symptom+": ":"")+turn.answer,quote:turn.answer};
}
