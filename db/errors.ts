/**
 * Drizzle wraps driver errors; the SQLSTATE and the constraint name live on
 * the innermost cause. One place decides what a Postgres error looks like.
 * SQLSTATE is five characters, not five digits: 23P01 is the exclusion
 * constraint, 22003 a numeric overflow.
 */
export type PgError = { code: string; constraint?: string };

export function pgError(err: unknown): PgError | null {
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur && typeof cur === "object"; i++) {
    const e = cur as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (typeof e.code === "string" && /^[0-9A-Z]{5}$/.test(e.code)) {
      return { code: e.code, constraint: typeof e.constraint === "string" ? e.constraint : undefined };
    }
    cur = e.cause;
  }
  return null;
}

/** 23505: unique violation. */
export const UNIQUE_VIOLATION = "23505";
/** 23P01: exclusion constraint (overlapping ranges). */
export const EXCLUSION_VIOLATION = "23P01";
/** 22003: numeric value out of range (int4 overflow). */
export const NUMERIC_OUT_OF_RANGE = "22003";
