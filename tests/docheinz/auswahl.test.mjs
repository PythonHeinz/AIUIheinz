import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuery, findAll } from '../../tools/docheinz/mod/suche.js';
import { buildRequest, clip, trimHistory, KINDS, MAX_CHARS } from '../../tools/docheinz/mod/ki.js';

test('search finds all hits case-insensitively with context and positions', () => {
    const t = 'Der Wille zur Macht. Der wille ist stark.\nUnd der WILLE bleibt.';
    const r = findAll(t, '  wille ');
    assert.equal(r.length, 3);
    assert.deepEqual(r.map(x => t.slice(x.start, x.start + x.len).toLowerCase()), ['wille', 'wille', 'wille']);
    assert.equal(r[0].hit, 'Wille');
    assert.ok(!/\n/.test(r[2].before + r[2].after));
    assert.equal(findAll(t, 'xyz').length, 0);
    assert.equal(findAll(t, '   ').length, 0);
});
test('search respects max and offset and does not overlap', () => {
    assert.equal(findAll('aaaa', 'aa').length, 2);
    assert.equal(findAll('a '.repeat(100), 'a', { max: 5 }).length, 5);
    assert.equal(findAll('x abc', 'abc', { offset: 100 })[0].start, 102);
    assert.equal(normalizeQuery('  a \n b  '), 'a b');
});
test('request contains only the passage, no title or author', () => {
    const r = buildRequest('explain', 'Ein  Satz.', { lang: 'de', title: 'Titel', author: 'Autor' });
    assert.equal(r.messages.length, 1);
    assert.doesNotMatch(r.messages[0].content, /Titel|Autor/);
    assert.match(r.messages[0].content, /Ein Satz\./);
    assert.match(r.system, /Deutsch/);
    assert.deepEqual(KINDS, ['explain', 'summary']);
    assert.match(buildRequest('summary', 'x', { lang: 'en' }).messages[0].content, /Summarize/);
    assert.throws(() => buildRequest('translate', 'x'));
});
test('long passages are clipped and flagged', () => {
    const c = clip('w '.repeat(MAX_CHARS));
    assert.equal(c.clipped, true);
    assert.equal(c.text.length, MAX_CHARS);
    assert.equal(clip('kurz').clipped, false);
});

test('page text is added only when given and clipped', () => {
    assert.ok(!/Page text/.test(buildRequest('explain', 'x', { lang: 'en' }).messages[0].content));
    const r = buildRequest('explain', 'Passage', { lang: 'en', page: 'Around ' + 'w '.repeat(5000) });
    assert.match(r.messages[0].content, /Page text for context:\nAround/);
    assert.ok(r.messages[0].content.length < 3400 + 300);
    assert.match(buildRequest('summary', 'P', { lang: 'de', page: 'Umfeld' }).messages[0].content, /Seitentext zum Zusammenhang:\nUmfeld/);
});
test('history keeps the first message and drops the oldest pairs when too long', () => {
    const m = (role, n) => ({ role, content: 'x'.repeat(n) });
    const h = [m('user', 100), m('assistant', 100), m('user', 100), m('assistant', 100)];
    assert.equal(trimHistory(h).length, 4);
    const big = [m('user', 100), m('assistant', 3000), m('user', 100), m('assistant', 3000), m('user', 100), m('assistant', 3000), m('user', 100)];
    const t = trimHistory(big, 8000);
    assert.equal(t[0], big[0]);
    assert.equal(t[t.length - 1], big[6]);
    assert.equal(t[1].role, 'assistant');
    assert.ok(t.length < big.length);
    assert.deepEqual(trimHistory([]), []);
});

test('custom system prompt replaces the built-in one and fills {title}/{author}', () => {
    const r = buildRequest('explain', 'x', { lang: 'de', title: 'T', author: 'A', system: 'Buch {title} von {author}. Sei knapp.' });
    assert.equal(r.system, 'Buch T von A. Sei knapp.');
    assert.match(buildRequest('explain', 'x', { lang: 'en', system: '   ' }).system, /Never say which book/);
});

import { CHAPTER_MAX_ONLINE } from '../../tools/docheinz/mod/ki.js';
test('Kapitel: max erlaubt längeren Text, Standard bleibt bei MAX_CHARS', () => {
    const long = 'a'.repeat(MAX_CHARS * 3);
    assert.equal(buildRequest('summary', long, { lang: 'de' }).clipped, true);
    const r = buildRequest('summary', long, { lang: 'de', max: CHAPTER_MAX_ONLINE });
    assert.equal(r.clipped, false);
    assert.ok(r.messages[0].content.length > MAX_CHARS * 3);
    assert.ok(buildRequest('summary', 'a'.repeat(CHAPTER_MAX_ONLINE + 5), { lang: 'en', max: CHAPTER_MAX_ONLINE }).clipped);
});
