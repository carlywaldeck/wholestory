"use client";
import {EllieIcon} from "./ellie-support";
import {useEffect,useMemo,useRef,useState} from "react";
import {conversationAudio,type AudioState} from "../lib/conversation-audio";
import {useJournalDictation} from "../hooks/use-journal-dictation";
import {nextJournalQuestion,type FollowupTurn,type FollowupQuestion} from "../lib/journal-followups";
export function JournalFollowups({text,edits={},selected=[],absent=[],symptomFree=false,sessionKey,onUpdate,onActivity,disabled=false,paused=false,mode="type",autoStart=false,onComplete,openingFirst=false,onOpening}:{text:string;edits?:Record<string,string>;selected?:string[];absent?:string[];symptomFree?:boolean;sessionKey:string;onUpdate:(turns:FollowupTurn[])=>void;onActivity:(active:boolean)=>void;disabled?:boolean;paused?:boolean;mode?:"type"|"speak";autoStart?:boolean;onComplete?:()=>void;openingFirst?:boolean;onOpening?:(text:string)=>void}){
 const talking=useRef(false);const listenAllowed=useRef(false);
 const completeRef=useRef(onComplete);completeRef.current=onComplete;const completed=useRef(false);
 const [automatic,setAutomatic]=useState(autoStart);
 const automaticRef=useRef(automatic);automaticRef.current=automatic;
 const [openingDone,setOpeningDone]=useState(false);const opening=openingFirst&&!openingDone;
 const previousQuestion=useRef<string|undefined>(undefined);
 useEffect(()=>{if(autoStart)setAutomatic(true);},[autoStart]);
 const [editing,setEditing]=useState(false);
 const [turns,setTurns]=useState<FollowupTurn[]>([]);const [answer,setAnswer]=useState("");const [stopped,setStopped]=useState(false);const [speaking,setSpeaking]=useState(false);const [notice,setNotice]=useState("");
 const followupQuestion=useMemo(()=>nextJournalQuestion(text,turns.map(t=>edits[t.question.id]!==undefined?{...t,answer:edits[t.question.id],status:"answered"}:t),{selected,symptomFree,absent}),[text,turns,selected.join("|"),absent.join("|"),symptomFree,JSON.stringify(edits)]);
 const question=opening?{id:"day-opening",text:"What’s been bothering you today?",spokenText:"What's been bothering you today?",options:[] as string[]}:followupQuestion;
 const [audioState,setAudioState]=useState<AudioState>(conversationAudio.state);
 useEffect(()=>conversationAudio.subscribe(s=>{setAudioState(s);setSpeaking(s.phase!=="idle");}),[]);
 const mic=useJournalDictation(addition=>setAnswer(v=>[v,addition].filter(Boolean).join(" ")),sessionKey+":"+(question?.id??"none"));
 function stopVoice(){conversationAudio.stop();}
 useEffect(()=>{if(paused){listenAllowed.current=false;setAutomatic(false);talking.current=false;stopVoice();mic.cancel(true);}},[paused]);
 useEffect(()=>{
  const changed=previousQuestion.current!==question?.id;previousQuestion.current=question?.id;
  if(changed){setAnswer("");setEditing(false);}
  stopVoice();mic.cancel(true);let active=true;
  if(automatic&&!paused&&!stopped&&question){
   listenAllowed.current=true;
   void conversationAudio.speak([question.spokenText]).then(()=>{
    if(active&&listenAllowed.current&&automaticRef.current&&!document.hidden&&!conversationAudio.state.notice)mic.start();
   });
  }else if(!automatic&&talking.current&&mode==="speak"&&!paused&&question&&localStorage.getItem("elya.autoReplies")==="on")read();
  return()=>{active=false;listenAllowed.current=false;stopVoice();mic.cancel(true);};
 },[question?.id,automatic,paused,stopped]);
 useEffect(()=>{if(automatic&&answer.trim()&&mic.active){const timer=setTimeout(()=>mic.stop(),1400);return()=>clearTimeout(timer);}},[answer,automatic,mic.active]);
 useEffect(()=>{if(automatic&&!paused&&!speaking&&!mic.active&&answer.trim()&&question){const timer=setTimeout(()=>proceed(),650);return()=>clearTimeout(timer);}},[answer,automatic,speaking,mic.active,paused,question?.id]);
 useEffect(()=>{if((stopped||!question&&(turns.length>0||openingFirst&&openingDone))&&!speaking&&!mic.active&&!automatic&&!completed.current){completed.current=true;completeRef.current?.();}},[stopped,question?.id,speaking,mic.active,automatic,openingDone]);
 useEffect(()=>{if(automatic&&stopped){setAutomatic(false);return;}if(automatic&&!question){let active=true;void conversationAudio.speak(["Thanks for telling me. You can review your entry when you're ready."]).then(()=>{if(active)setAutomatic(false);});return()=>{active=false;};}},[question?.id,stopped,automatic]);
 useEffect(()=>{if(automatic&&!mic.active&&mic.message&&!mic.message.startsWith("Transcription stopped")){setNotice(mic.message);setAutomatic(false);}},[mic.message,mic.active,automatic]);
 useEffect(()=>()=>conversationAudio.stop(),[]);
 useEffect(()=>{onActivity(mic.active||speaking||(automatic&&!!question&&!stopped));},[mic.active,speaking,automatic,question?.id,stopped,onActivity]);
 const makeTurn=(q:FollowupQuestion,value:string):FollowupTurn=>({question:q,answer:value.trim(),status:value.trim()==="Prefer not to answer"?"declined":value.trim()==="Not applicable"?"not-applicable":value.trim()==="Not sure"?"unknown":"answered"});
 useEffect(()=>{onUpdate([...turns,...(!opening&&followupQuestion&&answer.trim()?[makeTurn(followupQuestion,answer)]:[])]);},[turns,answer,question?.id,onUpdate]);
 function proceed(skip=false,finish=false){listenAllowed.current=false;mic.cancel(true);stopVoice();if(opening){if(!skip&&answer.trim())onOpening?.(answer.trim());setOpeningDone(true);}else if(followupQuestion&&(skip||answer.trim()))setTurns(v=>[...v,skip?{question:followupQuestion,answer:"",skipped:true,status:"skipped"}:makeTurn(followupQuestion,answer)]);setAnswer("");if(finish)setStopped(true);}
 function read(){if(!question)return;talking.current=true;void conversationAudio.speak([question.spokenText]);}

 if(!question&&!turns.length)return null;
 return <section className={"journal-followups"+(mode==="speak"?" followups-spoken":"")} aria-label="Optional follow-up">
 {!stopped&&question?<>
 <div className="ellie-journal-identity"><EllieIcon/><span>With Ellie · optional reflection</span></div>
 <p className="followup-note">Ellie is Elya's voice journal assistant.</p>
 <div className="conversation-control"><button type="button" className="text-action" onClick={()=>{if(automatic){listenAllowed.current=false;setAutomatic(false);talking.current=false;stopVoice();mic.cancel(true);}else{setNotice("");void conversationAudio.unlock().catch(()=>{});setAutomatic(true);}}}>{automatic?"Pause conversation":"Start voice conversation"}</button><span>{automatic?"Ellie speaks, then listens. Answers advance automatically.":"Optional. You can answer by voice, tap an option, or type."}</span></div>
 <div className="followup-topline"><span>{mode==="speak"?"AI voice · Optional":"Optional detail"}</span></div>
 <p className="followup-question" aria-live="polite">{mode==="speak"?question.spokenText:question.text}</p>
 {!opening&&<div className="journal-symptom-bubbles">{[...question.options,...(!question.options.includes("Prefer not to answer")?["Prefer not to answer"]:[]),"Not applicable"].map(option=><button type="button" key={option} aria-pressed={answer===option} disabled={disabled} onClick={()=>{listenAllowed.current=false;mic.cancel(true);stopVoice();setAnswer(option);}}>{answer===option?"✓ ":""}{option}</button>)}</div>}
 {mode==="type"&&!automatic?<>
 <label htmlFor="followup-answer">Your answer</label><textarea id="followup-answer" maxLength={1000} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Answer in your own words."/>
 </>:<>
 {answer&&<p className="followup-answer-preview" aria-live="polite">“{answer}”</p>}
 <div className="followup-voice-action"><button type="button" className="button primary" disabled={disabled||paused} onClick={()=>{if(speaking){listenAllowed.current=false;talking.current=false;stopVoice();}else if(mic.active){mic.stop();}else if(answer.trim()){proceed();}else{stopVoice();mic.start();}}}>{speaking?"Stop speaking":mic.active?"Done speaking":answer.trim()?"Continue":"Answer"}</button>
 {!automatic&&!speaking&&!mic.active&&<button type="button" className="back-link" onClick={read}>Hear question</button>}</div>
 <div className="followup-edit"><button type="button" className="back-link" aria-expanded={editing} aria-controls="followup-edit-field" onClick={()=>{listenAllowed.current=false;setAutomatic(false);stopVoice();mic.cancel(true);setEditing(v=>!v);}}>{opening?"Type instead":"Edit answer"}</button>{editing&&<div id="followup-edit-field"><label htmlFor="followup-answer">Your answer</label><textarea id="followup-answer" maxLength={1000} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder={opening?"Tell Ellie how your day felt.":"Correct your words here."}/></div>}</div>
 </>}
 <div className="followup-actions">{mode==="type"&&!automatic&&<button type="button" className="button" disabled={disabled||!answer.trim()} onClick={()=>proceed()}>Next question</button>}<button type="button" className="back-link" onClick={()=>proceed(true)}>Skip</button><button type="button" className="back-link" onClick={()=>{talking.current=false;proceed(false,true);}}>Finish conversation</button></div>
 {(notice||audioState.phase==="thinking"||mic.active||audioState.notice||mic.message||audioState.phase==="speaking"&&audioState.caption!==question.spokenText)&&<div className="followup-status" role="status">{notice&&<p>{notice} You can type your answer instead.</p>}{audioState.phase==="thinking"?<p>Preparing voice…</p>:mic.active?<p>Listening…</p>:null}{audioState.phase==="speaking"&&audioState.caption!==question.spokenText&&<p aria-label="Spoken caption">{audioState.caption}</p>}{audioState.notice&&<p>{audioState.notice}</p>}{mic.message&&!mic.active&&<p>{mic.message}</p>}</div>}
 </>:<p role="status">You can review and save your entry.</p>}
 </section>;
}
