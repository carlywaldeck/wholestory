import {describe,it,expect} from "vitest";
import {nextJournalQuestion,followupFact,type FollowupTurn} from "./journal-followups";
const turn=(text:string,answer:string,status:FollowupTurn["status"]="answered"):FollowupTurn=>({question:nextJournalQuestion(text,[])!,answer,status,skipped:status==="skipped"});
describe("provisional question eligibility",()=>{
 it("does not extend a fully described entry",()=>expect(nextJournalQuestion("Moderate cramps for two hours. Heat helped a lot. I missed class.",[])).toBeNull());
 it("asks severity instead of known duration or impact",()=>expect(nextJournalQuestion("I had cramps for two hours and missed class.",[])?.type).toBe("severity"));
 it("requires clarification before routine questions on contradiction",()=>expect(nextJournalQuestion("No symptoms today, but cramps for two hours",[])?.type).toBe("clarify"));
 it("respects explicit absence and has no prior-day inputs",()=>{expect(nextJournalQuestion("No symptoms today",[])).toBeNull();expect(nextJournalQuestion("",[])).toBeNull();});
 it("keeps skipped, declined and not applicable topics excluded",()=>{for(const status of ["skipped","declined","not-applicable"] as const){const t=turn("cramps","",status);expect(nextJournalQuestion("cramps",[t])?.id).not.toBe(t.question.id);expect(followupFact(t)).toBeNull();}});
 it("caps all symptoms together at three",()=>{let ts:FollowupTurn[]=[];for(let i=0;i<3;i++){const q=nextJournalQuestion("cramps and bloating",ts)!;ts.push({question:q,answer:"",skipped:true,status:"skipped"});}expect(nextJournalQuestion("cramps, bloating and fatigue",ts)).toBeNull();});
 it("recalculates eligibility after original entry edits",()=>{expect(nextJournalQuestion("cramps",[])?.type).toBe("severity");expect(nextJournalQuestion("Moderate cramps",[])?.type).toBe("duration");});
 it("uses selections when there is no extraction service and leaves unsupported prose unknown",()=>{expect(nextJournalQuestion("Something feels different",[])).toBeNull();expect(nextJournalQuestion("",[],{selected:["Fatigue"]})?.symptom).toBe("Fatigue");});
 it("does not convert unknown, declined or skipped to absence",()=>{expect(followupFact(turn("cramps","Not sure","unknown"))).toBeNull();const f=followupFact(turn("cramps","Moderate"));expect(f?.quote).toBe("Moderate");expect(f?.value).toContain("Pelvic pain");});
 it("does not accept forecast or wearable inputs",()=>expect(nextJournalQuestion("",[],{selected:[]})).toBeNull());
});

it("does not question an explicitly absent symptom",()=>{expect(nextJournalQuestion("I reported no fatigue.",[])).toBeNull();expect(nextJournalQuestion("Fatigue",[],{absent:["Fatigue"]})).toBeNull();});
