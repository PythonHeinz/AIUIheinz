import test from 'node:test';
import assert from 'node:assert/strict';
import { keyOf, woerter } from '../../tools/wikiheinz/mod/schluessel.js';
import { neueQuelle, ausDatei, istSchreibbar, angabe, linkZu, ART, EIGEN_ID } from '../../tools/wikiheinz/mod/quelle.js';

test('keyOf: klein, ß, Umlaute und Akzente gefaltet, Rand-Interpunktion, Unterstrich als Leerzeichen', () => {
    assert.equal(keyOf('  „Straße“! '), 'strasse');
    assert.equal(keyOf('Köln_am_Rhein'), 'koln am rhein');
    assert.equal(keyOf('Ä'.normalize('NFD') + 'pfel'), 'apfel');
    assert.equal(keyOf(null), ''); assert.equal(keyOf('Zürich Čapek é'), 'zurich capek e');
});
test('woerter: Füllwörter fallen weg, Reihenfolge bleibt, Doppelte nicht, höchstens 8', () => {
    assert.deepEqual(woerter('Wer war Sokrates und was hat er gemacht?'), ['sokrates', 'gemacht']);
    assert.deepEqual(woerter('Sokrates Sokrates Platon'), ['sokrates', 'platon']);
    assert.equal(woerter('a1 b2 c3 d4 e5 f6 g7 h8 i9 j10 k11').length, 8);
    assert.deepEqual(woerter('Was ist das?'), []);
});
test('Quelle: Vorbelegung aus dem Dateinamen, Schreibrechte, Angabe und Link', () => {
    const d = ausDatei('wikipedia-de.jsonl.gz'); assert.equal(d.sprache, 'de'); assert.equal(d.wikipedia, true);
    assert.equal(ausDatei('wikipedia_en_2026-10.jsonl.gz').stand, '2026-10'); assert.equal(ausDatei('wikipedia_en_2026-10.jsonl.gz').sprache, 'en');
    assert.equal(ausDatei('woerterbuch.tsv'), null);
    const w = neueQuelle({ ...d, stand: '2026-10' }), e = neueQuelle({ art: ART.EIGEN, name: 'Mein Wiki' });
    assert.equal(e.id, EIGEN_ID); assert.equal(istSchreibbar(e), true); assert.equal(istSchreibbar(w), false);
    assert.equal(angabe(w, 'Sokrates'), 'Wikipedia (de, offline), „Sokrates“, CC BY-SA 4.0, Stand 2026-10');
    assert.equal(linkZu(w, 'Köln am Rhein'), 'https://de.wikipedia.org/wiki/K%C3%B6ln_am_Rhein'); assert.equal(linkZu(e, 'x'), '');
});
