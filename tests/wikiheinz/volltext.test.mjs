import test from 'node:test';
import assert from 'node:assert/strict';
import { volltextQuelle, waehleAbschnitte } from '../../tools/wikiheinz/mod/volltext.js';

const A = { titel: 'Köln', intro: 'Köln ist eine Großstadt am Rhein. Sie ist die viertgrößte Stadt Deutschlands.', infobox: [['Einwohner', '1.083.498'], ['Fläche', '405 km²']],
    abschnitte: [{ h: 'Geschichte', text: 'Die Stadt wurde als Colonia gegründet und erhielt im Jahr 50 Stadtrechte.' }, { h: 'Wirtschaft', text: 'Köln ist ein Medienstandort mit Ford und Rewe.' }, { h: 'Klima', text: 'Das Klima ist mild.' }] };

test('waehleAbschnitte: Einleitung zuerst, dann der Abschnitt mit den meisten Treffern, ohne Umlaut-Hürde', () => {
    const t = waehleAbschnitte(A, ['Koeln', 'Geschichte Colonia'], { maxZeichen: 600 });
    assert.match(t, /^Köln ist eine Großstadt/); assert.match(t, /Geschichte: Die Stadt wurde als Colonia/); assert.doesNotMatch(t, /Klima/);
    assert.ok(t.length <= 700);
});
test('waehleAbschnitte: Infobox-Zeile nur, wenn der Name zu den Begriffen passt', () => {
    assert.match(waehleAbschnitte(A, ['Einwohner Geschichte']), /Infobox – Einwohner: 1\.083\.498/);
    assert.doesNotMatch(waehleAbschnitte(A, ['Geschichte']), /Infobox/);
});
test('waehleAbschnitte: ohne Treffer nur die Einleitung, ohne Artikel leer', () => {
    assert.equal(waehleAbschnitte(A, ['Zebra']), A.intro);
    assert.equal(waehleAbschnitte(null, ['x']), '');
    assert.equal(waehleAbschnitte({ intro: 'Nur Einleitung.', abschnitte: [] }, ['Einleitung']), 'Nur Einleitung.');
});
test('waehleAbschnitte: Länge bleibt unter der Grenze', () => {
    const lang = { intro: 'Eins. '.repeat(100), abschnitte: [{ h: 'Rhein', text: 'Der Rhein fließt. '.repeat(100) }] };
    assert.ok(waehleAbschnitte(lang, ['Rhein'], { maxZeichen: 500 }).length <= 560);
});
test('volltextQuelle: Status und Artikel werden gemerkt, Fehler und 404 ergeben null', async () => {
    let n = 0; const holen = async (u) => { n++; if (u.includes('status')) return { status: 200, json: { available: true, datei: 'w.zim' } }; if (u.includes('Gibt')) return { status: 404, json: { error: 'x' } }; return { status: 200, json: A }; };
    const v = volltextQuelle(holen);
    assert.equal((await v.status()).available, true); await v.status(); assert.equal(n, 1);
    assert.equal((await v.artikel('Köln')).titel, 'Köln'); await v.artikel('Köln'); assert.equal(n, 2);
    assert.equal(await v.artikel('Gibt es nicht'), null);
    const aus = volltextQuelle(async () => { throw new Error('offline'); });
    assert.deepEqual(await aus.status(), { available: false, error: 'offline' }); assert.equal(await aus.artikel('Köln'), null);
});
