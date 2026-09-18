CREATE TYPE "public"."booking_status" AS ENUM('pending_payment', 'confirmed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."contact_channel" AS ENUM('whatsapp', 'email');--> statement-breakpoint
CREATE TYPE "public"."override_kind" AS ENUM('closed', 'extra');--> statement-breakpoint
CREATE TABLE "availability_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"kind" "override_kind" NOT NULL,
	"time" text,
	"duration_minutes" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"weekday" integer NOT NULL,
	"time" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"service_id" text NOT NULL,
	"price_cop" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "booking_status" DEFAULT 'pending_payment' NOT NULL,
	"hold_expires_at" timestamp with time zone NOT NULL,
	"customer_name" text NOT NULL,
	"contact_channel" "contact_channel" NOT NULL,
	"contact_value" text NOT NULL,
	"client_time_zone" text NOT NULL,
	"origin" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "availability_overrides_date_idx" ON "availability_overrides" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_code_idx" ON "bookings" USING btree ("code");--> statement-breakpoint
CREATE INDEX "bookings_starts_at_idx" ON "bookings" USING btree ("starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_active_slot_idx" ON "bookings" USING btree ("starts_at") WHERE "bookings"."status" in ('pending_payment', 'confirmed');