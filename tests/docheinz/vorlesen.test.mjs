import test from 'node:test';
import assert from 'node:assert/strict';
import { splitSentences, pickVoice, RATES, MAX_LEN } from '../../tools/docheinz/mod/vorlesen.js';

const parts = (t, l) => splitSentences(t, l).map(x => t.slice(x.start, x.start + x.len));
test('Sätze: Abkürzungen, Initialen, Zahlen mit Punkt und wörtliche Rede trennen nicht', () => {
    assert.deepEqual(parts('Dr. Müller kam an. Er ging z. B. nach Hause! Am 3. Mai war es kalt. "Wirklich?" fragte sie. Ja.', 'de'),
        ['Dr. Müller kam an.', 'Er ging z. B. nach Hause!', 'Am 3. Mai war es kalt.', '"Wirklich?" fragte sie.', 'Ja.']);
    assert.deepEqual(parts('Mr. Smith met J. R. R. Tolkien. He said no.', 'en'), ['Mr. Smith met J. R. R. Tolkien.', 'He said no.']);
});
test('Zeilenumbruch trennt immer, leere Zeilen fallen weg, Positionen stimmen', () => {
    const t = 'Überschrift\n\nErster Satz. Zweiter Satz';
    const s = splitSentences(t, 'de');
    assert.deepEqual(s.map(x => t.slice(x.start, x.start + x.len)), ['Überschrift', 'Erster Satz.', 'Zweiter Satz']);
    assert.deepEqual(splitSentences('', 'de'), []);
    assert.deepEqual(splitSentences(undefined, 'de'), []);
});
test('zu lange Sätze werden gekürzt, ohne Text zu verlieren', () => {
    const t = 'aaaa, ' + 'b'.repeat(120) + ', ' + 'c'.repeat(150) + '.';
    const p = parts(t, 'en');
    assert.ok(p.length >= 2 && p.every(x => x.length <= MAX_LEN));
    assert.equal(p.join('').replace(/\s/g, ''), t.replace(/\s/g, ''));
});
test('Stimme: gespeicherte, sonst passende Sprache, offline vor online', () => {
    const v = [{ voiceURI: 'a', lang: 'en-US', localService: true }, { voiceURI: 'b', lang: 'de-DE', localService: false }, { voiceURI: 'c', lang: 'de-DE', localService: true }];
    assert.equal(pickVoice(v, 'de-AT').voiceURI, 'c');
    assert.equal(pickVoice(v, 'de', 'b').voiceURI, 'b');
    assert.equal(pickVoice(v, 'fr'), null);
    assert.equal(pickVoice([], 'de'), null);
    assert.ok(RATES.includes(1));
});
