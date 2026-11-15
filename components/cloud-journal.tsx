'use client';
import {useEffect,useState} from 'react';
import {cloudClient,deleteCloudJournal,downloadJournal,missingCloudEntries,uploadJournal} from '../lib/supabase-journal';
import {loadEntries,importEntries} from '../lib/storage';
export function CloudJournal({onImported}:{onImported:()=>Promise<void>}){
 const [db]=useState(cloudClient);const [email,setEmail]=useState('');const [signed,setSigned]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [consent,setConsent]=useState(false);const [deleting,setDeleting]=useState(false);
 useEffect(()=>{if(!db)return;void db.auth.getUser().then(({data})=>setSigned(Boolean(data.user)));const {data}=db.auth.onAuthStateChange((_event,session)=>{setSigned(Boolean(session));setConsent(false);});return()=>data.subscription.unsubscribe();},[db]);
 async function act(fn:()=>Promise<string>){setBusy(true);setMessage('');try{setMessage(await fn());}catch(e){setMessage(e instanceof Error?e.message:'Cloud action failed.');}finally{setBusy(false);}}
 return <details className="settings-section"><summary>Account & cloud journal</summary>
 <p>Optional Supabase storage for personal journal entries. Maya and other fictional profiles are excluded. Wearable observations and learning snapshots remain on this device.</p>
 {!db?<p>Cloud storage is not configured yet. Your local journal and fictional demo work without an account.</p>:<>
 <p>{signed?'Signed in to your cloud account.':'Sign in to use cloud storage.'} Local entries remain available after signing out. Use a private device.</p>
 {!signed?<form onSubmit={e=>{e.preventDefault();void act(async()=>{const {error}=await db.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:window.location.origin+'/settings'}});if(error)throw Error('The sign-in email could not be sent. Check Supabase email settings or try later.');return 'Check your email for a sign-in link, then return to Settings.';});}}><label>Email address<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="button" disabled={busy}>Email me a sign-in link</button></form>:<>
 <label className="checkbox"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I want to send my personal journal text and structured symptoms to this app’s Supabase project when I press Upload.</label>
 <p>Upload replaces cloud copies with the same entry IDs. Download adds missing entries and preserves existing local entries. This is manual backup and restore, not automatic conflict-resolving sync.</p>
 <button className="button" disabled={busy||!consent} onClick={()=>void act(async()=>`${await uploadJournal(db,await loadEntries())} personal entries uploaded. Fictional records were excluded.`)}>Upload personal journal</button>
 <button className="button" disabled={busy} onClick={()=>void act(async()=>{const remote=await downloadJournal(db);const added=missingCloudEntries(await loadEntries(),remote);await importEntries(added);await onImported();return `${added.length} missing personal entries restored. Existing local entries were preserved.`;})}>Download missing entries</button>
 <button className="button" disabled={busy} onClick={()=>void act(async()=>{const {error}=await db.auth.signOut();if(error)throw Error('Sign out failed.');return 'Signed out. Local journal entries remain on this device.';})}>Sign out</button>
 <button className="button" disabled={busy} onClick={()=>setDeleting(true)}>Delete cloud journal</button>
 {deleting&&<div><p>Permanently delete all journal entries in this signed-in cloud account? This does not delete local entries or the account itself.</p><button className="button" disabled={busy} onClick={()=>setDeleting(false)}>Cancel</button><button className="button" disabled={busy} onClick={()=>void act(async()=>{await deleteCloudJournal(db);setDeleting(false);return 'Cloud journal deleted. Local entries remain on this device.';})}>Permanently delete cloud entries</button></div>}
 </>}
 </>}{message&&<p role="status">{message}</p>}</details>;
}
