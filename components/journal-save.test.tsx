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
 await user.type(screen.getByLabelText("What are you experiencing today?"),"Fictional draft to keep.");await user.click(screen.getByRole("button",{name:"Fatigue"}));await user.click(screen.getByRole("button",{name:"Save entry"}));expect(screen.getByRole("alert").textContent).toContain("Storage is unavailable.");expect((screen.getByLabelText("What are you experiencing today?") as HTMLTextAreaElement).value).toBe("Fictional draft to keep.");expect(window.location.pathname).toBe("/journal");
});
it("accepts a symptom-only entry without inventing absences",async()=>{
 window.history.replaceState(null,"","/journal");const user=userEvent.setup();const p=props();p.onSave.mockResolvedValue(undefined);render(<AppNavigationProvider><LinenPages {...p}/></AppNavigationProvider>);await user.click(screen.getByRole("button",{name:"Fatigue"}));await user.click(screen.getByRole("button",{name:"Save entry"}));const entry=p.onSave.mock.calls[0][0];expect(entry.facts).toHaveLength(1);expect(entry.facts[0].kind).toBe("Fatigue");expect(entry.symptomFree).toBe(false);expect(window.location.pathname).toBe("/outlook");
});
