import {expect,it} from "vitest";
import {confirmedJournalDays} from "./learning-journal";
it("migrates confirmed fields conservatively and leaves free-text omissions unknown",()=>{
 const entries=[{id:"old",date:"2026-11-10",text:"I reported fatigue.",facts:[{kind:"Fatigue" as const,value:"Fatigue",quote:"I reported fatigue."}],symptomFree:false,demo:false}];
 const result=confirmedJournalDays(entries,[],"2026-11-14T18:00:00Z",{});expect(result.days[0].symptoms.fatigue).toBe(true);expect(result.days[0].symptoms.pelvicPain).toBeNull();expect(result.days[0].availableAt).toBe("2026-11-14T18:00:00Z");
 const reopened=confirmedJournalDays(entries,[],"2026-11-14T20:00:00Z",result.receipts);expect(reopened.days[0].availableAt).toBe(result.days[0].availableAt);
});
