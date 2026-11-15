// @vitest-environment jsdom
import {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const audio=vi.hoisted(()=>({state:{phase:'idle',caption:'',notice:''},speak:vi.fn(async(_lines:string[],_acknowledge=false)=>{}),stop:vi.fn(),unlock:vi.fn(async()=>{}),subscribe:vi.fn((fn:any)=>{fn({phase:'idle',caption:'',notice:''});return()=>{};})}));
vi.mock('../lib/conversation-audio',()=>({conversationAudio:audio}));
import {JournalFollowups} from './journal-followups';
class Mic{static instances:Mic[]=[];lang='';continuous=false;interimResults=false;onstart:any=null;onend:any=null;onerror:any=null;onresult:any=null;constructor(){Mic.instances.push(this);}start=vi.fn(()=>this.onstart?.());stop=vi.fn(()=>this.onend?.());abort=vi.fn();}
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.clearAllMocks();Mic.instances=[];});
it('speaks and listens once started, then advances from a final transcript without Hear question',async()=>{
 vi.stubGlobal('isSecureContext',true);vi.stubGlobal('SpeechRecognition',Mic);const update=vi.fn();render(<JournalFollowups autoStart mode="speak" text="I have cramps." sessionKey="test" onUpdate={update} onActivity={vi.fn()}/>);
 await waitFor(()=>expect(Mic.instances.length).toBeGreaterThan(0));expect(audio.speak).toHaveBeenCalledWith(['How strong is the pain right now?']);
 act(()=>Mic.instances.at(-1)!.onresult({results:[Object.assign([{transcript:'Moderate'}],{isFinal:true})]}));
 await waitFor(()=>expect(audio.speak.mock.calls.length).toBeGreaterThanOrEqual(2),{timeout:4000});expect(update.mock.calls.some(c=>c[0].some((t:any)=>t.answer==='Moderate'))).toBe(true);expect(audio.speak.mock.calls[1][0].at(-1)).not.toBe('How strong is the pain right now?');
});
it('pauses recording and preserves the stop control instead of requesting another question',async()=>{
 vi.stubGlobal('isSecureContext',true);vi.stubGlobal('SpeechRecognition',Mic);const user=userEvent.setup();render(<JournalFollowups autoStart mode="speak" text="I have cramps." sessionKey="test" onUpdate={vi.fn()} onActivity={vi.fn()}/>);
 await waitFor(()=>expect(Mic.instances.length).toBeGreaterThan(0));await user.click(screen.getByRole('button',{name:'Pause conversation'}));expect(Mic.instances.at(-1)!.abort).toHaveBeenCalled();expect(screen.getByRole('button',{name:'Start voice conversation'})).toBeTruthy();
});
it('lets a user finish while listening and opens review exactly once',async()=>{
 vi.stubGlobal('isSecureContext',true);vi.stubGlobal('SpeechRecognition',Mic);const user=userEvent.setup();const complete=vi.fn();render(<JournalFollowups autoStart mode="speak" text="I have cramps." sessionKey="finish" onUpdate={vi.fn()} onActivity={vi.fn()} onComplete={complete}/>);
 await waitFor(()=>expect(Mic.instances.length).toBeGreaterThan(0));await user.click(screen.getByRole('button',{name:'Finish conversation'}));await waitFor(()=>expect(complete).toHaveBeenCalledTimes(1));expect(Mic.instances.at(-1)!.abort).toHaveBeenCalled();
});
it('releases the conversation when speech recognition is unsupported and offers typed answers',async()=>{
 vi.stubGlobal('isSecureContext',true);vi.stubGlobal('SpeechRecognition',undefined);vi.stubGlobal('webkitSpeechRecognition',undefined);const activity=vi.fn();render(<JournalFollowups autoStart mode="speak" text="I have cramps." sessionKey="fallback" onUpdate={vi.fn()} onActivity={activity}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Start voice conversation'})).toBeTruthy());expect(activity.mock.calls.at(-1)?.[0]).toBe(false);expect(screen.getByRole('button',{name:'Moderate'})).toBeTruthy();
});

it('does not open the microphone after a tapped answer interrupts question playback',async()=>{
 vi.stubGlobal('isSecureContext',true);vi.stubGlobal('SpeechRecognition',Mic);let finish!:()=>void;audio.speak.mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve;}));const user=userEvent.setup();render(<JournalFollowups autoStart mode="speak" text="I have cramps." sessionKey="tap" onUpdate={vi.fn()} onActivity={vi.fn()}/>);await user.click(screen.getByRole('button',{name:'Moderate'}));await act(async()=>finish());expect(Mic.instances).toHaveLength(0);
});

it('asks about the day first and uses that answer for the first symptom question',async()=>{
 vi.stubGlobal('isSecureContext',true);vi.stubGlobal('SpeechRecognition',Mic);const opening=vi.fn();const update=vi.fn(),activity=vi.fn();function Session(){const [text,setText]=useState('');return <JournalFollowups autoStart openingFirst mode="speak" text={text} onOpening={value=>{opening(value);setText(value);}} sessionKey="opening" onUpdate={update} onActivity={activity}/>;}render(<Session/>);await waitFor(()=>expect(Mic.instances.length).toBeGreaterThan(0));expect(audio.speak).toHaveBeenCalledWith(["What's been bothering you today?"]);expect(screen.queryByRole('button',{name:'Moderate'})).toBeNull();act(()=>Mic.instances.at(-1)!.onresult({results:[Object.assign([{transcript:'I had a headache today.'}],{isFinal:true})]}));await waitFor(()=>expect(opening).toHaveBeenCalledWith('I had a headache today.'),{timeout:5000});await waitFor(()=>expect(audio.speak).toHaveBeenCalledWith(['How strong is the headache right now?']));
});
