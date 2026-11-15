// @vitest-environment jsdom
import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import prepared from '../public/demos/maya-learning-v2.json';
import type {LearningOutlook} from '../lib/learning-types';
import {IssuedDayOutlook,issuedDayRows} from './issued-day-outlook';
import {PersonalLearningOutlook} from './personal-learning-outlook';
afterEach(cleanup);
it('names the features actually selected in Sophie’s saved and next-day forecasts',()=>{
 const result=structuredClone(prepared.result) as LearningOutlook;
 expect(issuedDayRows(result,'2026-11-14').filter(r=>r.usedWearables).map(r=>r.symptom)).toEqual(['fatigue','bloating']);
 expect(result.symptoms.filter(s=>s.usedWearables).map(s=>s.symptom)).toEqual(['fatigue','bloating']);
 const view=render(<IssuedDayOutlook result={result} date="2026-11-14"/>);expect(screen.getByText(/Sophie’s wearable patterns were selected for fatigue and bloating/)).toBeTruthy();
 view.rerender(<PersonalLearningOutlook result={result} sampleDays={14} today="2026-11-14"/>);expect(screen.getByText(/Sophie’s wearable patterns were selected for her fatigue and bloating outlook/)).toBeTruthy();
});
it('does not claim wearables are selected for a new personal profile',()=>{render(<PersonalLearningOutlook result={null} today="2026-11-14"/>);expect(screen.getByText(/current outlook does not yet use wearable patterns/)).toBeTruthy();expect(screen.queryByText(/were selected for/)).toBeNull();});
