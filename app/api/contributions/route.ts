import { NextRequest, NextResponse } from "next/server";
import { parseContributions } from "@/lib/github";

export async function GET(request: NextRequest) {
  const year = Number(request.nextUrl.searchParams.get("year") || new Date().getUTCFullYear());
  if (!Number.isInteger(year) || year < 2023 || year > new Date().getUTCFullYear()) return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  try {
    const response = await fetch(`https://github.com/users/jdharcourt/contributions?from=${year}-01-01&to=${year}-12-31`, { headers: { "User-Agent": "james-harcourt-portfolio", Accept: "text/html" }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("GitHub unavailable");
    const html = await response.text();
    if (html.length > 2000000) throw new Error("Calendar too large");
    return NextResponse.json(parseContributions(html, year), { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ error: "GitHub contributions are temporarily unavailable." }, { status: 502 });
  }
}
