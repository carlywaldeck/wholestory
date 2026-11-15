// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {OutlookDay} from "./outlook-day";
import {symptomRisk} from "../lib/symptom-risk";
afterEach(cleanup);
const props=()=>({date:"2026-11-14",today:"2026-11-14",entries:[],forecast:null,onDate:vi.fn(),onCalendar:vi.fn(),onEdit:vi.fn(),onSettings:vi.fn(),demoDays:[]});
it("shows the two sibling panels with honest missing Journal and wearable states",()=>{
 render(<OutlookDay {...props()}/>);expect(screen.getByRole("heading",{name:"Your Journal"})).toBeTruthy();expect(screen.getByRole("heading",{name:"Wearable data"})).toBeTruthy();expect(screen.getByText("No entry for this day.")).toBeTruthy();expect(screen.getByText("No measurements available for this day.")).toBeTruthy();
});
it("uses the reported units and preserves missing measurements",()=>{
 render(<OutlookDay {...props()} demoDays={[{date:"2026-11-14",sleepHours:7.2,steps:null,temperatureDeviationC:.25}]}/>);
 expect(screen.getByText("7.2 hours")).toBeTruthy();expect(screen.getByText("0.25 °C above your usual level")).toBeTruthy();expect(screen.getByText("Not available")).toBeTruthy();expect(screen.queryByText("Oura connected")).toBeNull();
});
it("does not fabricate estimates outside the supported date",()=>{
 render(<OutlookDay {...props()} date="2026-11-20"/>);expect(screen.getByRole("heading",{name:"Symptoms you may experience"})).toBeTruthy();expect(screen.getByText("No symptom outlook available for this date.")).toBeTruthy();expect(screen.queryByRole("heading",{name:"Wearable data"})).toBeNull();expect(screen.queryByRole("button",{name:"Open Journal"})).toBeNull();
});
it("shows experimental risk bands without percentages and allows day/calendar navigation",async()=>{
 const user=userEvent.setup();const p=props();const forecast=symptomRisk({kind:"synthetic",targetDate:"2026-11-15",asOf:"2026-11-14T12:00:00Z",timeZone:"UTC",days:[]},{evaluate:false});
 forecast.symptoms[0]={...forecast.symptoms[0],state:"experimental-estimate",probability:.7,outlook:"higher-estimated-likelihood"};
 render(<OutlookDay {...p} date="2026-11-15" forecast={forecast}/>);expect(screen.getByText("High risk")).toBeTruthy();expect(screen.queryByText("Estimated likelihood: 70%")).toBeNull();expect(screen.getByRole("button",{name:/Fatigue Still learning your pattern/})).toBeTruthy();
 await user.click(screen.getByRole("button",{name:"Next day"}));expect(p.onDate).toHaveBeenCalledWith("2026-11-16");await user.click(screen.getByRole("button",{name:"Month calendar"}));expect(p.onCalendar).toHaveBeenCalledOnce();
});

it("opens a date chooser from the day heading and navigates to the selected day",async()=>{const p=props();render(<OutlookDay {...p}/>);await userEvent.click(screen.getByRole("button",{name:/Saturday, November 14/}));const input=screen.getByLabelText("Choose a day");const {fireEvent}=await import("@testing-library/react");fireEvent.change(input,{target:{value:"2026-11-09"}});expect(p.onDate).toHaveBeenCalledWith("2026-11-09");});
