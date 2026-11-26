/* tools/wikiheinz/ui/wiki.js – Reiter „Mein Wiki“: Seitenliste, Editor, Export und Wiederherstellen. Logik in ../../../lib/wissen/eigene.js. */
import { HeinzStore } from './base.js';
import { $, t, S, on, emit, msg, jetzt, eigene, ladeQuellen, herunterladen } from './state.js';
import { neueQuelle, ART, EIGEN_ID } from '../../../lib/wissen/quelle.js';
import { speichere, seiten, loescheSeite, exportJSON, exportDateien, wiederherstellen } from '../../../lib/wissen/eigene.js';
import { volltext } from '../../../lib/wissen/suche.js';
import { keyOf } from '../../../lib/wissen/schluessel.js';
import { zip } from '../../../lib/wissen/zip.js';

let bearbeitet = null, loeschScharf = 0;
const einst = () => HeinzStore.get('heinz_wikiheinz_settings', {}) || {};

async function sicherStellen() {
    if (!eigene()) { await S.sp.quelleSetzen(neueQuelle({ id: EIGEN_ID, name: 'Mein Wiki', art: ART.EIGEN, sprache: 'de' })); await ladeQuellen(); }
    return eigene();
}
async function zaehle(g) { const q = eigene(); if (!q) return; q.anzahl = (await seiten(S.sp, q.id)).length; if (g) q.geaendert = new Date().toISOString(); await S.sp.quelleSetzen(q); await ladeQuellen(); }

let listeSeq = 0;
export async function liste() {
    const id = ++listeSeq, q = eigene(), box = $('seiten'), f = $('wq').value.trim(), neu = document.createDocumentFragment();
    let l = q ? (f && keyOf(f) ? await volltext(S.sp, q.id, f, 200) : (await seiten(S.sp, q.id)).map(e => ({ q: q.id, titel: e.t, text: e.x }))) : [];
    for (const r of l) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'wh-hit'; b.dataset.t = r.titel;
        b.innerHTML = '<b></b><small></small>'; b.firstChild.textContent = r.titel; b.lastChild.textContent = String(r.text || '').replace(/[#>*_`\[\]]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
        neu.appendChild(b);
    }
    if (id !== listeSeq) return;                                  // nur die neueste Abfrage zeichnet (sonst erscheint die Liste doppelt)
    box.replaceChildren(neu);
    $('wikiinfo').textContent = l.length ? t('pages', { n: l.length }) : t('pagesNone');
    const n = q ? q.anzahl : 0, ex = einst().export, w = $('wikiwarn');
    w.hidden = !n || (ex && !(q.geaendert && q.geaendert > ex));
    w.textContent = !ex ? t('warnNever') : t('warnOld', { d: String(ex).slice(0, 10) });
}

function editor(titel, text, istNeu) {
    bearbeitet = istNeu ? null : titel;
    $('v-liste').hidden = true; $('v-edit').hidden = false;
    $('e-titel').value = titel || ''; $('e-text').value = text || ''; $('b-del').hidden = istNeu;
    $('e-info').textContent = ''; window.scrollTo(0, 0);
}
function schliesse() { $('v-edit').hidden = true; $('v-liste').hidden = false; bearbeitet = null; liste(); }

async function start({ titel }) {
    emit('tab', 'wiki'); const q = await sicherStellen();
    const e = titel ? (await S.sp.hole(q.id, keyOf(titel))).find(x => x.t === titel) : null;
    editor(titel || '', e ? e.x : '', !e);
}
async function speicherKlick() {
    const titel = $('e-titel').value.trim(); if (!titel) { msg(t('needTitle'), 'err'); return; }
    const q = await sicherStellen();
    if (bearbeitet && bearbeitet !== titel) await loescheSeite(S.sp, q.id, bearbeitet);
    await speichere(S.sp, q.id, { titel, text: $('e-text').value }, new Date().toISOString());
    await zaehle(true); msg(t('saved'), 'ok'); schliesse(); emit('geaendert');
}
async function loeschKlick() {
    if (!bearbeitet) return;
    if (!loeschScharf) { loeschScharf = setTimeout(() => { loeschScharf = 0; }, 4000); msg(t('del') + '?', 'warn'); return; }
    clearTimeout(loeschScharf); loeschScharf = 0;
    await loescheSeite(S.sp, eigene().id, bearbeitet); await zaehle(true); msg(t('deleted'), 'ok'); schliesse(); emit('geaendert');
}
async function markiereExport() { const s = einst(); s.export = new Date().toISOString(); await HeinzStore.set('heinz_wikiheinz_settings', s); await liste(); }

export function initWiki() {
    $('seiten').addEventListener('click', (ev) => { const b = ev.target.closest('.wh-hit'); if (b) emit('open', { q: eigene().id, titel: b.dataset.t }); });
    $('b-neu').addEventListener('click', () => start({ titel: '' }));
    $('wq').addEventListener('input', () => liste());
    $('b-save').addEventListener('click', speicherKlick); $('b-cancel').addEventListener('click', schliesse); $('b-del').addEventListener('click', loeschKlick);
    $('b-exp-json').addEventListener('click', async () => { const q = eigene(); if (!q) return; herunterladen('mein-wiki-' + jetzt() + '.json', await exportJSON(S.sp, q.id), 'application/json'); await markiereExport(); });
    $('b-exp-zip').addEventListener('click', async () => {
        const q = eigene(); if (!q) return;
        const d = await exportDateien(S.sp, q.id); d.push({ name: '_wikiheinz.json', text: await exportJSON(S.sp, q.id) });
        herunterladen('mein-wiki-' + jetzt() + '.zip', zip(d), 'application/zip'); await markiereExport();
    });
    $('f-rest').addEventListener('change', async (ev) => {
        const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
        try { const q = await sicherStellen(), n = await wiederherstellen(S.sp, q.id, await f.text()); await zaehle(true); msg(t('restored', { n }), 'ok'); await liste(); emit('geaendert'); }
        catch (e) { msg(t('restoreFail', { why: e.message }), 'err'); }
    });
    on('edit', start); on('quellen', liste); on('lang', liste);
    liste();
}
