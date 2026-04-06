import { Effect } from "effect";

import {
  ApiError,
  AuthService,
  OwnerListingService,
  requireBearerToken,
  runApiEffect,
} from "@jumpinboat/api/next-handlers";

import { getApiRequestTelemetryContext } from "../../../../../lib/api-request-telemetry";
import { catchApiError, jsonOk } from "../../../../../lib/api-http";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ boatId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { boatId } = await params;
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
        return yield* ownerListingService.getOwnerListing(user.id, boatId);
      }),
      getApiRequestTelemetryContext(request, "owner.listings.detail"),
    );
    return jsonOk(data, 200);
  } catch (error) {
    return catchApiError(error, { request, context: "owner.listings.detail" });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { boatId } = await params;
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
        return yield* ownerListingService.updateOwnerListing(user.id, boatId, listing);
      }),
      getApiRequestTelemetryContext(request, "owner.listings.update"),
    );
    return jsonOk(data, 200);
  } catch (error) {
    return catchApiError(error, { request, context: "owner.listings.update" });
  }
}
