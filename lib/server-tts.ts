import {z} from "zod";
import {VOICE_ID,VOICE,SPEECH_MODEL,STYLE_INSTRUCTION,SAFE_SPEECH_TEXTS,EMERGENCY_LINE} from "./conversation-voice-config";
const schema=z.object({text:z.string().min(1).max(600),consent:z.literal(true)}).strict();
/** Provider adapter: raw PCM, mono signed 16-bit little endian at 24 kHz. */
export async function synthesize(text:string,key:string,signal:AbortSignal,voice:string=VOICE_ID,format="pcm"){
 const response=await fetch("https://api.openai.com/v1/audio/speech",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:SPEECH_MODEL,voice,input:text,response_format:format,speed:text===EMERGENCY_LINE?1:VOICE.speed,instructions:text===EMERGENCY_LINE?"Read the supplied emergency guidance exactly, clearly, at normal pace. Do not add or change words.":STYLE_INSTRUCTION}),signal});
 if(!response.ok||!response.body)throw Error("Speech provider unavailable");return response.body;
}
export async function handleTts(req:Request,env:{OPENAI_API_KEY?:string}){
 const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
 if(req.method==="GET")return Response.json({configured:!!env.OPENAI_API_KEY,voice:VOICE_ID},{headers});
 if(req.method!=="POST")return new Response(null,{status:405,headers});
 if(req.headers.get("origin")&&req.headers.get("origin")!==new URL(req.url).origin)return Response.json({error:"Origin rejected"},{status:403,headers});
 try{if(Number(req.headers.get("content-length")??0)>3000)throw Error();const {text}=schema.parse(await req.json());if(!SAFE_SPEECH_TEXTS.has(text))return Response.json({error:"Only approved, name-free spoken lines are supported."},{status:400,headers});if(!env.OPENAI_API_KEY)return Response.json({error:"Natural AI voice is not configured. Browser fallback is available."},{status:503,headers});
 const stream=await synthesize(text,env.OPENAI_API_KEY,AbortSignal.any([req.signal,AbortSignal.timeout(VOICE.requestTimeoutMs)]));return new Response(stream,{headers:{...headers,"Content-Type":"audio/pcm","X-Audio-Sample-Rate":"24000","X-Accel-Buffering":"no"}});
 }catch{return Response.json({error:"The AI voice is unavailable. Captions and browser fallback remain available."},{status:502,headers});}
}
