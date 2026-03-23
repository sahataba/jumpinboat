import { Context, Effect, Layer } from "effect";

import type { PublicBoatListFilters } from "@jumpinboat/shared";

import { searchBoatListingSummaries } from "../db/boat-queries.js";
import { parsePublicBoatListFilters, toSearchFilters } from "../public-boats.js";

export class PublicBoatsService extends Context.Tag("PublicBoatsService")<
  PublicBoatsService,
  {
    readonly parseFilters: (requestUrl: URL) => PublicBoatListFilters;
    readonly search: (filters: PublicBoatListFilters) => Effect.Effect<
      ReadonlyArray<Awaited<ReturnType<typeof searchBoatListingSummaries>>[number]>,
      Error
    >;
  }
>() {
  static readonly Live = Layer.succeed(this, {
    parseFilters: parsePublicBoatListFilters,
    search: (filters: PublicBoatListFilters) =>
      Effect.tryPromise({
        try: () => searchBoatListingSummaries(toSearchFilters(filters)),
        catch: (e) => (e instanceof Error ? e : new Error(String(e))),
      }),
  });
}
