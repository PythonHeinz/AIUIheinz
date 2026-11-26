/* tools/wikiheinz/ui/quellen.js – Reiter „Quellen“: Liste, Import einer Wikipedia-Datei mit Fortschritt, Anhalten und Fortsetzen, Löschen in Stücken. Logik in ../../../lib/wissen/import.js. */
import { $, t, S, on, esc, msg, quelleVon, ladeQuellen, zahl, zim } from './state.js';
import { neueQuelle, ausDatei, ART } from '../../../lib/wissen/quelle.js';
import { importiere, zeilenAus, parseZeile } from '../../../lib/wissen/import.js';

let ac = null, scharf = '';

async function* lesen(stream) {
    const r = stream.getReader();
    try { for (;;) { const { done, value } = await r.read(); if (done) return; yield value; } } finally { try { r.releaseLock(); } catch (e) { /* schon frei */ } }
}
function strom(file, zaehler) {
    let s = file.stream();
    if (zaehler) s = s.pipeThrough(new TransformStream({ transform(c, ctl) { zaehler(c.length); ctl.enqueue(c); } }));
    return /\.gz$/i.test(file.name) ? s.pipeThrough(new DecompressionStream('gzip')) : s;
}
async function pruefeDatei(file) {                              // die erste nichtleere Zeile muss ein Eintrag sein
    const s = strom(file); let ok = false;
    try { for await (const z of zeilenAus(lesen(s))) { if (!z.trim()) continue; ok = !!parseZeile(z) || /^\{.*"word"/.test(z); break; } } catch (e) { ok = false; }
    try { await s.cancel(); } catch (e) { /* schon zu */ }
    return ok;
}

export function render() {
    const box = $('quellen'); box.innerHTML = '';
    for (const q of S.quellen) {
        const d = document.createElement('div'); d.className = 'wh-src';
        const z = [t('entries', { n: zahl(q.anzahl) }), q.art === ART.EIGEN ? t('writable') : t(q.fertig ? 'complete' : 'incomplete') + ' · ' + t('readOnly')];
        if (q.lizenz) z.push(t('license', { l: q.lizenz })); if (q.stand) z.push(t('stand', { s: q.stand }));
        d.innerHTML = '<b>' + esc(q.name) + '</b><small>' + esc(z.join(' · ')) + '</small>';
        if (q.art !== ART.EIGEN) { const r = document.createElement('div'); r.className = 'wh-row'; r.innerHTML = '<button type="button" class="pill danger" data-del="' + esc(q.id) + '"><svg class="i sm"><use href="../../lib/icons.svg#i-trash"/></svg><span></span></button>'; r.querySelector('span').textContent = t('delete'); d.appendChild(r); }
        box.appendChild(d);
    }
}
async function speicherInfo() {
    let z = '';
    try {
        const e = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null, p = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null;
        const mb = (n) => n >= 1e9 ? (n / 1e9).toFixed(1) + ' GB' : Math.round(n / 1e6) + ' MB';
        if (e && e.quota) z = t('usage', { u: mb(e.usage || 0), q: mb(e.quota) }) + (p === null ? '' : ' ' + t(p ? 'persisted' : 'notPersisted'));
    } catch (e) { z = ''; }
    $('speicherinfo').textContent = z + (S.sp.info().art === 'memory' ? ' ' + t('storeMem') : '');
}

async function importieren(file) {
    if (S.laeuft) return;
    const meta = ausDatei(file.name) || { id: file.name.replace(/\.(jsonl|json|txt)(\.gz)?$/i, '').replace(/\.gz$/i, ''), name: file.name, art: ART.IMPORT };
    let q = quelleVon(neueQuelle(meta).id);
    if (q && q.fertig) { msg(t('exists'), 'err'); return; }
    if (!(await pruefeDatei(file))) { msg(t('notAFile'), 'err'); return; }
    q = q || neueQuelle(meta);
    S.laeuft = true; ac = new AbortController(); $('b-stop').hidden = false; $('prog').hidden = false; $('impinfo').textContent = '';
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* kein Schutz möglich */ }
    let bytes = 0, letzte = 0;
    try {
        const r = await importiere({ chunks: lesen(strom(file, (n) => { bytes += n; })), speicher: S.sp, quelle: q, signal: ac.signal,
            onProgress: (p) => { $('progbar').style.width = Math.min(99, Math.round(bytes / Math.max(1, file.size) * 100)) + '%'; $('impinfo').textContent = t('reading', { n: zahl(p.gespeichert) });
                if (Date.now() - letzte > 800) { letzte = Date.now(); ladeQuellen(); } } });
        msg(r.abgebrochen ? t('impStopped', { n: zahl(r.gespeichert) }) : t('impDone', { n: zahl(r.gespeichert) }), r.abgebrochen ? 'warn' : 'ok');
        if (!r.abgebrochen) $('progbar').style.width = '100%';
    } catch (e) { msg(t('impFail', { why: e && e.message || e }), 'err'); }
    S.laeuft = false; ac = null; $('b-stop').hidden = true; $('impinfo').textContent = '';
    setTimeout(() => { if (!S.laeuft) $('prog').hidden = true; }, 1500);
    await ladeQuellen(); speicherInfo();
}
async function loeschen(id) {
    const q = quelleVon(id); if (!q || S.laeuft) return;
    if (scharf !== id) { scharf = id; setTimeout(() => { scharf = ''; }, 4000); msg(t('confirmDel', { n: q.name }), 'warn'); return; }
    scharf = ''; S.laeuft = true;
    try { await S.sp.quelleLoeschen(id, (n, m) => msg(t('deleting', { n: zahl(n), m: zahl(m) }), '')); msg(t('delDone'), 'ok'); } catch (e) { msg(String(e && e.message || e), 'err'); }
    S.laeuft = false; await ladeQuellen(); speicherInfo();
}

export async function renderZim() {
    const st = await zim.status(true), el = $('zimstat');
    el.textContent = st.available ? t('zimOn', { f: st.datei, n: zahl(st.eintraege) }) : t(st.error === 'zstd' ? 'zimZstd' : st.error === 'offline' ? 'zimOffline' : st.error === 'none' ? 'zimNone' : 'zimBad', { x: st.text || '' });
}

export function initQuellen() {
    on('tabwechsel', (name) => { if (name === 'quellen') renderZim(); });
    on('lang', renderZim); renderZim();
    $('f-import').addEventListener('change', (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) importieren(f); });
    $('b-stop').addEventListener('click', () => { if (ac) ac.abort(); });
    $('quellen').addEventListener('click', (ev) => { const b = ev.target.closest('[data-del]'); if (b) loeschen(b.dataset.del); });
    on('quellen', render); on('lang', () => { render(); speicherInfo(); });
    render(); speicherInfo();
}
