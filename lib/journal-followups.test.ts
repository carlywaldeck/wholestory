import {expect,it} from "vitest";
import {nextJournalQuestion,followupQuestions,followupFact,type FollowupTurn} from "./journal-followups";
it("branches on the patient's answer instead of reading a fixed list",()=>{
 const initial="I had pelvic cramps for two hours.";const first=nextJournalQuestion(initial,[])!;expect(first.id).toBe("impact");
 const turns:FollowupTurn[]=[{question:first,answer:"I missed work and took ibuprofen."}];expect(nextJournalQuestion(initial,turns)?.id).toBe("outcome");
 turns.push({question:followupQuestions.outcome,answer:"There was no relief."});expect(nextJournalQuestion(initial,turns)?.id).toBe("severity");
 turns.push({question:followupQuestions.severity,answer:"Moderate."});expect(nextJournalQuestion(initial,turns)).toBeNull();
});
it("does not repeat supplied details or turn uncertainty into a severity score",()=>{
 const q=nextJournalQuestion("Severe pain in my lower back for three hours, outside my period. I missed work; heat helped.",[])!;expect(q.id).toBe("priority");expect(followupFact({question:followupQuestions.severity,answer:"I am not sure."})?.kind).toBe("Uncertainty");expect(followupFact({question:followupQuestions.severity,answer:"6"})?.value).toBe("Reported intensity: 6");
});
it("respects explicit symptom absence and skips without inventing patient facts",()=>{
 expect(nextJournalQuestion("No symptoms today.",[])).toBeNull();expect(followupFact({question:followupQuestions.impact,answer:"",skipped:true})).toBeNull();
});
