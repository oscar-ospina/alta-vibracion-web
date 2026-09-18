/**
 * HTTP Basic auth for /admin. Pure helpers (no next/headers) so proxy.ts can
 * import them. `proxy.ts` challenges page loads; every admin server action
 * calls `requireAdmin()` from lib/admin-auth-server.ts itself, because a server
 * action's POST is not bound to the route it was rendered on.
 */
import { timingSafeEqual } from "node:crypto";

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isAuthorized(authorization: string | null): boolean {
  if (!adminConfigured() || !authorization?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
  const idx = decoded.indexOf(":");
  if (idx < 0) return false;
  return (
    safeEqual(decoded.slice(0, idx), process.env.ADMIN_USER!) &&
    safeEqual(decoded.slice(idx + 1), process.env.ADMIN_PASSWORD!)
  );
}
