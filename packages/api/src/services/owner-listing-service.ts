import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";

import type {
  BoatDeparture,
  BoatListingDetail,
  BoatListingPayload,
  BoatTranslation,
  CapacityInfo,
  Money,
  OwnerBoatListingSummary,
  Route,
  Stop,
} from "@jumpinboat/shared";

import { ApiError } from "../api-error.js";
import { getDb } from "../db/client.js";
import {
  boatDepartures,
  boatRouteStops,
  boatRoutes,
  boatTranslations,
  boats,
  bookings,
} from "../db/schema.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const num = (value: string | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value);

const toMoney = (amount: number, currency: string): Money => ({ amount, currency });

const parseFiniteNumber = (value: unknown, field: string, min?: number): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ApiError(422, `${field} must be a valid number`);
  }
  if (typeof min === "number" && parsed < min) {
    throw new ApiError(422, `${field} must be at least ${min}`);
  }
  return parsed;
};

const parseOptionalFiniteNumber = (value: unknown, field: string, min?: number): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return parseFiniteNumber(value, field, min);
};

const parseString = (value: unknown, field: string, required = true): string => {
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) {
      return "";
    }
    throw new ApiError(422, `${field} must be a string`);
  }
  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    throw new ApiError(422, `${field} is required`);
  }
  return trimmed;
};

const parseOptionalString = (value: unknown, field: string): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return parseString(value, field, false);
};

const parseBoolean = (value: unknown, field: string, defaultValue = false): boolean => {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value !== "boolean") {
    throw new ApiError(422, `${field} must be a boolean`);
  }
  return value;
};

const parseTranslation = (value: unknown, index: number): BoatTranslation => {
  if (!isRecord(value)) {
    throw new ApiError(422, `translations[${index}] must be an object`);
  }
  const locale = value.locale === "hr" ? "hr" : value.locale === "en" ? "en" : undefined;
  if (!locale) {
    throw new ApiError(422, `translations[${index}].locale must be en or hr`);
  }
  return {
    locale,
    name: parseString(value.name, `translations[${index}].name`),
    description: parseString(value.description, `translations[${index}].description`),
    allowedGoodsDescription: parseOptionalString(
      value.allowedGoodsDescription,
      `translations[${index}].allowedGoodsDescription`,
    ),
    startLocationLabel: parseOptionalString(
      value.startLocationLabel,
      `translations[${index}].startLocationLabel`,
    ),
    endLocationLabel: parseOptionalString(
      value.endLocationLabel,
      `translations[${index}].endLocationLabel`,
    ),
  };
};

const parseListingPayload = (body: unknown): BoatListingPayload => {
  if (!isRecord(body)) {
    throw new ApiError(400, "Request body must be a JSON object");
  }

  if (!Array.isArray(body.translations) || body.translations.length === 0) {
    throw new ApiError(422, "translations must contain at least one translation");
  }

  const translations = body.translations.map((translation, index) =>
    parseTranslation(translation, index),
  );
  const localeSet = new Set(translations.map((translation) => translation.locale));
  if (!localeSet.has("en")) {
    throw new ApiError(422, "An English translation is required");
  }

  if (!isRecord(body.route)) {
    throw new ApiError(422, "route must be an object");
  }
  if (!isRecord(body.route.start) || !isRecord(body.route.end) || !isRecord(body.route.pricing)) {
    throw new ApiError(422, "route.start, route.end, and route.pricing are required");
  }

  const hasUniformPerStopPricing = parseBoolean(
    body.route.pricing.hasUniformPerStopPricing,
    "route.pricing.hasUniformPerStopPricing",
  );
  const currency = parseString(body.route.pricing.basePricePerTrip && isRecord(body.route.pricing.basePricePerTrip)
    ? body.route.pricing.basePricePerTrip.currency
    : undefined, "route.pricing.basePricePerTrip.currency");

  const offersCargo = parseBoolean(
    body.capacity && isRecord(body.capacity) ? body.capacity.offersCargo : undefined,
    "capacity.offersCargo",
  );

  const capacity: CapacityInfo = {
    maxPassengers: Math.floor(
      parseFiniteNumber(
        body.capacity && isRecord(body.capacity) ? body.capacity.maxPassengers : undefined,
        "capacity.maxPassengers",
        1,
      ),
    ),
    maxTotalLoadKg: Math.floor(
      parseFiniteNumber(
        body.capacity && isRecord(body.capacity) ? body.capacity.maxTotalLoadKg : undefined,
        "capacity.maxTotalLoadKg",
        1,
      ),
    ),
    offersCargo,
    maxCargoPackages: offersCargo
      ? parseOptionalFiniteNumber(
          body.capacity && isRecord(body.capacity) ? body.capacity.maxCargoPackages : undefined,
          "capacity.maxCargoPackages",
          0,
        )
      : undefined,
    maxCargoWeightKg: offersCargo
      ? parseOptionalFiniteNumber(
          body.capacity && isRecord(body.capacity) ? body.capacity.maxCargoWeightKg : undefined,
          "capacity.maxCargoWeightKg",
          0,
        )
      : undefined,
    cargoPricePerKg: undefined,
  };

  const cargoPrice = offersCargo
    ? parseOptionalFiniteNumber(
        body.capacity && isRecord(body.capacity) && isRecord(body.capacity.cargoPricePerKg)
          ? body.capacity.cargoPricePerKg.amount
          : undefined,
        "capacity.cargoPricePerKg.amount",
        0,
      )
    : undefined;

  const payload: BoatListingPayload = {
    slug: parseOptionalString(body.slug, "slug"),
    translations,
    route: {
      start: {
        lat: parseFiniteNumber(body.route.start.lat, "route.start.lat"),
        lng: parseFiniteNumber(body.route.start.lng, "route.start.lng"),
      },
      end: {
        lat: parseFiniteNumber(body.route.end.lat, "route.end.lat"),
        lng: parseFiniteNumber(body.route.end.lng, "route.end.lng"),
      },
      stops: Array.isArray(body.route.stops)
        ? body.route.stops.map((stop, index) => {
            if (!isRecord(stop) || !isRecord(stop.coordinate)) {
              throw new ApiError(422, `route.stops[${index}] must be an object`);
            }
            return {
              orderIndex: index + 1,
              coordinate: {
                lat: parseFiniteNumber(stop.coordinate.lat, `route.stops[${index}].coordinate.lat`),
                lng: parseFiniteNumber(stop.coordinate.lng, `route.stops[${index}].coordinate.lng`),
              },
              perStopPrice:
                parseOptionalFiniteNumber(
                  isRecord(stop.perStopPrice) ? stop.perStopPrice.amount : undefined,
                  `route.stops[${index}].perStopPrice.amount`,
                  0,
                ) !== undefined
                  ? {
                      amount: parseFiniteNumber(
                        isRecord(stop.perStopPrice) ? stop.perStopPrice.amount : undefined,
                        `route.stops[${index}].perStopPrice.amount`,
                        0,
                      ),
                      currency,
                    }
                  : undefined,
            };
          })
        : [],
      pricing: {
        basePricePerTrip: {
          amount: parseFiniteNumber(
            isRecord(body.route.pricing.basePricePerTrip)
              ? body.route.pricing.basePricePerTrip.amount
              : undefined,
            "route.pricing.basePricePerTrip.amount",
            0,
          ),
          currency,
        },
        hasUniformPerStopPricing,
        uniformPricePerStop:
          hasUniformPerStopPricing
            ? {
                amount: parseFiniteNumber(
                  isRecord(body.route.pricing.uniformPricePerStop)
                    ? body.route.pricing.uniformPricePerStop.amount
                    : undefined,
                  "route.pricing.uniformPricePerStop.amount",
                  0,
                ),
                currency,
              }
            : undefined,
      },
    },
    capacity: {
      ...capacity,
      cargoPricePerKg: cargoPrice === undefined ? undefined : { amount: cargoPrice, currency },
    },
    departures: Array.isArray(body.departures)
      ? body.departures.map((departure, index) => {
          if (!isRecord(departure)) {
            throw new ApiError(422, `departures[${index}] must be an object`);
          }
          const departureTimeUtc = parseString(
            departure.departureTimeUtc,
            `departures[${index}].departureTimeUtc`,
          );
          if (Number.isNaN(Date.parse(departureTimeUtc))) {
            throw new ApiError(422, `departures[${index}].departureTimeUtc must be a valid ISO date`);
          }
          return {
            departureTimeUtc,
            maxPassengersOverride: parseOptionalFiniteNumber(
              departure.maxPassengersOverride,
              `departures[${index}].maxPassengersOverride`,
              1,
            ),
            maxCargoWeightKgOverride: parseOptionalFiniteNumber(
              departure.maxCargoWeightKgOverride,
              `departures[${index}].maxCargoWeightKgOverride`,
              0,
            ),
            status:
              departure.status === "cancelled"
                ? "cancelled"
                : departure.status === undefined || departure.status === "scheduled"
                  ? "scheduled"
                  : (() => {
                      throw new ApiError(
                        422,
                        `departures[${index}].status must be scheduled or cancelled`,
                      );
                    })(),
          };
        })
      : [],
    photos: Array.isArray(body.photos)
      ? body.photos
          .map((photo, index) => parseString(photo, `photos[${index}]`, false))
          .filter((photo) => photo.length > 0)
      : [],
    isActive: parseBoolean(body.isActive, "isActive", true),
  };

  return payload;
};

const mapDbError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof ApiError) {
    return error;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    String(error.code) === "23505"
  ) {
    return new ApiError(409, "A listing with this slug already exists");
  }
  return new ApiError(500, fallbackMessage);
};

const pickSummaryTranslation = (translations: ReadonlyArray<BoatTranslation>): BoatTranslation => {
  const english = translations.find((translation) => translation.locale === "en");
  if (english) {
    return english;
  }
  const croatian = translations.find((translation) => translation.locale === "hr");
  if (croatian) {
    return croatian;
  }
  return {
    locale: "en",
    name: "Untitled listing",
    description: "",
  };
};

const toRouteModel = (
  boatRow: typeof boats.$inferSelect,
  routeRow: typeof boatRoutes.$inferSelect,
  stopRows: ReadonlyArray<typeof boatRouteStops.$inferSelect>,
): Route => ({
  id: routeRow.id as Route["id"],
  boatId: boatRow.id as Route["boatId"],
  start: {
    lat: num(routeRow.startLat),
    lng: num(routeRow.startLng),
  },
  end: {
    lat: num(routeRow.endLat),
    lng: num(routeRow.endLng),
  },
  stops: stopRows
    .slice()
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map(
      (stop): Stop => ({
        id: stop.id,
        routeId: routeRow.id as Stop["routeId"],
        orderIndex: stop.orderIndex,
        coordinate: {
          lat: num(stop.lat),
          lng: num(stop.lng),
        },
        perStopPrice:
          stop.perStopPrice == null
            ? undefined
            : toMoney(num(stop.perStopPrice), routeRow.currency),
      }),
    ),
  pricing: {
    basePricePerTrip: toMoney(num(routeRow.basePricePerTrip), routeRow.currency),
    hasUniformPerStopPricing: routeRow.hasUniformPerStopPricing,
    uniformPricePerStop:
      routeRow.uniformPricePerStop == null
        ? undefined
        : toMoney(num(routeRow.uniformPricePerStop), routeRow.currency),
  },
});

const toCapacityModel = (
  boatRow: typeof boats.$inferSelect,
  currency: string,
): CapacityInfo => ({
  maxPassengers: boatRow.maxPassengers,
  maxTotalLoadKg: boatRow.maxTotalLoadKg,
  offersCargo: boatRow.offersCargo,
  maxCargoPackages: boatRow.maxCargoPackages ?? undefined,
  maxCargoWeightKg: boatRow.maxCargoWeightKg ?? undefined,
  cargoPricePerKg:
    boatRow.cargoPricePerKg == null ? undefined : toMoney(num(boatRow.cargoPricePerKg), currency),
});

const toDepartureModel = (
  departureRow: typeof boatDepartures.$inferSelect,
): BoatDeparture => ({
  id: departureRow.id as BoatDeparture["id"],
  routeId: departureRow.routeId as BoatDeparture["routeId"],
  departureTimeUtc: departureRow.departureTimeUtc.toISOString(),
  maxPassengersOverride: departureRow.maxPassengersOverride ?? undefined,
  maxCargoWeightKgOverride: departureRow.maxCargoWeightKgOverride ?? undefined,
  status: departureRow.status,
});

type OwnerListingRecord = {
  readonly boat: BoatListingDetail;
  readonly departures: ReadonlyArray<BoatDeparture>;
};

const loadOwnerListing = async (
  ownerId: string,
  boatId: string,
): Promise<OwnerListingRecord | null> => {
  const [boatRow] = await getDb()
    .select()
    .from(boats)
    .where(and(eq(boats.id, boatId), eq(boats.ownerId, ownerId)))
    .limit(1);

  if (!boatRow) {
    return null;
  }

  const [routeRow] = await getDb()
    .select()
    .from(boatRoutes)
    .where(eq(boatRoutes.boatId, boatRow.id))
    .limit(1);

  if (!routeRow) {
    throw new ApiError(500, "Listing route is missing");
  }

  const [translationRows, stopRows, departureRows] = await Promise.all([
    getDb()
      .select()
      .from(boatTranslations)
      .where(eq(boatTranslations.boatId, boatRow.id))
      .orderBy(asc(boatTranslations.locale)),
    getDb()
      .select()
      .from(boatRouteStops)
      .where(eq(boatRouteStops.routeId, routeRow.id))
      .orderBy(asc(boatRouteStops.orderIndex)),
    getDb()
      .select()
      .from(boatDepartures)
      .where(eq(boatDepartures.routeId, routeRow.id))
      .orderBy(asc(boatDepartures.departureTimeUtc)),
  ]);

  const translations = translationRows.map(
    (translation): BoatTranslation => ({
      locale: translation.locale === "hr" ? "hr" : "en",
      name: translation.name,
      description: translation.description,
      allowedGoodsDescription: translation.allowedGoodsDescription ?? undefined,
      startLocationLabel: translation.startLocationLabel ?? undefined,
      endLocationLabel: translation.endLocationLabel ?? undefined,
    }),
  );

  const route = toRouteModel(boatRow, routeRow, stopRows);
  const boat: BoatListingDetail = {
    id: boatRow.id as BoatListingDetail["id"],
    slug: boatRow.slug ?? undefined,
    ownerId: boatRow.ownerId,
    translations,
    route,
    capacity: toCapacityModel(boatRow, routeRow.currency),
    photos: [...boatRow.photos],
    isActive: boatRow.isActive,
  };

  return {
    boat,
    departures: departureRows.map(toDepartureModel),
  };
};

const listOwnerListings = (ownerId: string) =>
  Effect.tryPromise({
    try: async () => {
      const rows = await getDb()
        .select()
        .from(boats)
        .where(eq(boats.ownerId, ownerId))
        .orderBy(asc(boats.createdAt));

      const items: OwnerBoatListingSummary[] = [];

      for (const row of rows) {
        const record = await loadOwnerListing(ownerId, row.id);
        if (!record) {
          continue;
        }
        items.push({
          id: record.boat.id,
          slug: record.boat.slug,
          translation: pickSummaryTranslation(record.boat.translations),
          route: record.boat.route,
          capacity: record.boat.capacity,
          departures: [...record.departures],
          isActive: record.boat.isActive,
        });
      }

      return items;
    },
    catch: (error) => mapDbError(error, "Could not load owner listings"),
  });

const getOwnerListing = (ownerId: string, boatId: string) =>
  Effect.tryPromise({
    try: async () => {
      const record = await loadOwnerListing(ownerId, boatId);
      if (!record) {
        throw new ApiError(404, "Listing not found");
      }
      return record;
    },
    catch: (error) => mapDbError(error, "Could not load listing"),
  });

const insertListingRows = async (
  ownerId: string,
  boatId: string,
  routeId: string,
  listing: BoatListingPayload,
) => {
  await getDb().insert(boats).values({
    id: boatId,
    ownerId,
    slug: listing.slug ?? null,
    skipperIncluded: true,
    photos: listing.photos,
    maxPassengers: listing.capacity.maxPassengers,
    maxTotalLoadKg: listing.capacity.maxTotalLoadKg,
    offersCargo: listing.capacity.offersCargo,
    maxCargoPackages: listing.capacity.maxCargoPackages ?? null,
    maxCargoWeightKg: listing.capacity.maxCargoWeightKg ?? null,
    cargoPricePerKg: listing.capacity.cargoPricePerKg?.amount?.toString() ?? null,
    isActive: listing.isActive ?? true,
  });

  await getDb().insert(boatRoutes).values({
    id: routeId,
    boatId,
    startLat: String(listing.route.start.lat),
    startLng: String(listing.route.start.lng),
    endLat: String(listing.route.end.lat),
    endLng: String(listing.route.end.lng),
    basePricePerTrip: String(listing.route.pricing.basePricePerTrip.amount),
    hasUniformPerStopPricing: listing.route.pricing.hasUniformPerStopPricing,
    uniformPricePerStop: listing.route.pricing.uniformPricePerStop?.amount?.toString() ?? null,
    currency: listing.route.pricing.basePricePerTrip.currency,
  });

  if (listing.translations.length > 0) {
    await getDb().insert(boatTranslations).values(
      listing.translations.map((translation) => ({
        id: randomUUID(),
        boatId,
        locale: translation.locale,
        name: translation.name,
        description: translation.description,
        allowedGoodsDescription: translation.allowedGoodsDescription ?? null,
        startLocationLabel: translation.startLocationLabel ?? null,
        endLocationLabel: translation.endLocationLabel ?? null,
      })),
    );
  }

  if (listing.route.stops.length > 0) {
    await getDb().insert(boatRouteStops).values(
      listing.route.stops.map((stop, index) => ({
        id: randomUUID(),
        routeId,
        orderIndex: index + 1,
        lat: String(stop.coordinate.lat),
        lng: String(stop.coordinate.lng),
        perStopPrice: stop.perStopPrice?.amount?.toString() ?? null,
      })),
    );
  }

  if (listing.departures.length > 0) {
    await getDb().insert(boatDepartures).values(
      listing.departures.map((departure) => ({
        id: randomUUID(),
        routeId,
        departureTimeUtc: new Date(departure.departureTimeUtc),
        maxPassengersOverride: departure.maxPassengersOverride ?? null,
        maxCargoWeightKgOverride: departure.maxCargoWeightKgOverride ?? null,
        status: departure.status ?? "scheduled",
      })),
    );
  }
};

const createOwnerListing = (ownerId: string, listing: BoatListingPayload) =>
  Effect.tryPromise({
    try: async () => {
      const boatId = randomUUID();
      const routeId = randomUUID();
      await insertListingRows(ownerId, boatId, routeId, listing);
      const record = await loadOwnerListing(ownerId, boatId);
      if (!record) {
        throw new ApiError(500, "Created listing could not be reloaded");
      }
      return record;
    },
    catch: (error) => mapDbError(error, "Could not create listing"),
  });

const updateOwnerListing = (
  ownerId: string,
  boatId: string,
  listing: BoatListingPayload,
) =>
  Effect.tryPromise({
    try: async () => {
      const current = await loadOwnerListing(ownerId, boatId);
      if (!current) {
        throw new ApiError(404, "Listing not found");
      }

      const [bookingRow] = await getDb()
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.boatId, boatId))
        .limit(1);

      if (bookingRow) {
        throw new ApiError(
          409,
          "Listings with existing bookings cannot be edited yet. Create a new listing instead.",
        );
      }

      await getDb()
        .update(boats)
        .set({
          slug: listing.slug ?? null,
          photos: listing.photos,
          maxPassengers: listing.capacity.maxPassengers,
          maxTotalLoadKg: listing.capacity.maxTotalLoadKg,
          offersCargo: listing.capacity.offersCargo,
          maxCargoPackages: listing.capacity.maxCargoPackages ?? null,
          maxCargoWeightKg: listing.capacity.maxCargoWeightKg ?? null,
          cargoPricePerKg: listing.capacity.cargoPricePerKg?.amount?.toString() ?? null,
          isActive: listing.isActive ?? true,
          updatedAt: new Date(),
        })
        .where(eq(boats.id, boatId));

      await getDb()
        .update(boatRoutes)
        .set({
          startLat: String(listing.route.start.lat),
          startLng: String(listing.route.start.lng),
          endLat: String(listing.route.end.lat),
          endLng: String(listing.route.end.lng),
          basePricePerTrip: String(listing.route.pricing.basePricePerTrip.amount),
          hasUniformPerStopPricing: listing.route.pricing.hasUniformPerStopPricing,
          uniformPricePerStop: listing.route.pricing.uniformPricePerStop?.amount?.toString() ?? null,
          currency: listing.route.pricing.basePricePerTrip.currency,
          updatedAt: new Date(),
        })
        .where(eq(boatRoutes.id, current.boat.route.id));

      await getDb().delete(boatTranslations).where(eq(boatTranslations.boatId, boatId));
      await getDb().delete(boatRouteStops).where(eq(boatRouteStops.routeId, current.boat.route.id));
      await getDb().delete(boatDepartures).where(eq(boatDepartures.routeId, current.boat.route.id));

      if (listing.translations.length > 0) {
        await getDb().insert(boatTranslations).values(
          listing.translations.map((translation) => ({
            id: randomUUID(),
            boatId,
            locale: translation.locale,
            name: translation.name,
            description: translation.description,
            allowedGoodsDescription: translation.allowedGoodsDescription ?? null,
            startLocationLabel: translation.startLocationLabel ?? null,
            endLocationLabel: translation.endLocationLabel ?? null,
          })),
        );
      }

      if (listing.route.stops.length > 0) {
        await getDb().insert(boatRouteStops).values(
          listing.route.stops.map((stop, index) => ({
            id: randomUUID(),
            routeId: current.boat.route.id,
            orderIndex: index + 1,
            lat: String(stop.coordinate.lat),
            lng: String(stop.coordinate.lng),
            perStopPrice: stop.perStopPrice?.amount?.toString() ?? null,
          })),
        );
      }

      if (listing.departures.length > 0) {
        await getDb().insert(boatDepartures).values(
          listing.departures.map((departure) => ({
            id: randomUUID(),
            routeId: current.boat.route.id,
            departureTimeUtc: new Date(departure.departureTimeUtc),
            maxPassengersOverride: departure.maxPassengersOverride ?? null,
            maxCargoWeightKgOverride: departure.maxCargoWeightKgOverride ?? null,
            status: departure.status ?? "scheduled",
          })),
        );
      }

      const record = await loadOwnerListing(ownerId, boatId);
      if (!record) {
        throw new ApiError(500, "Updated listing could not be reloaded");
      }
      return record;
    },
    catch: (error) => mapDbError(error, "Could not update listing"),
  });

export interface OwnerListingServiceShape {
  readonly parseListingPayload: (body: unknown) => Effect.Effect<BoatListingPayload, ApiError>;
  readonly listOwnerListings: (
    ownerId: string,
  ) => Effect.Effect<ReadonlyArray<OwnerBoatListingSummary>, ApiError>;
  readonly getOwnerListing: (
    ownerId: string,
    boatId: string,
  ) => Effect.Effect<OwnerListingRecord, ApiError>;
  readonly createOwnerListing: (
    ownerId: string,
    listing: BoatListingPayload,
  ) => Effect.Effect<OwnerListingRecord, ApiError>;
  readonly updateOwnerListing: (
    ownerId: string,
    boatId: string,
    listing: BoatListingPayload,
  ) => Effect.Effect<OwnerListingRecord, ApiError>;
}

export const OwnerListingService =
  Context.GenericTag<OwnerListingServiceShape>("OwnerListingService");

export const OwnerListingServiceLive = Layer.succeed(
  OwnerListingService,
  OwnerListingService.of({
    parseListingPayload: (body) =>
      Effect.try({
        try: () => parseListingPayload(body),
        catch: (error) =>
          error instanceof ApiError
            ? error
            : new ApiError(422, "Invalid listing payload"),
      }),
    listOwnerListings,
    getOwnerListing,
    createOwnerListing,
    updateOwnerListing,
  }),
);
