"use client";
import {useEffect,useState} from "react";
import {conversationAudio,type AudioState} from "../lib/conversation-audio";
import {VOICE,SAMPLE_LINES} from "../lib/conversation-voice-config";
export function BrowserVoicePreferences(){
 const [mode,setMode]=useState("type");const [speed,setSpeed]=useState(VOICE.speed);const [audio,setAudio]=useState<AudioState>(conversationAudio.state);
 useEffect(()=>{try{setMode(localStorage.getItem("elya.journalMode")??"type");const saved=Number(localStorage.getItem("elya.voiceSpeed")??VOICE.speed);if(saved>=.8&&saved<=1.2)setSpeed(saved);}catch{}return conversationAudio.subscribe(setAudio);},[]);
 return <div className="browser-voice-preferences"><p>elya’s feminine voice is AI-generated, not a person or clinician. Questions use prepared audio; no API key is needed and no journal text is sent for speech. Dictation may use your browser’s speech service. Captions stay visible.</p><button type="button" className="button" onClick={()=>audio.phase!=="idle"?conversationAudio.stop():void conversationAudio.speak([SAMPLE_LINES[0]])}>{audio.phase!=="idle"?"Stop speaking":"Play sample"}</button><label>Speaking speed: {speed.toFixed(2)}×<input aria-label="Speaking speed" type="range" min="0.8" max="1.2" step="0.05" value={speed} onChange={e=>{const value=Number(e.target.value);setSpeed(value);localStorage.setItem("elya.voiceSpeed",String(value));}}/></label>{audio.caption&&<p aria-label="Spoken caption">{audio.caption}</p>}{audio.notice&&<p role="status">{audio.notice}</p>}</div>;
}
