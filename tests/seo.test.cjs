const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTsModule(relativePath, mocks = {}) {
  const fullPath = path.join(__dirname, '..', relativePath);
  const code = ts.transpileModule(readFileSync(fullPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const localRequire = (specifier) => {
    if (mocks[specifier]) return mocks[specifier];
    if (specifier.startsWith('@/')) {
      return loadTsModule(`${specifier.slice(2)}.ts`, mocks);
    }
    return require(specifier);
  };
  vm.runInNewContext(code, { exports, require: localRequire, URL, Date });
  return exports;
}

test('SEO images exist on disk and are referenced in JSON-LD and sitemap', () => {
  const seo = loadTsModule('lib/seo.ts');
  const sitemapMod = loadTsModule('app/sitemap.ts');
  const robotsMod = loadTsModule('app/robots.ts');

  assert.equal(seo.seoImages.length, 7);
  for (const img of seo.seoImages) {
    const diskPath = path.join(__dirname, '..', 'public', img.path.replace(/^\//, ''));
    assert.ok(existsSync(diskPath), `Expected image on disk: ${diskPath}`);
    assert.ok(img.url.startsWith('https://jamesharcourt.ie/'));
    assert.match(img.alt, /James Harcourt/);
  }

  const homeLd = seo.buildHomeJsonLd();
  assert.equal(homeLd['@context'], 'https://schema.org');
  const graph = homeLd['@graph'];
  const person = graph.find((node) => node['@type'] === 'Person');
  const profilePage = graph.find((node) => node['@type'] === 'ProfilePage');
  const imageObjects = graph.filter((node) => node['@type'] === 'ImageObject');

  assert.ok(person, 'Person schema should exist');
  assert.ok(profilePage, 'ProfilePage schema should exist');
  assert.equal(person.name, 'James Harcourt');
  assert.ok(person.sameAs.some((u) => u.includes('linkedin.com/in/james-harcourt')));
  assert.ok(person.sameAs.some((u) => u.includes('github.com/jdharcourt')));
  assert.ok(person.sameAs.some((u) => u.includes('equilibrium.ie')));
  assert.equal(imageObjects.length, 7);
  assert.equal(person.image.length, 7);

  const sitemapEntries = sitemapMod.default();
  const homeEntry = sitemapEntries.find((entry) => entry.url === 'https://jamesharcourt.ie');
  assert.ok(homeEntry, 'Home entry should be in sitemap');
  assert.equal(homeEntry.images.length, 7);

  const robotsConfig = robotsMod.default();
  assert.equal(robotsConfig.sitemap, 'https://jamesharcourt.ie/sitemap.xml');
});
