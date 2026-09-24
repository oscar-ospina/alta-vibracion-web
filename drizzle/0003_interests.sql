CREATE TYPE "public"."interest_kind" AS ENUM('service', 'gift', 'company');--> statement-breakpoint
CREATE TYPE "public"."interest_status" AS ENUM('new', 'contacted', 'closed');--> statement-breakpoint
CREATE TABLE "interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "interest_kind" NOT NULL,
	"service_id" text NOT NULL,
	"preferred_name" text NOT NULL,
	"contact_channel" "contact_channel" NOT NULL,
	"contact_value" text NOT NULL,
	"organization" text,
	"topic" text,
	"message" text,
	"consent" boolean DEFAULT false NOT NULL,
	"status" "interest_status" DEFAULT 'new' NOT NULL,
	"origin" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contacted_at" timestamp with time zone,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "interests_status_idx" ON "interests" USING btree ("status","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "interests_open_idx" ON "interests" USING btree ("kind","service_id","contact_value") WHERE "interests"."status" = 'new';