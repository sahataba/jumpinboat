CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'completed', 'cancelled', 'declined');--> statement-breakpoint
CREATE TYPE "public"."departure_status" AS ENUM('scheduled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role_primary" AS ENUM('owner', 'admin');--> statement-breakpoint
CREATE TABLE "boat_departures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"departure_time_utc" timestamp with time zone NOT NULL,
	"max_passengers_override" integer,
	"max_cargo_weight_kg_override" integer,
	"status" "departure_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boat_route_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"lat" numeric(9, 6) NOT NULL,
	"lng" numeric(9, 6) NOT NULL,
	"per_stop_price" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boat_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"boat_id" uuid NOT NULL,
	"start_lat" numeric(9, 6) NOT NULL,
	"start_lng" numeric(9, 6) NOT NULL,
	"end_lat" numeric(9, 6) NOT NULL,
	"end_lng" numeric(9, 6) NOT NULL,
	"base_price_per_trip" numeric(10, 2) NOT NULL,
	"has_uniform_per_stop_pricing" boolean DEFAULT false NOT NULL,
	"uniform_price_per_stop" numeric(10, 2),
	"currency" text DEFAULT 'EUR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boat_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"boat_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"allowed_goods_description" text,
	"start_location_label" text,
	"end_location_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"slug" text,
	"max_passengers" integer NOT NULL,
	"max_total_load_kg" integer NOT NULL,
	"offers_cargo" boolean DEFAULT false NOT NULL,
	"max_cargo_packages" integer,
	"max_cargo_weight_kg" integer,
	"cargo_price_per_kg" numeric(10, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boats_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "booking_cargo_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"label" text NOT NULL,
	"weight_kg" integer NOT NULL,
	"package_count" integer
);
--> statement-breakpoint
CREATE TABLE "booking_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"stop_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"departure_id" uuid NOT NULL,
	"boat_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"passenger_count" integer NOT NULL,
	"estimated_cargo_weight_kg" integer,
	"estimated_cargo_packages" integer,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"base_trip_price" numeric(10, 2) NOT NULL,
	"per_stop_total_price" numeric(10, 2) NOT NULL,
	"cargo_price_total" numeric(10, 2),
	"total_price" numeric(10, 2) NOT NULL,
	"weather_risk_percent" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"role_primary" "user_role_primary" DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
