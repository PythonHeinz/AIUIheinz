import test from 'node:test';
import assert from 'node:assert/strict';
import { suche, volltext, suchbegriffe } from '../../lib/wissen/suche.js';
import { neuerSpeicher } from '../../lib/wissen/speicher.js';
import { neueQuelle, ART } from '../../lib/wissen/quelle.js';
import { keyOf } from '../../lib/wissen/schluessel.js';

const e = (t, x, v = '') => ({ k: keyOf(t), t, x, v });
async function aufbau() {
    const sp = neuerSpeicher();
    await sp.quelleSetzen(neueQuelle({ id: 'wikipedia-de', wikipedia: true }));
    await sp.quelleSetzen(neueQuelle({ id: 'mein-wiki', art: ART.EIGEN }));
    await sp.add('wikipedia-de', [e('Sokrates', 'Philosoph.'), e('Socrates', '', 'Sokrates'), e('Sokratische Methode', 'Fragetechnik.'), e('Sokrates (Begriff)', 'x'), e('Apfel', 'Frucht.'), e('A', '', 'B'), e('B', '', 'C'), e('C', '', 'D'), e('D', '', 'E'), e('E', 'Ziel.')]);
    await sp.put({ ...e('Sokrates-Notizen', 'Mein Text #antike Dialog'), q: 'mein-wiki', tags: ['antike'] });
    return sp;
}
test('suche: Vorsilbe, genauer Treffer zuerst, eigene Seiten vor Importen, kürzerer Titel zuerst', async () => {
    const sp = await aufbau(), r = await suche(sp, 'sokrates');
    assert.equal(r[0].titel, 'Sokrates'); assert.equal(r[0].genau, true);
    const ts = r.map(x => x.titel); assert.ok(ts.includes('Sokrates (Begriff)') && ts.includes('Sokrates-Notizen'));
    assert.ok(ts.indexOf('Sokrates-Notizen') < ts.indexOf('Sokrates (Begriff)'));
});
test('suche: Weiterleitung wird gefolgt und kennt „via“; Ketten höchstens 3 lang; nichts gefunden = leer', async () => {
    const sp = await aufbau(), r = await suche(sp, 'Socrates', { quellen: ['wikipedia-de'] });
    assert.equal(r[0].titel, 'Sokrates'); assert.equal(r[0].via, 'Socrates');
    assert.deepEqual(await suche(sp, 'a', { quellen: ['wikipedia-de'], limit: 50 }).then(x => x.filter(y => y.via === 'A')), [], 'Kette A→B→C→D→E ist länger als 3');
    assert.deepEqual(await suche(sp, 'Zzzz'), []); assert.deepEqual(await suche(sp, '  '), []);
});
test('volltext in Mein Wiki: alle Wörter, Titel und Schlagwort zählen mehr', async () => {
    const sp = await aufbau();
    assert.equal((await volltext(sp, 'mein-wiki', 'dialog antike'))[0].titel, 'Sokrates-Notizen');
    assert.deepEqual(await volltext(sp, 'mein-wiki', 'dialog xyz'), []);
});
test('suchbegriffe: höchstens `gesamt` Treffer, keine Doppelten', async () => {
    const sp = await aufbau(), r = await suchbegriffe(sp, ['sokrates', 'Socrates', 'apfel'], { gesamt: 3 });
    assert.equal(r.length, 3); assert.equal(new Set(r.map(x => x.q + '|' + x.titel)).size, 3);
});
