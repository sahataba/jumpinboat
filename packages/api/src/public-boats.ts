import type {
  BoatListingSummary,
  PublicBoatListFilters,
} from "@jumpinboat/shared";
import {
  buildPublicBoatsSearchPath,
  defaultPublicBoatListFilters,
  normalizePublicBoatListFilters,
} from "@jumpinboat/shared";

const money = (amount: number) => ({ amount, currency: "EUR" });

const boatId = (value: string) => value as BoatListingSummary["id"];
const routeId = (value: string) => value as BoatListingSummary["route"]["id"];

const publicBoatListings: ReadonlyArray<BoatListingSummary> = [
  {
    id: boatId("boat-lanterna-sunrise"),
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
      id: routeId("route-lanterna-sunrise"),
      boatId: boatId("boat-lanterna-sunrise"),
      start: { lat: 45.2271, lng: 13.5956 },
      end: { lat: 45.2914, lng: 13.6152 },
      stops: [
        {
          id: "stop-parentino",
          routeId: routeId("route-lanterna-sunrise"),
          orderIndex: 1,
          coordinate: { lat: 45.2337, lng: 13.6012 },
          perStopPrice: money(12),
        },
        {
          id: "stop-spadici",
          routeId: routeId("route-lanterna-sunrise"),
          orderIndex: 2,
          coordinate: { lat: 45.2489, lng: 13.6049 },
          perStopPrice: money(12),
        },
      ],
      pricing: {
        basePricePerTrip: money(58),
        hasUniformPerStopPricing: true,
        uniformPricePerStop: money(12),
      },
    },
    capacity: {
      maxPassengers: 8,
      maxTotalLoadKg: 900,
      offersCargo: true,
      maxCargoPackages: 10,
      maxCargoWeightKg: 200,
      cargoPricePerKg: money(2.5),
    },
    bookedPassengers: 3,
    freePassengers: 5,
    maxPassengers: 8,
    weatherRiskPercent: 10,
    offersCargo: true,
  },
  {
    id: boatId("boat-rovinj-island-run"),
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
      id: routeId("route-rovinj-island-run"),
      boatId: boatId("boat-rovinj-island-run"),
      start: { lat: 45.0811, lng: 13.6387 },
      end: { lat: 45.0605, lng: 13.6548 },
      stops: [
        {
          id: "stop-katarina",
          routeId: routeId("route-rovinj-island-run"),
          orderIndex: 1,
          coordinate: { lat: 45.0723, lng: 13.6469 },
          perStopPrice: money(9),
        },
      ],
      pricing: {
        basePricePerTrip: money(42),
        hasUniformPerStopPricing: false,
      },
    },
    capacity: {
      maxPassengers: 10,
      maxTotalLoadKg: 1100,
      offersCargo: false,
    },
    bookedPassengers: 7,
    freePassengers: 3,
    maxPassengers: 10,
    weatherRiskPercent: 18,
    offersCargo: false,
  },
  {
    id: boatId("boat-zadar-market-cargo"),
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
      id: routeId("route-zadar-market-cargo"),
      boatId: boatId("boat-zadar-market-cargo"),
      start: { lat: 44.1181, lng: 15.2314 },
      end: { lat: 44.0824, lng: 15.1879 },
      stops: [
        {
          id: "stop-ugat",
          routeId: routeId("route-zadar-market-cargo"),
          orderIndex: 1,
          coordinate: { lat: 44.0931, lng: 15.1974 },
          perStopPrice: money(18),
        },
        {
          id: "stop-poljana",
          routeId: routeId("route-zadar-market-cargo"),
          orderIndex: 2,
          coordinate: { lat: 44.1008, lng: 15.1799 },
          perStopPrice: money(15),
        },
      ],
      pricing: {
        basePricePerTrip: money(76),
        hasUniformPerStopPricing: false,
      },
    },
    capacity: {
      maxPassengers: 6,
      maxTotalLoadKg: 1250,
      offersCargo: true,
      maxCargoPackages: 18,
      maxCargoWeightKg: 500,
      cargoPricePerKg: money(1.9),
    },
    bookedPassengers: 2,
    freePassengers: 4,
    maxPassengers: 6,
    weatherRiskPercent: 22,
    offersCargo: true,
  },
  {
    id: boatId("boat-split-sunset-line"),
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
      id: routeId("route-split-sunset-line"),
      boatId: boatId("boat-split-sunset-line"),
      start: { lat: 43.5077, lng: 16.439 },
      end: { lat: 43.4969, lng: 16.2563 },
      stops: [
        {
          id: "stop-mestrovic",
          routeId: routeId("route-split-sunset-line"),
          orderIndex: 1,
          coordinate: { lat: 43.5032, lng: 16.4188 },
          perStopPrice: money(20),
        },
      ],
      pricing: {
        basePricePerTrip: money(95),
        hasUniformPerStopPricing: true,
        uniformPricePerStop: money(20),
      },
    },
    capacity: {
      maxPassengers: 12,
      maxTotalLoadKg: 1400,
      offersCargo: false,
    },
    bookedPassengers: 6,
    freePassengers: 6,
    maxPassengers: 12,
    weatherRiskPercent: 12,
    offersCargo: false,
  },
];

const includesQuery = (listing: BoatListingSummary, query: string): boolean => {
  if (query.length === 0) {
    return true;
  }

  const haystack = [
    listing.translation.name,
    listing.translation.description,
    listing.translation.allowedGoodsDescription,
    listing.translation.startLocationLabel,
    listing.translation.endLocationLabel,
    listing.slug,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
};

export const parsePublicBoatListFilters = (requestUrl: URL): PublicBoatListFilters => {
  const minFreeSpots = Number(requestUrl.searchParams.get("minFreeSpots") ?? "0");

  return normalizePublicBoatListFilters({
    ...defaultPublicBoatListFilters,
    query: requestUrl.searchParams.get("query") ?? "",
    goodsTransportOnly: requestUrl.searchParams.get("goodsTransportOnly") === "true",
    minFreeSpots: Number.isFinite(minFreeSpots) ? minFreeSpots : 0,
  });
};

export const searchPublicBoatListings = (
  filters: PublicBoatListFilters,
): ReadonlyArray<BoatListingSummary> => {
  const normalized = normalizePublicBoatListFilters(filters);

  return publicBoatListings.filter((listing) => {
    if (normalized.goodsTransportOnly && !listing.offersCargo) {
      return false;
    }

    if ((listing.freePassengers ?? 0) < normalized.minFreeSpots) {
      return false;
    }

    return includesQuery(listing, normalized.query);
  });
};

export const getPublicBoatsSearchHref = (filters: PublicBoatListFilters): string =>
  buildPublicBoatsSearchPath(filters);
