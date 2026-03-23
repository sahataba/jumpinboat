import * as HttpServerResponse from "@effect/platform/HttpServerResponse";
import { Effect } from "effect";

import { ApiError, getErrorMessage, getErrorStatusCode } from "../api-error.js";

export const json = (statusCode: number, payload: unknown) =>
  HttpServerResponse.json(payload, { status: statusCode }).pipe(
    Effect.orDie,
  );

export const text = (statusCode: number, body: string) =>
  Effect.succeed(HttpServerResponse.text(body, { status: statusCode }));

export const noContent = () => Effect.succeed(HttpServerResponse.empty({ status: 204 }));

export const fromError = (error: unknown, fallbackMessage = "Unexpected error") =>
  json(getErrorStatusCode(error), {
    error: getErrorMessage(error, fallbackMessage),
  });

export const requireBearerToken = (token: string | null) => {
  if (!token) {
    return Effect.fail(new ApiError(401, "Missing bearer token"));
  }

  return Effect.succeed(token);
};
