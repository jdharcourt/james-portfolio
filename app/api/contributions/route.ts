import { NextRequest, NextResponse } from "next/server";
import { CONTRIBUTIONS_QUERY, parseContributions, parseGraphQLContributions } from "@/lib/github";

const LOGIN = "jdharcourt";

async function fromApi(token: string, year: number) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "james-harcourt-portfolio" },
    body: JSON.stringify({ query: CONTRIBUTIONS_QUERY, variables: { login: LOGIN, from: `${year}-01-01T00:00:00Z`, to: `${year}-12-31T23:59:59Z` } }),
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("GitHub API unavailable");
  return parseGraphQLContributions(await response.json(), year);
}

async function fromPublicProfile(year: number) {
  const response = await fetch(`https://github.com/users/${LOGIN}/contributions?from=${year}-01-01&to=${year}-12-31`, { headers: { "User-Agent": "james-harcourt-portfolio", Accept: "text/html" }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("GitHub unavailable");
  const html = await response.text();
  if (html.length > 2000000) throw new Error("Calendar too large");
  return parseContributions(html, year);
}

export async function GET(request: NextRequest) {
  const year = Number(request.nextUrl.searchParams.get("year") || new Date().getUTCFullYear());
  if (!Number.isInteger(year) || year < 2023 || year > new Date().getUTCFullYear()) return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  const token = process.env.GITHUB_TOKEN;
  try {
    let calendar;
    try {
      if (!token) throw new Error("No token");
      calendar = await fromApi(token, year);
    } catch {
      calendar = await fromPublicProfile(year);
    }
    return NextResponse.json(calendar, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ error: "GitHub contributions are temporarily unavailable." }, { status: 502 });
  }
}
