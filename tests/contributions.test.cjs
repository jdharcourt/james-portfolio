const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { parseContributions } = require('../lib/github.ts');

test('parses an actual GitHub calendar with date-sorted counts and levels', () => {
  const calendar = parseContributions(readFileSync(`${__dirname}/fixtures/github-january-2026.html`, 'utf8'), 2026);
  assert.equal(calendar.days.length, 31);
  assert.equal(calendar.days[0].date, '2026-01-01');
  assert.equal(calendar.days[30].date, '2026-01-31');
  assert.ok(calendar.total > 0);
  assert.equal(calendar.days.find(day => day.date === '2026-01-04').count, 0);
  assert.ok(calendar.days.every(day => Number.isInteger(day.count) && day.count >= 0 && day.level >= 0 && day.level <= 4));
  assert.equal(calendar.total, calendar.days.reduce((sum, day) => sum + day.count, 0));
});

test('rejects GitHub error pages, incomplete calendars and duplicate dates', () => {
  assert.throws(() => parseContributions('<h1>Rate limited</h1>', 2026));
  const html = readFileSync(`${__dirname}/fixtures/github-january-2026.html`, 'utf8');
  assert.throws(() => parseContributions(html, 2025));
  assert.throws(() => parseContributions(html + html, 2026));
});
