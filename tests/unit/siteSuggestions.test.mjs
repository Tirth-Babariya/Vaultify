// Unit tests for the "Website / App" autocomplete. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SITE_SUGGESTIONS, SITE_DOMAINS, suggestSites } from '../../src/lib/siteSuggestions.js';

test('developer and cloud tools are suggested', () => {
  for (const [typed, expected] of [
    ['ver', 'Vercel'], ['ren', 'Render'], ['supa', 'Supabase'], ['neo', 'Neon'], ['netl', 'Netlify'],
    ['rail', 'Railway'], ['fly', 'Fly.io'], ['clau', 'Claude'], ['open', 'OpenAI'], ['cloudf', 'Cloudflare'],
  ]) {
    assert.ok(suggestSites(typed).includes(expected), `"${typed}" should suggest ${expected}`);
  }
});

test('matching is case-insensitive and ignores surrounding whitespace', () => {
  assert.deepEqual(suggestSites('  VERCE  '), suggestSites('verce'));
  assert.ok(suggestSites('VERCE').includes('Vercel'));
  assert.ok(suggestSites(' SUPA ').includes('Supabase'));
});

test('names that start with the text rank before names that merely contain it', () => {
  const result = suggestSites('ver');
  assert.equal(result[0], 'Vercel');
  assert.ok(result.indexOf('Vercel') < result.indexOf('Evernote'));
});

test('among equal matches the shorter name comes first', () => {
  const result = suggestSites('goog');
  assert.equal(result[0], 'Google');
});

test('an exact match is not suggested back, and empty input suggests nothing', () => {
  assert.ok(!suggestSites('vercel').includes('Vercel'));
  assert.deepEqual(suggestSites(''), []);
  assert.deepEqual(suggestSites('   '), []);
});

test('results are capped', () => {
  assert.ok(suggestSites('a').length <= 7);
  assert.equal(suggestSites('a', 3).length, 3);
});

test('every suggestion has a plausible domain and names are unique', () => {
  assert.ok(SITE_SUGGESTIONS.length >= 200);
  assert.equal(new Set(SITE_SUGGESTIONS.map((n) => n.toLowerCase())).size, SITE_SUGGESTIONS.length);
  for (const name of SITE_SUGGESTIONS) {
    const domain = SITE_DOMAINS[name.toLowerCase()];
    assert.match(domain, /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i, `${name} -> ${domain}`);
  }
});
