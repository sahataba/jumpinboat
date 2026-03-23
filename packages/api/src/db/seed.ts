import argon2 from "argon2";
import { eq } from "drizzle-orm";

import { db } from "./client.js";
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
  const [existing] = await db.select().from(boats).limit(1);
  if (existing) {
    console.log("Database already has boats; skip seed.");
    return;
  }

  const passwordHash = await argon2.hash("password123");

  await db.insert(users).values({
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
    {
      id: "10000000-0000-4000-8000-000000000020",
      slug: "rovinj-island-run",
      translation: {
        locale: "en",
        name: "Rovinj Island Run",
        description:
          "Open-deck island connector for beachgoers heading from Rovinj old town to the Red Island loop.",
        startLocationLabel: "Rovinj Old Town",
        endLocationLabel: "Red Island",
      },
      route: {
        id: "10000000-0000-4000-8000-000000000021",
        startLat: "45.0811",
        startLng: "13.6387",
        endLat: "45.0605",
        endLng: "13.6548",
        basePrice: "42",
        hasUniformPerStop: false,
        currency: "EUR",
        stops: [
          {
            id: "10000000-0000-4000-8000-000000000022",
            order: 1,
            lat: "45.0723",
            lng: "13.6469",
            perStopPrice: "9",
          },
        ],
      },
      maxPassengers: 10,
      maxTotalLoadKg: 1100,
      offersCargo: false,
    },
    {
      id: "10000000-0000-4000-8000-000000000030",
      slug: "zadar-market-cargo",
      translation: {
        locale: "en",
        name: "Zadar Market Cargo Shuttle",
        description:
          "Practical mixed-use boat for passengers, produce boxes, and restaurant supply runs between islands.",
        allowedGoodsDescription: "Produce crates, dry goods, florist stock, and catering packs.",
        startLocationLabel: "Zadar Port",
        endLocationLabel: "Preko Pier",
      },
      route: {
        id: "10000000-0000-4000-8000-000000000031",
        startLat: "44.1181",
        startLng: "15.2314",
        endLat: "44.0824",
        endLng: "15.1879",
        basePrice: "76",
        hasUniformPerStop: false,
        currency: "EUR",
        stops: [
          {
            id: "10000000-0000-4000-8000-000000000032",
            order: 1,
            lat: "44.0931",
            lng: "15.1974",
            perStopPrice: "18",
          },
          {
            id: "10000000-0000-4000-8000-000000000033",
            order: 2,
            lat: "44.1008",
            lng: "15.1799",
            perStopPrice: "15",
          },
        ],
      },
      maxPassengers: 6,
      maxTotalLoadKg: 1250,
      offersCargo: true,
      maxCargoPackages: 18,
      maxCargoWeightKg: 500,
      cargoPricePerKg: "1.90",
    },
    {
      id: "10000000-0000-4000-8000-000000000040",
      slug: "split-sunset-line",
      translation: {
        locale: "en",
        name: "Split Sunset Line",
        description:
          "Late-day charter line with cushioned seating for quick hops toward Ciovo and sunset returns.",
        startLocationLabel: "Split Riva",
        endLocationLabel: "Ciovo West",
      },
      route: {
        id: "10000000-0000-4000-8000-000000000041",
        startLat: "43.5077",
        startLng: "16.439",
        endLat: "43.4969",
        endLng: "16.2563",
        basePrice: "95",
        hasUniformPerStop: true,
        uniformPerStop: "20",
        currency: "EUR",
        stops: [
          {
            id: "10000000-0000-4000-8000-000000000042",
            order: 1,
            lat: "43.5032",
            lng: "16.4188",
            perStopPrice: "20",
          },
        ],
      },
      maxPassengers: 12,
      maxTotalLoadKg: 1400,
      offersCargo: false,
    },
  ];

  for (const b of data) {
    await db.insert(boats).values({
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

    await db.insert(boatTranslations).values({
      boatId: b.id,
      locale: b.translation.locale,
      name: b.translation.name,
      description: b.translation.description,
      allowedGoodsDescription: b.translation.allowedGoodsDescription ?? null,
      startLocationLabel: b.translation.startLocationLabel,
      endLocationLabel: b.translation.endLocationLabel,
    });

    await db.insert(boatRoutes).values({
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
      await db.insert(boatRouteStops).values({
        id: s.id,
        routeId: b.route.id,
        orderIndex: s.order,
        lat: s.lat,
        lng: s.lng,
        perStopPrice: s.perStopPrice ?? null,
      });
    }

    for (let i = 1; i <= 5; i++) {
      await db.insert(boatDepartures).values({
        routeId: b.route.id,
        departureTimeUtc: inDays(i + i * 0.1),
        status: "scheduled",
      });
    }
  }

  await db.insert(boatTranslations).values({
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
