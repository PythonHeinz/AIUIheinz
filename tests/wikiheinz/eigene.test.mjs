import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../../tools/wikiheinz/mod/eigene.js';
import { neuerSpeicher } from '../../tools/wikiheinz/mod/speicher.js';

const Q = 'mein-wiki';
test('verweise und tags: Alias, Doppelte, Überschrift ist kein Schlagwort', () => {
    assert.deepEqual(W.verweise('Siehe [[Platon]] und [[Platon|er]] sowie [[Aristoteles]].'), ['Platon', 'Aristoteles']);
    assert.deepEqual(W.tags('# Titel\n## Unter\nText #Antike und (#Dialog) #antike'), ['antike', 'dialog']);
});
test('speichere, haengeAn, Umbenennen, Rückverweise, Löschen', async () => {
    const sp = neuerSpeicher();
    await W.speichere(sp, Q, { titel: 'Platon', text: 'Schüler von [[Sokrates]] #antike' }, '2026-11-25');
    await W.speichere(sp, Q, { titel: 'Sokrates', text: 'Lehrer.' }, '2026-11-25');
    assert.deepEqual((await W.rueckverweise(sp, Q, 'sokrates')).map(e => e.t), ['Platon']);
    const a = await W.haengeAn(sp, Q, 'Sokrates', 'Mehr dazu.', { buch: 'B' }, '2026-11-26');
    assert.equal(a.x, 'Lehrer.\n\nMehr dazu.'); assert.equal(a.e, '2026-11-25'); assert.equal(a.g, '2026-11-26'); assert.equal(a.h.buch, 'B');
    const neu = await W.haengeAn(sp, Q, 'Neu', 'Erster Text', null, '2026-11-26'); assert.equal(neu.x, 'Erster Text');
    await W.speichere(sp, Q, { titel: 'sokrates', text: 'Klein.' }, 'x'); assert.equal((await W.seiten(sp, Q)).filter(e => e.k === 'sokrates').length, 1);
    assert.equal(await W.loescheSeite(sp, Q, 'Platon'), true); assert.equal(await W.loescheSeite(sp, Q, 'Platon'), false);
    await assert.rejects(() => W.speichere(sp, Q, { titel: ' ', text: 'x' }), /Titel/);
});
test('zitatBlock: Zitat, Autor, Buch, Kapitel', () => {
    assert.equal(W.zitatBlock({ zitat: 'Ich weiß, dass ich nichts weiß.\nZweite Zeile', autor: 'Platon', buch: 'Apologie', kapitel: '21d', am: '2026-11-25' }),
        '> Ich weiß, dass ich nichts weiß.\n> Zweite Zeile\n\n— Platon, *Apologie*, 21d (2026-11-25)');
    assert.equal(W.zitatBlock({}), '');
});
test('Export und Wiederherstellen: JSON verlustfrei, Dateien mit Kopf und eindeutigen Namen', async () => {
    const sp = neuerSpeicher(); await sp.quelleSetzen({ id: Q, name: 'Mein Wiki', art: 'eigen' });
    await W.speichere(sp, Q, { titel: 'A/B: Test', text: 'x [[C]] #t', herkunft: { buch: 'Buch' } }, '2026-11-25');
    await W.speichere(sp, Q, { titel: 'A_B: test', text: 'y' }, '2026-11-25');
    const json = await W.exportJSON(sp, Q), sp2 = neuerSpeicher(); assert.equal(await W.wiederherstellen(sp2, Q, json), 2);
    assert.equal((await sp2.hole(Q, 'a/b: test'))[0].h.buch, 'Buch'); assert.deepEqual((await sp2.hole(Q, 'a/b: test'))[0].links, ['C']);
    const d = await W.exportDateien(sp, Q); assert.equal(new Set(d.map(f => f.name.toLowerCase())).size, 2); assert.ok(d.every(f => !/[\/:]/.test(f.name)));
    assert.match(d[0].text, /^---\ntitel: /); await assert.rejects(() => W.wiederherstellen(sp2, Q, '{"a":1}'), /WikiHeinz/);
});
