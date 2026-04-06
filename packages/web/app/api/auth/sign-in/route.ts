import { Effect } from "effect";

import {
  ApiError,
  AuthService,
  runApiEffect,
} from "@jumpinboat/api/next-handlers";

import { getApiRequestTelemetryContext } from "../../../../lib/api-request-telemetry";
import { catchApiError, jsonOk } from "../../../../lib/api-http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await runApiEffect(
      Effect.gen(function* () {
        const authService = yield* AuthService;
        const raw = yield* Effect.tryPromise({
          try: () => request.json() as Promise<unknown>,
          catch: () => new ApiError(400, "Request body must be valid JSON"),
        });
        const payload = yield* authService.parseSignInRequest(raw);
        const authResponse = yield* authService.signIn(payload);
        return authResponse;
      }),
      getApiRequestTelemetryContext(request, "auth.sign-in"),
    );
    return jsonOk(data, 200);
  } catch (e) {
    return catchApiError(e, { request, context: "auth.sign-in" });
  }
}
