import { Effect } from "effect";

import {
  ApiError,
  AuthService,
  OwnerListingService,
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
        const ownerListingService = yield* OwnerListingService;
        const token = yield* requireBearerToken(
          authService.getBearerToken(request.headers.get("authorization") ?? undefined),
        );
        const user = yield* authService.getCurrentUser(token);
        if (!user.canListBoats) {
          return yield* Effect.fail(new ApiError(403, "Account cannot manage listings"));
        }
        const items = yield* ownerListingService.listOwnerListings(user.id);
        return { items };
      }),
      getApiRequestTelemetryContext(request, "owner.listings"),
    );
    return jsonOk(data, 200);
  } catch (error) {
    return catchApiError(error, { request, context: "owner.listings" });
  }
}

export async function POST(request: Request) {
  try {
    const data = await runApiEffect(
      Effect.gen(function* () {
        const authService = yield* AuthService;
        const ownerListingService = yield* OwnerListingService;
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
        const listing = yield* ownerListingService.parseListingPayload(raw);
        const record = yield* ownerListingService.createOwnerListing(user.id, listing);
        return record;
      }),
      getApiRequestTelemetryContext(request, "owner.listings.create"),
    );
    return jsonOk(data, 201);
  } catch (error) {
    return catchApiError(error, { request, context: "owner.listings.create" });
  }
}
