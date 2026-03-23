import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";

import type { CreateBookingRequest, Booking, BookingPriceBreakdown } from "@jumpinboat/shared";

import { ApiError } from "../api-error.js";
import { db } from "../db/client.js";
import {
  boatDepartures,
  boatRouteStops,
  boatRoutes,
  boats,
  bookings,
  bookingStops,
  users,
} from "../db/schema.js";

const num = (v: string | null | undefined): number =>
  v === null || v === undefined ? 0 : Number(v);

const money = (amount: number, currency = "EUR") => ({ amount, currency });

const weatherStubPercent = (lat: number, lng: number): number => {
  const h = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453);
  return 8 + Math.floor((h % 1) * 22);
};

const computeStopTotal = (
  route: {
    hasUniformPerStopPricing: boolean;
    uniformPricePerStop: string | null;
    stops: ReadonlyArray<{ id: string; perStopPrice: string | null }>;
  },
  selectedStopIds: ReadonlySet<string>,
): number => {
  let total = 0;
  for (const s of route.stops) {
    if (!selectedStopIds.has(s.id)) continue;
    if (route.hasUniformPerStopPricing && route.uniformPricePerStop != null) {
      total += num(route.uniformPricePerStop);
    } else if (s.perStopPrice != null) {
      total += num(s.perStopPrice);
    }
  }
  return total;
};

const createBooking = (customerId: string, body: CreateBookingRequest) =>
  Effect.tryPromise({
    try: async () => {
      const [dep] = await db
        .select()
        .from(boatDepartures)
        .where(eq(boatDepartures.id, body.departureId))
        .limit(1);

      if (!dep || dep.status !== "scheduled") {
        throw new ApiError(404, "Departure not found");
      }

      const [routeRow] = await db
        .select()
        .from(boatRoutes)
        .where(eq(boatRoutes.id, dep.routeId))
        .limit(1);

      if (!routeRow) {
        throw new ApiError(500, "Route missing");
      }

      const [boatRow] = await db
        .select()
        .from(boats)
        .where(eq(boats.id, body.boatId))
        .limit(1);

      if (!boatRow || boatRow.id !== routeRow.boatId) {
        throw new ApiError(400, "Boat does not match departure");
      }

      const stops = await db
        .select()
        .from(boatRouteStops)
        .where(eq(boatRouteStops.routeId, routeRow.id));

      const selectedIds = new Set(body.selectedStops.map((s) => s.stopId));
      for (const sel of body.selectedStops) {
        if (sel.routeId !== routeRow.id) {
          throw new ApiError(400, "Invalid stop selection");
        }
        const found = stops.find((s) => s.id === sel.stopId);
        if (!found) {
          throw new ApiError(400, "Unknown stop");
        }
      }

      const existing = await db
        .select({ p: bookings.passengerCount })
        .from(bookings)
        .where(
          and(
            eq(bookings.departureId, dep.id),
            inArray(bookings.status, ["pending", "confirmed"]),
          ),
        );

      const booked = existing.reduce((a, r) => a + r.p, 0);
      const maxP = dep.maxPassengersOverride ?? boatRow.maxPassengers;
      if (booked + body.passengerCount > maxP) {
        throw new ApiError(409, "Not enough seats on this departure");
      }

      if (boatRow.offersCargo) {
        const maxW = dep.maxCargoWeightKgOverride ?? boatRow.maxCargoWeightKg ?? 0;
        const estW = body.estimatedCargoWeightKg ?? 0;
        if (estW > maxW) {
          throw new ApiError(409, "Cargo weight exceeds listing limit");
        }
        const maxPk = boatRow.maxCargoPackages ?? 999;
        const estPk = body.estimatedCargoPackages ?? 0;
        if (estPk > maxPk) {
          throw new ApiError(409, "Package count exceeds listing limit");
        }
      } else if (
        (body.estimatedCargoWeightKg ?? 0) > 0 ||
        (body.estimatedCargoPackages ?? 0) > 0
      ) {
        throw new ApiError(400, "This listing does not offer cargo transport");
      }

      const baseTrip = num(routeRow.basePricePerTrip);
      const perStopTotal = computeStopTotal(
        {
          hasUniformPerStopPricing: routeRow.hasUniformPerStopPricing,
          uniformPricePerStop: routeRow.uniformPricePerStop,
          stops,
        },
        selectedIds,
      );

      let cargoTotal = 0;
      if (boatRow.offersCargo && boatRow.cargoPricePerKg && body.estimatedCargoWeightKg) {
        cargoTotal = num(boatRow.cargoPricePerKg) * body.estimatedCargoWeightKg;
      }

      const total = baseTrip + perStopTotal + cargoTotal;
      const midLat = (num(routeRow.startLat) + num(routeRow.endLat)) / 2;
      const midLng = (num(routeRow.startLng) + num(routeRow.endLng)) / 2;
      const weatherRisk = weatherStubPercent(midLat, midLng);

      const bookingId = randomUUID();

      await db.insert(bookings).values({
        id: bookingId,
        departureId: dep.id,
        boatId: boatRow.id,
        customerId,
        passengerCount: body.passengerCount,
        estimatedCargoWeightKg: body.estimatedCargoWeightKg ?? null,
        estimatedCargoPackages: body.estimatedCargoPackages ?? null,
        status: "pending",
        baseTripPrice: String(baseTrip),
        perStopTotalPrice: String(perStopTotal),
        cargoPriceTotal: cargoTotal > 0 ? String(cargoTotal) : null,
        totalPrice: String(total),
        weatherRiskPercent: weatherRisk,
      });

      for (const sel of body.selectedStops) {
        await db.insert(bookingStops).values({
          bookingId,
          stopId: sel.stopId,
        });
      }

      const price: BookingPriceBreakdown = {
        baseTripPrice: money(baseTrip, routeRow.currency),
        perStopTotalPrice: money(perStopTotal, routeRow.currency),
        cargoPriceTotal:
          cargoTotal > 0 ? money(cargoTotal, routeRow.currency) : undefined,
        totalPrice: money(total, routeRow.currency),
      };

      const result: Booking = {
        id: bookingId as Booking["id"],
        boatId: body.boatId,
        departureId: body.departureId,
        passengerCount: body.passengerCount,
        selectedStops: body.selectedStops,
        status: "pending",
        price,
        weatherRiskPercent: weatherRisk,
        createdAt: new Date().toISOString(),
      };

      console.log(
        `[notify:stub] New booking ${bookingId} for boat ${body.boatId} — email/WhatsApp to owner would fire here.`,
      );

      return result;
    },
    catch: (e) => (e instanceof ApiError ? e : new ApiError(500, String(e))),
  });

const listMine = (customerId: string) =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select()
        .from(bookings)
        .where(eq(bookings.customerId, customerId))
        .orderBy(bookings.createdAt);

      return rows.map(rowToBooking);
    },
    catch: () => new ApiError(500, "Could not list bookings"),
  });

const listOwnerIncoming = (ownerId: string) =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select({
          b: bookings,
          customerEmail: users.email,
        })
        .from(bookings)
        .innerJoin(boats, eq(bookings.boatId, boats.id))
        .innerJoin(users, eq(bookings.customerId, users.id))
        .where(eq(boats.ownerId, ownerId));

      return rows.map((r) => ({
        booking: rowToBooking(r.b),
        customerEmail: r.customerEmail,
        boatId: r.b.boatId,
      }));
    },
    catch: () => new ApiError(500, "Could not list owner bookings"),
  });

function rowToBooking(row: typeof bookings.$inferSelect): Booking {
  const currency = "EUR";
  return {
    id: row.id as Booking["id"],
    boatId: row.boatId as Booking["boatId"],
    departureId: row.departureId as Booking["departureId"],
    passengerCount: row.passengerCount,
    selectedStops: [],
    status: row.status as Booking["status"],
    price: {
      baseTripPrice: money(num(row.baseTripPrice), currency),
      perStopTotalPrice: money(num(row.perStopTotalPrice), currency),
      cargoPriceTotal:
        row.cargoPriceTotal != null
          ? money(num(row.cargoPriceTotal), currency)
          : undefined,
      totalPrice: money(num(row.totalPrice), currency),
    },
    weatherRiskPercent: row.weatherRiskPercent ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

const setBookingStatus = (
  ownerId: string,
  bookingId: string,
  status: "confirmed" | "declined",
) =>
  Effect.tryPromise({
    try: async () => {
      const [row] = await db
        .select()
        .from(bookings)
        .innerJoin(boats, eq(bookings.boatId, boats.id))
        .where(and(eq(bookings.id, bookingId), eq(boats.ownerId, ownerId)))
        .limit(1);

      if (!row) {
        throw new ApiError(404, "Booking not found");
      }

      if (row.bookings.status !== "pending") {
        throw new ApiError(409, "Booking is no longer pending");
      }

      await db
        .update(bookings)
        .set({ status, updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));

      console.log(
        `[notify:stub] Booking ${bookingId} ${status} — email/WhatsApp to customer would fire here.`,
      );

      return { ok: true as const };
    },
    catch: (e) => (e instanceof ApiError ? e : new ApiError(500, String(e))),
  });

export interface BookingServiceShape {
  readonly parseCreateBody: (body: unknown) => Effect.Effect<CreateBookingRequest, ApiError>;
  readonly createBooking: (
    customerId: string,
    body: CreateBookingRequest,
  ) => Effect.Effect<Booking, ApiError>;
  readonly listMine: (customerId: string) => Effect.Effect<ReadonlyArray<Booking>, ApiError>;
  readonly listOwnerIncoming: (
    ownerId: string,
  ) => Effect.Effect<
    ReadonlyArray<{ booking: Booking; customerEmail: string; boatId: string }>,
    ApiError
  >;
  readonly setBookingStatus: (
    ownerId: string,
    bookingId: string,
    status: "confirmed" | "declined",
  ) => Effect.Effect<{ ok: true }, ApiError>;
}

const parseCreateBody = (body: unknown): Effect.Effect<CreateBookingRequest, ApiError> =>
  Effect.try({
    try: () => {
      if (typeof body !== "object" || body === null) {
        throw new ApiError(400, "Invalid JSON");
      }
      const o = body as Record<string, unknown>;
      const passengerCount = Number(o.passengerCount);
      if (!Number.isFinite(passengerCount) || passengerCount < 1) {
        throw new ApiError(422, "passengerCount must be at least 1");
      }
      return {
        boatId: String(o.boatId),
        departureId: String(o.departureId),
        passengerCount: Math.floor(passengerCount),
        selectedStops: Array.isArray(o.selectedStops)
          ? (o.selectedStops as CreateBookingRequest["selectedStops"])
          : [],
        estimatedCargoWeightKg:
          o.estimatedCargoWeightKg != null
            ? Number(o.estimatedCargoWeightKg)
            : undefined,
        estimatedCargoPackages:
          o.estimatedCargoPackages != null
            ? Number(o.estimatedCargoPackages)
            : undefined,
      } as CreateBookingRequest;
    },
    catch: (e) =>
      e instanceof ApiError ? e : new ApiError(422, "Invalid booking payload"),
  });

export const BookingService = Context.GenericTag<BookingServiceShape>("BookingService");

export const BookingServiceLive = Layer.succeed(
  BookingService,
  BookingService.of({
    parseCreateBody,
    createBooking: (customerId, body) => createBooking(customerId, body),
    listMine,
    listOwnerIncoming,
    setBookingStatus,
  }),
);
