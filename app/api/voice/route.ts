import { generateVoice, voiceStatus } from "../../../lib/server-voice";
export const dynamic = "force-dynamic";
export function GET() {
  return voiceStatus({ OPENAI_API_KEY: process.env.OPENAI_API_KEY });
}
export function POST(req: Request) {
  return generateVoice(req, {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_VOICE_MODEL: process.env.OPENAI_VOICE_MODEL,
  });
}
