import test from 'node:test';
import assert from 'node:assert/strict';
import { baueBegriffeAnfrage, pruefeBegriffe, baueKontext, baueAntwortAnfrage, pruefeAntwort, beantworte } from '../../tools/wikiheinz/mod/frage.js';
import { neuerSpeicher } from '../../tools/wikiheinz/mod/speicher.js';
import { neueQuelle, ART } from '../../tools/wikiheinz/mod/quelle.js';
import { keyOf } from '../../tools/wikiheinz/mod/schluessel.js';

const e = (t, x, v = '') => ({ k: keyOf(t), t, x, v });
async function aufbau() {
    const sp = neuerSpeicher();
    await sp.quelleSetzen(neueQuelle({ id: 'wikipedia-de', name: 'Wikipedia (de, offline)', wikipedia: true, lizenz: 'CC BY-SA 4.0', stand: '2026-10' }));
    await sp.quelleSetzen(neueQuelle({ id: 'mein-wiki', name: 'Mein Wiki', art: ART.EIGEN }));
    await sp.add('wikipedia-de', [e('Sokrates', 'Sokrates war ein antiker Philosoph aus Athen.'), e('Platon', 'Platon war ein Schüler des Sokrates.')]);
    return sp;
}

test('pruefeBegriffe: JSON-Objekt, Liste, Text drumherum, Müll, Doppelte, Länge', () => {
    assert.deepEqual(pruefeBegriffe('{"begriffe":["Sokrates","sokrates"," „Platon“ "]}'), ['Sokrates', 'Platon']);
    assert.deepEqual(pruefeBegriffe('["A","B"]'), ['A', 'B']);
    assert.deepEqual(pruefeBegriffe('Hier: {"begriffe":["Köln"]} fertig'), ['Köln']);
    assert.equal(pruefeBegriffe('Sokrates'), null); assert.equal(pruefeBegriffe('{"begriffe":[]}'), null); assert.equal(pruefeBegriffe(''), null);
    assert.equal(pruefeBegriffe('{"begriffe":["' + 'x'.repeat(61) + '"]}'), null);
    assert.equal(pruefeBegriffe('{"begriffe":["a1","b2","c3","d4","e5","f6"]}').length, 4);
});
test('Anfragen: Schema, Frage steckt nur im Nutzertext, Auszüge nummeriert, Marker NOT_FOUND im Auftrag', () => {
    const b = baueBegriffeAnfrage('Wer war Sokrates?'); assert.equal(b.format.properties.begriffe.maxItems, 4); assert.equal(b.user, 'Wer war Sokrates?');
    const k = baueKontext([{ q: 'w', titel: 'Sokrates', text: 'Text eins.' }, { q: 'w', titel: 'Platon', text: 'Text zwei.' }]);
    const a = baueAntwortAnfrage('Wer war Sokrates?', k.verwendet);
    assert.match(a.user, /\[1\] Sokrates\nText eins\.\n\n\[2\] Platon/); assert.match(a.user, /Question: Wer war Sokrates\?$/); assert.match(a.system, /NOT_FOUND/); assert.match(a.system, /ONLY/);
});
test('baueKontext: Auszug und Gesamtlänge begrenzt, mindestens ein Treffer bleibt', () => {
    const lang = 'wort '.repeat(1000), k = baueKontext([{ q: 'w', titel: 'A', text: lang }, { q: 'w', titel: 'B', text: lang }, { q: 'w', titel: 'C', text: lang }]);
    assert.ok(k.text.length <= 3300 + 100); assert.ok(k.verwendet.length >= 1 && k.verwendet.length <= 3); assert.ok(k.verwendet[0].auszug.length <= 900);
    assert.equal(baueKontext([]).verwendet.length, 0);
});
test('pruefeAntwort: NOT_FOUND, leer, zitierte Nummern, ungültige Nummer, ohne Beleg', () => {
    const v = [{ nr: 1 }, { nr: 2 }];
    assert.equal(pruefeAntwort('NOT_FOUND', v).status, 'nichtGefunden'); assert.equal(pruefeAntwort(' not found. ', v).status, 'nichtGefunden'); assert.equal(pruefeAntwort('', v).status, 'nichtGefunden');
    assert.deepEqual(pruefeAntwort('Er lehrte [2] und lebte in Athen [1][2][9].', v).zitiert, [1, 2]);
    assert.equal(pruefeAntwort('Er lebte in Athen.', v).ohneBeleg, true); assert.equal(pruefeAntwort('Er lebte in Athen [3].', v).ohneBeleg, true);
});
test('beantworte: Modell liefert Begriffe, Antwort mit Quellenliste und Lizenz', async () => {
    const sp = await aufbau(), calls = [];
    const senden = async (a) => { calls.push(a.art); return a.art === 'begriffe' ? '{"begriffe":["Sokrates"]}' : 'Ein Philosoph aus Athen [1].'; };
    const r = await beantworte({ frage: 'Wer war Sokrates?', sp, senden, onStatus: (s) => calls.push('st:' + s) });
    assert.deepEqual(calls, ['st:suche', 'begriffe', 'st:lese', 'st:antworte', 'antwort']);
    assert.equal(r.status, 'ok'); assert.equal(r.von, 'modell'); assert.equal(r.quellen[0].titel, 'Sokrates'); assert.equal(r.quellen[0].zitiert, true);
    assert.match(r.quellen[0].angabe, /CC BY-SA 4\.0/); assert.equal(r.quellen[0].link, 'https://de.wikipedia.org/wiki/Sokrates');
});
test('beantworte: Modell liefert Müll → Rückfall auf Wörter der Frage, Quelle „code“', async () => {
    const sp = await aufbau();
    const r = await beantworte({ frage: 'Wer war Platon?', sp, senden: async (a) => a.art === 'begriffe' ? 'keine ahnung' : 'Schüler des Sokrates [1].' });
    assert.equal(r.von, 'code'); assert.deepEqual(r.begriffe, ['platon']); assert.equal(r.status, 'ok');
});
test('beantworte: nichts gefunden → kein zweiter Modellaufruf, „nicht gefunden“, keine Quellen', async () => {
    const sp = await aufbau(); let n = 0;
    const r = await beantworte({ frage: 'Wer ist Zaphod Beeblebrox?', sp, senden: async (a) => { n++; return a.art === 'begriffe' ? '{"begriffe":["Zaphod Beeblebrox"]}' : 'Ein Präsident.'; } });
    assert.equal(r.status, 'nichtGefunden'); assert.equal(n, 1); assert.deepEqual(r.quellen, []); assert.equal(r.antwort, '');
});
test('beantworte: Modell sagt NOT_FOUND → „nicht gefunden“, auch wenn Treffer da waren', async () => {
    const sp = await aufbau();
    const r = await beantworte({ frage: 'Wie alt wurde Sokrates?', sp, senden: async (a) => a.art === 'begriffe' ? '{"begriffe":["Sokrates"]}' : 'NOT_FOUND' });
    assert.equal(r.status, 'nichtGefunden'); assert.deepEqual(r.quellen, []);
});
test('beantworte: Fehler beim Begriffe-Aufruf → Rückfall; Fehler bei der Antwort geht nach oben; Abbruch geht nach oben', async () => {
    const sp = await aufbau();
    const r = await beantworte({ frage: 'Platon', sp, senden: async (a) => { if (a.art === 'begriffe') throw new Error('x'); return 'Schüler [1]'; } });
    assert.equal(r.status, 'ok'); assert.equal(r.von, 'code');
    await assert.rejects(() => beantworte({ frage: 'Platon', sp, senden: async (a) => { if (a.art === 'antwort') throw new TypeError('offline'); return '{"begriffe":["Platon"]}'; } }), TypeError);
    const ac = new AbortController(); ac.abort();
    await assert.rejects(() => beantworte({ frage: 'Platon', sp, signal: ac.signal, senden: async () => { throw new Error('abort'); } }), /abort/);
});
test('beantworte: Mein Wiki wird mitdurchsucht, Quelle ohne Link', async () => {
    const sp = await aufbau(); await sp.put({ ...e('Sokrates-Notiz', 'Mein Gedanke zu Sokrates.'), q: 'mein-wiki' });
    const r = await beantworte({ frage: 'Sokrates-Notiz', sp, quellen: ['mein-wiki'], senden: async (a) => a.art === 'begriffe' ? '{"begriffe":["Sokrates-Notiz"]}' : 'Notiz [1]' });
    assert.equal(r.quellen[0].q, 'mein-wiki'); assert.equal(r.quellen[0].link, '');
});
test('Antwortsprache folgt der Spracheinstellung, nicht der Frage oder den Auszügen', () => {
    const v = [{ nr: 1, titel: 'Sokrates', auszug: 'Sokrates war ein Philosoph.' }];
    const en = baueAntwortAnfrage('Wer war Sokrates?', v, 'en');
    assert.match(en.system, /Write your answer in English/); assert.match(en.user, /Answer in English\.$/);
    const de = baueAntwortAnfrage('Who was Sokrates?', v, 'de');
    assert.match(de.system, /in German/); assert.match(de.user, /Answer in German\.$/);
    assert.doesNotMatch(baueAntwortAnfrage('Sokrates', v).system, /Write your answer in/);
});
