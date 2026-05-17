import argon2 from "argon2";
import { eq } from "drizzle-orm";

import { getDb } from "./client.js";
import {
  boatDepartures,
  boatRouteStops,
  boatRoutes,
  boatTranslations,
  boats,
  users,
} from "./schema.js";

const OWNER_ID = "10000000-0000-4000-8000-000000000001";
const OWNER_EMAIL = "owner@jumpinboat.local";

async function main() {
  const [existing] = await getDb().select().from(boats).limit(1);
  if (existing) {
    console.log("Database already has boats; skip seed.");
    return;
  }

  const passwordHash = await argon2.hash("password123");

  await getDb().insert(users).values({
    id: OWNER_ID,
    email: OWNER_EMAIL,
    passwordHash,
    rolePrimary: "owner",
    canBook: true,
    canListBoats: true,
  });

  const now = Date.now();
  const inDays = (d: number) => new Date(now + d * 86400000);

  type BoatSeed = {
    id: string;
    slug: string;
    translation: {
      locale: string;
      name: string;
      description: string;
      allowedGoodsDescription?: string;
      startLocationLabel: string;
      endLocationLabel: string;
    };
    route: {
      id: string;
      startLat: string;
      startLng: string;
      endLat: string;
      endLng: string;
      basePrice: string;
      hasUniformPerStop: boolean;
      uniformPerStop?: string;
      currency: string;
      stops: ReadonlyArray<{
        id: string;
        order: number;
        lat: string;
        lng: string;
        perStopPrice?: string;
      }>;
    };
    maxPassengers: number;
    maxTotalLoadKg: number;
    offersCargo: boolean;
    maxCargoPackages?: number;
    maxCargoWeightKg?: number;
    cargoPricePerKg?: string;
  };

  const data: BoatSeed[] = [
    {
      id: "10000000-0000-4000-8000-000000000010",
      slug: "lanterna-sunrise-hop",
      translation: {
        locale: "en",
        name: "Lanterna Sunrise Hop",
        description:
          "Fast morning transfers from Porec to Lanterna with coffee, shade canopy, and room for swim bags.",
        allowedGoodsDescription: "Cool boxes, groceries, and compact luggage.",
        startLocationLabel: "Porec Harbor",
        endLocationLabel: "Lanterna Marina",
      },
      route: {
        id: "10000000-0000-4000-8000-000000000011",
        startLat: "45.2271",
        startLng: "13.5956",
        endLat: "45.2914",
        endLng: "13.6152",
        basePrice: "58",
        hasUniformPerStop: true,
        uniformPerStop: "12",
        currency: "EUR",
        stops: [
          {
            id: "10000000-0000-4000-8000-000000000012",
            order: 1,
            lat: "45.2337",
            lng: "13.6012",
            perStopPrice: "12",
          },
          {
            id: "10000000-0000-4000-8000-000000000013",
            order: 2,
            lat: "45.2489",
            lng: "13.6049",
            perStopPrice: "12",
          },
        ],
      },
      maxPassengers: 8,
      maxTotalLoadKg: 900,
      offersCargo: true,
      maxCargoPackages: 10,
      maxCargoWeightKg: 200,
      cargoPricePerKg: "2.50",
    },
  ];

  for (const b of data) {
    await getDb().insert(boats).values({
      id: b.id,
      ownerId: OWNER_ID,
      slug: b.slug,
      skipperIncluded: true,
      photos: [],
      maxPassengers: b.maxPassengers,
      maxTotalLoadKg: b.maxTotalLoadKg,
      offersCargo: b.offersCargo,
      maxCargoPackages: b.maxCargoPackages ?? null,
      maxCargoWeightKg: b.maxCargoWeightKg ?? null,
      cargoPricePerKg: b.cargoPricePerKg ?? null,
      isActive: true,
    });

    await getDb().insert(boatTranslations).values({
      boatId: b.id,
      locale: b.translation.locale,
      name: b.translation.name,
      description: b.translation.description,
      allowedGoodsDescription: b.translation.allowedGoodsDescription ?? null,
      startLocationLabel: b.translation.startLocationLabel,
      endLocationLabel: b.translation.endLocationLabel,
    });

    await getDb().insert(boatRoutes).values({
      id: b.route.id,
      boatId: b.id,
      startLat: b.route.startLat,
      startLng: b.route.startLng,
      endLat: b.route.endLat,
      endLng: b.route.endLng,
      basePricePerTrip: b.route.basePrice,
      hasUniformPerStopPricing: b.route.hasUniformPerStop,
      uniformPricePerStop: b.route.uniformPerStop ?? null,
      currency: b.route.currency,
    });

    for (const s of b.route.stops) {
      await getDb().insert(boatRouteStops).values({
        id: s.id,
        routeId: b.route.id,
        orderIndex: s.order,
        lat: s.lat,
        lng: s.lng,
        perStopPrice: s.perStopPrice ?? null,
      });
    }

    for (let i = 1; i <= 5; i++) {
      await getDb().insert(boatDepartures).values({
        routeId: b.route.id,
        departureTimeUtc: inDays(i + i * 0.1),
        status: "scheduled",
      });
    }
  }

  await getDb().insert(boatTranslations).values({
    boatId: "10000000-0000-4000-8000-000000000010",
    locale: "hr",
    name: "Lanterna jutarnji transfer",
    description:
      "Brzi jutarnji prijevoz od Poreča do Lanterne s kavom i sjenom — skipper uključen.",
    allowedGoodsDescription: "Hladnjaci, namirnice, kompaktna prtljaga.",
    startLocationLabel: "Poreč luka",
    endLocationLabel: "Lanterna marina",
  });

  console.log(`Seeded owner ${OWNER_EMAIL} / password123 and ${data.length} boats with departures.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
