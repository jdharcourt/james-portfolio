export type ContributionDay = { date: string; count: number; level: number };

export type ContributionCalendar = {
  year: number;
  total: number;
  days: ContributionDay[];
  /** "api" includes private work visible to the token; "public" mirrors the public profile. */
  source: "api" | "public";
  /** Contributions to private repositories, when the API reports them. */
  privateCount: number | null;
  activeDays: number;
  longestStreak: number;
  bestDay: ContributionDay | null;
};

function validate(days: ContributionDay[], year: number) {
  days.sort((a, b) => a.date.localeCompare(b.date));
  if (days.length < 28 || new Set(days.map(day => day.date)).size !== days.length || days.some(day => !day.date.startsWith(`${year}-`))) throw new Error("Invalid contribution calendar");
  return days;
}

export function summarise(year: number, days: ContributionDay[], source: ContributionCalendar["source"], privateCount: number | null = null): ContributionCalendar {
  let longestStreak = 0;
  let streak = 0;
  let bestDay: ContributionDay | null = null;
  for (const day of days) {
    streak = day.count > 0 ? streak + 1 : 0;
    longestStreak = Math.max(longestStreak, streak);
    if (day.count > 0 && (!bestDay || day.count > bestDay.count)) bestDay = day;
  }
  return {
    year,
    total: days.reduce((total, day) => total + day.count, 0),
    days,
    source,
    privateCount,
    activeDays: days.filter(day => day.count > 0).length,
    longestStreak,
    bestDay,
  };
}

export function parseContributions(html: string, year: number) {
  const tooltips = new Map<string, number>();
  for (const match of html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/g)) {
    const id = match[1].match(/\bfor="([^"]+)"/)?.[1];
    const count = match[2].replace(/<[^>]*>/g, "").trim().match(/^([\d,]+) contributions?/);
    if (id && (count || /^No contributions?/.test(match[2].trim()))) tooltips.set(id, count ? Number(count[1].replace(/,/g, "")) : 0);
  }
  const days: ContributionDay[] = [];
  for (const match of html.matchAll(/<td\b[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const id = match[0].match(/\bid="([^"]+)"/)?.[1];
    const level = Number(match[0].match(/data-level="([0-4])"/)?.[1]);
    if (!id || !tooltips.has(id) || !match[1].startsWith(`${year}-`) || !Number.isInteger(level)) continue;
    days.push({ date: match[1], count: tooltips.get(id)!, level });
  }
  return summarise(year, validate(days, year), "public");
}

const LEVELS: Record<string, number> = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

export const CONTRIBUTIONS_QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      restrictedContributionsCount
      commitContributionsByRepository(maxRepositories: 100) { repository { isPrivate } contributions { totalCount } }
      contributionCalendar { weeks { contributionDays { date contributionCount contributionLevel } } }
    }
  }
}`;

type GraphQLResponse = {
  data?: { user?: { contributionsCollection?: {
    restrictedContributionsCount: number;
    commitContributionsByRepository: { repository: { isPrivate: boolean }; contributions: { totalCount: number } }[];
    contributionCalendar: { weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[] };
  } } | null };
  errors?: unknown[];
};

export function parseGraphQLContributions(response: GraphQLResponse, year: number) {
  const collection = response.data?.user?.contributionsCollection;
  if (!collection || response.errors?.length) throw new Error("Invalid GitHub API response");
  const days = collection.contributionCalendar.weeks.flatMap(week => week.contributionDays)
    .filter(day => day.date.startsWith(`${year}-`))
    .map(day => ({ date: day.date, count: day.contributionCount, level: LEVELS[day.contributionLevel] ?? 0 }));
  // Private repos are visible to the profile owner's token; restricted counts cover anonymised private work otherwise.
  const privateCount = collection.restrictedContributionsCount + collection.commitContributionsByRepository
    .filter(entry => entry.repository.isPrivate)
    .reduce((total, entry) => total + entry.contributions.totalCount, 0);
  return summarise(year, validate(days, year), "api", privateCount);
}
