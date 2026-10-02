CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'interest', 'active', 'closed');--> statement-breakpoint
ALTER TYPE "public"."interest_kind" ADD VALUE 'campaign';--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"service_id" text NOT NULL,
	"price_cop" integer NOT NULL,
	"threshold" integer NOT NULL,
	"capacity" integer NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"allows_gift" boolean DEFAULT false NOT NULL,
	"conditions" text DEFAULT '' NOT NULL,
	"conditions_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "interests_open_idx";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "campaign_id" uuid;--> statement-breakpoint
ALTER TABLE "interests" ADD COLUMN "campaign_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_code_idx" ON "campaigns" USING btree ("code");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interests" ADD CONSTRAINT "interests_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "interests_open_idx" ON "interests" USING btree ("kind","service_id","contact_value",coalesce("campaign_id"::text, '')) WHERE "interests"."status" = 'new';