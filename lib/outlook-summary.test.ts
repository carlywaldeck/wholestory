import {expect,it} from 'vitest';
import {outlookSummary} from './outlook-summary';
import type {LearningOutlook} from './learning-types';
const result=(band:'high'|'low'|'medium')=>({outlook:[{symptom:'fatigue',status:'experimental',band}],symptoms:[]}) as unknown as LearningOutlook;
it('never invents a forecast when the learner has no estimate',()=>{expect(outlookSummary(null)).toContain('will appear');expect(outlookSummary(null)).not.toContain('low');});
it('reads the actual symptom band without attributing a cause',()=>{expect(outlookSummary(result('high'))).toContain('higher risk of fatigue');expect(outlookSummary(result('high'))).not.toMatch(/sleep|HRV|cause/);});
it('preserves uncertainty for low estimates',()=>{expect(outlookSummary(result('low'))).toContain('Symptoms can still happen');});
