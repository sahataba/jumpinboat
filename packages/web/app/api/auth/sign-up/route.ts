import { Effect } from "effect";

import {
  ApiError,
  AuthService,
  runApiEffect,
} from "@jumpinboat/api/next-handlers";

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
        const payload = yield* authService.parseSignUpRequest(raw);
        const authResponse = yield* authService.signUp(payload);
        return authResponse;
      }),
    );
    return jsonOk(data, 201);
  } catch (e) {
    return catchApiError(e, { request, context: "auth.sign-up" });
  }
}
