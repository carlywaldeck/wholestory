import { handleOura } from "../../../../../lib/server-oura";
function handler(req: Request) {
  return handleOura(req, {
    OURA_CLIENT_ID: process.env.OURA_CLIENT_ID,
    OURA_CLIENT_SECRET: process.env.OURA_CLIENT_SECRET,
    OURA_SESSION_SECRET: process.env.OURA_SESSION_SECRET,
    APP_ORIGIN: process.env.APP_ORIGIN,
  });
}
export const GET = handler;
export const POST = handler;
