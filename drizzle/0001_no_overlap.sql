-- Overlapping live bookings cannot coexist, whatever their start instants.
-- Complements bookings_active_slot_idx (same-start guard). Exclusion violations
-- raise SQLSTATE 23P01; lib/agenda/bookings.ts maps both codes to slot_taken.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("status" IN ('pending_payment', 'confirmed'));
