import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

// Enums

export const userRolePrimaryEnum = pgEnum("user_role_primary", [
  "owner",
  "admin",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "declined",
]);

export const departureStatusEnum = pgEnum("departure_status", [
  "scheduled",
  "cancelled",
]);

// Users

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  rolePrimary: userRolePrimaryEnum("role_primary").notNull().default("owner"),
  canBook: boolean("can_book").notNull().default(true),
  canListBoats: boolean("can_list_boats").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Boats and translations

export const boats = pgTable("boats", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    // FK → users.id (enforced in migrations)
    ,
  slug: text("slug").unique(),
  skipperIncluded: boolean("skipper_included").notNull().default(true),
  photos: jsonb("photos")
    .$type<ReadonlyArray<string>>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  maxPassengers: integer("max_passengers").notNull(),
  maxTotalLoadKg: integer("max_total_load_kg").notNull(),
  offersCargo: boolean("offers_cargo").notNull().default(false),
  maxCargoPackages: integer("max_cargo_packages"),
  maxCargoWeightKg: integer("max_cargo_weight_kg"),
  cargoPricePerKg: numeric("cargo_price_per_kg", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const boatTranslations = pgTable("boat_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  boatId: uuid("boat_id")
    .notNull()
    // FK → boats.id
    ,
  locale: text("locale").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  allowedGoodsDescription: text("allowed_goods_description"),
  startLocationLabel: text("start_location_label"),
  endLocationLabel: text("end_location_label"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Routes and stops

export const boatRoutes = pgTable("boat_routes", {
  id: uuid("id").primaryKey().defaultRandom(),
  boatId: uuid("boat_id")
    .notNull()
    // FK → boats.id
    ,
  startLat: numeric("start_lat", { precision: 9, scale: 6 }).notNull(),
  startLng: numeric("start_lng", { precision: 9, scale: 6 }).notNull(),
  endLat: numeric("end_lat", { precision: 9, scale: 6 }).notNull(),
  endLng: numeric("end_lng", { precision: 9, scale: 6 }).notNull(),
  basePricePerTrip: numeric("base_price_per_trip", {
    precision: 10,
    scale: 2,
  }).notNull(),
  hasUniformPerStopPricing: boolean("has_uniform_per_stop_pricing")
    .notNull()
    .default(false),
  uniformPricePerStop: numeric("uniform_price_per_stop", {
    precision: 10,
    scale: 2,
  }),
  currency: text("currency").notNull().default("EUR"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const boatRouteStops = pgTable("boat_route_stops", {
  id: uuid("id").primaryKey().defaultRandom(),
  routeId: uuid("route_id")
    .notNull()
    // FK → boat_routes.id
    ,
  orderIndex: integer("order_index").notNull(),
  lat: numeric("lat", { precision: 9, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 9, scale: 6 }).notNull(),
  perStopPrice: numeric("per_stop_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Departures (availability)

export const boatDepartures = pgTable("boat_departures", {
  id: uuid("id").primaryKey().defaultRandom(),
  routeId: uuid("route_id")
    .notNull()
    // FK → boat_routes.id
    ,
  departureTimeUtc: timestamp("departure_time_utc", {
    withTimezone: true,
  }).notNull(),
  maxPassengersOverride: integer("max_passengers_override"),
  maxCargoWeightKgOverride: integer("max_cargo_weight_kg_override"),
  status: departureStatusEnum("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Bookings and related tables

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  departureId: uuid("departure_id")
    .notNull()
    // FK → boat_departures.id
    ,
  boatId: uuid("boat_id")
    .notNull()
    // FK → boats.id
    ,
  customerId: uuid("customer_id")
    .notNull()
    // FK → users.id
    ,
  passengerCount: integer("passenger_count").notNull(),
  estimatedCargoWeightKg: integer("estimated_cargo_weight_kg"),
  estimatedCargoPackages: integer("estimated_cargo_packages"),
  status: bookingStatusEnum("status").notNull().default("pending"),
  baseTripPrice: numeric("base_trip_price", { precision: 10, scale: 2 }).notNull(),
  perStopTotalPrice: numeric("per_stop_total_price", {
    precision: 10,
    scale: 2,
  }).notNull(),
  cargoPriceTotal: numeric("cargo_price_total", {
    precision: 10,
    scale: 2,
  }),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  weatherRiskPercent: integer("weather_risk_percent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bookingStops = pgTable("booking_stops", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    // FK → bookings.id
    ,
  stopId: uuid("stop_id")
    .notNull()
    // FK → boat_route_stops.id
    ,
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bookingCargoItems = pgTable("booking_cargo_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    // FK → bookings.id
    ,
  label: text("label").notNull(),
  weightKg: integer("weight_kg").notNull(),
  packageCount: integer("package_count"),
});
