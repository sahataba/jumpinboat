import { Context, Effect, Layer } from "effect";

import type { PublicBoatListFilters } from "@jumpinboat/shared";

import { parsePublicBoatListFilters, searchPublicBoatListings } from "../public-boats.js";

export class PublicBoatsService extends Context.Tag("PublicBoatsService")<
  PublicBoatsService,
  {
    readonly parseFilters: (requestUrl: URL) => PublicBoatListFilters;
    readonly search: (filters: PublicBoatListFilters) => Effect.Effect<
      ReadonlyArray<ReturnType<typeof searchPublicBoatListings>[number]>,
      never
    >;
  }
>() {
  static readonly Live = Layer.succeed(this, {
    parseFilters: parsePublicBoatListFilters,
    search: (filters: PublicBoatListFilters) => Effect.succeed(searchPublicBoatListings(filters)),
  });
}
