import { Effect } from "effect";

import {
  ApiError,
  AuthService,
  requireBearerToken,
  runApiEffect,
} from "@jumpinboat/api/next-handlers";

import { getApiRequestTelemetryContext } from "../../../../lib/api-request-telemetry";
import { catchApiError, jsonOk } from "../../../../lib/api-http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const data = await runApiEffect(
      Effect.gen(function* () {
        const authService = yield* AuthService;
        const token = yield* requireBearerToken(
          authService.getBearerToken(request.headers.get("authorization") ?? undefined),
        );
        const user = yield* authService.getCurrentUser(token);
        return { user };
      }),
      getApiRequestTelemetryContext(request, "auth.me"),
    );
    return jsonOk(data, 200);
  } catch (e) {
    return catchApiError(e, { request, context: "auth.me" });
  }
}
