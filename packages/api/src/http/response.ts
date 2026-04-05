import { Effect } from "effect";

import { ApiError } from "../api-error.js";

/** Used by Next Route Handlers via `@jumpinboat/api/next-handlers` (standalone HTTP server removed). */
export const requireBearerToken = (token: string | null) => {
  if (!token) {
    return Effect.fail(new ApiError(401, "Missing bearer token"));
  }

  return Effect.succeed(token);
};
