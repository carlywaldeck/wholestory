import {appointmentSummary} from '../../../lib/server-appointment-summary';
export const runtime='nodejs';
export function GET(req:Request){return appointmentSummary(req,{OPENAI_API_KEY:process.env.OPENAI_API_KEY,OPENAI_MODEL:process.env.OPENAI_MODEL});}
export function POST(req:Request){return appointmentSummary(req,{OPENAI_API_KEY:process.env.OPENAI_API_KEY,OPENAI_MODEL:process.env.OPENAI_MODEL});}
