import {extract} from '../../../lib/server-extract';
export async function POST(req:Request){return extract(req,{OPENAI_API_KEY:process.env.OPENAI_API_KEY,OPENAI_MODEL:process.env.OPENAI_MODEL});}
