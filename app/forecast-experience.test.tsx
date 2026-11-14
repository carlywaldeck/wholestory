// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, within, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import { clearEntries, putEntry, loadEntries } from "../lib/storage";
import { defaultPreferences, savePreferences } from "../lib/preferences";
import { handleForecast } from "../lib/server-forecast";
beforeEach(async()=>{
  await clearEntries(); localStorage.clear();
  await savePreferences({...defaultPreferences,setupComplete:true});
  vi.spyOn(window,"scrollTo").mockImplementation(()=>{});
  vi.stubGlobal("ResizeObserver",class {observe(){} unobserve(){} disconnect(){}});
  vi.stubGlobal("fetch",vi.fn((url:string)=>handleForecast(new Request(new URL(url,"http://localhost").href))));
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it("uses one matching forecast history, saves an explicit demo check-in, and isolates personal records",async()=>{
  await putEntry({id:"private",date:"2026-11-01",text:"Personal private words.",facts:[],symptomFree:false,demo:false});
  const user=userEvent.setup(); render(<Home/>);
  await user.click(screen.getByRole("button",{name:"Menu"}));
  await user.click(screen.getAllByRole("button",{name:"Outlook"}).at(-1)!);
  expect(screen.getByRole("heading",{name:"Tomorrow, a little more context."})).toBeTruthy();
  await user.selectOptions(screen.getByLabelText("Explore a fictional outlook"),"maya");
  await screen.findByRole("button",{name:"Exit demo"});
  const response=await handleForecast(new Request("http://localhost/api/forecast?persona=maya&targetDate="+new Date(Date.now()+86400000).toISOString().slice(0,10)));
  const payload=await response.json();
  for(const result of payload.forecast.symptoms.filter((s:{symptom:string})=>["pelvicPain","fatigue","bloating","bowelSymptoms"].includes(s.symptom))) {
    if(result.probability!==null)expect(screen.getAllByText(Math.round(result.probability*100)+"%").length).toBeGreaterThan(0);
  }
  await user.click(screen.getByRole("button",{name:"Check in today"}));
  const form=screen.getByRole("group",{name:"Pelvic pain / cramps"});
  await user.click(within(form).getByRole("radio",{name:/Present/}));
  await user.click(within(screen.getByRole("group",{name:"Fatigue"})).getByRole("radio",{name:/None reported/}));
  await user.type(screen.getByLabelText(/Anything else/),"I missed a fictional rehearsal.");
  await user.click(screen.getByRole("button",{name:"Save check-in"}));
  await screen.findByRole("heading",{name:"Journal"});
  expect(screen.getByText(/I missed a fictional rehearsal/)).toBeTruthy();
  expect(screen.queryByText("Personal private words.")).toBeNull();
  expect((await loadEntries()).map(e=>e.id)).toEqual(["private"]);
  await user.click(screen.getByRole("button",{name:/^Appointment brief$/}));
  expect((screen.getByRole("button",{name:"Download PDF"}) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByLabelText("I have reviewed this brief and the supporting entries for accuracy."));
  expect((screen.getByRole("button",{name:"Download PDF"}) as HTMLButtonElement).disabled).toBe(false);
  await user.click(screen.getByRole("button",{name:"Exit demo"}));
  await user.click(screen.getByRole("button",{name:/^Journal$/}));
  await screen.findByText("Personal private words.");
  expect(screen.queryByText(/I missed a fictional rehearsal/)).toBeNull();
});
it("keeps unanswered personal symptoms null and never calls the server for personal estimates",async()=>{
  const user=userEvent.setup(); render(<Home/>);
  await user.click(screen.getByRole("button",{name:"Menu"}));
  await user.click(screen.getAllByRole("button",{name:"Outlook"}).at(-1)!);
  await user.click(screen.getByRole("button",{name:"Check in today"}));
  await user.click(within(screen.getByRole("group",{name:"Bloating"})).getByRole("radio",{name:/None reported/}));
  await user.click(screen.getByRole("button",{name:"Save check-in"}));
  await screen.findByRole("heading",{name:"Journal"});
  const days=JSON.parse(localStorage.getItem("elya-confirmed-checkins-v1")!);
  expect(days[0].symptoms.bloating).toBe(false);
  expect(days[0].symptoms.pelvicPain).toBeNull();
  expect(days[0].availableAt).toBeTruthy();
  expect(vi.mocked(fetch).mock.calls.filter(([url,init])=>String(url).includes("/api/forecast") || init?.method === "POST")).toEqual([]);
});
it("reports a demo fetch error without loading an old demo history",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("unavailable",{status:503})));
  const user=userEvent.setup();render(<Home/>);
  await user.click(screen.getByRole("button",{name:"Menu"}));
  await user.click(screen.getAllByRole("button",{name:"Outlook"}).at(-1)!);
  await user.selectOptions(screen.getByLabelText("Explore a fictional outlook"),"alex");
  await waitFor(()=>expect(screen.getByRole("alert").textContent).toContain("could not be loaded"));
  expect(screen.queryByRole("button",{name:"Exit demo"})).toBeNull();
});
