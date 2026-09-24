CREATE TYPE "public"."gift_status" AS ENUM('pending_payment', 'paid', 'redeemed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TABLE "gift_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"service_id" text NOT NULL,
	"price_cop" integer NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_contact_channel" "contact_channel" NOT NULL,
	"buyer_contact_value" text NOT NULL,
	"message" text,
	"status" "gift_status" DEFAULT 'pending_payment' NOT NULL,
	"campaign_id" uuid,
	"interest_id" uuid,
	"conditions" text DEFAULT '' NOT NULL,
	"paid_at" timestamp with time zone,
	"redeemed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "gift_order_id" uuid;--> statement-breakpoint
ALTER TABLE "gift_orders" ADD CONSTRAINT "gift_orders_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_orders" ADD CONSTRAINT "gift_orders_interest_id_interests_id_fk" FOREIGN KEY ("interest_id") REFERENCES "public"."interests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gift_orders_code_idx" ON "gift_orders" USING btree ("code");--> statement-breakpoint
CREATE INDEX "gift_orders_status_idx" ON "gift_orders" USING btree ("status");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_gift_order_id_gift_orders_id_fk" FOREIGN KEY ("gift_order_id") REFERENCES "public"."gift_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_gift_order_idx" ON "bookings" USING btree ("gift_order_id") WHERE "bookings"."status" in ('pending_payment', 'confirmed');