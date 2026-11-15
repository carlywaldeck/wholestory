"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {conversationAudio,type AudioState} from "../lib/conversation-audio";
import {reflection} from "../lib/conversation-voice-config";
import {useJournalDictation} from "../hooks/use-journal-dictation";
import {nextJournalQuestion,type FollowupTurn,type FollowupQuestion} from "../lib/journal-followups";
export function JournalFollowups({text,edits={},selected=[],absent=[],symptomFree=false,sessionKey,onUpdate,onActivity,disabled=false,paused=false,mode="type"}:{text:string;edits?:Record<string,string>;selected?:string[];absent?:string[];symptomFree?:boolean;sessionKey:string;onUpdate:(turns:FollowupTurn[])=>void;onActivity:(active:boolean)=>void;disabled?:boolean;paused?:boolean;mode?:"type"|"speak"}){
 const talking=useRef(false);
 const [turns,setTurns]=useState<FollowupTurn[]>([]);const [answer,setAnswer]=useState("");const [stopped,setStopped]=useState(false);const [speaking,setSpeaking]=useState(false);const [notice,setNotice]=useState("");
 const question=useMemo(()=>nextJournalQuestion(text,turns.map(t=>edits[t.question.id]!==undefined?{...t,answer:edits[t.question.id],status:"answered"}:t),{selected,symptomFree,absent}),[text,turns,selected.join("|"),absent.join("|"),symptomFree,JSON.stringify(edits)]);
 const [audioState,setAudioState]=useState<AudioState>(conversationAudio.state);
 useEffect(()=>conversationAudio.subscribe(s=>{setAudioState(s);setSpeaking(s.phase!=="idle");}),[]);
 const mic=useJournalDictation(addition=>setAnswer(v=>[v,addition].filter(Boolean).join(" ")),sessionKey+":"+(question?.id??"none"));
 function stopVoice(){conversationAudio.stop();}
 useEffect(()=>{if(paused){talking.current=false;stopVoice();mic.cancel();}},[paused]);
 useEffect(()=>{setAnswer("");stopVoice();mic.cancel();if(talking.current&&mode==="speak"&&!paused&&question)read();},[question?.id]);
 useEffect(()=>()=>conversationAudio.stop(),[]);
 useEffect(()=>{onActivity(mic.active||speaking);},[mic.active,speaking,onActivity]);
 const makeTurn=(q:FollowupQuestion,value:string):FollowupTurn=>({question:q,answer:value.trim(),status:value.trim()==="Prefer not to answer"?"declined":value.trim()==="Not applicable"?"not-applicable":value.trim()==="Not sure"?"unknown":"answered"});
 useEffect(()=>{onUpdate([...turns,...(question&&answer.trim()?[makeTurn(question,answer)]:[])]);},[turns,answer,question?.id,onUpdate]);
 function proceed(skip=false,finish=false){if(mic.active)return;stopVoice();if(question&&(skip||answer.trim()))setTurns(v=>[...v,skip?{question,answer:"",skipped:true,status:"skipped"}:makeTurn(question,answer)]);setAnswer("");if(finish)setStopped(true);}
 function read(){if(!question)return;talking.current=true;const last=turns.filter(t=>!t.skipped).at(-1);void conversationAudio.speak([...(last?[reflection(last.answer)]:[]),question.spokenText],!!last);}

 if(!question&&!turns.length)return null;
 return <section className="journal-followups" aria-label="Optional follow-up">
 {!stopped&&question?<><div className="followup-topline"><span>Optional detail</span><button type="button" className="back-link" onClick={()=>proceed(false,true)}>Stop questions</button></div><p className="followup-question" aria-live="polite">{question.text}</p>
 {mode==="speak"&&<p className="followup-note">elya uses a computer-generated voice, not a person or clinician. Spoken replies stay on this device. Dictation may use your browser’s speech service.</p>}
 {mode==="speak"&&<button type="button" className="button" disabled={mic.active} onClick={speaking?()=>{talking.current=false;stopVoice();}:read}>{speaking?"Stop speaking":"Read question aloud"}</button>}
 <div className="journal-symptom-bubbles">{[...question.options,...(!question.options.includes("Prefer not to answer")?["Prefer not to answer"]:[]),"Not applicable"].map(option=><button type="button" key={option} aria-pressed={answer===option} disabled={disabled||mic.active} onClick={()=>setAnswer(option)}>{answer===option?"✓ ":""}{option}</button>)}</div>
 <label htmlFor="followup-answer">Your answer</label><textarea id="followup-answer" maxLength={1000} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Choose an option or add your own words."/>
 <div className="followup-actions">{mode==="speak"&&<button type="button" className="button" disabled={disabled||paused} onClick={mic.active?mic.stop:()=>{stopVoice();mic.start();}}>{mic.active?"Stop recording answer":"Speak answer"}</button>}<button type="button" className="button" disabled={disabled||mic.active||!answer.trim()} onClick={()=>proceed()}>Next question</button><button type="button" className="back-link" disabled={mic.active} onClick={()=>proceed(true)}>Skip</button></div>{(audioState.caption||audioState.notice||mic.message)&&<div role="status"><p>{audioState.phase==="thinking"?"Preparing voice…":mic.active?"Listening…":""}</p>{audioState.caption&&<p aria-label="Spoken caption">{audioState.caption}</p>}{audioState.notice&&<p>{audioState.notice}</p>}{mic.message&&<p>{mic.message}</p>}</div>}
 </>:<p role="status">You can review and save your entry.</p>}
 <p className="followup-note">You can skip questions and save at any time. Details are confirmed before saving.</p>
 </section>;
}
