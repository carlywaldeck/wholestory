import {expect,it} from 'vitest';
import {outlookDateCopy} from './outlook-date-copy';
it('uses the actual target, including today, tomorrow, and another date',()=>{
 expect(outlookDateCopy('2026-11-14','2026-11-14')).toMatchObject({heading:'Today’s outlook',when:'today',followup:'Check in today to record what actually happened.'});
 expect(outlookDateCopy('2026-12-01','2026-11-30')).toMatchObject({heading:'Tomorrow’s outlook',when:'tomorrow',followup:'Check in tomorrow to record what actually happened.'});
 expect(outlookDateCopy('2026-11-13','2026-11-14').heading).toBe('Symptom outlook');expect(outlookDateCopy(undefined,'2026-11-14').heading).toBe('Symptom outlook');
});
