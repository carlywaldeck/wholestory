// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {JournalFollowups} from "./journal-followups";
afterEach(cleanup);
it("shows one optional question, keeps original text separate, and can stop unanswered",async()=>{const update=vi.fn();const user=userEvent.setup();render(<JournalFollowups text="cramps for two hours" sessionKey="test" onUpdate={update} onActivity={vi.fn()}/>);expect(screen.getByText("How strong was the pelvic pain / cramps?")).toBeTruthy();await user.click(screen.getByRole("button",{name:"Moderate"}));await user.click(screen.getByRole("button",{name:"Next question"}));expect(update.mock.calls.at(-1)?.[0][0].answer).toBe("Moderate");await user.click(screen.getByRole("button",{name:"Finish conversation"}));expect(screen.queryByLabelText("Your answer")).toBeNull();expect(screen.getByText("You can review and save your entry.")).toBeTruthy();});

it("keeps a tappable fallback in Speak mode and hides editing until requested",async()=>{const user=userEvent.setup();render(<JournalFollowups mode="speak" text="cramps for two hours" sessionKey="voice" onUpdate={vi.fn()} onActivity={vi.fn()}/>);expect(screen.getByRole("button",{name:"Moderate"})).toBeTruthy();expect(screen.queryByRole("textbox",{name:"Your answer"})).toBeNull();expect(screen.getByRole("button",{name:"Answer"})).toBeTruthy();await user.click(screen.getByText("Edit answer",{exact:true}));expect(screen.getByRole("textbox",{name:"Your answer"})).toBeTruthy();});
