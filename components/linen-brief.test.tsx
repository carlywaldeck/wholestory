// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinenBrief, recordedSummary } from "./linen-brief";
import type { Entry } from "../lib/model";
afterEach(cleanup);
const entry:Entry={id:"fictional",date:"2026-11-10",text:"Pain was 4 out of 10. I missed a walk. Rest helped.",facts:[{kind:"Pelvic pain",value:"Pelvic pain",quote:"Pain"},{kind:"Severity",value:"4/10",quote:"Pain was 4 out of 10."},{kind:"Daily-life impact",value:"Missed a walk",quote:"I missed a walk."},{kind:"What helped",value:"Rest",quote:"Rest helped."}],symptomFree:false,demo:true};
const props=()=>({entries:[entry],today:"2026-11-14",onSource:vi.fn(),onJournal:vi.fn()});

it("counts distinct reported days and preserves treatment outcomes including no benefit",()=>{
 const text=recordedSummary([entry,{...entry,id:"same-day",facts:[...entry.facts,{kind:"Fatigue",value:"No",quote:"Pain"}]}]);
 expect(text).toContain("Pelvic pain: reported on 1 day.");expect(text).toContain("“Rest helped.”");expect(text).not.toContain("Fatigue: reported on");expect(text).toContain("Fatigue: explicitly absent on 1 logged day.");
});
it("is read-only, with one month selector and three working export actions",async()=>{
 const user=userEvent.setup();render(<LinenBrief {...props()}/>);
 expect(document.querySelectorAll("textarea")).toHaveLength(0);expect(screen.getByText("AI summary for your doctor")).toBeTruthy();
 expect(screen.getByLabelText("Month")).toBeTruthy();
 await user.click(screen.getByRole("button",{name:"Copy"}));expect(await navigator.clipboard.readText()).toContain("Pelvic pain: reported on 1 day.");expect(await navigator.clipboard.readText()).not.toContain(entry.text);
 const print=vi.spyOn(window,"print").mockImplementation(()=>{});await user.click(screen.getByRole("button",{name:"Print"}));expect(print).toHaveBeenCalledOnce();print.mockRestore();
 expect(screen.getByRole("button",{name:"Download report"})).toBeTruthy();
 expect(screen.getByText(/This report is generated locally/)).toBeTruthy();
});
it("filters by month and uses the exact empty message without contribution buttons",async()=>{
 const user=userEvent.setup();render(<LinenBrief {...props()}/>);
 await user.clear(screen.getByLabelText("Month"));await user.type(screen.getByLabelText("Month"),"2026-10");
 expect(screen.getByText("No journal entries for this month.")).toBeTruthy();expect(screen.queryByRole("button")).toBeNull();
});
it("links each statement to confirmed Journal sources and refreshes after a correction",async()=>{
 const user=userEvent.setup();const p=props();const {rerender}=render(<LinenBrief {...p}/>);
 const link=screen.getAllByRole("link",{name:"View Journal entry for Nov 10, 2026"})[0];
 expect(link.getAttribute("href")).toBe("/journal?date=2026-11-10");await user.click(link);expect(p.onSource).toHaveBeenCalledWith(entry);
 rerender(<LinenBrief {...p} entries={[{...entry,facts:[],text:"My corrected original words."}]}/>);
 expect(screen.queryByText("Pelvic pain: reported on 1 day.")).toBeNull();expect(screen.getByText("“My corrected original words.”")).toBeTruthy();
});
it("does not turn missing days into symptom-free days or include future observations",()=>{
 render(<LinenBrief {...props()} entries={[entry,{...entry,id:"future",date:"2026-11-28",text:"Future record"}]}/>);
 expect(screen.getByText("1 logged day · Missing entries are unknown.")).toBeTruthy();expect(screen.queryByText("Explicitly symptom-free days")).toBeNull();expect(screen.queryByText("Future record")).toBeNull();
});
it('does not call a profile empty while its saved entries are restoring',()=>{render(<LinenBrief {...props()} entries={[]} loading/>);expect(screen.getByRole('status').textContent).toBe('Loading saved journal entries…');expect(screen.queryByText('No journal entries for this month.')).toBeNull();});
