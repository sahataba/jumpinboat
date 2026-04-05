import { Effect } from "effect";

import {
  ApiError,
  AuthService,
  BookingService,
  requireBearerToken,
  runApiEffect,
} from "@jumpinboat/api/next-handlers";

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
        if (!user.canListBoats) {
          return yield* Effect.fail(new ApiError(403, "Account cannot manage listings"));
        }
        const raw = yield* Effect.tryPromise({
          try: () => request.json() as Promise<unknown>,
          catch: () => new ApiError(400, "Request body must be valid JSON"),
        });
        const body = raw as { bookingId?: string; status?: string };
        if (typeof body.bookingId !== "string" || body.bookingId.length === 0) {
          return yield* Effect.fail(new ApiError(422, "bookingId is required"));
        }
        if (body.status !== "confirmed" && body.status !== "declined") {
          return yield* Effect.fail(new ApiError(422, "status must be confirmed or declined"));
        }
        yield* bookingService.setBookingStatus(user.id, body.bookingId, body.status);
        return { ok: true as const };
      }),
    );
    return jsonOk(data, 200);
  } catch (e) {
    return catchApiError(e);
  }
}
