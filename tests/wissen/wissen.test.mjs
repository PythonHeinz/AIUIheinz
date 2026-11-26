import test from 'node:test';
import assert from 'node:assert/strict';
import { HeinzWissen } from '../../lib/wissen/index.js';
import { neuerSpeicher } from '../../lib/wissen/speicher.js';
import { neueQuelle, ART } from '../../lib/wissen/quelle.js';
import { keyOf } from '../../lib/wissen/schluessel.js';

const e = (t, x, v = '') => ({ k: keyOf(t), t, x, v });
const ARTIKEL = { titel: 'Grünten', intro: 'Der Grünten ist ein Berg im Allgäu.', infobox: [['Höhe', '1738 m'], ['Gebirge', 'Allgäuer Voralpen']], abschnitte: [{ h: 'Geschichte', text: 'Auf dem Grünten wurde Erz abgebaut.' }], zeichen: 120 };
function holenMit(zimDa, log) {
    return async (u) => {
        if (log) log.push(u);
        if (u === '/api/wiki/status') return { status: 200, json: zimDa ? { available: true, datei: 'test.zim', eintraege: 2 } : { available: false } };
        const m = /titel=([^&]+)/.exec(u), t = m ? decodeURIComponent(m[1]) : '';
        return zimDa && t === 'Grünten' ? { status: 200, json: ARTIKEL } : { status: 404, json: null };
    };
}
async function aufbau(zimDa = false, log = null, mitDaten = true) {
    const sp = neuerSpeicher();
    if (mitDaten) {
        await sp.quelleSetzen(neueQuelle({ id: 'wikipedia-de', name: 'Wikipedia (de, offline)', wikipedia: true, lizenz: 'CC BY-SA 4.0', stand: '2026-10', anzahl: 3 }));
        await sp.add('wikipedia-de', [e('Grünten', 'Der Grünten ist ein Berg.'), e('Sokrates', 'Sokrates war ein antiker Philosoph aus Athen.'), e('Köln', 'Köln ist eine Stadt am Rhein.')]);
    }
    HeinzWissen.konfiguriere({ speicher: sp, holen: holenMit(zimDa, log), postfach: null });
    return sp;
}

test('ohne Quelle: Zustand statt Fehler, kein Modellaufruf, kein Netz', async () => {
    const log = []; await aufbau(false, log, false);
    let gesendet = 0; const senden = async () => { gesendet++; return ''; };
    assert.equal((await HeinzWissen.zustand()).weg, 'keine');
    for (const r of [await HeinzWissen.suche('Sokrates'), await HeinzWissen.kontext('Wer war Sokrates?', { senden }), await HeinzWissen.beantworte('Wer war Sokrates?', { senden })]) { assert.equal(r.zustand, 'keine-quelle'); assert.equal(r.weg, 'keine'); }
    assert.equal(gesendet, 0);
    assert.deepEqual(log, ['/api/wiki/status']);                                   // nur der Zustand der eigenen ZIM, nie die Artikel
});

test('quellen und zustand: bereit nur mit Einträgen, Weg Auszug ohne ZIM, voll mit ZIM', async () => {
    const sp = await aufbau(false);
    await sp.quelleSetzen(neueQuelle({ id: 'mein-wiki', name: 'Mein Wiki', art: ART.EIGEN }));
    const q = await HeinzWissen.quellen(); assert.equal(q.find(x => x.id === 'wikipedia-de').bereit, true); assert.equal(q.find(x => x.id === 'mein-wiki').bereit, false);
    assert.deepEqual(await HeinzWissen.zustand().then(z => [z.weg, z.zim]), ['auszug', false]);
    await aufbau(true); assert.deepEqual(await HeinzWissen.zustand().then(z => [z.weg, z.zim]), ['voll', true]);
});

test('suche: Treffer mit Quelle, Angabe, Link, Lizenz; Auszug ohne ZIM, voll mit ZIM', async () => {
    await aufbau(false);
    let r = await HeinzWissen.suche('Grünten'); assert.equal(r.zustand, 'ok'); assert.equal(r.weg, 'auszug');
    assert.equal(r.treffer[0].titel, 'Grünten'); assert.equal(r.treffer[0].voll, false); assert.equal(r.treffer[0].lizenz, 'CC BY-SA 4.0');
    assert.match(r.treffer[0].angabe, /Wikipedia \(de, offline\), „Grünten“, CC BY-SA 4.0, Stand 2026-10/); assert.match(r.treffer[0].link, /^https:\/\/de\.wikipedia\.org\/wiki\/Gr%C3%BCnten$/);
    await aufbau(true); r = await HeinzWissen.suche(['Grünten']); assert.equal(r.weg, 'voll'); assert.equal(r.treffer[0].voll, true); assert.match(r.treffer[0].auszug, /Allgäu/);
    assert.equal((await HeinzWissen.suche('Nirgendwo')).zustand, 'leer');
    assert.equal((await HeinzWissen.suche('Grünten', { voll: false })).weg, 'auszug');
});

test('kontext: Begriffe von der App, kein Modellaufruf bei Treffer; Rückfall auf das Modell nur ohne Treffer', async () => {
    await aufbau(false);
    let n = 0; const senden = async (a) => { n++; return a.art === 'begriffe' ? '{"begriffe":["Köln"]}' : 'x'; };
    let r = await HeinzWissen.kontext('Wie hoch ist der Grünten?', { senden });
    assert.equal(r.zustand, 'ok'); assert.equal(r.von, 'code'); assert.equal(r.rueckfall, false); assert.equal(n, 0); assert.match(r.text, /^\[1\] Grünten/); assert.equal(r.verwendet[0].lizenz, 'CC BY-SA 4.0');
    r = await HeinzWissen.kontext('What is Cologne like?', { senden });             // App findet nichts, das Modell übersetzt in den Titel
    assert.equal(r.zustand, 'ok'); assert.equal(r.von, 'modell'); assert.equal(r.rueckfall, true); assert.equal(n, 1); assert.equal(r.verwendet[0].titel, 'Köln');
    n = 0; r = await HeinzWissen.kontext('Quantenschaum Zeitkristall', { senden: async () => { n++; return '{"begriffe":["Zeitkristall"]}'; } });
    assert.equal(r.zustand, 'leer'); assert.equal(n, 1); assert.equal(r.text, '');
    r = await HeinzWissen.kontext('What is Cologne like?');                          // ohne senden kein Rückfall
    assert.equal(r.zustand, 'leer');
});

test('kontext: begriffeVom modell fragt das Modell zuerst; Auszüge aus der ZIM ergeben Weg voll', async () => {
    await aufbau(true);
    const arten = []; const senden = async (a) => { arten.push(a.art); return '{"begriffe":["Grünten"]}'; };
    const r = await HeinzWissen.kontext('Höhe vom Gruenten', { senden, begriffeVom: 'modell' });
    assert.deepEqual(arten, ['begriffe']); assert.equal(r.von, 'modell'); assert.equal(r.weg, 'voll'); assert.equal(r.verwendet[0].voll, true); assert.match(r.text, /Allgäu/);
});

test('beantworte: Antwort nur aus Auszügen mit Quellenangabe; „nicht gefunden“ bleibt Zustand leer', async () => {
    await aufbau(false);
    const r = await HeinzWissen.beantworte('Wer war Sokrates?', { senden: async (a) => a.art === 'begriffe' ? '{"begriffe":["Sokrates"]}' : 'Ein Philosoph aus Athen [1].', sprache: 'de' });
    assert.equal(r.zustand, 'ok'); assert.equal(r.antwort, 'Ein Philosoph aus Athen [1].'); assert.equal(r.quellen[0].zitiert, true); assert.equal(r.quellen[0].lizenz, 'CC BY-SA 4.0'); assert.match(r.quellen[0].angabe, /Stand 2026-10/);
    const n = await HeinzWissen.beantworte('Wer war Sokrates?', { senden: async (a) => a.art === 'begriffe' ? '{"begriffe":["Sokrates"]}' : 'NOT_FOUND' });
    assert.equal(n.zustand, 'leer'); assert.equal(n.status, 'nichtGefunden'); assert.deepEqual(n.quellen, []);
});

test('wert: Infobox-Feld ohne Modell; Zustände keine-zim, leer, kein-feld; Namensvettern melden genau=false', async () => {
    await aufbau(false); assert.equal((await HeinzWissen.wert('Grünten', 'Höhe')).zustand, 'keine-zim');
    await aufbau(true);
    let r = await HeinzWissen.wert('Grünten', 'Höhe'); assert.equal(r.zustand, 'ok'); assert.equal(r.wert, '1738 m'); assert.equal(r.genau, true); assert.match(r.angabe || r.quelle, /Grünten/); assert.match(r.link, /wikipedia\.org/);
    assert.equal((await HeinzWissen.wert('Grünten', 'hohe')).wert, '1738 m');       // gefaltet: Höhe = hohe
    assert.equal((await HeinzWissen.wert('Grünten', 'Einwohner')).zustand, 'kein-feld');
    assert.equal((await HeinzWissen.wert('Nirgendwo', 'Höhe')).zustand, 'leer');
});

test('merke: ohne Postfach Zustand kein-postfach, mit Postfach wird abgelegt (nie direkt ins Wiki)', async () => {
    const sp = await aufbau(false);
    assert.equal((await HeinzWissen.merke({ titel: 'T', text: 'x' })).zustand, 'kein-postfach');
    const gelegt = []; HeinzWissen.konfiguriere({ postfach: { legen: async (an, art, daten) => { gelegt.push([an, art, daten]); } } });
    assert.equal((await HeinzWissen.merke({ titel: 'T', text: 'x', tags: ['a'] })).zustand, 'abgelegt');
    assert.deepEqual(gelegt[0].slice(0, 2), ['wikiheinz', 'merke']); assert.equal(gelegt[0][2].titel, 'T');
    assert.equal((await sp.quellen()).some(q => q.art === 'eigen'), false);
});
