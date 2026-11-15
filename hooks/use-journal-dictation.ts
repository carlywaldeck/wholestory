"use client";
import {useEffect,useRef,useState} from "react";
type Result=ArrayLike<{transcript:string}>&{isFinal?:boolean};
type Recognition={lang:string;continuous:boolean;interimResults:boolean;start:()=>void;stop:()=>void;abort:()=>void;onstart:(()=>void)|null;onend:(()=>void)|null;onerror:((e:{error:string})=>void)|null;onresult:((e:{results:ArrayLike<Result>})=>void)|null};
export function useJournalDictation(append:(text:string)=>void,sessionKey:string){
 const current=useRef<Recognition|null>(null);const appendRef=useRef(append);appendRef.current=append;
 const [state,setState]=useState<"idle"|"starting"|"recording">("idle");const [message,setMessage]=useState("");
 function cancel(){const r=current.current;current.current=null;if(r){r.onresult=null;r.onstart=null;r.onend=null;r.onerror=null;r.abort();}setState("idle");}
 useEffect(()=>{return()=>{const r=current.current;if(r){r.onresult=null;r.onstart=null;r.onend=null;r.onerror=null;r.abort();current.current=null;}};},[sessionKey]);
 useEffect(()=>{setState("idle");setMessage("");const hide=()=>{if(document.hidden&&current.current){cancel();setMessage("Recording stopped when the page was hidden. Your transcript is still editable.");}};document.addEventListener("visibilitychange",hide);return()=>document.removeEventListener("visibilitychange",hide);},[sessionKey]);
 function stop(){const r=current.current;if(!r)return;try{r.stop();}catch{cancel();}}
 function start(){
  if(current.current)return;
  if(!window.isSecureContext){setMessage("Speak needs HTTPS or localhost. Open the localhost Journal to use the microphone; typing and saving work here.");return;}
  const api=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};const Constructor=api.SpeechRecognition??api.webkitSpeechRecognition;
  if(!Constructor){setMessage("This browser does not support voice-to-text. Open this same Elya link in a normal Chrome tab, allow Microphone, then press Speak. Embedded previews may not support dictation. Your typed entry is preserved.");return;}
  const r=new Constructor();current.current=r;r.lang=navigator.language||"en-US";r.continuous=true;r.interimResults=false;let consumed=0,failed=false;
  r.onstart=()=>{if(current.current===r){setState("recording");setMessage("Recording. Speak naturally, then select Stop recording.");}};
  r.onresult=e=>{if(current.current!==r)return;const additions:string[]=[];for(let i=consumed;i<e.results.length;i++){if(e.results[i].isFinal===false)break;additions.push(e.results[i][0].transcript);consumed=i+1;}if(additions.length)appendRef.current(additions.join(" "));};
  r.onerror=e=>{if(current.current!==r)return;failed=true;const messages:Record<string,string>={"not-allowed":"Microphone permission was denied. Allow microphone access in your browser’s site settings, then try Speak again. Typing is still available.","service-not-allowed":"This browser blocked speech transcription. Open Elya in a normal Chrome tab and allow Microphone in the site settings, then press Speak. Your typed entry is preserved.","audio-capture":"No microphone is available. Check your microphone connection or keep typing.","network":"The browser’s speech service could not connect. Keep typing or try Speak again.","no-speech":"No speech was detected. Try Speak again or keep typing."};setMessage(messages[e.error]??"Transcription stopped. Your text is preserved; keep typing or try again.");cancel();};
  r.onend=()=>{if(current.current!==r)return;current.current=null;setState("idle");if(!failed)setMessage("Transcription stopped. Review or edit your words before saving.");};
  setState("starting");setMessage("Waiting for microphone permission…");try{r.start();}catch{cancel();setMessage("Speech transcription could not start. Your text is preserved; you can keep typing.");}
 }
 return {state,message,active:state!=="idle",start,stop,cancel};
}
