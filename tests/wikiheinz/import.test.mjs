import test from 'node:test';
import assert from 'node:assert/strict';
import { zeilenAus, parseZeile, importiere } from '../../lib/wissen/import.js';
import { neuerSpeicher } from '../../lib/wissen/speicher.js';
import { neueQuelle } from '../../lib/wissen/quelle.js';

const art = (t, x) => JSON.stringify({ word: t, senses: [{ glosses: [x] }], lang_code: 'de' });
const weg = (t, z) => JSON.stringify({ word: t, senses: [{ form_of: [{ word: z }] }] });
const DATEI = [art('Sokrates', 'Sokrates war ein Philosoph.'), weg('Socrates', 'Sokrates'), 'kaputt', '', art('Apfel', 'Der Apfel ist eine Frucht.'), weg('Selbst', 'Selbst'), art('Leer', '  ')].join('\n') + '\n';
async function* stuecke(text, n) { const b = new TextEncoder().encode(text); for (let i = 0; i < b.length; i += n) yield b.slice(i, i + n); }

test('zeilenAus: Bytes in beliebigen Stücken (auch mitten im Umlaut), letzte Zeile ohne Umbruch', async () => {
    const out = []; for await (const z of zeilenAus(stuecke('Köln\r\nüber\nEnde', 3))) out.push(z);
    assert.deepEqual(out, ['Köln', 'über', 'Ende']);
});
test('parseZeile: Artikel, Weiterleitung, Müll, leerer Text, Weiterleitung auf sich selbst', () => {
    assert.deepEqual(parseZeile(art('Sokrates', 'Text')), { k: 'sokrates', t: 'Sokrates', x: 'Text', v: '' });
    assert.deepEqual(parseZeile(weg('Socrates', 'Sokrates')), { k: 'socrates', t: 'Socrates', x: '', v: 'Sokrates' });
    assert.equal(parseZeile('kaputt'), null); assert.equal(parseZeile(art('Leer', ' ')), null); assert.equal(parseZeile(weg('A', 'A')), null);
});
test('importiere: schreibt Stapel, zählt, setzt fertig', async () => {
    const sp = neuerSpeicher(), q = neueQuelle({ id: 'wikipedia-de', wikipedia: true }), fort = [];
    const r = await importiere({ chunks: stuecke(DATEI, 7), speicher: sp, quelle: q, stapel: 2, onProgress: (p) => fort.push(p.gespeichert) });
    assert.equal(r.gespeichert, 3); assert.equal(r.abgebrochen, false);
    const m = await sp.quelle('wikipedia-de'); assert.equal(m.fertig, true); assert.equal(m.anzahl, 3);
    assert.equal((await sp.hole('wikipedia-de', 'apfel'))[0].x, 'Der Apfel ist eine Frucht.');
    assert.ok(fort.length >= 2);
});
test('importiere: Abbruch nach dem Stapel, Fortsetzen ohne Doppelte', async () => {
    const sp = neuerSpeicher(), ac = new AbortController(); let q = neueQuelle({ id: 'w' });
    const r1 = await importiere({ chunks: stuecke(DATEI, 50), speicher: sp, quelle: q, stapel: 1, signal: ac.signal, onProgress: () => ac.abort() });
    assert.equal(r1.abgebrochen, true);
    const mid = await sp.quelle('w'); assert.equal(mid.fertig, false); assert.equal(mid.anzahl, 1);
    const r2 = await importiere({ chunks: stuecke(DATEI, 50), speicher: sp, quelle: mid, stapel: 1 });
    assert.equal(r2.abgebrochen, false); assert.equal((await sp.quelle('w')).anzahl, 3); assert.equal((await sp.alle('w')).length, 3);
    assert.equal((await sp.quelle('w')).fertig, true);
});
