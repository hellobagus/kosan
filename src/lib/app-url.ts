import type { NextRequest } from "next/server";

function trimTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

export function resolveAppOrigin(request?: NextRequest | Request): string {
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    if (forwardedHost) {
      const proto = forwardedProto || "http";
      return trimTrailingSlash(`${proto}://${forwardedHost.split(",")[0].trim()}`);
    }

    const host = request.headers.get("host");
    if (host && !/^localhost(:\d+)?$/i.test(host) && !/^127\.0\.0\.1(:\d+)?$/.test(host)) {
      const proto = forwardedProto || (host.includes("localhost") ? "http" : "http");
      return trimTrailingSlash(`${proto}://${host}`);
    }

    if (request instanceof Request && "nextUrl" in request) {
      const nextRequest = request as NextRequest;
      const origin = nextRequest.nextUrl.origin;
      if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
        return trimTrailingSlash(origin);
      }
    }
  }

  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL;

  if (fromEnv) return trimTrailingSlash(fromEnv);

  return "http://localhost:3000";
}

export function appUrl(path: string, request?: NextRequest | Request) {
  const base = resolveAppOrigin(request);
  return new URL(path.startsWith("/") ? path : `/${path}`, base).toString();
}
