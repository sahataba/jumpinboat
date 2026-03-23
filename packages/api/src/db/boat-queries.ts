import { and, asc, eq, gte, inArray } from "drizzle-orm";

import type {
  BoatListingSummary,
  BoatTranslation,
  CapacityInfo,
  Money,
  Route,
  Stop,
} from "@jumpinboat/shared";

import { db } from "./client.js";
import {
  boatDepartures,
  boatRouteStops,
  boatRoutes,
  boatTranslations,
  boats,
  bookings,
} from "./schema.js";

const money = (amount: number, currency = "EUR"): Money => ({ amount, currency });

const num = (v: string | null | undefined): number =>
  v === null || v === undefined ? 0 : Number(v);

const toCoordinate = (lat: string, lng: string) => ({
  lat: num(lat),
  lng: num(lng),
});

const haversineKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
};

/** Minimum distance from point P to segment AB (km). */
const distancePointToSegmentKm = (
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  // Approximate: treat lat/lng as planar for small distances — good enough for MVP filters
  const dist = (x: typeof p, y: typeof p) => haversineKm(x, y);
  const ab = dist(a, b);
  if (ab < 0.001) return dist(p, a);
  // project t onto segment
  const toRad = (d: number) => (d * Math.PI) / 180;
  const latM = (la: number) => la * 111;
  const lngM = (la: number, ln: number) => ln * 111 * Math.cos(toRad(la));
  const px = lngM(p.lat, p.lng);
  const py = latM(p.lat);
  const ax = lngM(a.lat, a.lng);
  const ay = latM(a.lat);
  const bx = lngM(b.lat, b.lng);
  const by = latM(b.lat);
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abx * abx + aby * aby || 1)));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  const clat = cy / 111;
  const clng = cx / (111 * Math.cos(toRad(clat)) || 1);
  return haversineKm(p, { lat: clat, lng: clng });
};

const routeTouchesPoints = (
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  stops: ReadonlyArray<{ lat: number; lng: number }>,
  searchStart: { lat: number; lng: number },
  searchEnd: { lat: number; lng: number },
  maxKm: number,
): boolean => {
  const points = [start, ...stops, end];
  const near = (p: { lat: number; lng: number }, q: { lat: number; lng: number }) =>
    haversineKm(p, q) <= maxKm;
  const segNear = (
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
    q: { lat: number; lng: number },
  ) => distancePointToSegmentKm(q, a, b) <= maxKm;

  let okStart = false;
  let okEnd = false;
  for (let i = 0; i < points.length; i++) {
    if (near(points[i], searchStart)) okStart = true;
    if (near(points[i], searchEnd)) okEnd = true;
  }
  for (let i = 0; i < points.length - 1; i++) {
    if (segNear(points[i], points[i + 1], searchStart)) okStart = true;
    if (segNear(points[i], points[i + 1], searchEnd)) okEnd = true;
  }
  return okStart && okEnd;
};

const pickTranslation = (
  byBoat: Map<string, BoatTranslation[]>,
  boatId: string,
  locale: string,
): BoatTranslation => {
  const list = byBoat.get(boatId) ?? [];
  const exact = list.find((t) => t.locale === locale);
  if (exact) return exact;
  const en = list.find((t) => t.locale === "en");
  if (en) return en;
  const hr = list.find((t) => t.locale === "hr");
  if (hr) return hr;
  return {
    locale: "en",
    name: "Listing",
    description: "",
  };
};

export type PublicBoatSearchFilters = {
  readonly query: string;
  readonly goodsTransportOnly: boolean;
  readonly minFreeSpots: number;
  readonly locale: "en" | "hr";
  readonly nearMe?: { lat: number; lng: number; radiusKm: number };
  readonly route?: {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
    maxMatchKm: number;
  };
};

const weatherStubPercent = (lat: number, lng: number): number => {
  const h = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453);
  return 8 + Math.floor((h % 1) * 22);
};

export async function searchBoatListingSummaries(
  filters: PublicBoatSearchFilters,
): Promise<ReadonlyArray<BoatListingSummary>> {
  const activeBoats = await db
    .select()
    .from(boats)
    .where(eq(boats.isActive, true));

  if (activeBoats.length === 0) {
    return [];
  }

  const boatIds = activeBoats.map((b) => b.id);

  const routes = await db
    .select()
    .from(boatRoutes)
    .where(inArray(boatRoutes.boatId, boatIds));

  const routeIds = routes.map((r) => r.id);
  const stops =
    routeIds.length === 0
      ? []
      : await db
          .select()
          .from(boatRouteStops)
          .where(inArray(boatRouteStops.routeId, routeIds))
          .orderBy(boatRouteStops.orderIndex);

  const translations = await db
    .select()
    .from(boatTranslations)
    .where(inArray(boatTranslations.boatId, boatIds));

  const byBoatTr = new Map<string, BoatTranslation[]>();
  for (const t of translations) {
    const tr: BoatTranslation = {
      locale: t.locale as BoatTranslation["locale"],
      name: t.name,
      description: t.description,
      allowedGoodsDescription: t.allowedGoodsDescription ?? undefined,
      startLocationLabel: t.startLocationLabel ?? undefined,
      endLocationLabel: t.endLocationLabel ?? undefined,
    };
    const arr = byBoatTr.get(t.boatId) ?? [];
    arr.push(tr);
    byBoatTr.set(t.boatId, arr);
  }

  const stopsByRoute = new Map<string, typeof stops>();
  for (const s of stops) {
    const arr = stopsByRoute.get(s.routeId) ?? [];
    arr.push(s);
    stopsByRoute.set(s.routeId, arr);
  }

  const now = new Date();
  const departures =
    routeIds.length === 0
      ? []
      : await db
          .select()
          .from(boatDepartures)
          .where(
            and(
              inArray(boatDepartures.routeId, routeIds),
              eq(boatDepartures.status, "scheduled"),
              gte(boatDepartures.departureTimeUtc, now),
            ),
          );

  const depIds = departures.map((d) => d.id);
  const bookingRows =
    depIds.length === 0
      ? []
      : await db
          .select({
            departureId: bookings.departureId,
            passengers: bookings.passengerCount,
            status: bookings.status,
          })
          .from(bookings)
          .where(
            and(
              inArray(bookings.departureId, depIds),
              inArray(bookings.status, ["pending", "confirmed"]),
            ),
          );

  const bookedByDep = new Map<string, number>();
  for (const br of bookingRows) {
    bookedByDep.set(
      br.departureId,
      (bookedByDep.get(br.departureId) ?? 0) + br.passengers,
    );
  }

  const depsByRoute = new Map<string, typeof departures>();
  for (const d of departures) {
    const arr = depsByRoute.get(d.routeId) ?? [];
    arr.push(d);
    depsByRoute.set(d.routeId, arr);
  }

  const summaries: BoatListingSummary[] = [];

  for (const boat of activeBoats) {
    const routeRow = routes.find((r) => r.boatId === boat.id);
    if (!routeRow) continue;

    const routeStops = (stopsByRoute.get(routeRow.id) ?? []).sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );

    const start = toCoordinate(routeRow.startLat, routeRow.startLng);
    const end = toCoordinate(routeRow.endLat, routeRow.endLng);
    const stopCoords = routeStops.map((s) => toCoordinate(s.lat, s.lng));

    if (filters.nearMe) {
      const { lat, lng, radiusKm } = filters.nearMe;
      const p = { lat, lng };
      const closeEnough =
        haversineKm(p, start) <= radiusKm ||
        haversineKm(p, end) <= radiusKm ||
        stopCoords.some((c) => haversineKm(p, c) <= radiusKm);
      if (!closeEnough) continue;
    }

    if (filters.route) {
      const { start: ss, end: se, maxMatchKm } = filters.route;
      if (!routeTouchesPoints(start, end, stopCoords, ss, se, maxMatchKm)) {
        continue;
      }
    }

    const stopModels: Stop[] = routeStops.map((s) => ({
      id: s.id,
      routeId: routeRow.id as Stop["routeId"],
      orderIndex: s.orderIndex,
      coordinate: toCoordinate(s.lat, s.lng),
      perStopPrice:
        s.perStopPrice != null
          ? money(num(s.perStopPrice), routeRow.currency)
          : undefined,
    }));

    const route: Route = {
      id: routeRow.id as Route["id"],
      boatId: boat.id as Route["boatId"],
      start,
      end,
      stops: stopModels,
      pricing: {
        basePricePerTrip: money(num(routeRow.basePricePerTrip), routeRow.currency),
        hasUniformPerStopPricing: routeRow.hasUniformPerStopPricing,
        uniformPricePerStop:
          routeRow.uniformPricePerStop != null
            ? money(num(routeRow.uniformPricePerStop), routeRow.currency)
            : undefined,
      },
    };

    const capacity: CapacityInfo = {
      maxPassengers: boat.maxPassengers,
      maxTotalLoadKg: boat.maxTotalLoadKg,
      offersCargo: boat.offersCargo,
      maxCargoPackages: boat.maxCargoPackages ?? undefined,
      maxCargoWeightKg: boat.maxCargoWeightKg ?? undefined,
      cargoPricePerKg:
        boat.cargoPricePerKg != null
          ? money(num(boat.cargoPricePerKg), routeRow.currency)
          : undefined,
    };

    const routeDeps = depsByRoute.get(routeRow.id) ?? [];
    let minFree = boat.maxPassengers;
    for (const dep of routeDeps) {
      const maxP = dep.maxPassengersOverride ?? boat.maxPassengers;
      const booked = bookedByDep.get(dep.id) ?? 0;
      const free = Math.max(0, maxP - booked);
      minFree = Math.min(minFree, free);
    }
    if (routeDeps.length === 0) {
      minFree = boat.maxPassengers;
    }

    const translation = pickTranslation(byBoatTr, boat.id, filters.locale);

    const q = filters.query.trim().toLowerCase();
    if (q.length > 0) {
      const hay = [
        translation.name,
        translation.description,
        translation.allowedGoodsDescription,
        translation.startLocationLabel,
        translation.endLocationLabel,
        boat.slug,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) continue;
    }

    if (filters.goodsTransportOnly && !boat.offersCargo) continue;
    if (minFree < filters.minFreeSpots) continue;

    const midLat = (start.lat + end.lat) / 2;
    const midLng = (start.lng + end.lng) / 2;

    summaries.push({
      id: boat.id as BoatListingSummary["id"],
      slug: boat.slug ?? undefined,
      translation,
      route,
      capacity,
      bookedPassengers: boat.maxPassengers - minFree,
      freePassengers: minFree,
      maxPassengers: boat.maxPassengers,
      weatherRiskPercent: weatherStubPercent(midLat, midLng),
      offersCargo: boat.offersCargo,
    });
  }

  return summaries;
}

export async function getBoatListingSummaryById(
  boatId: string,
  locale: "en" | "hr",
): Promise<BoatListingSummary | null> {
  const list = await searchBoatListingSummaries({
    query: "",
    goodsTransportOnly: false,
    minFreeSpots: 0,
    locale,
  });
  return list.find((b) => b.id === boatId) ?? null;
}

export async function listDeparturesForBoat(
  boatId: string,
): Promise<
  ReadonlyArray<{
    id: string;
    routeId: string;
    departureTimeUtc: Date;
    maxPassengersOverride: number | null;
    maxCargoWeightKgOverride: number | null;
    status: string;
  }>
> {
  const [routeRow] = await db
    .select({ id: boatRoutes.id })
    .from(boatRoutes)
    .innerJoin(boats, eq(boatRoutes.boatId, boats.id))
    .where(eq(boats.id, boatId))
    .limit(1);

  if (!routeRow) {
    return [];
  }

  const now = new Date();
  return db
    .select({
      id: boatDepartures.id,
      routeId: boatDepartures.routeId,
      departureTimeUtc: boatDepartures.departureTimeUtc,
      maxPassengersOverride: boatDepartures.maxPassengersOverride,
      maxCargoWeightKgOverride: boatDepartures.maxCargoWeightKgOverride,
      status: boatDepartures.status,
    })
    .from(boatDepartures)
    .where(
      and(
        eq(boatDepartures.routeId, routeRow.id),
        eq(boatDepartures.status, "scheduled"),
        gte(boatDepartures.departureTimeUtc, now),
      ),
    )
    .orderBy(asc(boatDepartures.departureTimeUtc));
}
