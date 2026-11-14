// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinenBrief, recordedSummary } from "./linen-brief";
import type { Entry } from "../lib/model";
afterEach(cleanup);
const entry:Entry={id:"fictional",date:"2026-11-10",text:"Pain was 4 out of 10. I missed a walk. Rest helped.",facts:[{kind:"Pelvic pain",value:"Pelvic pain",quote:"Pain"},{kind:"Severity",value:"4/10",quote:"Pain was 4 out of 10."},{kind:"Daily-life impact",value:"Missed a walk",quote:"I missed a walk."},{kind:"What helped",value:"Rest",quote:"Rest helped."}],symptomFree:false,demo:true};
const props=()=>({entries:[entry],today:"2026-11-14",onSource:vi.fn(),onJournal:vi.fn()});
it("counts reported days rather than duplicate entries, preserves quotes, and excludes absent symptoms",()=>{
 const text=recordedSummary([entry,{...entry,id:"same-day",facts:[...entry.facts,{kind:"Fatigue",value:"No",quote:"No"}]}]);
 expect(text).toContain("Pelvic pain: 1 day reported.");expect(text).toContain("“Rest helped.” (Nov 10, 2026)");expect(text).not.toContain("Fatigue:");
});
it("requires review again after editing before copy or print",async()=>{
 const user=userEvent.setup();render(<LinenBrief {...props()}/>);
 const print=screen.getByRole("button",{name:"Print / Save as PDF"}) as HTMLButtonElement;
 expect(print.disabled).toBe(true);await user.click(screen.getByRole("checkbox"));expect(print.disabled).toBe(false);
 await user.type(screen.getByLabelText("What I want understood",{exact:false}),"I want to explain the missed walk.");expect(print.disabled).toBe(true);
});
it("filters source entries by date and keeps real source links",async()=>{
 const user=userEvent.setup();const p=props();render(<LinenBrief {...p}/>);
 await user.click(screen.getByText("Review source entries (1)"));const link=screen.getByRole("link",{name:"Nov 10, 2026"});expect(link.getAttribute("href")).toBe("/journal?date=2026-11-10");await user.click(link);expect(p.onSource).toHaveBeenCalledWith(entry);
 await user.clear(screen.getByLabelText("From"));await user.type(screen.getByLabelText("From"),"2026-11-11");
 expect(screen.getByText("No recorded entries in this date range.")).toBeTruthy();
});
it("exports the edited words and sources, not the original generated summary",async()=>{
 const user=userEvent.setup();render(<LinenBrief {...props()}/>);
 await user.clear(screen.getByLabelText("Recorded symptoms and daily life"));await user.type(screen.getByLabelText("Recorded symptoms and daily life",{exact:false}),"My corrected account.");
 await user.click(screen.getByRole("checkbox"));await user.click(screen.getByRole("button",{name:"Copy"}));
 expect(await navigator.clipboard.readText()).toContain("My corrected account.");expect(await navigator.clipboard.readText()).toContain(entry.text);
 const print=vi.spyOn(window,"print").mockImplementation(()=>{});await user.click(screen.getByRole("button",{name:"Print / Save as PDF"}));expect(print).toHaveBeenCalledOnce();print.mockRestore();
});
