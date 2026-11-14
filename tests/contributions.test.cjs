const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { parseContributions, parseGraphQLContributions } = require('../lib/github.ts');

test('parses an actual GitHub calendar with date-sorted counts and levels', () => {
  const calendar = parseContributions(readFileSync(`${__dirname}/fixtures/github-january-2026.html`, 'utf8'), 2026);
  assert.equal(calendar.days.length, 31);
  assert.equal(calendar.days[0].date, '2026-01-01');
  assert.equal(calendar.days[30].date, '2026-01-31');
  assert.ok(calendar.total > 0);
  assert.equal(calendar.days.find(day => day.date === '2026-01-04').count, 0);
  assert.ok(calendar.days.every(day => Number.isInteger(day.count) && day.count >= 0 && day.level >= 0 && day.level <= 4));
  assert.equal(calendar.total, calendar.days.reduce((sum, day) => sum + day.count, 0));
  assert.equal(calendar.source, 'public');
  assert.equal(calendar.privateCount, null);
});

test('rejects GitHub error pages, incomplete calendars and duplicate dates', () => {
  assert.throws(() => parseContributions('<h1>Rate limited</h1>', 2026));
  const html = readFileSync(`${__dirname}/fixtures/github-january-2026.html`, 'utf8');
  assert.throws(() => parseContributions(html, 2025));
  assert.throws(() => parseContributions(html + html, 2026));
});

function apiResponse(counts, extra = {}) {
  const days = counts.map((count, index) => ({ date: `2026-02-${String(index + 1).padStart(2, '0')}`, contributionCount: count, contributionLevel: count ? 'SECOND_QUARTILE' : 'NONE' }));
  return { data: { user: { contributionsCollection: {
    restrictedContributionsCount: 0,
    commitContributionsByRepository: [
      { repository: { isPrivate: true }, contributions: { totalCount: 12 } },
      { repository: { isPrivate: false }, contributions: { totalCount: 5 } },
    ],
    contributionCalendar: { weeks: [{ contributionDays: [{ date: '2025-12-31', contributionCount: 9, contributionLevel: 'FOURTH_QUARTILE' }, ...days] }] },
    ...extra,
  } } } };
}

test('includes private repository contributions from the GitHub API', () => {
  const counts = [1, 2, 0, 3, 3, 3, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const calendar = parseGraphQLContributions(apiResponse(counts, { restrictedContributionsCount: 4 }), 2026);
  assert.equal(calendar.source, 'api');
  assert.equal(calendar.days.length, 28);
  assert.equal(calendar.days[0].date, '2026-02-01');
  assert.equal(calendar.total, 16);
  assert.equal(calendar.privateCount, 16);
  assert.equal(calendar.longestStreak, 4);
  assert.equal(calendar.activeDays, 9);
  assert.deepEqual(calendar.bestDay, { date: '2026-02-04', count: 3, level: 2 });
  assert.equal(calendar.days[1].level, 2);
});

test('rejects GitHub API errors', () => {
  assert.throws(() => parseGraphQLContributions({ errors: [{ message: 'Bad credentials' }] }, 2026));
  assert.throws(() => parseGraphQLContributions({ data: { user: null } }, 2026));
});
