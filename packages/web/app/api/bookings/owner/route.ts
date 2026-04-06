import { Effect } from "effect";

import {
  ApiError,
  AuthService,
  BookingService,
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
        const bookingService = yield* BookingService;
        const token = yield* requireBearerToken(
          authService.getBearerToken(request.headers.get("authorization") ?? undefined),
        );
        const user = yield* authService.getCurrentUser(token);
        if (!user.canListBoats) {
          return yield* Effect.fail(new ApiError(403, "Account cannot manage listings"));
        }
        const items = yield* bookingService.listOwnerIncoming(user.id);
        return { items };
      }),
      getApiRequestTelemetryContext(request, "bookings.owner"),
    );
    return jsonOk(data, 200);
  } catch (e) {
    return catchApiError(e, { request, context: "bookings.owner" });
  }
}
