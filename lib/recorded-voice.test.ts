// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {ConversationAudio} from "./conversation-audio";
import {RECORDED_VOICE} from "./recorded-voice-manifest";
import {SAFE_SPEECH_TEXTS} from "./conversation-voice-config";
class Context{currentTime=0;destination={};resume=async()=>{};createBuffer(){return{duration:0,getChannelData:()=>new Float32Array(1)}}async decodeAudioData(){return{duration:.001}}createBufferSource(){return{buffer:null,playbackRate:{value:1},connect(){},start(){},stop(){}}}}
afterEach(()=>vi.unstubAllGlobals());
it("covers every approved spoken line with one prepared voice",()=>{for(const text of SAFE_SPEECH_TEXTS)expect(RECORDED_VOICE[text]).toMatch(/^\/media\/elya-voice\/.+\.wav$/);});
it("plays prepared audio instead of calling a speech API or system synthesis",async()=>{vi.stubGlobal("AudioContext",Context);const fetch=vi.fn().mockResolvedValue(new Response(new Uint8Array([0,0])));vi.stubGlobal("fetch",fetch);const systemSpeak=vi.fn();vi.stubGlobal("speechSynthesis",{cancel:vi.fn(),speak:systemSpeak});const audio=new ConversationAudio();const task=audio.speak(["Has anything helped?"]);await vi.waitFor(()=>expect(audio.state.phase).toBe("speaking"));audio.stop();await task;expect(fetch.mock.calls[0][0]).toBe(RECORDED_VOICE["Has anything helped?"]);expect(fetch.mock.calls.every(c=>String(c[0]).startsWith('/media/'))).toBe(true);expect(systemSpeak).not.toHaveBeenCalled();});
