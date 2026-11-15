// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {JournalFollowups} from "./journal-followups";
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("speaks only on request, adapts one question at a time, and stops at three",async()=>{
 class Utterance{ text:string;onend:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(text:string){this.text=text;} }
 const spoken:string[]=[];vi.stubGlobal("SpeechSynthesisUtterance",Utterance);vi.stubGlobal("speechSynthesis",{getVoices:()=>[],cancel:vi.fn(),speak:(u:Utterance)=>{spoken.push(u.text);u.onend?.();}});
 const answer=vi.fn();const user=userEvent.setup();render(<JournalFollowups mode="type" text="I had pelvic cramps for two hours." sessionKey="entry" onAnswer={answer} onActivity={vi.fn()}/>);expect(spoken).toHaveLength(0);
 await user.click(screen.getByRole("button",{name:"Answer a few follow-ups"}));expect(spoken).toHaveLength(0);
 await user.type(screen.getByLabelText("Your answer"),"I missed work and took ibuprofen.");await user.click(screen.getByRole("button",{name:/^(Next question|Finish)$/}));expect(screen.getByText("What changed after you tried that, if anything?")).toBeTruthy();
 await user.type(screen.getByLabelText("Your answer"),"No relief.");await user.click(screen.getByRole("button",{name:/^(Next question|Finish)$/}));await user.type(screen.getByLabelText("Your answer"),"Moderate.");await user.click(screen.getByRole("button",{name:/^(Next question|Finish)$/}));expect(spoken).toHaveLength(0);expect(answer).toHaveBeenCalledTimes(3);expect(screen.queryByLabelText("Your answer")).toBeNull();
});
