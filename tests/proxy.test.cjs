const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');

test('rate limits chat and sets nonce CSP, HSTS and safety headers on successful and blocked requests', () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(`${__dirname}/../proxy.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require, process: { env: { NODE_ENV: 'production' } }, Headers, console: { warn() {} },
  });
  const request = new NextRequest('https://portfolio.test/api/chat', { method: 'POST', headers: { 'x-forwarded-for': '192.0.2.1' } });
  const first = exports.proxy(request);
  assert.equal(first.status, 200);
  assert.match(first.headers.get('content-security-policy'), /nonce-[^']+/);
  assert.doesNotMatch(first.headers.get('content-security-policy'), /unsafe-eval/);
  assert.equal(first.headers.get('x-content-type-options'), 'nosniff');
  assert.match(first.headers.get('strict-transport-security'), /31536000/);
  for (let index = 0; index < 5; index++) assert.equal(exports.proxy(request).status, 200);
  const blocked = exports.proxy(request);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('retry-after'), '60');
  assert.match(blocked.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(exports.proxy(new NextRequest('https://portfolio.test/resume')).status, 200);
});
