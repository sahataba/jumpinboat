import { textOk } from "../../../lib/api-http";

export const runtime = "nodejs";

export function GET() {
  return textOk("ok", 200);
}
