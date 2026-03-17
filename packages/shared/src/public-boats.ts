import { Atom } from "@effect-atom/atom";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { Effect } from "effect";

import type { BoatListingSummary } from "./schemas/listings.js";

export type PublicBoatListFilters = {
  readonly query: string;
  readonly goodsTransportOnly: boolean;
  readonly minFreeSpots: number;
};

export const defaultPublicBoatListFilters: PublicBoatListFilters = {
  query: "",
  goodsTransportOnly: false,
  minFreeSpots: 0,
};

export const normalizePublicBoatListFilters = (
  filters: PublicBoatListFilters,
): PublicBoatListFilters => ({
  query: filters.query.trim(),
  goodsTransportOnly: filters.goodsTransportOnly,
  minFreeSpots: Number.isFinite(filters.minFreeSpots)
    ? Math.max(0, Math.floor(filters.minFreeSpots))
    : 0,
});

export const buildPublicBoatsSearchPath = (
  filters: PublicBoatListFilters,
  basePath = "/api/boats/search",
): string => {
  const normalized = normalizePublicBoatListFilters(filters);
  const params = new URLSearchParams();

  if (normalized.query.length > 0) {
    params.set("query", normalized.query);
  }

  if (normalized.goodsTransportOnly) {
    params.set("goodsTransportOnly", "true");
  }

  if (normalized.minFreeSpots > 0) {
    params.set("minFreeSpots", String(normalized.minFreeSpots));
  }

  const queryString = params.toString();
  return queryString.length > 0 ? `${basePath}?${queryString}` : basePath;
};

export const countActivePublicBoatFilters = (
  filters: PublicBoatListFilters,
): number => {
  const normalized = normalizePublicBoatListFilters(filters);

  return [
    normalized.query.length > 0,
    normalized.goodsTransportOnly,
    normalized.minFreeSpots > 0,
  ].filter(Boolean).length;
};

export const createPublicBoatListAtoms = (
  loadPublicBoats: (
    filters: PublicBoatListFilters,
  ) => Effect.Effect<ReadonlyArray<BoatListingSummary>, unknown>,
) => {
  const filtersAtom = Atom.make(defaultPublicBoatListFilters).pipe(Atom.keepAlive);

  const boatsAtom = Atom.make(
    Effect.fnUntraced(function* (get: Atom.Context) {
      const filters = normalizePublicBoatListFilters(get(filtersAtom));
      return yield* loadPublicBoats(filters);
    }),
  ).pipe(Atom.keepAlive);

  const activeFilterCountAtom = Atom.make((get: Atom.Context) =>
    countActivePublicBoatFilters(get(filtersAtom)),
  ).pipe(Atom.keepAlive);

  return {
    activeFilterCountAtom,
    boatsAtom,
    filtersAtom,
  } as const;
};

export const createPublicBoatListClient = (
  loadPublicBoats: (
    filters: PublicBoatListFilters,
  ) => Effect.Effect<ReadonlyArray<BoatListingSummary>, unknown>,
) => {
  const publicBoatListAtoms = createPublicBoatListAtoms(loadPublicBoats);

  const usePublicBoatFilters = () => {
    const filters = useAtomValue(publicBoatListAtoms.filtersAtom);
    const setFilters = useAtomSet(publicBoatListAtoms.filtersAtom);

    return {
      filters,
      setFilters,
    } as const;
  };

  const usePublicBoatList = () => {
    const result = useAtomValue(publicBoatListAtoms.boatsAtom);
    const activeFilterCount = useAtomValue(
      publicBoatListAtoms.activeFilterCountAtom,
    );

    return {
      activeFilterCount,
      result,
    } as const;
  };

  return {
    publicBoatListAtoms,
    usePublicBoatFilters,
    usePublicBoatList,
  } as const;
};

export const loadPublicBoatsFromUrl = (
  getUrl: (filters: PublicBoatListFilters) => string,
  init?: RequestInit,
) =>
  (filters: PublicBoatListFilters): Effect.Effect<
    ReadonlyArray<BoatListingSummary>,
    Error
  > =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(getUrl(filters), init);

        if (!response.ok) {
          throw new Error(`Failed to load boats (${response.status})`);
        }

        const data = (await response.json()) as {
          items: ReadonlyArray<BoatListingSummary>;
        };

        return data.items;
      },
      catch: (error) =>
        error instanceof Error
          ? error
          : new Error("Failed to load public boats"),
    });
