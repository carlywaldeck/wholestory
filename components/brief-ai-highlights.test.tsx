// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {BriefAIHighlights} from './brief-ai-highlights';
const entry={id:'sample',date:'2026-11-14',text:'Fatigue today.',facts:[{kind:'Fatigue' as const,value:'Fatigue',quote:'Fatigue today.'}],demo:true,persona:'maya' as const,symptomFree:false};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('requires consent and forwards verified highlights for PDF export',async()=>{
 const item={text:'Fatigue: reported on 1 day.',sourceIds:['sample']};const output=vi.fn();const fetcher=vi.fn(async(_url:string,init?:RequestInit)=>Response.json(init?.method==='POST'?{month:'2026-11',provenance:'ai-selected-verified-statements',statements:[item]}:{configured:true}));vi.stubGlobal('fetch',fetcher);const user=userEvent.setup();render(<BriefAIHighlights entries={[entry]} month="2026-11" onSource={vi.fn()} onHighlights={output}/>);await user.click(screen.getByText('AI summary for your doctor'));await waitFor(()=>expect(screen.getByRole('button',{name:'Create AI summary'})).toBeTruthy());expect(screen.getByRole('button',{name:'Create AI summary'}).hasAttribute('disabled')).toBe(true);await user.click(screen.getByRole('checkbox'));await user.click(screen.getByRole('button',{name:'Create AI summary'}));await waitFor(()=>expect(output).toHaveBeenCalledWith([item]));expect(fetcher.mock.calls.filter(c=>c[1]?.method==='POST')).toHaveLength(1);
});
