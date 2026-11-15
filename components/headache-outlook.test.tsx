// @vitest-environment jsdom
import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {PersonalLearningOutlook} from './personal-learning-outlook';
import {IssuedDayOutlook} from './issued-day-outlook';
import {FutureSymptomOutlook} from './future-symptom-outlook';
import type {LearningOutlook} from '../lib/learning-types';
import prepared from '../public/demos/maya-learning-v2.json';
const result=()=>structuredClone(prepared) as unknown as {result:LearningOutlook};
afterEach(cleanup);
it('never silently drops headache from current, earlier, or future outlooks',()=>{
 const learning=result().result;
 const view=render(<PersonalLearningOutlook result={learning} today="2026-11-14"/>);expect(screen.getByText('Not enough history yet to forecast headache.')).toBeTruthy();
 view.rerender(<IssuedDayOutlook result={learning} date="2026-11-14"/>);expect(screen.getByText('Not enough history yet to forecast headache.')).toBeTruthy();
 view.rerender(<FutureSymptomOutlook date="2026-11-15" learning={learning} forecast={null}/>);expect(screen.getByRole('button',{name:/Headache Not enough history/})).toBeTruthy();
});
it('shows an existing headache estimate rather than replacing it with a made-up learning state',()=>{
 const learning=result().result;const item=learning.outlook.find(row=>row.symptom==='headache')!;Object.assign(item,{band:'medium',status:'experimental',label:'Medium risk'});learning.state.records.find(row=>row.targetDate===learning.targetDate&&row.symptom==='headache')!.estimate=.5;
 render(<FutureSymptomOutlook date="2026-11-15" learning={learning} forecast={null}/>);expect(screen.getByRole('button',{name:'Headache Medium risk'})).toBeTruthy();expect(screen.queryByText('Not enough history yet to forecast headache.')).toBeNull();
});
