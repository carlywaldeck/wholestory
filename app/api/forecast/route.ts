import { handleForecast } from "../../../lib/server-forecast";
export const GET = (req: Request) =>
  handleForecast(req, { APP_ORIGIN: process.env.APP_ORIGIN });
export const POST = (req: Request) =>
  handleForecast(req, { APP_ORIGIN: process.env.APP_ORIGIN });
