import { Effect } from "effect";

import {
  ApiError,
  PublicBoatsService,
  runApiEffect,
} from "@jumpinboat/api/next-handlers";

import { catchApiError, jsonOk } from "../../../../lib/api-http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const data = await runApiEffect(
      Effect.gen(function* () {
        const publicBoatsService = yield* PublicBoatsService;
        const url = new URL(request.url);
        const filters = publicBoatsService.parseFilters(url);
        const items = yield* publicBoatsService.search(filters).pipe(
          Effect.mapError((e) =>
            new ApiError(500, e instanceof Error ? e.message : String(e)),
          ),
        );
        return { items };
      }),
    );
    return jsonOk(data, 200);
  } catch (e) {
    return catchApiError(e);
  }
}
