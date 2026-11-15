"use client";
import {useEffect,useRef,useState} from "react";
import {useJournalDictation} from "../hooks/use-journal-dictation";
import {nextJournalQuestion,followupFact,type FollowupTurn,type FollowupQuestion} from "../lib/journal-followups";
import type {Fact} from "../lib/model";
export function JournalFollowups({text,sessionKey,onAnswer,onActivity,disabled=false,paused=false,mode="speak"}:{text:string;sessionKey:string;onAnswer:(question:string,answer:string,fact:Fact|null)=>void;onActivity:(active:boolean)=>void;disabled?:boolean;paused?:boolean;mode?:"type"|"speak"}){
 const [question,setQuestion]=useState<FollowupQuestion|null>(null);const [turns,setTurns]=useState<FollowupTurn[]>([]);const [answer,setAnswer]=useState("");const [started,setStarted]=useState(false);const [finished,setFinished]=useState(false);const [speaking,setSpeaking]=useState(false);const [notice,setNotice]=useState("");
 const utterance=useRef<SpeechSynthesisUtterance|null>(null);const base=useRef("");
 const mic=useJournalDictation(addition=>setAnswer(value=>[value,addition].filter(Boolean).join(" ")),sessionKey+":followup:"+(question?.id??"none"));
 function stopVoice(){if(utterance.current){utterance.current.onend=null;utterance.current.onerror=null;window.speechSynthesis?.cancel();utterance.current=null;}setSpeaking(false);}
 useEffect(()=>{if(paused){stopVoice();mic.cancel();}},[paused]);
 useEffect(()=>{return()=>{onActivity(false);if(utterance.current){utterance.current.onend=null;utterance.current.onerror=null;window.speechSynthesis?.cancel();}};},[sessionKey]);
 useEffect(()=>{onActivity(mic.active||speaking||!!answer.trim()||(started&&!finished&&question!==null));},[mic.active,speaking,answer,started,finished,question,onActivity]);
 function finish(){stopVoice();mic.cancel();if(question&&answer.trim())onAnswer(question.text,answer.trim(),followupFact({question,answer:answer.trim()}));setAnswer("");setFinished(true);setQuestion(null);}
 function read(q:FollowupQuestion){
  stopVoice();setNotice("");if(mode==="type")return;if(!("speechSynthesis" in window)||typeof SpeechSynthesisUtterance==="undefined"){setNotice("This browser cannot read aloud. The question is shown below.");return;}
  const utteranceValue=new SpeechSynthesisUtterance(q.text);const voices=window.speechSynthesis.getVoices();
  try{const chosen=localStorage.getItem("elya.followupVoice")??"";utteranceValue.voice=voices.find(v=>v.voiceURI===chosen)??null;const rate=Number(localStorage.getItem("elya.followupPace")??1);utteranceValue.rate=[.9,1,1.1].includes(rate)?rate:1;}catch{}
  utteranceValue.onend=()=>{setSpeaking(false);utterance.current=null;};utteranceValue.onerror=()=>{setSpeaking(false);setNotice("Audio could not play. You can read the question and type or speak your answer.");};utterance.current=utteranceValue;setSpeaking(true);try{window.speechSynthesis.speak(utteranceValue);}catch{stopVoice();setNotice("Audio could not start. You can still read and answer the question.");}
 }
 function start(){base.current=text;setStarted(true);setTurns([]);setAnswer("");setNotice("");const q=nextJournalQuestion(text,[]);setQuestion(q);setFinished(!q);if(q)read(q);}
 function proceed(skip=false){
  if(!question||mic.active||speaking||(!skip&&!answer.trim()))return;
  const turn:FollowupTurn={question,answer:skip?"":answer.trim(),skipped:skip};const nextTurns=[...turns,turn];
  if(!skip)onAnswer(question.text,turn.answer,followupFact(turn));
  setTurns(nextTurns);setAnswer("");const q=nextJournalQuestion(base.current,nextTurns);setQuestion(q);if(q)read(q);else{setFinished(true);stopVoice();}
 }
 if(!text.trim()&&!started)return null;
 return <section className="journal-followups" aria-label="Optional follow-up conversation">
  {!started?<><button type="button" className="button" disabled={disabled} onClick={start}>Answer a few follow-ups</button><p className="followup-note">One question at a time. Skip any question or finish whenever you like.</p></>:finished?<p role="status">You can review your entry and add it to your calendar.</p>:question&&<>
   <div className="followup-topline"><span>Optional follow-up {turns.length+1} of up to 3</span><button type="button" className="back-link" onClick={finish}>Finish questions</button></div>
   <p className="followup-question" aria-live="polite">{question.text}</p>
   {mode==="speak"&&<div className="followup-audio"><button type="button" className="button" disabled={mic.active} onClick={()=>speaking?stopVoice():read(question)}>{speaking?"Stop speaking":"Read question aloud"}</button></div>}
   <label htmlFor="followup-answer">Your answer</label><textarea id="followup-answer" readOnly={mode==="speak"} placeholder={mode==="speak"?"Press Speak answer. Your transcript appears here.":"Write your answer."} maxLength={1000} value={answer} onChange={e=>setAnswer(e.target.value)} disabled={speaking}/>
   <div className="followup-actions">{mode==="speak"&&<button type="button" className="button" disabled={speaking||disabled} onClick={mic.active?mic.stop:()=>{stopVoice();mic.start();}}>{mic.active?"Stop recording answer":"Speak answer"}</button>}<button type="button" className="button primary" disabled={mic.active||speaking||!answer.trim()||disabled} onClick={()=>proceed()}>{turns.length===2?"Finish":"Next question"}</button><button type="button" className="back-link" disabled={mic.active||speaking||disabled} onClick={()=>proceed(true)}>Skip</button></div>
   {(notice||mic.message)&&<p role="status">{notice||mic.message}</p>}
  </>}
  <p className="followup-note">Adapted from Endometriosis.org’s first-consultation guide. These questions help document your experience; they do not diagnose.</p>
 </section>;
}
