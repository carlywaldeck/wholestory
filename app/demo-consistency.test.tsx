// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,cleanup,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './page';
import {navigate} from './test-navigation';
import * as storage from '../lib/storage';
import {clearLearningData} from '../lib/learning-store';
import {defaultPreferences,savePreferences} from '../lib/preferences';
import type {LearningBundle,LearningTask} from '../lib/learning-types';
import prepared from '../public/demos/maya-learning-v3.json';
vi.mock('../lib/learning-client',()=>({runLearningTask:vi.fn(async(task:LearningTask)=>{if(task.op==='demo')return structuredClone(prepared) as LearningBundle;const {computeLearning}=await import('../lib/learning-compute');return computeLearning(task);})}));
vi.mock('../lib/conversation-audio',()=>({conversationAudio:{state:{phase:'idle',caption:'',notice:''},speak:vi.fn(async()=>{}),stop:vi.fn(),unlock:vi.fn(async()=>{}),subscribe:(fn:any)=>{fn({phase:'idle',caption:'',notice:''});return()=>{};}}}));
class Mic{static instances:Mic[]=[];onstart:any=null;onend:any=null;onerror:any=null;onresult:any=null;constructor(){Mic.instances.push(this);}start(){this.onstart?.();}stop(){this.onend?.();}abort(){} }
const oldTZ=process.env.TZ;
beforeEach(async()=>{process.env.TZ='America/Los_Angeles';vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-12-01T01:30:00Z'));await storage.clearEntries();await clearLearningData();localStorage.clear();sessionStorage.clear();await savePreferences({...defaultPreferences,setupComplete:true});window.history.replaceState(null,'','/outlook');vi.spyOn(window,'scrollTo').mockImplementation(()=>{});vi.stubGlobal('isSecureContext',true);vi.stubGlobal('SpeechRecognition',Mic);vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});vi.stubGlobal('fetch',vi.fn(async()=>Response.json({configured:false})));});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();process.env.TZ=oldTZ;Mic.instances=[];});
function transcript(words:string){const mic=Mic.instances.at(-1)!;act(()=>mic.onresult({results:[Object.assign([{transcript:words}],{isFinal:true})]}));}
it('keeps a fresh saved entry in Journal, My days, and November after UTC rolls to December, even if the learning cache fails',async()=>{
 const initial=vi.spyOn(storage,'loadEntries');let resolveInitial!:(entries:any[])=>void;initial.mockImplementationOnce(()=>new Promise(resolve=>{resolveInitial=resolve;}));
 const write=Storage.prototype.setItem;vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(this:Storage,key,value){if(key==='elya-confirmed-checkins-v1')throw Error('check-in cache blocked');return write.call(this,key,value);});
 const user=userEvent.setup();const view=render(<Home/>);await user.click(screen.getByRole('button',{name:'Check in today'}));
 expect((screen.getByLabelText('Entry date') as HTMLInputElement).value).toBe('2026-11-30');
 await user.click(screen.getByRole('button',{name:'Speak'}));transcript('A fictional tired day.');await user.click(screen.getByRole('button',{name:'Stop recording'}));await user.click(screen.getByRole('button',{name:'Fatigue'}));
 expect(screen.getByText(/Unsaved entry/)).toBeTruthy();await user.click(screen.getByRole('button',{name:'Review entry'}));await user.click(screen.getByRole('button',{name:'Confirm and save'}));
 await waitFor(()=>expect(window.location.pathname).toBe('/outlook'));await act(async()=>resolveInitial([]));
 expect((await storage.loadEntries())[0].date).toBe('2026-11-30');await navigate(user,'Journal');expect((screen.getByLabelText('What are you experiencing today?') as HTMLTextAreaElement).value).toBe('A fictional tired day.');
 await navigate(user,'My days');await user.click(screen.getByRole('button',{name:/November 30, 2026, today, Logged: Fatigue/}));expect(screen.getByText('A fictional tired day.')).toBeTruthy();
 await navigate(user,'Appointment Brief');expect(document.querySelector('.monthly-report-body')?.textContent).toContain('Fatigue: reported on 1 day.');expect((screen.getByLabelText('Month') as HTMLInputElement).value).toBe('2026-11');view.unmount();render(<Home/>);await screen.findByText('Supporting Journal entries (1)');expect(document.querySelector('.brief-sources')?.textContent).toContain('A fictional tired day.');
});
it('saves Ellie speech in the Sophie profile, highlights its sample date, and survives a report refresh',async()=>{
 const user=userEvent.setup();const view=render(<Home/>);await user.click(screen.getByRole('button',{name:'Try Sophie’s demo'}));await screen.findByText('Sophie’s demo · Fictional profile');
 await user.click(screen.getByRole('button',{name:'Tell Ellie how you’re feeling'}));await waitFor(()=>expect(Mic.instances.length).toBeGreaterThan(0));transcript('I had fatigue today.');
 await user.click(screen.getByRole('button',{name:'Done speaking'}));await screen.findByText('How strong is the fatigue right now?',{}, {timeout:5000});await user.click(screen.getByRole('button',{name:'Finish conversation'}));
 await screen.findByRole('heading',{name:'Review your entry'});await user.click(screen.getByRole('button',{name:'Save & see my day'}));await screen.findByRole('heading',{name:'Your days, connected'}, {timeout:8000});
 const date=screen.getByRole('button',{name:/November 14, 2026, today, Logged: Fatigue/});expect(date.getAttribute('aria-pressed')).toBe('true');await user.click(date);expect(screen.getByText('I had fatigue today.')).toBeTruthy();
 await user.click(screen.getByRole('button',{name:'See my appointment brief'}));expect(document.querySelector('.monthly-report-body')?.textContent).toContain('Fatigue: 6 of 14 logged days');
 view.unmount();render(<Home/>);expect(screen.queryByText('No journal entries for this month.')).toBeNull();await screen.findByText('Supporting Journal entries (14)',{}, {timeout:8000});expect(document.querySelector('.monthly-report-body')?.textContent).toContain('Fatigue: 6 of 14 logged days');expect(document.querySelector('.brief-sources')?.textContent).toContain('I had fatigue today.');expect(await storage.loadEntries()).toEqual([]);
},15000);
it('keeps spoken symptoms and the no-symptoms control mutually exclusive in both directions',async()=>{
 const user=userEvent.setup();render(<Home/>);await user.click(screen.getByRole('button',{name:'Try Sophie’s demo'}));await screen.findByText('Sophie’s demo · Fictional profile');await user.click(screen.getByRole('button',{name:'Tell Ellie how you’re feeling'}));await waitFor(()=>expect(Mic.instances.length).toBeGreaterThan(0));transcript('No symptoms today, but I have a headache.');await user.click(screen.getByRole('button',{name:'Done speaking'}));await waitFor(()=>expect(document.querySelector('.journal-symptom-bubbles button[aria-pressed="true"]')?.textContent).toContain('Headache'),{timeout:5000});await user.click(screen.getByRole('button',{name:'Pause conversation'}));await user.click(screen.getByText('Symptoms and additional details'));
 const none=screen.getByRole('checkbox',{name:'No symptoms today'}) as HTMLInputElement;expect(none.checked).toBe(false);expect(screen.getByRole('button',{name:'Headache'}).getAttribute('aria-pressed')).toBe('true');

},12000);
it('runs Sophie Type instead through saved day and brief using only the new impact answer',async()=>{
 const user=userEvent.setup();render(<Home/>);await user.click(screen.getByRole('button',{name:'Try Sophie’s demo'}));await screen.findByText('Sophie’s demo · Fictional profile');await user.click(screen.getByRole('button',{name:'Type instead'}));
 expect((screen.getByLabelText('What are you experiencing today?') as HTMLTextAreaElement).value).toBe('');await user.type(screen.getByLabelText('What are you experiencing today?'),'Tired and bloated today.');await user.click(screen.getByRole('button',{name:'Fatigue'}));await user.click(screen.getByRole('button',{name:'Bloating'}));await user.click(screen.getByRole('button',{name:'Missed activities'}));await user.click(screen.getByRole('button',{name:'Next question'}));await user.click(screen.getByRole('button',{name:'Review entry'}));await user.click(screen.getByRole('button',{name:'Save & see my day'}));await screen.findByRole('heading',{name:'Your days, connected'},{timeout:8000});await user.click(screen.getByRole('button',{name:/November 14, 2026, today, Logged: Fatigue, Bloating/}));expect(document.querySelector('.day-confirmed-details')?.textContent).toContain('Missed activities');await user.click(screen.getByRole('button',{name:'See my appointment brief'}));expect(document.querySelector('.doctor-overview')?.textContent).toContain('Daily activities were affected on 4 days');expect(document.querySelector('.monthly-report-body')?.textContent).toContain('Pelvic pain: 5 of 14 logged days');expect(await storage.loadEntries()).toEqual([]);
},15000);
