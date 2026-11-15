import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {validateEntry,type Entry} from './model';
let client:SupabaseClient|null=null;
export function cloudConfigured(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);}
export function cloudClient(){
 if(!cloudConfigured())return null;
 if(!client)client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{storageKey:'elya-supabase-auth'}});
 return client;
}
export function personalCloudEntries(input:unknown[]):Entry[]{
 return input.map(validateEntry).filter(e=>!e.demo&&!e.persona);
}
async function account(db:SupabaseClient){const {data,error}=await db.auth.getUser();if(error||!data.user)throw Error('Sign in before syncing your journal.');return data.user.id;}
export async function uploadJournal(db:SupabaseClient,input:Entry[]){
 const entries=personalCloudEntries(input);if(entries.length>1000)throw Error('This preview supports up to 1,000 personal entries per upload.');
 const user_id=await account(db);if(!entries.length)return 0;
 const {error}=await db.from('elya_journal_entries').upsert(entries.map(e=>({user_id,entry_id:e.id,payload:e})),{onConflict:'user_id,entry_id'});
 if(error)throw Error('Cloud upload failed. Check the Supabase table and access policies. Your local journal is unchanged.');return entries.length;
}
export async function downloadJournal(db:SupabaseClient){
 const user_id=await account(db);
 const {data,error}=await db.from('elya_journal_entries').select('payload').eq('user_id',user_id).order('entry_id').limit(1001);
 if(error)throw Error('Cloud download failed. Your local journal is unchanged.');
 if((data??[]).length>1000)throw Error('This preview supports up to 1,000 cloud entries. Export a larger archive separately.');
 // Validate the entire response before returning anything for local persistence.
 const raw=(data??[]).map(r=>validateEntry(r.payload));
 if(raw.some(e=>e.demo||e.persona))throw Error('Cloud response unexpectedly contains fictional data. Nothing was imported.');
 return raw;
}
export function missingCloudEntries(local:Entry[],remote:Entry[]){
 const ids=new Set(local.map(e=>e.id));return personalCloudEntries(remote).filter(e=>!ids.has(e.id));
}
export async function deleteCloudJournal(db:SupabaseClient){
 const user_id=await account(db);const {error}=await db.from('elya_journal_entries').delete().eq('user_id',user_id);
 if(error)throw Error('Cloud deletion failed. Try again before assuming the remote copy is deleted.');
}
