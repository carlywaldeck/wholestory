/** Clipboard API where available; selection fallback for local HTTP previews. */
export async function copyText(text:string) {
  try { if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return;} } catch { /* Try the user-initiated selection fallback. */ }
  const previous=document.activeElement as HTMLElement|null;
  const field=document.createElement("textarea");field.value=text;field.readOnly=true;
  field.style.cssText="position:fixed;left:-9999px;top:0;opacity:0";
  document.body.appendChild(field);
  try {field.select();if(!document.execCommand("copy"))throw Error("Copy unavailable");}
  finally {field.remove();previous?.focus();}
}
