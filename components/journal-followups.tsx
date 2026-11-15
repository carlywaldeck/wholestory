"use client";
import {EllieIcon} from "./ellie-support";
import {useEffect,useMemo,useRef,useState} from "react";
import {conversationAudio,type AudioState} from "../lib/conversation-audio";
import {reflection} from "../lib/conversation-voice-config";
import {useJournalDictation} from "../hooks/use-journal-dictation";
import {nextJournalQuestion,type FollowupTurn,type FollowupQuestion} from "../lib/journal-followups";
export function JournalFollowups({text,edits={},selected=[],absent=[],symptomFree=false,sessionKey,onUpdate,onActivity,disabled=false,paused=false,mode="type"}:{text:string;edits?:Record<string,string>;selected?:string[];absent?:string[];symptomFree?:boolean;sessionKey:string;onUpdate:(turns:FollowupTurn[])=>void;onActivity:(active:boolean)=>void;disabled?:boolean;paused?:boolean;mode?:"type"|"speak"}){
 const talking=useRef(false);
 const [editing,setEditing]=useState(false);
 const [turns,setTurns]=useState<FollowupTurn[]>([]);const [answer,setAnswer]=useState("");const [stopped,setStopped]=useState(false);const [speaking,setSpeaking]=useState(false);const [notice,setNotice]=useState("");
 const question=useMemo(()=>nextJournalQuestion(text,turns.map(t=>edits[t.question.id]!==undefined?{...t,answer:edits[t.question.id],status:"answered"}:t),{selected,symptomFree,absent}),[text,turns,selected.join("|"),absent.join("|"),symptomFree,JSON.stringify(edits)]);
 const [audioState,setAudioState]=useState<AudioState>(conversationAudio.state);
 useEffect(()=>conversationAudio.subscribe(s=>{setAudioState(s);setSpeaking(s.phase!=="idle");}),[]);
 const mic=useJournalDictation(addition=>setAnswer(v=>[v,addition].filter(Boolean).join(" ")),sessionKey+":"+(question?.id??"none"));
 function stopVoice(){conversationAudio.stop();}
 useEffect(()=>{if(paused){talking.current=false;stopVoice();mic.cancel();}},[paused]);
 useEffect(()=>{setAnswer("");setEditing(false);stopVoice();mic.cancel();if(talking.current&&mode==="speak"&&!paused&&question&&localStorage.getItem("elya.autoReplies")==="on")read();},[question?.id]);
 useEffect(()=>()=>conversationAudio.stop(),[]);
 useEffect(()=>{onActivity(mic.active||speaking);},[mic.active,speaking,onActivity]);
 const makeTurn=(q:FollowupQuestion,value:string):FollowupTurn=>({question:q,answer:value.trim(),status:value.trim()==="Prefer not to answer"?"declined":value.trim()==="Not applicable"?"not-applicable":value.trim()==="Not sure"?"unknown":"answered"});
 useEffect(()=>{onUpdate([...turns,...(question&&answer.trim()?[makeTurn(question,answer)]:[])]);},[turns,answer,question?.id,onUpdate]);
 function proceed(skip=false,finish=false){if(mic.active)return;stopVoice();if(question&&(skip||answer.trim()))setTurns(v=>[...v,skip?{question,answer:"",skipped:true,status:"skipped"}:makeTurn(question,answer)]);setAnswer("");if(finish)setStopped(true);}
 function read(){if(!question)return;talking.current=true;const last=turns.filter(t=>!t.skipped).at(-1);void conversationAudio.speak([...(last?[reflection(last.answer)]:[]),question.spokenText],!!last);}

 if(!question&&!turns.length)return null;
 return <section className={"journal-followups"+(mode==="speak"?" followups-spoken":"")} aria-label="Optional follow-up">
 {!stopped&&question?<>
 <div className="ellie-journal-identity"><EllieIcon/><span>With Ellie · optional reflection</span></div>
 <div className="followup-topline"><span>{mode==="speak"?"AI voice · Optional":"Optional detail"}</span></div>
 <p className="followup-question" aria-live="polite">{mode==="speak"?question.spokenText:question.text}</p>
 {mode==="type"?<>
 <div className="journal-symptom-bubbles">{[...question.options,...(!question.options.includes("Prefer not to answer")?["Prefer not to answer"]:[]),"Not applicable"].map(option=><button type="button" key={option} aria-pressed={answer===option} disabled={disabled||mic.active} onClick={()=>setAnswer(option)}>{answer===option?"✓ ":""}{option}</button>)}</div>
 <label htmlFor="followup-answer">Your answer</label><textarea id="followup-answer" maxLength={1000} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Answer in your own words."/>
 </>:<>
 {answer&&<p className="followup-answer-preview" aria-live="polite">“{answer}”</p>}
 <div className="followup-voice-action"><button type="button" className="button primary" disabled={disabled||paused} onClick={()=>{if(speaking){talking.current=false;stopVoice();}else if(mic.active){mic.stop();}else if(answer.trim()){proceed();}else{stopVoice();mic.start();}}}>{speaking?"Stop speaking":mic.active?"Done speaking":answer.trim()?"Continue":"Answer"}</button>
 {!speaking&&!mic.active&&<button type="button" className="back-link" onClick={read}>Hear question</button>}</div>
 <div className="followup-edit"><button type="button" className="back-link" aria-expanded={editing} aria-controls="followup-edit-field" onClick={()=>setEditing(v=>!v)}>Edit answer</button>{editing&&<div id="followup-edit-field"><label htmlFor="followup-answer">Your answer</label><textarea id="followup-answer" maxLength={1000} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Correct your words here."/></div>}</div>
 </>}
 <div className="followup-actions">{mode==="type"&&<button type="button" className="button" disabled={disabled||!answer.trim()} onClick={()=>proceed()}>Next question</button>}<button type="button" className="back-link" disabled={mic.active} onClick={()=>proceed(true)}>Skip</button><button type="button" className="back-link" disabled={mic.active} onClick={()=>{talking.current=false;proceed(false,true);}}>Finish questions</button></div>
 {(audioState.phase==="thinking"||mic.active||audioState.notice||mic.message||audioState.phase==="speaking"&&audioState.caption!==question.spokenText)&&<div className="followup-status" role="status">{audioState.phase==="thinking"?<p>Preparing voice…</p>:mic.active?<p>Listening…</p>:null}{audioState.phase==="speaking"&&audioState.caption!==question.spokenText&&<p aria-label="Spoken caption">{audioState.caption}</p>}{audioState.notice&&<p>{audioState.notice}</p>}{mic.message&&!mic.active&&<p>{mic.message}</p>}</div>}
 </>:<p role="status">You can review and save your entry.</p>}
 </section>;
}
