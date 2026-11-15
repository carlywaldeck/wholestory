// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {DemoWearable} from './demo-wearable';
afterEach(cleanup);
it('shows the loaded fictional measurements and opens their detail without OAuth',async()=>{
 const user=userEvent.setup(),onView=vi.fn();render(<DemoWearable days={[{date:'2026-11-14',sleepHours:7.3,steps:5000,hrvRmssdMs:52,nightHeartRateBpm:60,temperatureDeviationC:-.11}]} onView={onView}/>);
 expect(screen.getByText('7.3 h')).toBeTruthy();expect(screen.getByText(/Sample data loaded/)).toBeTruthy();expect(screen.queryByText('Continue to Oura')).toBeNull();await user.click(screen.getByRole('button',{name:'View daily readings →'}));expect(onView).toHaveBeenCalledOnce();
});
it('does not claim a connection if sample readings are missing',()=>{
 render(<DemoWearable days={[]} onView={vi.fn()}/>);expect(screen.queryByText(/Sample data loaded/)).toBeNull();expect(screen.getByText(/No sample data/)).toBeTruthy();expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
});
