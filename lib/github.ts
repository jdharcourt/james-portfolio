export function parseContributions(html: string, year: number) {
  const tooltips = new Map<string, number>();
  for (const match of html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/g)) {
    const id = match[1].match(/\bfor="([^"]+)"/)?.[1];
    const count = match[2].replace(/<[^>]*>/g, "").trim().match(/^([\d,]+) contributions?/);
    if (id && (count || /^No contributions?/.test(match[2].trim()))) tooltips.set(id, count ? Number(count[1].replace(/,/g, "")) : 0);
  }
  const days = [];
  for (const match of html.matchAll(/<td\b[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const id = match[0].match(/\bid="([^"]+)"/)?.[1];
    const level = Number(match[0].match(/data-level="([0-4])"/)?.[1]);
    if (!id || !tooltips.has(id) || !match[1].startsWith(`${year}-`) || !Number.isInteger(level)) continue;
    days.push({ date: match[1], count: tooltips.get(id)!, level });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  if (days.length < 28 || new Set(days.map(day => day.date)).size !== days.length) throw new Error("Invalid contribution calendar");
  return { year, total: days.reduce((total, day) => total + day.count, 0), days };
}
