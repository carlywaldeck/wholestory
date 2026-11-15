// @vitest-environment jsdom
import {afterEach,expect,it} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {IssuedDayOutlook,issuedDayRows} from './issued-day-outlook';
import type {LearningOutlook} from '../lib/learning-types';
afterEach(cleanup);
it('shows the frozen estimate for today and excludes tomorrow and same-day reissuance',()=>{
 const result={state:{timeZone:'UTC',records:[{symptom:'fatigue',targetDate:'2026-11-14',issuedAt:'2026-11-13T23:00:00Z',estimate:.1,usedWearables:true,trainingPairs:45},{symptom:'bloating',targetDate:'2026-11-14',issuedAt:'2026-11-14T10:00:00Z',estimate:.9},{symptom:'fatigue',targetDate:'2026-11-15',issuedAt:'2026-11-14T23:00:00Z',estimate:.9}]}} as LearningOutlook;
 expect(issuedDayRows(result,'2026-11-14')).toHaveLength(1);render(<IssuedDayOutlook result={result} date="2026-11-14"/>);expect(screen.getByText('Low risk')).toBeTruthy();expect(screen.queryByText('High risk')).toBeNull();expect(screen.getByText(/Earlier readings from her wearable helped estimate fatigue/)).toBeTruthy();
});
it('does not substitute a future forecast when today has no issued estimate',()=>{
 render(<IssuedDayOutlook result={null} date="2026-11-14"/>);expect(screen.getByText(/No previously issued outlook/)).toBeTruthy();expect(screen.getAllByText('Still learning your pattern')).toHaveLength(4);
});
