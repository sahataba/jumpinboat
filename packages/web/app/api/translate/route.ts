import { Effect } from "effect";

import { ApiError, runApiEffect } from "@jumpinboat/api/next-handlers";

import { getApiRequestTelemetryContext } from "../../../lib/api-request-telemetry";
import { catchApiError, jsonOk } from "../../../lib/api-http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await runApiEffect(
      Effect.gen(function* () {
        const raw = yield* Effect.tryPromise({
          try: () => request.json() as Promise<unknown>,
          catch: () => new ApiError(400, "Request body must be valid JSON"),
        });
        const body = raw as { text?: string; targetLocale?: string };
        const textIn = typeof body.text === "string" ? body.text : "";
        const target = body.targetLocale === "hr" ? "hr" : "en";
        const translated =
          target === "hr" ? `[HR stub] ${textIn}` : `[EN stub] ${textIn}`;
        return { translated, targetLocale: target, engine: "stub" as const };
      }),
      getApiRequestTelemetryContext(request, "translate.post"),
    );
    return jsonOk(data, 200);
  } catch (e) {
    return catchApiError(e, { request, context: "translate.post" });
  }
}
