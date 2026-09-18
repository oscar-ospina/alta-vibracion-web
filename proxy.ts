import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "@/lib/admin-auth";

/** Challenges page loads under /admin. Not the security boundary; see lib/admin-auth.ts. */
export function proxy(request: NextRequest) {
  if (isAuthorized(request.headers.get("authorization"))) return NextResponse.next();
  return new NextResponse("Acceso restringido", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Alta Vibración admin", charset="UTF-8"' },
  });
}

export const config = { matcher: "/admin/:path*" };
