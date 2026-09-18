import { headers } from "next/headers";
import { isAuthorized } from "./admin-auth";

/** Call at the top of every admin server action. Throws when not authorized. */
export async function requireAdmin(): Promise<void> {
  const h = await headers();
  if (!isAuthorized(h.get("authorization"))) throw new Error("No autorizado");
}
