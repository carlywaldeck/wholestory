// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {renderHook,act,cleanup} from "@testing-library/react";
import {useJournalDictation} from "./use-journal-dictation";
class Mic{
 static latest:Mic;lang="";continuous=false;interimResults=false;onstart:(()=>void)|null=null;onend:(()=>void)|null=null;onerror:((e:{error:string})=>void)|null=null;onresult:((e:{results:any[]})=>void)|null=null;
 constructor(){Mic.latest=this;}start=vi.fn(()=>this.onstart?.());stop=vi.fn(()=>this.onend?.());abort=vi.fn();
}
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("does not request microphone access on insecure HTTP",()=>{
 vi.stubGlobal("isSecureContext",false);const constructor=vi.fn();vi.stubGlobal("SpeechRecognition",constructor);const {result}=renderHook(()=>useJournalDictation(vi.fn(),"entry"));act(()=>result.current.start());expect(constructor).not.toHaveBeenCalled();expect(result.current.message).toContain("HTTPS or localhost");
});
it("appends each final result once and never starts automatically",()=>{
 vi.stubGlobal("isSecureContext",true);vi.stubGlobal("SpeechRecognition",Mic);const append=vi.fn();const {result,unmount}=renderHook(()=>useJournalDictation(append,"entry"));expect(result.current.active).toBe(false);act(()=>result.current.start());expect(result.current.state).toBe("recording");
 act(()=>Mic.latest.onresult?.({results:[[{transcript:"Fictional sentence."}]]}));act(()=>Mic.latest.onresult?.({results:[[{transcript:"Fictional sentence."}],[{transcript:"Second sentence."}]]}));expect(append.mock.calls).toEqual([["Fictional sentence."],["Second sentence."]]);unmount();expect(Mic.latest.abort).toHaveBeenCalled();
});
it("preserves the draft and explains denied permission",()=>{
 vi.stubGlobal("isSecureContext",true);vi.stubGlobal("SpeechRecognition",Mic);const append=vi.fn();const {result}=renderHook(()=>useJournalDictation(append,"entry"));act(()=>result.current.start());act(()=>Mic.latest.onerror?.({error:"not-allowed"}));expect(result.current.active).toBe(false);expect(result.current.message).toContain("site settings");expect(append).not.toHaveBeenCalled();
});
it("aborts when the Journal date or page changes",()=>{
 vi.stubGlobal("isSecureContext",true);vi.stubGlobal("SpeechRecognition",Mic);const {result,rerender}=renderHook(({id})=>useJournalDictation(vi.fn(),id),{initialProps:{id:"2026-11-14"}});act(()=>result.current.start());const mic=Mic.latest;rerender({id:"2026-11-13"});expect(mic.abort).toHaveBeenCalled();expect(mic.onresult).toBeNull();expect(result.current.active).toBe(false);
});
