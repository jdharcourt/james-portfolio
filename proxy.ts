import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const buckets = new Map<string, { count: number; expires: number }>();

export function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString("base64");
  const development = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' https://vitals.vercel-insights.com${development ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const now = Date.now();
    for (const [key, value] of buckets) if (value.expires <= now) buckets.delete(key);
    const client = createHash("sha256").update(request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local").digest("hex");
    const limits: [string, number, number][] = [[`${client}:api`, 120, 60000]];
    if (request.method === "POST" && request.nextUrl.pathname === "/api/chat") limits.push([`${client}:chat-minute`, 6, 60000], [`${client}:chat-hour`, 60, 3600000], ["chat-global", 200, 3600000]);
    if (buckets.size > 10000 || limits.some(([key, maximum]) => (buckets.get(key)?.count || 0) >= maximum)) {
      console.warn("portfolio_api_rate_limited", { route: request.nextUrl.pathname });
      response = NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
    } else {
      for (const [key, , duration] of limits) {
        const bucket = buckets.get(key) || { count: 0, expires: now + duration };
        bucket.count += 1;
        buckets.set(key, bucket);
      }
    }
  }
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-Frame-Options", "DENY");
  if (!development) response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return response;
}
