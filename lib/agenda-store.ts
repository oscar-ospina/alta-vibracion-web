/**
 * Browser persistence for the local-MVP Agenda (story oscar-ospina/saas-planner#45).
 *
 * Everything stays in the visitor's browser: the simulated-busy slots generated
 * per viewed date AND the visitor's own booked slots. Privacy by minimization:
 * only { date, time, createdAt } is persisted for a booking — the name and
 * consultation details live in component state for the session and travel in
 * the WhatsApp message; nothing identifying is retained.
 *
 * localStorage is best-effort — private mode / quota errors degrade to the
 * module-level in-memory cache, so the flow keeps working for the session even
 * when nothing can persist. Writes MERGE with the currently stored state
 * (re-read inside persist) so a stale tab can't clobber a sibling tab's
 * booking or re-roll a date it already persisted (last-writer-wins lost-update).
 * Past dates are pruned on read, keeping the payload bounded to the horizon.
 *
 * Client-only by nature (guards `window`); call from event handlers or effects,
 * never during server render.
 */

import {
  type ISODate,
  type SlotTime,
  SLOT_TIMES,
  pickBlockedSlots,
  todayInBogota,
} from "@/lib/agenda";

const STORAGE_KEY = "av-agenda-v1";

/** The visitor's own booked slot — deliberately PII-free (see module doc). */
export type BookedSlot = {
  date: ISODate;
  time: SlotTime;
  createdAt: string;
};

export type AgendaState = {
  /** Simulated-busy slots, generated once per viewed date. */
  blocked: Record<ISODate, SlotTime[]>;
  /** The visitor's own confirmed requests (newest last). */
  bookings: BookedSlot[];
};

function emptyState(): AgendaState {
  return { blocked: {}, bookings: [] };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isSlotTime(value: unknown): value is SlotTime {
  return (SLOT_TIMES as readonly string[]).includes(value as string);
}

/**
 * Lenient shape-check: salvage what parses, drop the rest (never throw), and
 * prune entries before today (Bogotá) — stale simulated rolls and past
 * bookings are dead weight once the date can no longer be offered.
 */
function sanitize(raw: unknown): AgendaState {
  const state = emptyState();
  if (typeof raw !== "object" || raw === null) return state;
  const today = todayInBogota();
  const { blocked, bookings } = raw as Record<string, unknown>;
  if (typeof blocked === "object" && blocked !== null) {
    for (const [date, slots] of Object.entries(blocked)) {
      if (ISO_DATE.test(date) && date >= today && Array.isArray(slots)) {
        const valid = slots.filter(isSlotTime);
        if (valid.length > 0) state.blocked[date] = valid;
      }
    }
  }
  if (Array.isArray(bookings)) {
    for (const b of bookings) {
      const slot = b as BookedSlot;
      if (
        typeof b === "object" &&
        b !== null &&
        ISO_DATE.test(slot.date ?? "") &&
        slot.date >= today &&
        isSlotTime(slot.time)
      ) {
        state.bookings.push({
          date: slot.date,
          time: slot.time,
          createdAt: typeof slot.createdAt === "string" ? slot.createdAt : "",
        });
      }
    }
  }
  return state;
}

function readStored(): AgendaState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

let cache: AgendaState | null = null;

export function loadAgendaState(): AgendaState {
  if (cache) return cache;
  if (typeof window === "undefined") return emptyState();
  cache = readStored();
  return cache;
}

/**
 * Merge `next` with what's CURRENTLY stored (not with this tab's snapshot):
 * stored blocked rolls win for dates persisted by a sibling tab first, and
 * bookings union by date+time. Then write the merged state. Returns the merged
 * state so callers see the winning values.
 */
function persist(next: AgendaState): AgendaState {
  let merged = next;
  if (typeof window !== "undefined") {
    const stored = readStored();
    const seen = new Set<string>();
    merged = {
      // Spread order: a date present in both keeps the STORED roll.
      blocked: { ...next.blocked, ...stored.blocked },
      bookings: [...stored.bookings, ...next.bookings].filter((b) => {
        const key = `${b.date}|${b.time}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    };
  }
  cache = merged;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Private mode / quota exceeded — in-memory cache still serves the session.
  }
  return merged;
}

/**
 * Simulated-busy slots for a date, generating + persisting them on first view
 * so the same date always shows the same "Reservado" slots in this browser.
 */
export function ensureBlockedSlots(date: ISODate): SlotTime[] {
  const state = loadAgendaState();
  const existing = state.blocked[date];
  if (existing) return existing;
  const picked = pickBlockedSlots();
  const merged = persist({
    ...state,
    blocked: { ...state.blocked, [date]: picked },
  });
  // If a sibling tab rolled this date first, its persisted roll won the merge.
  return merged.blocked[date];
}

export function addBooking(booking: BookedSlot): AgendaState {
  const state = loadAgendaState();
  return persist({ ...state, bookings: [...state.bookings, booking] });
}

export function findBooking(
  state: AgendaState,
  date: ISODate,
  time: SlotTime,
): BookedSlot | undefined {
  return state.bookings.find((b) => b.date === date && b.time === time);
}
