"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, CalendarDays, Check, FileText, Settings } from "lucide-react";
import { GlassCard } from "./glass-card";
import { Wordmark } from "./wordmark";
import { flushSync } from "react-dom";
import Link from "next/link";

type NavigationState = {
  view: string; setView: (view: string) => void;
  settings: boolean; setSettings: (open: boolean) => void;
  checkinRequest: number;
  setDirty: (dirty: boolean) => void;
};
const NavigationContext = createContext<NavigationState | null>(null);
export const useAppNavigation = () => useContext(NavigationContext);
const destinations = [
  { label: "Journal", view: "Your story", href: "/journal", Icon: BookOpen },
  { label: "Outlook", view: "Outlook", href: "/outlook", Icon: CalendarDays },
  { label: "Appointment Brief", view: "Appointment brief", href: "/appointment-brief", Icon: FileText },
];
export function AppNavigationProvider({ children }: { children: ReactNode }) {
  const [view, updateView] = useState("Today");
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const requestLeave = (action: () => void) => {
    if (dirty) { pending.current = action; setLeaving(true); }
    else action();
  };
  const setView = (next: string) => {
    updateView(next);
    const href = destinations.find(d=>d.view===next)?.href;
    if (href && window.location.pathname !== href) window.history.pushState(null, "", href);
    if (next === "Today" && window.location.pathname !== "/") window.history.pushState(null, "", "/");
  };
  const [settings, setSettingsState] = useState(false);
  const previousPage=useRef("/outlook");
  function setSettings(value:boolean){if(value){if(!window.location.pathname.startsWith("/settings")){previousPage.current=window.location.pathname+window.location.search;window.history.pushState(null,"","/settings");}}else if(window.location.pathname.startsWith("/settings"))window.history.replaceState(null,"",previousPage.current);setSettingsState(value);}
  const [open, setOpen] = useState(false);
  const [checkinRequest, setCheckinRequest] = useState(0);
  const anchor = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const focusOnOpen = useRef<number | null>(null);
  const current = view === "Today" ? "Outlook" : view === "Insights" ? "Your story" : view;
  const close = (restore = true) => { setOpen(false); if (restore) trigger.current?.focus(); };
  const navigate = (next: string) => {
    const update = () => { setView(next); setSettings(false); if(next==="Today")window.dispatchEvent(new Event("elya-home")); };
    if (document.startViewTransition && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches && next !== view) {
      const transition = document.startViewTransition(() => flushSync(update));
      void transition.finished.catch(() => {});
    } else update();
    close();
  };
  useEffect(() => {
    const fromHash = () => {
      if(window.location.pathname==="/privacy"||window.location.pathname==="/settings"&&window.location.hash==="#privacy")window.history.replaceState(null,"","/settings/privacy");
      const route = destinations.find(d=>d.href===window.location.pathname);
      updateView(route?.view ?? (window.location.pathname.startsWith("/settings")?"Outlook":"Today")); setOpen(false); setSettingsState(window.location.pathname.startsWith("/settings"));
    };
    fromHash(); window.addEventListener("popstate", fromHash);
    window.addEventListener("hashchange", fromHash);
    return () => { window.removeEventListener("popstate", fromHash); window.removeEventListener("hashchange", fromHash); };
  }, []);
  useEffect(() => {
    if (!open) return;
    if (focusOnOpen.current !== null) {
      anchor.current?.querySelectorAll<HTMLAnchorElement>("nav a")[focusOnOpen.current]?.focus();
      focusOnOpen.current = null;
    }
    const outside = (e: MouseEvent) => { if (!anchor.current?.contains(e.target as Node)) close(); };
    const escape = (e: KeyboardEvent) => { if(e.key==="Escape") { e.preventDefault(); close(); } };
    document.addEventListener("click",outside); document.addEventListener("keydown",escape);
    return () => { document.removeEventListener("click",outside); document.removeEventListener("keydown",escape); };
  }, [open]);
  return <NavigationContext.Provider value={{view,setView,settings,setSettings,checkinRequest,setDirty}}>
    <div className="app-topbar" data-testid="persistent-topbar">
      <div className="app-menu-anchor" ref={anchor}>
        <button ref={trigger} className="app-menu-trigger" aria-expanded={open} aria-controls="app-menu" onClick={()=>setOpen(v=>!v)}
          onKeyDown={e=>{
            if(e.key==="ArrowDown"||e.key==="ArrowUp") {
              e.preventDefault();
              if(open) anchor.current?.querySelectorAll<HTMLAnchorElement>("nav a")[e.key==="ArrowUp"?3:0]?.focus();
              else {focusOnOpen.current=e.key==="ArrowUp"?3:0;setOpen(true);}
            }
          }}>Menu</button>
        <GlassCard as="nav" id="app-menu" className={`app-menu${open?" is-open":""}`} aria-label="Main pages" aria-hidden={!open} inert={!open}
          onKeyDown={e=>{
            if(!["ArrowDown","ArrowUp","Home","End"].includes(e.key))return;
            const links=Array.from(anchor.current?.querySelectorAll<HTMLAnchorElement>("nav a")??[]);
            const index=links.indexOf(document.activeElement as HTMLAnchorElement);
            e.preventDefault();
            const next=e.key==="Home"?0:e.key==="End"?links.length-1:(index+(e.key==="ArrowDown"?1:-1)+links.length)%links.length;
            links[next]?.focus();
          }}>
          {destinations.map(({label,view:next,href,Icon})=><a key={next} href={href} className={current===next?"is-current":""} aria-current={current===next?"page":undefined} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();requestLeave(()=>navigate(next));}}>
            <Icon size={18} aria-hidden="true"/><span>{label}</span>{current===next&&<Check size={16} aria-hidden="true" className="app-current-check"/>}
          </a>)}
          <div className="app-menu-divider"/>
          <a href="/settings" className="app-settings-link" data-settings-link="true" onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();requestLeave(()=>{close();setSettings(true);});}}>Settings and privacy</a>
        </GlassCard>
      </div>
      <Link className="app-wordmark-link" href="/" aria-label="elya, go to the home page" onNavigate={e=>{e.preventDefault();requestLeave(()=>navigate("Today"));}}><Wordmark /></Link>
      <a href="/journal" className="app-checkin-pill" hidden={view!=="Outlook"} onClick={e=>{e.preventDefault();requestLeave(()=>{window.dispatchEvent(new Event("elya-checkin-today"));navigate("Your story");});}}>Check in</a>
    </div>
    {leaving && <div className="overlay"><section className="modal" role="alertdialog" aria-modal="true" aria-labelledby="leave-title">
      <h2 id="leave-title">Leave without saving? Your entry isn't saved yet.</h2>
      <button autoFocus className="button" onClick={()=>{pending.current=null;setLeaving(false);}}>Stay</button>
      <button className="button primary" onClick={()=>{setDirty(false);setLeaving(false);pending.current?.();pending.current=null;}}>Leave</button>
    </section></div>}
    {children}
  </NavigationContext.Provider>;
}
