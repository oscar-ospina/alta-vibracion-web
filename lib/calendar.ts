/**
 * Google Calendar server client — booking Phase 1 (epic oscar-ospina/saas-planner#31,
 * story #40). Liliana's real Google Calendar is the source of truth for availability.
 *
 * ⚠️ SERVER-ONLY. This module reads a service-account private key from a NON-public
 * env var (`GOOGLE_SERVICE_ACCOUNT_KEY_B64`). Next.js only inlines `NEXT_PUBLIC_*`
 * into the client bundle, so the key is never shipped to the browser — but never
 * import this module from a Client Component. `googleapis` is Node-only (not Edge):
 * any route/action that uses it must set `export const runtime = "nodejs"`.
 *
 * Design is fixed by two ADRs (read them before changing anything here):
 *   - docs/superpowers/specs/2026-06-07-av-google-calendar.md  (#32 — auth, scope, TZ)
 *   - docs/superpowers/specs/2026-06-07-av-booking-backend.md   (#33 — deterministic id)
 *
 * Decisions honored here:
 *   - Auth = a Google Cloud **service account** whose JSON key is base64-encoded into
 *     one server-side env var; Liliana shares her personal calendar with it (writer ACL).
 *   - Scope = least-privilege `calendar.events`; availability is read with `events.list`
 *     (NOT `freebusy.query`, which needs a broader scope).
 *   - Events are **time-blocks with NO `attendees`** (a service account can't invite
 *     without domain-wide delegation); the client is notified via the app + an `.ics`.
 *   - `calendarId` = Liliana's gmail (the shared calendar), never `"primary"`.
 *   - All times computed in America/Bogotá (UTC-5, no DST) and sent as RFC3339 with an
 *     explicit `-05:00` offset plus `timeZone: "America/Bogota"`.
 *   - Double-booking guard = a **deterministic, slot-derived event id**; Google enforces
 *     per-calendar id uniqueness → a duplicate returns 409, giving best-effort idempotency.
 *
 * Setup runbook (GCP project, key, calendar share, env vars): docs/booking-setup.md.
 */
import { google, type calendar_v3 } from "googleapis";

/** IANA zone for all booking math. Colombia is a fixed UTC-5 with no DST. */
export const CALENDAR_TIME_ZONE = "America/Bogota";
const BOGOTA_OFFSET_MINUTES = -300; // UTC-5, no DST
const BOGOTA_OFFSET_LABEL = "-05:00";

/** Least-privilege scope: enough to list and insert events on a shared calendar. */
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

/** Thrown when required server-side configuration is missing or malformed. */
export class CalendarConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarConfigError";
  }
}

/**
 * Thrown when `events.insert` hits Google's per-calendar id-uniqueness check (HTTP 409).
 * For a deterministic slot id this means "this slot is already booked" — the booking
 * Server Action (#43) treats it as idempotent / slot-taken rather than a hard failure.
 */
export class DuplicateEventError extends Error {
  constructor(public readonly eventId: string) {
    super(`calendar event id already exists: ${eventId}`);
    this.name = "DuplicateEventError";
  }
}

// ---------------------------------------------------------------------------
// Auth + client (lazy singleton)
// ---------------------------------------------------------------------------

let cached: { calendar: calendar_v3.Calendar; calendarId: string } | null = null;

function loadServiceAccountKey(): Record<string, unknown> {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64;
  if (!b64) {
    throw new CalendarConfigError(
      "GOOGLE_SERVICE_ACCOUNT_KEY_B64 is not set (see docs/booking-setup.md)",
    );
  }
  let json: string;
  try {
    json = Buffer.from(b64, "base64").toString("utf8");
  } catch {
    throw new CalendarConfigError("GOOGLE_SERVICE_ACCOUNT_KEY_B64 is not valid base64");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new CalendarConfigError(
      "GOOGLE_SERVICE_ACCOUNT_KEY_B64 does not decode to valid JSON",
    );
  }
  if (typeof parsed !== "object" || parsed === null || !("private_key" in parsed)) {
    throw new CalendarConfigError(
      "decoded service-account key is missing fields (expected a Google JSON key)",
    );
  }
  return parsed as Record<string, unknown>;
}

function resolveCalendarId(): string {
  const id = process.env.LILIANA_CALENDAR_ID;
  if (!id) {
    throw new CalendarConfigError(
      "LILIANA_CALENDAR_ID is not set (see docs/booking-setup.md)",
    );
  }
  if (id === "primary") {
    throw new CalendarConfigError(
      'LILIANA_CALENDAR_ID must be the shared calendar email, not "primary" ' +
        "(a service account's own primary calendar is empty)",
    );
  }
  return id;
}

/**
 * Build (once, then cache) the authenticated Calendar client + the target calendarId.
 * Throws {@link CalendarConfigError} if env config is missing — call sites surface this
 * as "booking is temporarily unavailable" rather than leaking config details.
 */
export function getCalendarClient(): {
  calendar: calendar_v3.Calendar;
  calendarId: string;
} {
  if (cached) return cached;
  const calendarId = resolveCalendarId();
  const credentials = loadServiceAccountKey();
  const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  const calendar = google.calendar({ version: "v3", auth });
  cached = { calendar, calendarId };
  return cached;
}

/** Test seam: drop the cached client so a later call re-reads env (used by tests/smoke). */
export function resetCalendarClient(): void {
  cached = null;
}

// ---------------------------------------------------------------------------
// Timezone + deterministic id helpers (pure)
// ---------------------------------------------------------------------------

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Format a UTC instant as the Bogotá wall-clock RFC3339 string Google expects, e.g.
 * `2026-06-10T20:00:00Z` → `"2026-06-10T15:00:00-05:00"`. Paired with
 * `timeZone: "America/Bogota"` on the event. Relies on Colombia's fixed UTC-5 (no DST).
 */
export function toBogotaRFC3339(utc: Date): string {
  const local = new Date(utc.getTime() + BOGOTA_OFFSET_MINUTES * 60_000);
  return (
    `${local.getUTCFullYear()}-${pad2(local.getUTCMonth() + 1)}-${pad2(local.getUTCDate())}` +
    `T${pad2(local.getUTCHours())}:${pad2(local.getUTCMinutes())}:${pad2(local.getUTCSeconds())}` +
    BOGOTA_OFFSET_LABEL
  );
}

/**
 * Canonical, minute-precision UTC representation of a slot start, e.g.
 * `"2026-06-10T15:30:00Z"`. Floored to the minute so sub-minute drift can't change a
 * slot's identity. This is the stable key the deterministic event id is derived from.
 */
export function canonicalSlotStartUTC(slotStart: Date): string {
  const minuteFloored = new Date(Math.floor(slotStart.getTime() / 60_000) * 60_000);
  return minuteFloored.toISOString().replace(/\.\d{3}Z$/, "Z");
}

const BASE32HEX_ALPHABET = "0123456789abcdefghijklmnopqrstuv";

/** RFC4648 base32hex (lowercase, no padding) — Google event ids allow exactly a–v + 0–9. */
function base32hexEncode(bytes: Uint8Array): string {
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32HEX_ALPHABET[(buffer >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32HEX_ALPHABET[(buffer << (5 - bits)) & 0x1f];
  }
  return out;
}

/**
 * Deterministic Google event id for a slot: `base32hex(calendarId | slotStartUTC)`.
 * Same calendar + same slot start → same id, so duplicate inserts collide (409) and
 * collapse to one booking. **This is a hard rule** — a random/UUID id would let two
 * clients both pass the pre-check and both insert → double-book (see ADR #33).
 *
 * Google ids must be 5–1024 chars from the base32hex alphabet; a typical
 * `email|timestamp` encodes to ~60–80 chars, safely in range.
 */
export function deterministicSlotId(calendarId: string, slotStart: Date): string {
  const key = `${calendarId}|${canonicalSlotStartUTC(slotStart)}`;
  const id = base32hexEncode(new TextEncoder().encode(key));
  if (id.length < 5 || id.length > 1024) {
    throw new Error(`derived event id length ${id.length} is outside Google's 5–1024 range`);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Error classification + retry
// ---------------------------------------------------------------------------

type GoogleApiErrorShape = {
  code?: number | string;
  status?: number;
  /** Legacy googleapis (<v8) exposed reasons at the top level. */
  errors?: Array<{ reason?: string }>;
  response?: {
    status?: number;
    /** gaxios v7 (googleapis 173) carries reasons here, AIP-193 style. */
    data?: { error?: { errors?: Array<{ reason?: string }> } };
  };
};

function httpStatusOf(err: unknown): number | undefined {
  const e = err as GoogleApiErrorShape;
  const candidate =
    (typeof e?.code === "number" ? e.code : undefined) ??
    e?.status ??
    e?.response?.status;
  return typeof candidate === "number" ? candidate : undefined;
}

/** True when `events.insert` was rejected for an already-existing id (slot taken). */
export function isDuplicateError(err: unknown): boolean {
  return httpStatusOf(err) === 409;
}

/** Transient errors worth a retry: rate limits (429 / 403 rate-reason) and 5xx. */
function isRetryable(err: unknown): boolean {
  const status = httpStatusOf(err);
  if (status === 429) return true;
  if (status !== undefined && status >= 500) return true;
  if (status === 403) {
    // googleapis 173 throws gaxios v7 errors that carry the reasons at
    // response.data.error.errors; older versions used a top-level errors[].
    // Read both so the ADR's "backoff on 403/429" holds across versions.
    const e = err as GoogleApiErrorShape;
    const reasons = (e.response?.data?.error?.errors ?? e.errors ?? []).map(
      (x) => x.reason,
    );
    return reasons.some(
      (r) => r === "rateLimitExceeded" || r === "userRateLimitExceeded",
    );
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a Calendar call with exponential backoff on transient errors (rate limits / 5xx).
 * A 409 is NOT retried — it is a meaningful idempotency signal surfaced to the caller.
 * Safe for `events.insert` because the deterministic id makes a retried insert idempotent.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === attempts - 1) throw err;
      const backoff = Math.min(1_000 * 2 ** attempt, 8_000) + Math.floor(Math.random() * 250);
      await sleep(backoff);
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Calendar operations
// ---------------------------------------------------------------------------

/**
 * List events (busy windows) on the shared calendar between two instants. Uses
 * `singleEvents: true` so recurring events are expanded into concrete occurrences,
 * and pages through all results. Callers compute open slots as the complement (#41).
 * Keep the window modest (days, not a year) — see the booking horizon in #41.
 */
export async function listEvents(
  timeMin: Date,
  timeMax: Date,
): Promise<calendar_v3.Schema$Event[]> {
  const { calendar, calendarId } = getCalendarClient();
  const items: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  do {
    const res = await withRetry(() =>
      calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 2500,
        pageToken,
      }),
    );
    if (res.data.items) items.push(...res.data.items);
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return items;
}

export type TimeBlockInput = {
  /** Slot start as a UTC instant. */
  start: Date;
  /** Slot end as a UTC instant. */
  end: Date;
  /** Event title shown on Liliana's calendar, e.g. `Cita — <cliente>`. */
  summary: string;
  /** Optional longer body. */
  description?: string;
  /** String metadata stored on `extendedProperties.private` (cliente, canal, etc.). */
  privateProps?: Record<string, string>;
  /**
   * Event id. Defaults to {@link deterministicSlotId} of the slot — the double-book
   * guard. Override only for the delete-then-rebook salt edge (ADR #33), handled in #43.
   */
  id?: string;
};

/**
 * Insert a time-block event (NO attendees) on the shared calendar. Throws
 * {@link DuplicateEventError} when the (deterministic) id already exists — i.e. the
 * slot is already taken / this is a retried submission.
 */
export async function insertTimeBlock(
  input: TimeBlockInput,
): Promise<calendar_v3.Schema$Event> {
  const { calendar, calendarId } = getCalendarClient();
  const id = input.id ?? deterministicSlotId(calendarId, input.start);
  try {
    const res = await withRetry(() =>
      calendar.events.insert({
        calendarId,
        requestBody: {
          id,
          summary: input.summary,
          description: input.description,
          start: { dateTime: toBogotaRFC3339(input.start), timeZone: CALENDAR_TIME_ZONE },
          end: { dateTime: toBogotaRFC3339(input.end), timeZone: CALENDAR_TIME_ZONE },
          extendedProperties: input.privateProps
            ? { private: input.privateProps }
            : undefined,
          // No attendees / sendUpdates — a service account can't invite without DWD.
          // The client is notified via the app's WhatsApp/email + an .ics (#44).
        },
      }),
    );
    return res.data;
  } catch (err) {
    if (isDuplicateError(err)) throw new DuplicateEventError(id);
    throw err;
  }
}

/** Delete an event by id (used by the smoke-test cleanup and future cancel flows). */
export async function deleteEvent(eventId: string): Promise<void> {
  const { calendar, calendarId } = getCalendarClient();
  await withRetry(() => calendar.events.delete({ calendarId, eventId }));
}
