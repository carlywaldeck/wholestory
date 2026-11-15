import {expect,it,vi} from 'vitest';
import {personalCloudEntries,missingCloudEntries,uploadJournal,downloadJournal} from './supabase-journal';
import type {SupabaseClient} from '@supabase/supabase-js';
const entry={id:'local',date:'2026-11-14',text:'Fictional engineering test entry.',facts:[],demo:false,symptomFree:false};
it('excludes synthetic records even when a persona marker remains on a non-demo entry',()=>{
 expect(personalCloudEntries([entry,{...entry,id:'demo',demo:true},{...entry,id:'marked',persona:'maya'}])).toEqual([entry]);
});
it('restores missing entries without overwriting edited local entries',()=>{
 expect(missingCloudEntries([{...entry,text:'Local edit.'}],[entry,{...entry,id:'new'}])).toEqual([{...entry,id:'new'}]);
});
it('does not issue a database write when authentication is absent',async()=>{
 const from=vi.fn();const db={auth:{getUser:async()=>({data:{user:null},error:null})},from} as unknown as SupabaseClient;
 await expect(uploadJournal(db,[entry])).rejects.toThrow('Sign in');expect(from).not.toHaveBeenCalled();
});
it('scopes writes to the verified account and excludes demo rows',async()=>{
 const upsert=vi.fn(async(_rows:unknown,_options?:unknown)=>({error:null}));const db={auth:{getUser:async()=>({data:{user:{id:'account-a'}},error:null})},from:()=>({upsert})} as unknown as SupabaseClient;
 expect(await uploadJournal(db,[entry,{...entry,demo:true,id:'synthetic'}])).toBe(1);
 expect(upsert.mock.calls[0][0]).toEqual([{user_id:'account-a',entry_id:'local',payload:entry}]);
});
it('rejects an entire cloud response if any record is synthetic',async()=>{
 const query={eq:vi.fn(),order:vi.fn(),limit:vi.fn(async()=>({data:[{payload:entry},{payload:{...entry,demo:true}}],error:null}))};query.eq.mockReturnValue(query);query.order.mockReturnValue(query);
 const db={auth:{getUser:async()=>({data:{user:{id:'a'}},error:null})},from:()=>({select:()=>query})} as unknown as SupabaseClient;
 await expect(downloadJournal(db)).rejects.toThrow('fictional');expect(query.eq).toHaveBeenCalledWith('user_id','a');
});
