// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {render,screen,cleanup} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {LinenPages} from "./linen-pages";
import {AppNavigationProvider} from "./app-navigation";
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const props=()=>({view:"Your story",entries:[],forecast:null,loading:false,forecastError:"",onSave:vi.fn(),onSettings:vi.fn(),onDelete:vi.fn(),demo:false,onRetry:vi.fn()});
it("keeps the draft and selected date when saving fails",async()=>{
 window.history.replaceState(null,"","/journal");const user=userEvent.setup();const p=props();p.onSave.mockRejectedValue(Error("Storage is unavailable."));render(<AppNavigationProvider><LinenPages {...p}/></AppNavigationProvider>);
 await user.type(screen.getByLabelText("What are you experiencing today?"),"Fictional draft to keep.");await user.click(screen.getByRole("button",{name:"Fatigue"}));await user.click(screen.getByRole("button",{name:"Review entry"}));await user.click(screen.getByRole("button",{name:"Confirm and save"}));expect(screen.getByRole("alert").textContent).toContain("Storage is unavailable.");expect((screen.getByLabelText("What are you experiencing today?") as HTMLTextAreaElement).value).toBe("Fictional draft to keep.");expect(window.location.pathname).toBe("/journal");
});
it("accepts a symptom-only entry without inventing absences",async()=>{
 window.history.replaceState(null,"","/journal");const user=userEvent.setup();const p=props();p.onSave.mockResolvedValue(undefined);render(<AppNavigationProvider><LinenPages {...p}/></AppNavigationProvider>);await user.click(screen.getByRole("button",{name:"Fatigue"}));await user.click(screen.getByRole("button",{name:"Review entry"}));await user.click(screen.getByRole("button",{name:"Confirm and save"}));const entry=p.onSave.mock.calls[0][0];expect(entry.facts).toHaveLength(1);expect(entry.facts[0].kind).toBe("Fatigue");expect(entry.symptomFree).toBe(false);expect(window.location.pathname).toBe("/outlook");
});
it("reviews an unanswered follow-up without saving, then confirms provenance and brief data",async()=>{
 window.history.replaceState(null,"","/journal");const user=userEvent.setup();const p=props();p.onSave.mockResolvedValue(undefined);render(<AppNavigationProvider><LinenPages {...p}/></AppNavigationProvider>);
 await user.type(screen.getByLabelText("What are you experiencing today?"),"Cramps for two hours and missed class.");await user.click(screen.getByRole("button",{name:"Pelvic pain / cramps"}));await user.click(screen.getByRole("button",{name:"Moderate"}));await user.click(screen.getByRole("button",{name:"Next question"}));await user.click(screen.getByRole("button",{name:"Review entry"}));expect(p.onSave).not.toHaveBeenCalled();expect(screen.getByRole("heading",{name:"Review your entry"})).toBeTruthy();await user.click(screen.getByRole("button",{name:"Confirm and save"}));const entry=p.onSave.mock.calls[0][0];expect(entry.journal.originalText).toBe("Cramps for two hours and missed class.");expect(entry.journal.provenance.some((p:{source:string})=>p.source==="follow-up-answer")).toBe(true);expect(entry.facts.some((f:{kind:string})=>f.kind==="Severity")).toBe(true);const {recordedSummary}=await import("./linen-brief");expect(recordedSummary([entry])).toContain("Moderate");expect(entry.text).not.toContain("elya follow-up");
});
it("saves a reviewed demo check-in into the calendar before the appointment brief",async()=>{
 window.history.replaceState(null,"","/journal");const user=userEvent.setup();const p={...props(),demo:true};p.onSave.mockResolvedValue(undefined);render(<AppNavigationProvider><LinenPages {...p}/></AppNavigationProvider>);await user.click(screen.getByRole("button",{name:"Fatigue"}));await user.click(screen.getByRole("button",{name:"Review entry"}));await user.click(screen.getByRole("button",{name:"Save & see my day"}));expect(p.onSave).toHaveBeenCalledTimes(1);expect(window.location.pathname).toBe("/calendar");
});
it('clears every Present control when no symptoms is chosen, and clears no symptoms for bubbles and status controls',async()=>{
 window.history.replaceState(null,'','/journal');const user=userEvent.setup();render(<AppNavigationProvider><LinenPages {...props()}/></AppNavigationProvider>);
 const none=screen.getByRole('checkbox',{name:'No symptoms today'}) as HTMLInputElement;
 await user.click(screen.getByRole('button',{name:'Fatigue'}));await user.click(none);expect(none.checked).toBe(true);for(const button of document.querySelectorAll('.journal-symptom-bubbles button[aria-pressed]'))expect(button.getAttribute('aria-pressed')).toBe('false');
 await user.click(screen.getByRole('button',{name:/^Headache/}));expect(none.checked).toBe(false);expect(screen.getByRole('button',{name:'Headache'}).getAttribute('aria-pressed')).toBe('true');
 await user.click(none);await user.click(screen.getByText('Record a symptom as absent'));await user.selectOptions(screen.getByLabelText('Fatigue status'),'present');expect(none.checked).toBe(false);expect(screen.getByRole('button',{name:'Fatigue'}).getAttribute('aria-pressed')).toBe('true');
});
it('starts Sophie typing with an empty prompt and never copies seeded absence or impact into the new answer',async()=>{
 const {default:seed}=await import('../public/demos/maya-learning-v3.json');window.history.replaceState(null,'','/journal');const user=userEvent.setup();const p={...props(),demo:true,demoToday:'2026-11-14',entries:seed.entries as import('../lib/model').Entry[]};p.onSave.mockResolvedValue(undefined);render(<AppNavigationProvider><LinenPages {...p}/></AppNavigationProvider>);
 expect((screen.getByLabelText('What are you experiencing today?') as HTMLTextAreaElement).value).toBe('');
 await user.type(screen.getByLabelText('What are you experiencing today?'),'Tired and bloated today.');await user.click(screen.getByRole('button',{name:'Fatigue'}));await user.click(screen.getByRole('button',{name:'Bloating'}));
 await user.click(screen.getByRole('button',{name:'Missed activities'}));await user.click(screen.getByRole('button',{name:'Next question'}));await user.click(screen.getByRole('button',{name:'Review entry'}));await user.click(screen.getByRole('button',{name:'Save & see my day'}));
 const entry=p.onSave.mock.calls[0][0];expect(entry.text).not.toMatch(/I reported no|no interference|No change/);expect(entry.facts.filter((f:any)=>f.kind==='Daily-life impact').map((f:any)=>f.value)).toEqual(['Missed activities']);
});
