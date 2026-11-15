// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, within, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import {clearLearningData} from "../lib/learning-store";
import {runLearningTask} from "../lib/learning-client";
import {executeTestLearning} from "../tests/learning-executor";
vi.mock("../lib/learning-client",async()=>{const {executeTestLearning}=await import("../tests/learning-executor");return {runLearningTask:vi.fn(executeTestLearning)};});
import { navigate } from "./test-navigation";
import { clearEntries, putEntry, loadEntries } from "../lib/storage";
import { defaultPreferences, savePreferences } from "../lib/preferences";
import { handleForecast } from "../lib/server-forecast";
beforeEach(async()=>{await clearLearningData();vi.mocked(runLearningTask).mockImplementation(executeTestLearning);
  window.history.replaceState(null, "", "/outlook");
  await clearEntries(); localStorage.clear(); sessionStorage.clear();
  await savePreferences({...defaultPreferences,setupComplete:true});
  vi.spyOn(window,"scrollTo").mockImplementation(()=>{});
  vi.stubGlobal("ResizeObserver",class {observe(){} unobserve(){} disconnect(){}});
  vi.stubGlobal("fetch",vi.fn((url:string)=>handleForecast(new Request(new URL(url,"http://localhost").href))));
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it("uses matching backend history and isolates a demo check-in from personal records",async()=>{
 await putEntry({id:"private",date:"2026-11-01",text:"Personal private words.",facts:[],symptomFree:false,demo:false});
 const user=userEvent.setup();render(<Home/>);await user.click(screen.getByRole("button",{name:"Try Maya’s demo"}));
 await screen.findByText(/Demo · Maya/);
 expect(screen.getAllByText(/Still learning your pattern/)).toHaveLength(4);
 await user.click(screen.getByRole("button",{name:"Check in today"}));
 await user.click(screen.getByRole("button",{name:"Pelvic pain / cramps"}));
 await user.click(screen.getByText("Record a symptom as absent"));await user.selectOptions(screen.getByLabelText("Fatigue status"),"absent");
 await user.type(screen.getByLabelText("What are you experiencing today?")," I missed a fictional rehearsal.");
 await user.click(screen.getByRole("button",{name:"Save changes"}));await screen.findByRole("heading",{name:"Tomorrow’s outlook"});
 expect(screen.queryByText("Personal private words.")).toBeNull();expect((await loadEntries()).map(e=>e.id)).toEqual(["private"]);
 await navigate(user,"Appointment Brief");
 expect(document.querySelector(".monthly-report-body")?.textContent).toContain("Pelvic pain");
 expect(screen.getByRole("button",{name:"Print"})).toBeTruthy();expect(document.querySelector("textarea")).toBeNull();
});
it("keeps personal absence false and unanswered null without transmitting records",async()=>{
 const user=userEvent.setup();render(<Home/>);await user.click(screen.getByRole("button",{name:"Check in today"}));
 await user.click(screen.getByText("Record a symptom as absent"));await user.selectOptions(screen.getByLabelText("Bloating status"),"absent");
 await user.click(screen.getByRole("button",{name:"Add to calendar"}));await screen.findByRole("heading",{name:"Tomorrow’s outlook"});
 const days=JSON.parse(localStorage.getItem("elya-confirmed-checkins-v1")!);
 expect(days[0].symptoms.bloating).toBe(false);expect(days[0].symptoms.pelvicPain).toBeNull();expect(days[0].availableAt).toBeTruthy();
 expect(vi.mocked(fetch).mock.calls.filter(([url,init])=>String(url).includes("/api/forecast")||init?.method==="POST")).toEqual([]);
});
it("reports a demo error without substituting an older history",async()=>{
 vi.mocked(runLearningTask).mockImplementation(async task=>{if(task.op==="demo")throw Error("The fictional learner could not be loaded.");return executeTestLearning(task);});
 const user=userEvent.setup();render(<Home/>);await user.click(screen.getByRole("button",{name:"Try Maya’s demo"}));
 await waitFor(()=>expect(screen.getByRole("alert").textContent).toContain("could not be loaded"));
 expect(screen.queryByText("Fictional demo history")).toBeNull();
});

it("restores the single demo after refresh without changing the current report page",async()=>{
 sessionStorage.setItem("elya-active-demo","maya");window.history.replaceState(null,"","/appointment-brief");
 render(<Home/>);
 await screen.findByText("Your month at a glance");
 expect(window.location.pathname).toBe("/appointment-brief");
 expect(screen.queryByText("Personal private words.")).toBeNull();
});
