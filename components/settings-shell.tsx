"use client";
import {useEffect,useState,type ReactNode} from "react";
import {conversationAudio} from "../lib/conversation-audio";
import "./settings-shell.css";
export function SettingsShell({preferences,voice,connections,data,demo}:{preferences:ReactNode;voice:ReactNode;connections:ReactNode;data:ReactNode;demo:ReactNode}){
 const initial=()=>typeof window!=="undefined"&&(window.location.pathname==="/settings/privacy"||window.location.hash==="#privacy")?"data":"";
 const [active,setActive]=useState(initial);
 const sections=[{id:"voice",label:"Voice and replies",hint:"Voice sample and speed",content:voice},{id:"connections",label:"Wearable data",hint:"Oura and file imports",content:connections},{id:"data",label:"Privacy and data",hint:"Stays on this device",content:data},{id:"demo",label:"Explore a demo",hint:"Fictional examples",content:demo}];
 const selected=sections.find(s=>s.id===active);
 useEffect(()=>{const sync=()=>setActive(initial());if(window.location.hash==="#privacy")window.history.replaceState(null,"","/settings/privacy");window.addEventListener("popstate",sync);return()=>window.removeEventListener("popstate",sync);},[]);
 function open(id:string){conversationAudio.stop();setActive(id);window.history.replaceState(null,"",id==="data"?"/settings/privacy":"/settings");}
 return <div className="elya-settings">{selected?<><button className="back-link" onClick={()=>open("")}>← Back</button><h3>{selected.label}</h3>{selected.content}</>:<><h3 className="settings-group-label">You</h3>{preferences}<h3 className="settings-group-label">Settings</h3><div className="settings-root-rows">{sections.slice(0,3).map(s=><button key={s.id} onClick={()=>open(s.id)}><span>{s.label}<small>{s.hint}</small></span><span aria-hidden="true">›</span></button>)}</div><h3 className="settings-group-label">Try elya</h3><div className="settings-root-rows"><button onClick={()=>open("demo")}><span>Explore a demo<small>Fictional examples</small></span><span aria-hidden="true">›</span></button></div></>}</div>;
}
