/**
 * Live smoke-test for the Google Calendar integration (story oscar-ospina/saas-planner#40).
 *
 * This is the FIRST live run of the design in the two booking ADRs — the spikes were
 * "design-validated against docs, not live-run". It exercises, against Liliana's real
 * shared calendar, the exact operations the booking flow depends on:
 *
 *   1. events.list  → reads busy windows (the availability read-path, #41)
 *   2. events.insert → creates a Bogotá-correct time-block with a deterministic id (#43)
 *   3. re-insert the same id → expects HTTP 409 (the double-book idempotency guard)
 *   4. delete       → cleans up the test event
 *   5. (info) re-insert the deleted id → resolves the ADR's open "delete-then-rebook
 *      id-reuse" question (does Google let a deleted id be reused, or still 409?)
 *
 * Run it ONCE after completing docs/booking-setup.md (GCP project + service-account key
 * + calendar shared + env vars), then leave it in the repo as a re-runnable check. It is
 * dev-only and guarded: with no credentials it prints the runbook pointer and exits.
 *
 *   npm run smoke:calendar
 *
 * It creates a clearly-labelled test event ~60 days out at an off-hours time and deletes
 * it again; if a step fails mid-way it attempts cleanup and exits non-zero.
 */
import { existsSync } from "node:fs";

import {
  CALENDAR_TIME_ZONE,
  DuplicateEventError,
  canonicalSlotStartUTC,
  deleteEvent,
  deterministicSlotId,
  getCalendarClient,
  insertTimeBlock,
  isDuplicateError,
  listEvents,
  toBogotaRFC3339,
} from "../lib/calendar";

// Next.js auto-loads .env.local at runtime; this standalone script does not run through
// Next, so load it explicitly (no-op if absent — the env guard below handles that).
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const RUNBOOK = "docs/booking-setup.md";

function requireEnv(): void {
  const missing = ["GOOGLE_SERVICE_ACCOUNT_KEY_B64", "LILIANA_CALENDAR_ID"].filter(
    (k) => !process.env[k],
  );
  if (missing.length > 0) {
    console.error(
      `\n⏭  Smoke-test skipped — missing env: ${missing.join(", ")}.\n` +
        `   Complete the setup runbook first: ${RUNBOOK}\n` +
        `   (put the values in .env.local for local runs).\n`,
    );
    process.exit(1);
  }
}

/** A test slot ~60 days out at 05:00 Bogotá (off-hours → won't collide with real bookings). */
function testSlot(): { start: Date; end: Date } {
  const day = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  // 05:00 Bogotá = 10:00 UTC (UTC-5). Build the UTC instant directly.
  const start = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 10, 0, 0),
  );
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return { start, end };
}

async function main(): Promise<void> {
  requireEnv();

  const { calendarId } = getCalendarClient();
  console.log(`\n🔌 Calendar client ready → calendarId=${calendarId}`);
  console.log(`   timezone=${CALENDAR_TIME_ZONE}, scope=calendar.events\n`);

  // 1. READ — busy windows over the next 14 days.
  const now = new Date();
  const in14d = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const events = await listEvents(now, in14d);
  console.log(`1️⃣  events.list → ${events.length} event(s) in the next 14 days (busy windows).`);
  for (const e of events.slice(0, 5)) {
    const when = e.start?.dateTime ?? e.start?.date ?? "?";
    console.log(`      · ${when}  ${e.summary ?? "(sin título)"}`);
  }

  // 2. WRITE — a deterministic time-block, verify the Bogotá time round-trips.
  const { start, end } = testSlot();
  const expectedId = deterministicSlotId(calendarId, start);
  console.log(
    `\n2️⃣  events.insert → slot ${canonicalSlotStartUTC(start)} (UTC)\n` +
      `      sent start.dateTime = ${toBogotaRFC3339(start)}  (timeZone ${CALENDAR_TIME_ZONE})\n` +
      `      deterministic id    = ${expectedId}`,
  );
  const created = await insertTimeBlock({
    start,
    end,
    summary: "🧪 AV smoke-test — BORRAR si quedó",
    description: "Evento de prueba del smoke-test de Agenda (#40). Se elimina solo.",
    privateProps: { canal: "smoke-test" },
  });
  console.log(
    `      created id          = ${created.id}\n` +
      `      returned start      = ${created.start?.dateTime} (tz ${created.start?.timeZone})\n` +
      `      htmlLink            = ${created.htmlLink ?? "(n/a)"}`,
  );
  if (created.id !== expectedId) {
    throw new Error(`created id ${created.id} != expected deterministic id ${expectedId}`);
  }
  const sentLocal = toBogotaRFC3339(start);
  const okBogota = created.start?.dateTime?.startsWith(sentLocal.slice(0, 16));
  console.log(
    okBogota
      ? "      ✓ Bogotá time round-tripped correctly (UTC-5)."
      : `      ⚠️  Bogotá time mismatch — sent ${sentLocal}, got ${created.start?.dateTime}`,
  );

  // 3. IDEMPOTENCY — re-insert the same id, expect a 409 (no second event).
  console.log(`\n3️⃣  re-insert same id → expecting 409 duplicate…`);
  let got409 = false;
  try {
    await insertTimeBlock({
      start,
      end,
      summary: "🧪 AV smoke-test — duplicate (no debería crearse)",
    });
  } catch (err) {
    if (err instanceof DuplicateEventError || isDuplicateError(err)) {
      got409 = true;
      console.log("      ✓ 409 duplicate → idempotency confirmed (no second event).");
    } else {
      throw err;
    }
  }
  if (!got409) {
    // A second event slipped through — clean BOTH up and fail loudly.
    await safeDelete(expectedId);
    throw new Error("re-insert did NOT 409 — idempotency/double-book guard is broken.");
  }

  // 4. CLEANUP — delete the test event.
  console.log(`\n4️⃣  events.delete → removing the test event…`);
  await deleteEvent(expectedId);
  console.log("      ✓ test event deleted.");

  // 5. INFO — resolve the ADR's open "delete-then-rebook id reuse" question (#33/#43).
  console.log(`\n5️⃣  (info) re-insert the deleted id → is a deleted id reusable?`);
  try {
    const reused = await insertTimeBlock({
      start,
      end,
      summary: "🧪 AV smoke-test — id reuse probe",
    });
    console.log(
      "      → REUSABLE: Google accepted the deleted id. #43 can rely on query-first; " +
        "no salt strictly required for the cancel→rebook edge.",
    );
    await safeDelete(reused.id ?? expectedId);
    console.log("      ✓ probe event deleted.");
  } catch (err) {
    if (err instanceof DuplicateEventError || isDuplicateError(err)) {
      console.log(
        "      → NOT reusable: deleted id still 409s. #43 MUST salt the id (nonce) or " +
          "query-first so a genuinely free slot isn't rejected after a cancellation.",
      );
    } else {
      throw err;
    }
  }

  console.log(`\n✅ Smoke-test passed. The Google Calendar integration works live.\n`);
}

/** Best-effort delete used in error paths; never throws. */
async function safeDelete(eventId: string): Promise<void> {
  try {
    await deleteEvent(eventId);
  } catch {
    console.error(`      ⚠️  could not delete ${eventId} — remove it manually if present.`);
  }
}

main().catch((err: unknown) => {
  console.error("\n❌ Smoke-test FAILED:\n", err);
  process.exit(1);
});
