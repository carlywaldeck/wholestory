// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppNavigationProvider, useAppNavigation } from "./app-navigation";
function Page() {
  const nav=useAppNavigation()!;
  return <div><h1>{nav.view}</h1><span data-testid="checkin-request">{nav.checkinRequest}</span>{nav.settings&&<p>Settings opened</p>}</div>;
}
beforeEach(()=>window.history.replaceState(null,"","/outlook"));
afterEach(cleanup);
it("keeps the top bar mounted, uses the exact ordered links, and marks the current page",async()=>{
 const user=userEvent.setup();render(<AppNavigationProvider><Page/></AppNavigationProvider>);
 const bar=screen.getByTestId("persistent-topbar");
 const menu=screen.getByRole("button",{name:"Menu"});
 const wordmark=screen.getByRole("link",{name:"elya, go to the home page"});
 expect(menu.getAttribute("aria-expanded")).toBe("false");
 expect(screen.queryByRole("navigation",{name:"Main pages"})).toBeNull();
 await user.click(menu);
 const links=screen.getAllByRole("link").filter(l=>l.closest("#app-menu"));
 expect(links.map(l=>l.textContent)).toEqual(["Journal","Outlook","Appointment Brief","Privacy","Settings"]);
 expect(screen.getByRole("link",{name:"Outlook"}).getAttribute("aria-current")).toBe("page");
 await user.click(screen.getByRole("link",{name:"Journal"}));
 expect(screen.getByRole("heading",{name:"Your story"})).toBeTruthy();
 expect(screen.getByTestId("persistent-topbar")).toBe(bar);
 expect(screen.getByRole("link",{name:"elya, go to the home page"})).toBe(wordmark);
 expect(menu.getAttribute("aria-expanded")).toBe("false");
 expect(window.location.pathname).toBe("/journal");
 await user.click(menu);
 expect(screen.getByRole("link",{name:"Journal"}).getAttribute("aria-current")).toBe("page");
});
it("supports arrow keys, Enter, Escape and the requested tab order",async()=>{
 const user=userEvent.setup();render(<AppNavigationProvider><Page/></AppNavigationProvider>);
 const menu=screen.getByRole("button",{name:"Menu"});menu.focus();
 await user.keyboard("{ArrowDown}");
 expect(document.activeElement).toBe(screen.getByRole("link",{name:"Journal"}));
 await user.keyboard("{ArrowDown}");
 expect(document.activeElement).toBe(screen.getByRole("link",{name:"Outlook"}));
 await user.keyboard("{End}");
 expect(document.activeElement).toBe(screen.getByRole("link",{name:"Settings"}));
 await user.keyboard("{Escape}");
 expect(document.activeElement).toBe(menu);
 expect(menu.getAttribute("aria-expanded")).toBe("false");
 await user.click(menu);
 for(const name of ["Journal","Outlook","Appointment Brief","Privacy","Settings"]){
   await user.tab();expect(document.activeElement).toBe(screen.getByRole("link",{name}));
 }
 await user.keyboard("{Home}{Enter}");
 expect(screen.getByRole("heading",{name:"Your story"})).toBeTruthy();
});
it("closes on outside click and exposes Check in only on Outlook",async()=>{
 const user=userEvent.setup();render(<AppNavigationProvider><Page/></AppNavigationProvider>);
 const menu=screen.getByRole("button",{name:"Menu"});
 await user.click(menu);await user.click(screen.getByRole("heading"));
 expect(menu.getAttribute("aria-expanded")).toBe("false");
 expect(document.activeElement).toBe(menu);
 expect(screen.getByRole("link",{name:"Check in"})).toBeTruthy();
 await user.click(menu);
 await user.click(screen.getByRole("link",{name:"Outlook"}));
 await user.click(screen.getByRole("link",{name:"Check in"}));
 expect(screen.getByRole("heading",{name:"Your story"})).toBeTruthy();
 expect(window.location.pathname).toBe("/journal");
 expect(screen.queryByRole("link",{name:"Check in"})).toBeNull();
});
