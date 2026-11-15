"use client";
import {useEffect,useRef,useState} from "react";
import {useAppNavigation} from "./app-navigation";
import "./ellie-support.css";
export function EllieIcon(){return <img src="/media/ellie/ellie-minimal.png" alt="" width={88} height={80} draggable={false}/>;}
type Topic="home"|"support"|"learn"|"prepare";
const sources={who:"https://www.who.int/news-room/fact-sheets/detail/endometriosis",nhs:"https://www.nhs.uk/conditions/periods/",groups:"https://endometriosis.org/support/support-groups/",uk:"https://www.endometriosis-uk.org/support-groups"};
export function EllieSupport(){
 const navigation=useAppNavigation();const [open,setOpen]=useState(false),[topic,setTopic]=useState<Topic>("home");
 const [wandering,setWandering]=useState(true);
 useEffect(()=>{try{setWandering(localStorage.getItem("elya.ellieMotion")!=="off");}catch{}},[]);
 function toggleWandering(){setWandering(current=>{const next=!current;try{localStorage.setItem("elya.ellieMotion",next?"on":"off");}catch{}return next;});}
 const launcher=useRef<HTMLButtonElement>(null),closeButton=useRef<HTMLButtonElement>(null);
 function close(){setOpen(false);launcher.current?.focus();}
 useEffect(()=>{if(open)closeButton.current?.focus();},[open]);
 useEffect(()=>{if(navigation?.settings)setOpen(false);},[navigation?.settings]);
 useEffect(()=>{if(!open)return;const escape=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();close();}};document.addEventListener("keydown",escape);return()=>document.removeEventListener("keydown",escape);},[open]);
 const link=(url:string,label:string)=><a href={url} target="_blank" rel="noopener noreferrer">{label} <span aria-hidden="true">↗</span></a>;
 return <div role="region" className={"ellie-root"+(!open&&wandering?" ellie-wanders":"")} aria-label="Ellie support" hidden={navigation?.settings}>
 {open&&<section id="ellie-panel" className="ellie-panel" role="dialog" aria-modal="false" aria-labelledby="ellie-title">
  <header><div className="ellie-avatar"><EllieIcon/></div><div><h2 id="ellie-title">A little support, with Ellie</h2><p>Your guide to resources and reflection</p></div><button ref={closeButton} className="ellie-close" aria-label="Close Ellie" onClick={close}>×</button></header>
  <div className="ellie-body">
  {topic!=="home"&&<button className="ellie-back" onClick={()=>setTopic("home")}>← All support</button>}
  {topic==="home"&&<><p className="ellie-intro">You don’t have to find all the words at once. Where would you like to start?</p><div className="ellie-options"><button onClick={()=>setTopic("support")}><strong>Find your people</strong><span>Support groups and patient communities</span></button><button onClick={()=>setTopic("learn")}><strong>Understand your body</strong><span>Short reads about endometriosis and periods</span></button><button onClick={()=>setTopic("prepare")}><strong>Find the words</strong><span>Prepare for your journal or an appointment</span></button></div></>}
  {topic==="support"&&<><h3>Find your people</h3><p>Browse patient organizations by country, or explore online and local groups. You can check meeting details and eligibility directly with the organizer.</p><div className="ellie-resource"><strong>Worldwide directory</strong><p>National endometriosis organizations and support networks.</p>{link(sources.groups,"Browse by country")}</div><div className="ellie-resource"><strong>Endometriosis UK</strong><p>Local groups, an online group, and a community forum.</p>{link(sources.uk,"Explore UK support")}</div><p className="ellie-small">These are independent services. Opening a resource does not share your Elya journal. Check each service’s privacy and membership terms before joining.</p></>}
  {topic==="learn"&&<><h3>A little clarity</h3><div className="ellie-resource"><strong>Symptoms aren’t limited to bleeding days</strong><p>Endometriosis can involve ongoing pelvic pain, fatigue, bloating, or pain with bowel movements or urination. A symptom pattern alone cannot confirm a diagnosis.</p>{link(sources.who,"Read the WHO fact sheet")}</div><div className="ellie-resource"><strong>Your cycle is more than your period</strong><p>The menstrual cycle includes the days between periods. Keeping dates alongside your symptoms can help you describe when things happen.</p>{link(sources.nhs,"Explore the NHS period guide")}</div><p className="ellie-small">General education, reviewed November 14, 2026. A healthcare professional can discuss your individual symptoms.</p></>}
  {topic==="prepare"&&<><h3>Your experience, in your words</h3><p>You can begin with one sentence. There is no perfect way to describe what you’re feeling.</p><blockquote>“It started __. It felt __. It stopped me from __. I tried __, and it __.”</blockquote><h4>Questions you could bring</h4><ul><li>What could explain these symptoms, including symptoms before bleeding?</li><li>What evaluation or referral would you recommend?</li><li>What should I record before our next appointment?</li></ul><p>Ellie also guides optional journal reflections. Your answers stay yours to review before saving.</p><button className="ellie-journal" onClick={()=>{close();navigation?.navigateTo("Your story");}}>Open my journal</button><button className="ellie-back" onClick={()=>{close();navigation?.navigateTo("Appointment brief");}}>View my appointment brief →</button></>}
  </div><footer>Ellie is Elya’s digital guide, not a person or clinician. Resources and prompts—not a diagnostic chat.<button className="ellie-motion-toggle" aria-pressed={!wandering} onClick={toggleWandering}>{wandering?"Pause Ellie’s wandering":"Let Ellie wander"}</button></footer>
 </section>}
 <button ref={launcher} className="ellie-launcher" aria-label={open?"Close Ellie support":"Open Ellie support"} aria-expanded={open} aria-controls="ellie-panel" onClick={()=>{if(open)close();else{setTopic("home");setOpen(true);}}}><EllieIcon/><span>Ellie</span></button>
 </div>;
}
