import {handleTts} from "../../../lib/server-tts";
export const dynamic="force-dynamic";
export function GET(req:Request){return handleTts(req,{OPENAI_API_KEY:process.env.OPENAI_API_KEY});}
export function POST(req:Request){return handleTts(req,{OPENAI_API_KEY:process.env.OPENAI_API_KEY});}
