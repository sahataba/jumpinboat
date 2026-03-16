import * as S from "@effect/schema/Schema";

/**
 * Shared listing and route schemas used by web, mobile, and API.
 *
 * These mirror the backend data model (boats, routes, stops, departures)
 * but are shaped for API request/response payloads.
 */

export const Locale = S.Union(S.Literal("en"), S.Literal("hr"));
export type Locale = S.Schema.Type<typeof Locale>;

export const Coordinate = S.Struct({
  lat: S.Number,
  lng: S.Number,
});
export type Coordinate = S.Schema.Type<typeof Coordinate>;

export const BoatId = S.String.pipe(S.brand("BoatId"));
export type BoatId = string & { readonly _brand: "BoatId" };

export const RouteId = S.String.pipe(S.brand("RouteId"));
export type RouteId = string & { readonly _brand: "RouteId" };

export const DepartureId = S.String.pipe(S.brand("DepartureId"));
export type DepartureId = string & { readonly _brand: "DepartureId" };

export const BookingId = S.String.pipe(S.brand("BookingId"));
export type BookingId = string & { readonly _brand: "BookingId" };

export const Money = S.Struct({
  amount: S.Number, // in major currency units (e.g. EUR)
  currency: S.String, // e.g. "EUR"
});
export type Money = S.Schema.Type<typeof Money>;

export const BoatTranslation = S.Struct({
  locale: Locale,
  name: S.String,
  description: S.String,
  allowedGoodsDescription: S.optional(S.String),
  startLocationLabel: S.optional(S.String),
  endLocationLabel: S.optional(S.String),
});
export type BoatTranslation = S.Schema.Type<typeof BoatTranslation>;

export const Stop = S.Struct({
  id: S.String,
  routeId: RouteId,
  orderIndex: S.Number,
  coordinate: Coordinate,
  perStopPrice: S.optional(Money),
});
export type Stop = S.Schema.Type<typeof Stop>;

export const RoutePricing = S.Struct({
  basePricePerTrip: Money,
  hasUniformPerStopPricing: S.Boolean,
  uniformPricePerStop: S.optional(Money),
});
export type RoutePricing = S.Schema.Type<typeof RoutePricing>;

export const Route = S.Struct({
  id: RouteId,
  boatId: BoatId,
  start: Coordinate,
  end: Coordinate,
  stops: S.Array(Stop),
  pricing: RoutePricing,
});
export type Route = S.Schema.Type<typeof Route>;

export const CapacityInfo = S.Struct({
  maxPassengers: S.Number,
  maxTotalLoadKg: S.Number,
  offersCargo: S.Boolean,
  maxCargoPackages: S.optional(S.Number),
  maxCargoWeightKg: S.optional(S.Number),
  cargoPricePerKg: S.optional(Money),
});
export type CapacityInfo = S.Schema.Type<typeof CapacityInfo>;

export const BoatListingSummary = S.Struct({
  id: BoatId,
  slug: S.optional(S.String),
  translation: BoatTranslation,
  route: Route,
  capacity: CapacityInfo,
  bookedPassengers: S.optional(S.Number),
  freePassengers: S.optional(S.Number),
  maxPassengers: S.optional(S.Number),
  weatherRiskPercent: S.optional(S.Number),
  offersCargo: S.Boolean,
});
export type BoatListingSummary = S.Schema.Type<typeof BoatListingSummary>;

export const BoatListingDetail = S.Struct({
  id: BoatId,
  slug: S.optional(S.String),
  ownerId: S.String,
  translations: S.Array(BoatTranslation),
  route: Route,
  capacity: CapacityInfo,
  photos: S.Array(S.String),
  isActive: S.Boolean,
});
export type BoatListingDetail = S.Schema.Type<typeof BoatListingDetail>;

// Search filters & responses

export const SearchMode = S.Union(
  S.Literal("route"),
  S.Literal("near_me")
);
export type SearchMode = S.Schema.Type<typeof SearchMode>;

export const SearchBoatsRequest = S.Struct({
  mode: SearchMode,
  start: S.optional(Coordinate),
  end: S.optional(Coordinate),
  date: S.optional(S.String), // ISO date (client-local)
  timeOfDay: S.optional(S.String), // e.g. "morning", or concrete time
  returnTrip: S.optional(S.Boolean),
  priceMin: S.optional(S.Number),
  priceMax: S.optional(S.Number),
  minFreeSpots: S.optional(S.Number),
  minPassengerCapacity: S.optional(S.Number),
  minCargoWeightKg: S.optional(S.Number),
  goodsTransportOnly: S.optional(S.Boolean),
});
export type SearchBoatsRequest = S.Schema.Type<typeof SearchBoatsRequest>;

export const SearchBoatsResponse = S.Struct({
  items: S.Array(BoatListingSummary),
});
export type SearchBoatsResponse = S.Schema.Type<typeof SearchBoatsResponse>;

