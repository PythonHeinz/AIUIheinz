import test from 'node:test';
import assert from 'node:assert/strict';
import { baueSchema, baueAnfrage, pruefeAntwort, lauf, istFatalStandard, MAX_ZEICHEN } from '../../tools/filter/mod/bewerten.js';

const L = ['positive', 'neutral', 'negative'];

test('schema: enum der Etiketten, why nur auf Wunsch', () => {
    assert.deepEqual(baueSchema(L, false), { type: 'object', properties: { label: { type: 'string', enum: L } }, required: ['label'] });
    assert.deepEqual(baueSchema(L, true).required, ['label', 'why']);
});

test('anfrage: System-Prompt mit Regel und Etiketten, Eintrag gekürzt und gekennzeichnet', () => {
    const a = baueAnfrage({ regel: 'Rate mood. ', labels: L, text: 'x'.repeat(MAX_ZEICHEN + 5), mitGrund: true });
    assert.match(a.system, /Rate mood\. Allowed labels: positive, neutral, negative/);
    assert.match(a.system, /"why"/);
    assert.equal(a.user.length, MAX_ZEICHEN);
    assert.equal(a.gekuerzt, true);
    assert.equal(baueAnfrage({ regel: 'r', labels: L, text: 'kurz' }).gekuerzt, false);
    assert.equal(baueAnfrage({ regel: 'r', labels: L, text: 'abcdef', maxZeichen: 3 }).user, 'abc');
});

test('antwort prüfen: erlaubtes Etikett, Schreibweise egal, sonst unklar (null)', () => {
    assert.deepEqual(pruefeAntwort('{"label":"Positive","why":"nice"}', L), { label: 'positive', grund: 'nice', quelle: 'json' });
    assert.equal(pruefeAntwort('{"label":"fröhlich"}', L).label, null, 'nicht erlaubt = unklar');
    assert.equal(pruefeAntwort('', L).label, null);
    assert.equal(pruefeAntwort('Ich denke es ist negativ', L).label, null, 'Prosa wird nicht geraten');
    assert.equal(pruefeAntwort('Hier: {"label":"neutral"} Danke', L).label, 'neutral', 'JSON mit Text drumherum');
    assert.deepEqual(pruefeAntwort('"negative".', L), { label: 'negative', grund: '', quelle: 'text' }, 'Rückfall: ganze Antwort ist ein Etikett');
    assert.equal(pruefeAntwort('[1,2]', L).label, null);
    assert.equal(pruefeAntwort('{"label":null}', L).label, null);
});

const E = n => Array.from({ length: n }, (_, i) => ({ index: i, text: 'e' + i, row: ['e' + i] }));

test('lauf: ein Eintrag je Anfrage, Ergebnisse in Reihenfolge, Fortschritt', async () => {
    const calls = [], prog = [];
    const r = await lauf({ eintraege: E(3), labels: L, regel: 'r', mitGrund: false,
        senden: async a => { calls.push(a.user); return JSON.stringify({ label: a.user === 'e1' ? 'negative' : 'positive' }); },
        onErgebnis: (e, n, g) => prog.push([n, g]) });
    assert.deepEqual(calls, ['e0', 'e1', 'e2']);
    assert.deepEqual(r.ergebnisse.map(x => x.label), ['positive', 'negative', 'positive']);
    assert.deepEqual(prog, [[1, 3], [2, 3], [3, 3]]);
    assert.equal(r.fehler, 0); assert.equal(r.abgebrochen, false); assert.equal(r.fatal, null);
});

test('lauf: Abbruch zwischen zwei Einträgen, Wiederaufnahme überspringt Fertiges', async () => {
    const ac = new AbortController(), calls = [];
    const senden = async a => { calls.push(a.user); if (a.user === 'e1') ac.abort(); return '{"label":"neutral"}'; };
    const r1 = await lauf({ eintraege: E(4), labels: L, regel: 'r', senden, signal: ac.signal });
    assert.equal(r1.abgebrochen, true);
    assert.deepEqual(r1.ergebnisse.map(x => x.index), [0, 1]);
    const bereits = Object.fromEntries(r1.ergebnisse.map(x => [x.index, x]));
    const calls2 = [];
    const r2 = await lauf({ eintraege: E(4), labels: L, regel: 'r', bereits, senden: async a => { calls2.push(a.user); return '{"label":"positive"}'; } });
    assert.deepEqual(calls2, ['e2', 'e3'], 'nur der Rest wird gesendet');
    assert.deepEqual(r2.ergebnisse.map(x => x.label), ['neutral', 'neutral', 'positive', 'positive']);
});

test('lauf: AbortError der Anfrage beendet den Lauf ohne Fehlerzählung', async () => {
    const r = await lauf({ eintraege: E(3), labels: L, regel: 'r', senden: async () => { const e = new Error('x'); e.name = 'AbortError'; throw e; } });
    assert.equal(r.abgebrochen, true); assert.equal(r.fehler, 0); assert.equal(r.ergebnisse.length, 0);
});

test('lauf: Einzelfehler zählt als unklar und läuft weiter, Netz/404/Online-Sperre bricht ab', async () => {
    let n = 0;
    const r = await lauf({ eintraege: E(3), labels: L, regel: 'r', senden: async () => { n++; if (n === 2) throw Object.assign(new Error('HTTP 500'), { http: 500 }); return '{"label":"positive"}'; } });
    assert.deepEqual(r.ergebnisse.map(x => x.label), ['positive', null, 'positive']);
    assert.equal(r.fehler, 1); assert.equal(r.fatal, null);
    assert.equal(r.ergebnisse[1].fehler, true);
    const f = await lauf({ eintraege: E(3), labels: L, regel: 'r', senden: async () => { throw Object.assign(new Error('HTTP 404'), { http: 404 }); } });
    assert.equal(f.ergebnisse.length, 1); assert.ok(f.fatal);
    assert.equal(istFatalStandard(new TypeError('Failed to fetch')), true);
    assert.equal(istFatalStandard(Object.assign(new Error('x'), { code: 'ONLINE_BLOCKED' })), true);
    assert.equal(istFatalStandard(Object.assign(new Error('x'), { http: 500 })), false);
});
