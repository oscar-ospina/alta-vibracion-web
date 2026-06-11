/**
 * Browser persistence for the local-MVP Agenda (story oscar-ospina/saas-planner#45).
 *
 * Everything stays in the visitor's browser: the simulated-busy slots generated
 * per viewed date AND the visitor's own booking. localStorage is best-effort —
 * private mode / quota errors degrade to the module-level in-memory cache, so
 * the flow keeps working for the session even when nothing can persist.
 *
 * Client-only by nature (guards `window`); call from event handlers or effects,
 * never during server render.
 */

import {
  type ISODate,
  type Modality,
  type SlotTime,
  SLOT_TIMES,
  pickBlockedSlots,
} from "@/lib/agenda";

const STORAGE_KEY = "av-agenda-v1";

export type AgendaBooking = {
  date: ISODate;
  time: SlotTime;
  citaId: number;
  citaName: string;
  modality: Modality;
  name: string;
  createdAt: string;
};

export type AgendaState = {
  /** Simulated-busy slots, generated once per viewed date. */
  blocked: Record<ISODate, SlotTime[]>;
  /** The visitor's own confirmed requests (newest last). */
  bookings: AgendaBooking[];
};

function emptyState(): AgendaState {
  return { blocked: {}, bookings: [] };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isSlotTime(value: unknown): value is SlotTime {
  return (SLOT_TIMES as readonly string[]).includes(value as string);
}

/** Lenient shape-check: salvage what parses, drop the rest (never throw). */
function sanitize(raw: unknown): AgendaState {
  const state = emptyState();
  if (typeof raw !== "object" || raw === null) return state;
  const { blocked, bookings } = raw as Record<string, unknown>;
  if (typeof blocked === "object" && blocked !== null) {
    for (const [date, slots] of Object.entries(blocked)) {
      if (ISO_DATE.test(date) && Array.isArray(slots)) {
        const valid = slots.filter(isSlotTime);
        if (valid.length > 0) state.blocked[date] = valid;
      }
    }
  }
  if (Array.isArray(bookings)) {
    for (const b of bookings) {
      if (
        typeof b === "object" &&
        b !== null &&
        ISO_DATE.test((b as AgendaBooking).date ?? "") &&
        isSlotTime((b as AgendaBooking).time) &&
        typeof (b as AgendaBooking).name === "string"
      ) {
        state.bookings.push(b as AgendaBooking);
      }
    }
  }
  return state;
}

let cache: AgendaState | null = null;

export function loadAgendaState(): AgendaState {
  if (cache) return cache;
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? sanitize(JSON.parse(raw)) : emptyState();
  } catch {
    cache = emptyState();
  }
  return cache;
}

function persist(state: AgendaState): AgendaState {
  cache = state;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode / quota exceeded — in-memory cache still serves the session.
  }
  return state;
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
  persist({ ...state, blocked: { ...state.blocked, [date]: picked } });
  return picked;
}

export function addBooking(booking: AgendaBooking): AgendaState {
  const state = loadAgendaState();
  return persist({ ...state, bookings: [...state.bookings, booking] });
}

export function findBooking(
  state: AgendaState,
  date: ISODate,
  time: SlotTime,
): AgendaBooking | undefined {
  return state.bookings.find((b) => b.date === date && b.time === time);
}
