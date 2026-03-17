# Backend Data Model – JumpInBoat MVP

This document defines the **relational data model** for the JumpInBoat MVP, aligned with the product spec (including **price per trip**, **optional price per stop**, **capacity**, and **cargo limits**). It is stack-agnostic but designed to map cleanly to PostgreSQL + Drizzle ORM.

## Overview of Core Entities

- **users** – authentication and roles (`owner`, `admin`).
- **boats** – a physical boat or service operated by an owner.
- **boat_translations** – user-facing, translatable listing content (EN/HR).
- **boat_routes** – the canonical route for a boat (start → stops → end) and base pricing.
- **boat_route_stops** – ordered stops on a route, each with optional per-stop pricing.
- **boat_departures** – specific date/time slots when a route runs (availability).
- **bookings** – customer booking requests and their lifecycle.
- **booking_stops** – which segment(s) / stops the booking covers, used for per-stop pricing.
- **booking_cargo_items** – optional cargo/goods data when cargo transport is used.

> Note: Naming is illustrative; exact table and column names can be adapted during implementation as long as semantics remain the same.

## Tables

### 1. `users`

- **Goal**: Central user identity and roles.

Columns:
- `id` (PK, UUID)
- `email` (unique, text)
- `password_hash` (text, nullable for SSO)
- `role_primary` (enum: `owner`, `admin`)
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz)

Notes:
- Every signed-in user can make bookings as a customer by default; stored roles only control elevated capabilities such as managing boat listings or administration.

### 2. `boats`

- **Goal**: A boat listing that an owner can offer trips on.

Columns:
- `id` (PK, UUID)
- `owner_id` (FK → `users.id`)
- `slug` (text, unique, optional)
- `max_passengers` (integer, > 0)
- `max_total_load_kg` (integer, > 0) – legal total load/weight.
- `offers_cargo` (boolean, default false)
- `max_cargo_packages` (integer, nullable)
- `max_cargo_weight_kg` (integer, nullable)
- `cargo_price_per_kg` (numeric, nullable)
- `is_active` (boolean, default true)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

Business rules:
- `max_cargo_weight_kg` **must not exceed** `max_total_load_kg`; combined passenger + cargo use must respect `max_total_load_kg` (enforced in booking/business logic).

### 3. `boat_translations`

- **Goal**: Multi-language listing content for boats.

Columns:
- `id` (PK, UUID)
- `boat_id` (FK → `boats.id`)
- `locale` (text, e.g. `en`, `hr`)
- `name` (text)
- `description` (text)
- `allowed_goods_description` (text, nullable) – for cargo messaging.
- `start_location_label` (text, nullable)
- `end_location_label` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

Constraints:
- Unique (`boat_id`, `locale`).

### 4. `boat_routes`

- **Goal**: The canonical route for a boat (start → …stops… → end) and base pricing.

Columns:
- `id` (PK, UUID)
- `boat_id` (FK → `boats.id`)
- `start_lat` / `start_lng` (numeric)
- `end_lat` / `end_lng` (numeric)
- `base_price_per_trip` (numeric, not null)
- `has_uniform_per_stop_pricing` (boolean, default false)
- `uniform_price_per_stop` (numeric, nullable) – used when `has_uniform_per_stop_pricing = true`.
- `currency` (text, e.g. `EUR`)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

Notes:
- A boat can have **one primary route** for MVP. If multiple routes per boat are needed later, this model already supports it (multiple `boat_routes` per `boat_id`).

### 5. `boat_route_stops`

- **Goal**: Ordered stops for a route, each optionally with its own per-stop price.

Columns:
- `id` (PK, UUID)
- `route_id` (FK → `boat_routes.id`)
- `order_index` (integer, 0-based or 1-based)
- `lat` / `lng` (numeric)
- `per_stop_price` (numeric, nullable) – specific per-stop price when not using uniform pricing.
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

Constraints:
- Unique (`route_id`, `order_index`).

Pricing rules:
- If `boat_routes.has_uniform_per_stop_pricing = true`, the effective price per stop is `boat_routes.uniform_price_per_stop`.
- If `has_uniform_per_stop_pricing = false`, then each stop **may** define `per_stop_price`; the UI can show “from €Y per stop” using the minimum non-null per-stop price.

### 6. `boat_departures`

- **Goal**: Represent availability as concrete departures (date + time-of-day) for a specific route.

Columns:
- `id` (PK, UUID)
- `route_id` (FK → `boat_routes.id`)
- `departure_time_utc` (timestamptz) – stored in UTC per spec.
- `max_passengers_override` (integer, nullable) – optional per-departure override ≤ `boats.max_passengers`.
- `max_cargo_weight_kg_override` (integer, nullable) – optional per-departure override ≤ `boats.max_cargo_weight_kg`.
- `status` (enum: `scheduled`, `cancelled`)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

Notes:
- This table underpins both **availability** and **bookings per departure**.

### 7. `bookings`

- **Goal**: Customer booking requests and their lifecycle.

Columns:
- `id` (PK, UUID)
- `departure_id` (FK → `boat_departures.id`)
- `boat_id` (FK → `boats.id`)
- `customer_id` (FK → `users.id`)
- `passenger_count` (integer, > 0)
- `estimated_cargo_weight_kg` (integer, nullable)
- `estimated_cargo_packages` (integer, nullable)
- `status` (enum: `pending`, `confirmed`, `completed`, `cancelled`, `declined`)
- `base_trip_price` (numeric, snapshot at time of booking)
- `per_stop_total_price` (numeric, snapshot at time of booking)
- `cargo_price_total` (numeric, snapshot at time of booking, nullable)
- `total_price` (numeric) – sum of components at booking time.
- `weather_risk_percent` (integer, 0–100, nullable) – snapshot of cancellation probability.
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

Notes:
- Monetary fields are **snapshotted** to preserve pricing at request time, even if owner changes listing later.

### 8. `booking_stops`

- **Goal**: Record which stop(s) on the route the booking covers, enabling per-stop pricing and partial route bookings (e.g. board at stop A, disembark at stop C).

Columns:
- `id` (PK, UUID)
- `booking_id` (FK → `bookings.id`)
- `stop_id` (FK → `boat_route_stops.id`)
- `created_at` (timestamptz)

Usage:
- For **per-stop pricing**, the system sums the effective price for each `stop_id` attached to the booking and stores the total into `bookings.per_stop_total_price`.

### 9. `booking_cargo_items` (optional detail level)

- **Goal**: Capture more detailed cargo data if needed beyond simple aggregate fields.

Columns:
- `id` (PK, UUID)
- `booking_id` (FK → `bookings.id`)
- `label` (text, e.g. “Food supplies”)
- `weight_kg` (integer)
- `package_count` (integer, nullable)

Notes:
- For MVP you can rely on aggregate fields in `bookings` and add this table later if required.

## Capacity and Cargo Enforcement

Per departure, the system should:

1. **Passengers**:
   - Compute `sum(passenger_count)` across all non-cancelled bookings for a given `departure_id`.
   - Enforce: `sum_passengers + requested_passenger_count ≤ effective_max_passengers`, where:
     - `effective_max_passengers = boat_departures.max_passengers_override ?? boats.max_passengers`.

2. **Cargo weight**:
   - Compute `sum(estimated_cargo_weight_kg)` or a more precise weight if finalized.
   - Enforce:
     - `sum_cargo_weight + requested_cargo_weight ≤ effective_max_cargo_weight`, where:
       - `effective_max_cargo_weight = boat_departures.max_cargo_weight_kg_override ?? boats.max_cargo_weight_kg`.
     - And always ensure that combined passengers + cargo stay within `boats.max_total_load_kg` according to domain rules (e.g. convert passengers to an assumed weight if needed).

## Pricing Semantics

Given a booking on a departure:

- **Base price**: `boat_routes.base_price_per_trip`.
- **Per-stop component**:
  - If `has_uniform_per_stop_pricing = true`:
    - `per_stop_total_price = uniform_price_per_stop * number_of_selected_stops`.
  - Else:
    - `per_stop_total_price = sum(per_stop_price for each selected stop)`.
- **Cargo component** (if `offers_cargo = true`):
  - Simple model: `cargo_price_total = cargo_price_per_kg * estimated_cargo_weight_kg`.

The **displayed total** before booking:

```text
total_price_estimate = base_price_per_trip + per_stop_total_price + cargo_price_total
```

This matches the spec’s requirement to clearly show whether pricing is **per trip**, **per stop**, or a combination.

## Weather Risk

For each `boat_departures` row, an external weather integration can:

- Compute a **cancellation probability** (0–100%).
- Store that snapshot either:
  - directly on `boat_departures` (e.g. `weather_risk_percent`), or
  - on each `booking` as `weather_risk_percent` at the time the booking is created/updated.

The current model uses the latter (field on `bookings`) but can be extended to store a per-departure value as well.

## Mapping to Drizzle (outline)

In `packages/api/src/db`, create a `schema.ts` with Drizzle table definitions that mirror the tables above. For example:

- `users` table for auth and roles.
- `boats` and `boat_translations` for listings and i18n.
- `boat_routes` and `boat_route_stops` for map-defined routes and per-stop pricing.
- `boat_departures` for availability.
- `bookings`, `booking_stops`, and optionally `booking_cargo_items` for bookings and pricing breakdown.

Migrations generated via `drizzle-kit` should align with this model.
