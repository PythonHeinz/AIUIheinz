import test from 'node:test';
import assert from 'node:assert/strict';
import { wikiLang, wikiUrl, wikiPage } from '../../tools/docheinz/mod/wikipedia.js';

test('Sprache und Anfrage', () => {
    assert.equal(wikiLang('en-US'), 'en'); assert.equal(wikiLang(''), 'de'); assert.equal(wikiLang('x'), 'de');
    const u = new URL(wikiUrl('Dorian Gray', 'de'));
    assert.equal(u.hostname, 'de.wikipedia.org');
    assert.equal(u.searchParams.get('explaintext'), '1'); assert.equal(u.searchParams.get('exintro'), '1'); assert.equal(u.searchParams.get('origin'), '*');
    assert.equal(u.searchParams.get('gsrsearch'), 'Dorian Gray');
});
test('Antwort lesen', () => {
    const p = wikiPage({ query: { pages: [{ title: 'Oscar Wilde', extract: 'Oscar Wilde war ein irischer Schriftsteller.' }] } }, 'de');
    assert.equal(p.title, 'Oscar Wilde'); assert.equal(p.url, 'https://de.wikipedia.org/wiki/Oscar_Wilde');
    assert.equal(wikiPage({ query: { pages: [{ title: 'X', extract: '  ' }] } }, 'de'), null);
    assert.equal(wikiPage({}, 'de'), null);
});
