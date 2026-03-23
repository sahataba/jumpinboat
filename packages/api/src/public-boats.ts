import type { PublicBoatListFilters } from "@jumpinboat/shared";
import {
  defaultPublicBoatListFilters,
  normalizePublicBoatListFilters,
} from "@jumpinboat/shared";

import type { PublicBoatSearchFilters } from "./db/boat-queries.js";

export const parsePublicBoatListFilters = (requestUrl: URL): PublicBoatListFilters => {
  const minFreeSpots = Number(requestUrl.searchParams.get("minFreeSpots") ?? "0");
  const nearMeLat = requestUrl.searchParams.get("nearMeLat");
  const nearMeLng = requestUrl.searchParams.get("nearMeLng");
  const nearMeRadiusKm = requestUrl.searchParams.get("nearMeRadiusKm");
  const routeStartLat = requestUrl.searchParams.get("routeStartLat");
  const routeStartLng = requestUrl.searchParams.get("routeStartLng");
  const routeEndLat = requestUrl.searchParams.get("routeEndLat");
  const routeEndLng = requestUrl.searchParams.get("routeEndLng");
  const routeMatchKm = requestUrl.searchParams.get("routeMatchKm");
  const localeRaw = requestUrl.searchParams.get("locale");

  return normalizePublicBoatListFilters({
    ...defaultPublicBoatListFilters,
    query: requestUrl.searchParams.get("query") ?? "",
    goodsTransportOnly: requestUrl.searchParams.get("goodsTransportOnly") === "true",
    minFreeSpots: Number.isFinite(minFreeSpots) ? minFreeSpots : 0,
    locale: localeRaw === "hr" ? "hr" : "en",
    nearMeLat: nearMeLat != null ? Number(nearMeLat) : undefined,
    nearMeLng: nearMeLng != null ? Number(nearMeLng) : undefined,
    nearMeRadiusKm: nearMeRadiusKm != null ? Number(nearMeRadiusKm) : 25,
    routeStartLat: routeStartLat != null ? Number(routeStartLat) : undefined,
    routeStartLng: routeStartLng != null ? Number(routeStartLng) : undefined,
    routeEndLat: routeEndLat != null ? Number(routeEndLat) : undefined,
    routeEndLng: routeEndLng != null ? Number(routeEndLng) : undefined,
    routeMatchKm: routeMatchKm != null ? Number(routeMatchKm) : 8,
  });
};

export const toSearchFilters = (
  filters: PublicBoatListFilters,
): PublicBoatSearchFilters => {
  const n = normalizePublicBoatListFilters(filters);
  const nearMe =
    n.nearMeLat != null && n.nearMeLng != null
      ? { lat: n.nearMeLat, lng: n.nearMeLng, radiusKm: n.nearMeRadiusKm }
      : undefined;
  const route =
    n.routeStartLat != null &&
    n.routeStartLng != null &&
    n.routeEndLat != null &&
    n.routeEndLng != null
      ? {
          start: { lat: n.routeStartLat, lng: n.routeStartLng },
          end: { lat: n.routeEndLat, lng: n.routeEndLng },
          maxMatchKm: n.routeMatchKm,
        }
      : undefined;

  return {
    query: n.query,
    goodsTransportOnly: n.goodsTransportOnly,
    minFreeSpots: n.minFreeSpots,
    locale: n.locale,
    nearMe,
    route,
  };
};
