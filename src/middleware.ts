import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { SessionPayload } from "@/lib/auth";
import { canAccessPath, canOpenModule, getApiMinimumAccess, getApiModule, getModuleFromPath, hasModuleAccess, normalizeRole } from "@/lib/rbac";

const secretKey = process.env.JWT_SECRET || "fallback-secret-key";
const key = new TextEncoder().encode(secretKey);

const publicPaths = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/api/payments/midtrans/notification",
  "/api/public",
  "/uploads/",
  "/kamar-tersedia",
  "/daftar",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/" ||
    publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("session")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const session = payload as unknown as SessionPayload;

    if (!pathname.startsWith("/api/") && normalizeRole(session.role) === "TENANT") {
      if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
        return NextResponse.redirect(new URL("/portal", request.url));
      }
      if (
        !pathname.startsWith("/portal") &&
        !pathname.startsWith("/login") &&
        getModuleFromPath(pathname) &&
        !pathname.startsWith("/api/auth/logout")
      ) {
        const moduleKey = getModuleFromPath(pathname);
        if (moduleKey && !canOpenModule(session.role, moduleKey)) {
          return NextResponse.redirect(new URL("/portal", request.url));
        }
      }
    }

    if (pathname.startsWith("/api/")) {
      const moduleKey = getApiModule(pathname);
      if (moduleKey) {
        const minimum = getApiMinimumAccess(pathname, request.method);
        if (!hasModuleAccess(session.role, moduleKey, minimum)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      return NextResponse.next();
    }

    if (!canAccessPath(session.role, pathname)) {
      const home = normalizeRole(session.role) === "TENANT" ? "/portal" : "/dashboard";
      return NextResponse.redirect(new URL(home, request.url));
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads/|.*\\.(?:png|jpe?g|webp|gif|svg|ico|css|js|woff2?|ttf|txt|pdf|zip|webmanifest)$).*)",
  ],
};
