import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Public API paths that must be reachable WITHOUT a NextAuth session.
 * Everything else under /api requires a valid session token.
 *
 * - /api/auth              -> NextAuth sign-in/session + self-guarded user mgmt
 *                             (register/users/change-password perform their own
 *                             CEO/session checks inside the handler)
 * - /api/csrf-token        -> needed to bootstrap CSRF tokens
 * - /api/attachments/scan-callback -> external ClamAV webhook, guarded by its
 *                             own shared secret header
 */
const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/csrf-token",
  "/api/attachments/scan-callback",
];

// Exact public API paths (no session required)
const PUBLIC_API_EXACT = ["/api/health"];

function isPublicApi(pathname: string): boolean {
  if (PUBLIC_API_EXACT.includes(pathname)) return true;
  return PUBLIC_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = process.env.NEXTAUTH_SECRET;

  // ---- API routes ----
  if (pathname.startsWith("/api")) {
    if (isPublicApi(pathname)) {
      return NextResponse.next();
    }

    const token = await getToken({ req, secret });
    if (!token || token.isActive === false) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // ---- Page routes ----
  const token = await getToken({ req, secret });
  if (!token || token.isActive === false) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Match everything except Next internals, favicon and the login page.
// (API routes are intentionally included so they get session enforcement.)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login).*)"],
};
