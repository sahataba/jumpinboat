import { Effect } from "effect";

import {
  ApiError,
  AuthService,
  BookingService,
  requireBearerToken,
  runApiEffect,
} from "@jumpinboat/api/next-handlers";

import { catchApiError, jsonOk } from "../../../lib/api-http";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
          return yield* Effect.fail(new ApiError(403, "Account cannot book transport"));
        }
        const raw = yield* Effect.tryPromise({
          try: () => request.json() as Promise<unknown>,
          catch: () => new ApiError(400, "Request body must be valid JSON"),
        });
        const payload = yield* bookingService.parseCreateBody(raw);
        const booking = yield* bookingService.createBooking(user.id, payload);
        return { booking };
      }),
    );
    return jsonOk(data, 201);
  } catch (e) {
    return catchApiError(e);
  }
}
