// @vitest-environment jsdom
import {afterEach,expect,it} from "vitest";
import {cleanup,render,screen,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import demo from "../public/demos/maya-learning-v2.json";
import type {LearningOutlook} from "../lib/learning-types";
import {FutureSymptomOutlook} from "./future-symptom-outlook";
afterEach(cleanup);
const result=()=>structuredClone(demo.result) as LearningOutlook;
it("opens three grounded sentences by tap or keyboard and dismisses with Escape",async()=>{
 const user=userEvent.setup();const learning=result();render(<FutureSymptomOutlook date={learning.targetDate} learning={learning} forecast={null}/>);
 const trigger=screen.getByRole("button",{name:/Fatigue High risk/});expect(trigger.getAttribute("aria-expanded")).toBe("false");
 await user.click(trigger);const panel=screen.getByRole("region",{name:/Fatigue High risk/});expect(panel.querySelectorAll("p").length).toBe(3);expect(within(panel).getByText(/wearable patterns selected/)).toBeTruthy();
 await user.keyboard("{Escape}");expect(screen.queryByRole("region",{name:/Fatigue High risk/})).toBeNull();expect(document.activeElement).toBe(trigger);
 await user.keyboard("{Enter}");expect(trigger.getAttribute("aria-expanded")).toBe("true");
});
it("preserves null saved estimates and never invents forecasts for unsupported dates",async()=>{
 const learning=result();learning.state.records.find(r=>r.targetDate===learning.targetDate&&r.symptom==="fatigue")!.estimate=null;
 const view=render(<FutureSymptomOutlook date={learning.targetDate} learning={learning} forecast={null}/>);
 expect(screen.getByRole("button",{name:/Fatigue Still learning your pattern/})).toBeTruthy();expect(screen.queryByText(/%/)).toBeNull();
 view.rerender(<FutureSymptomOutlook date="2026-12-01" learning={learning} forecast={null}/>);expect(screen.getByText("No symptom outlook available for this date.")).toBeTruthy();expect(screen.queryByRole("button")).toBeNull();
});
