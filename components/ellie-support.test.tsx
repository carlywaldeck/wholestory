// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {EllieSupport} from './ellie-support';
import {AppNavigationProvider,useAppNavigation} from './app-navigation';
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();});
it('stays closed until requested and returns keyboard focus after Escape',async()=>{
 const user=userEvent.setup();render(<AppNavigationProvider><EllieSupport/></AppNavigationProvider>);
 expect(screen.queryByRole('dialog')).toBeNull();const launcher=screen.getByRole('button',{name:'Open Ellie support'});await user.click(launcher);
 expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('false');expect(document.activeElement).toBe(screen.getByRole('button',{name:'Close Ellie'}));
 await user.keyboard('{Escape}');expect(screen.queryByRole('dialog')).toBeNull();expect(document.activeElement).toBe(launcher);
});
it('shows curated links without transmitting journal data or claiming diagnosis',async()=>{
 const fetcher=vi.spyOn(globalThis,'fetch');const user=userEvent.setup();render(<AppNavigationProvider><EllieSupport/></AppNavigationProvider>);
 await user.click(screen.getByRole('button',{name:'Open Ellie support'}));await user.click(screen.getByRole('button',{name:/Find your people/}));
 const link=screen.getByRole('link',{name:/Browse by country/});expect(link.getAttribute('href')).toBe('https://endometriosis.org/support/support-groups/');expect(link.getAttribute('rel')).toContain('noopener');expect(fetcher).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'← All support'}));await user.click(screen.getByRole('button',{name:/Understand your body/}));expect(screen.getByText(/cannot confirm a diagnosis/)).toBeTruthy();
});
it('opens the journal from preparation without writing an entry',async()=>{
 window.history.replaceState(null,'','/outlook');const user=userEvent.setup();render(<AppNavigationProvider><EllieSupport/></AppNavigationProvider>);
 await user.click(screen.getByRole('button',{name:'Open Ellie support'}));await user.click(screen.getByRole('button',{name:/Find the words/}));await user.click(screen.getByRole('button',{name:'Open my journal'}));
 expect(window.location.pathname).toBe('/journal');expect(screen.queryByRole('dialog')).toBeNull();
});

it('preserves the unsaved-entry navigation confirmation',async()=>{
 function Draft(){const nav=useAppNavigation()!;return <button onClick={()=>nav.setDirty(true)}>Mark unsaved draft</button>;}
 window.history.replaceState(null,'','/journal');const user=userEvent.setup();render(<AppNavigationProvider><Draft/><EllieSupport/></AppNavigationProvider>);
 await user.click(screen.getByRole('button',{name:'Mark unsaved draft'}));await user.click(screen.getByRole('button',{name:'Open Ellie support'}));await user.click(screen.getByRole('button',{name:/Find the words/}));await user.click(screen.getByRole('button',{name:'View my appointment brief →'}));
 expect(screen.getByRole('alertdialog')).toBeTruthy();expect(window.location.pathname).toBe('/journal');await user.click(screen.getByRole('button',{name:'Stay'}));expect(window.location.pathname).toBe('/journal');
});

it('lets people stop wandering and remembers the choice on this device',async()=>{
 const user=userEvent.setup();render(<AppNavigationProvider><EllieSupport/></AppNavigationProvider>);await user.click(screen.getByRole('button',{name:'Open Ellie support'}));await user.click(screen.getByRole('button',{name:'Pause Ellie’s wandering'}));
 expect(localStorage.getItem('elya.ellieMotion')).toBe('off');await user.click(screen.getByRole('button',{name:'Close Ellie'}));expect(document.querySelector('.ellie-wanders')).toBeNull();
});
