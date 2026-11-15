// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinenOutlook } from "./linen-outlook";
import { symptomRisk } from "../lib/symptom-risk";
import type { Entry } from "../lib/model";
afterEach(cleanup);
beforeEach(()=>{window.history.replaceState(null,"","/outlook");vi.spyOn(window,"scrollTo").mockImplementation(()=>{});});
const entry:Entry={id:"fictional",date:"2026-11-14",text:"A fictional headache interrupted reading.",facts:[{kind:"Pain",value:"Headache",quote:"headache"}],symptomFree:false,demo:true};
function props(){return {today:"2026-11-14",selected:"2026-11-14",onSelect:vi.fn(),onEdit:vi.fn(),onRetry:vi.fn(),entries:[] as Entry[],forecast:null,loading:false,error:""};}
it("keeps unknown days different from explicitly symptom-free days",async()=>{
 const user=userEvent.setup();const p=props();const {rerender}=render(<LinenOutlook {...p}/>);
 expect(screen.getByText("Unknown · No entry recorded.")).toBeTruthy();
 expect(screen.queryByText("No symptoms")).toBeNull();
 rerender(<LinenOutlook {...p} entries={[{...entry,text:"No symptoms today.",facts:[],symptomFree:true}]}/>);
 expect(screen.getByText("No symptoms")).toBeTruthy();
 expect(screen.getByText("None reported · No symptoms")).toBeTruthy();
 await user.click(screen.getByRole("button",{name:"Edit entry"}));expect(p.onEdit).toHaveBeenCalledWith("2026-11-14");
});
it("navigates December to January and back without locale-dependent date parsing",async()=>{
 const user=userEvent.setup();render(<LinenOutlook {...props()} selected="2026-12-31"/>);
 await user.click(screen.getByRole("button",{name:"Next month"}));expect(screen.getByRole("heading",{name:"January 2027"})).toBeTruthy();
 await user.click(screen.getByRole("button",{name:"Previous month"}));expect(screen.getByRole("heading",{name:"December 2026"})).toBeTruthy();
});
it("shows only actual estimates, dates them accurately, and blocks future observations",()=>{
 const result=symptomRisk({kind:"synthetic",targetDate:"2026-11-15",asOf:"2026-11-14T12:00:00Z",timeZone:"UTC",days:[]},{evaluate:false});
 result.symptoms[0]={...result.symptoms[0],state:"experimental-estimate",probability:0.7,outlook:"higher-estimated-likelihood"};
 render(<LinenOutlook {...props()} selected="2026-11-15" forecast={result}/>);
 expect(screen.getByText("Pelvic pain / cramps may be more likely on November 15, 2026.")).toBeTruthy();
 expect(screen.queryByRole("button",{name:"Add entry"})).toBeNull();
 const list=document.querySelector(".outlook-prediction-detail ul") as HTMLElement;expect(within(list).getAllByRole("listitem")).toHaveLength(1);
 expect(within(list).queryByText("Fatigue")).toBeNull();
});
it("selects a crowded logged date and exposes the full source entry",async()=>{
 const user=userEvent.setup();const p=props();render(<LinenOutlook {...p} entries={[entry]}/>);
 expect(screen.getByText(entry.text)).toBeTruthy();
 await user.click(screen.getByRole("button",{name:/November 14, 2026, today, Logged: Headache/}));
 expect(p.onSelect).toHaveBeenCalledWith("2026-11-14");
});
it("offers a working retry when loading fails",async()=>{
 const user=userEvent.setup();const p=props();render(<LinenOutlook {...p} error="Outlook unavailable."/>);
 expect(screen.getByRole("alert").textContent).toContain("Outlook unavailable.");
 await user.click(screen.getByRole("button",{name:"Try again"}));expect(p.onRetry).toHaveBeenCalledOnce();
});
it('labels a today forecast as today and keeps the check-in on the local day',async()=>{
 const user=userEvent.setup();const p=props();const result=symptomRisk({kind:'synthetic',targetDate:'2026-11-14',asOf:'2026-11-13T20:00:00Z',timeZone:'America/Los_Angeles',days:[]},{evaluate:false});
 render(<LinenOutlook {...p} forecast={result}/>);expect(screen.getByRole('heading',{name:'Today’s outlook'})).toBeTruthy();expect(document.querySelector('.outlook-summary-top')?.textContent).toContain('November 14, 2026');expect(screen.queryByRole('heading',{name:'Tomorrow’s outlook'})).toBeNull();await user.click(screen.getByRole('button',{name:'Check in today'}));expect(p.onEdit).toHaveBeenCalledWith('2026-11-14');
});
