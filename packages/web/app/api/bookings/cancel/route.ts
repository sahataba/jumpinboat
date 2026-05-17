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

export async function PATCH(request: Request) {
  try {
    const data = await runApiEffect(
      Effect.gen(function* () {
        const authService = yield* AuthService;
        const bookingService = yield* BookingService;
        const token = yield* requireBearerToken(
          authService.getBearerToken(request.headers.get("authorization") ?? undefined),
        );
        const user = yield* authService.getCurrentUser(token);
        if (!user.canBook) {
          return yield* Effect.fail(new ApiError(403, "Account cannot cancel bookings"));
        }
        const raw = yield* Effect.tryPromise({
          try: () => request.json() as Promise<unknown>,
          catch: () => new ApiError(400, "Request body must be valid JSON"),
        });
        const body = raw as { bookingId?: string };
        if (typeof body.bookingId !== "string" || body.bookingId.length === 0) {
          return yield* Effect.fail(new ApiError(422, "bookingId is required"));
        }
        yield* bookingService.cancelBooking(user.id, body.bookingId);
        return { ok: true as const };
      }),
      getApiRequestTelemetryContext(request, "bookings.cancel"),
    );
    return jsonOk(data, 200);
  } catch (e) {
    return catchApiError(e, { request, context: "bookings.cancel" });
  }
}
