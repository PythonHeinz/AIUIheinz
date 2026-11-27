/* tools/docheinz/ui/woerterbuch.js – Wörterbücher: Verwaltung in der Bibliothek (Import, Liste, Löschen) und Nachschlagen für den Leser.
 *   initDict({ db(), t, say(text, art) })   verdrahtet Knopf #b-dict und Feld #dict der Bibliothek
 *   lookup(auswahl, sprache) -> Promise<{ none, groups: [{ word, items: [{ name, o, d }] }], tried }>   (none: kein Wörterbuch eingelesen)
 * Alles bleibt auf dem Gerät (IndexedDB, Stores dict und dictmeta). */
import { $, HeinzWissen } from './base.js';
import { detect, parseLine, parseJson, wanted, candidates, keyOf, words } from '../mod/woerterbuch.js';

const D = { env: null, open: false, busy: '', seq: 0 };
const BATCH = 4000;
// Lesbarer Name statt Dateiname: de-extract -> „Deutsches Wörterbuch (Wiktionary)“, simple-extract -> „Englisches Wörterbuch (Simple English)“
function niceName(file, t, ui) {
    const base = file.replace(/\.gz$/i, '').replace(/\.[^.]+$/, '') || file, m = /^([a-z]{2,6})-extract/i.exec(base);
    if (/^wikipedia/i.test(base)) return t('d_nameWiki');
    if (!m) return base;
    const c = m[1].toLowerCase();
    if (c === 'de') return t('d_nameDe');
    if (c === 'simple') return t('d_nameSimple');
    let l = c; try { l = new Intl.DisplayNames([ui || 'en'], { type: 'language' }).of(c) || c; } catch { /* Kürzel bleibt */ }
    return t('d_nameGen', { l });
}

// Die Wikipedia liegt seit 27.11.2026 in WikiHeinz (lib/wissen/). Ist dort eine Wikipedia bereit, wird eine alte eigene Kopie in docHeinz nicht mehr gelesen (sie bleibt als Rückfall, solange WikiHeinz keine hat) und kann gelöscht werden.
const istWikiKopie = (m) => /^wikipedia/i.test(m.name || '');
export async function wikiHeinzHatWikipedia() { try { return (await HeinzWissen.quellen()).some(q => q.bereit && q.wikipedia); } catch { return false; } }

export async function lookup(sel, lang) {
    const db = D.env && D.env.db();
    let metas = db ? await db.dictList() : [];
    if (metas.some(istWikiKopie) && await wikiHeinzHatWikipedia()) metas = metas.filter(m => !istWikiKopie(m));
    if (!metas.length) return { none: true, groups: [], tried: [] };
    const names = Object.fromEntries(metas.map(m => [m.id, m.name]));
    const ws = words(sel), tried = [], groups = [], seen = new Set();
    const tries = [];
    if (ws.length > 1) tries.push(ws.join(' '));                                  // erst die ganze Wortgruppe (Redewendung)
    ws.forEach(w => tries.push(w));
    for (const w of tries) {
        const cs = candidates(w, lang);
        let items = [];
        for (const c of cs) {                                                     // genau vor Grundform: beim ersten Treffer aufhören
            tried.push(c);
            const hits = (await db.dictFind([c])).filter(x => names[x.dict] !== undefined);
            if (hits.length) { items = hits; break; }
        }
        const refs = [...new Set(items.filter(x => x.r).map(x => x.r))], form = [];
        if (refs.length) {                                                       // Beugungsform: Eintrag der Grundform zeigen
            const real = items.filter(x => !x.r);
            for (const lem of refs) { const h = (await db.dictFind(candidates(lem, lang).slice(0, 1))).filter(x => !x.r && names[x.dict] !== undefined); h.forEach(x => form.push(Object.assign(x, { from: lem }))); }
            items = real.concat(form);
            if (!items.length) items = [{ dict: '', o: w, d: D.env.t('d_formOf', { a: w, b: refs[0] }), from: '' }];
        }
        const key = items.map(x => x.dict + ':' + x.w + ':' + x.d.slice(0, 20)).join('|');
        if (items.length && !seen.has(key)) { seen.add(key); groups.push({ word: w, items: items.map(x => ({ name: names[x.dict] || '', o: x.o, d: x.d, note: x.from ? D.env.t('d_formOf', { a: w, b: x.from }) : '' })) }); }
        if (groups.length && w === ws.join(' ') && ws.length > 1) break;           // Wortgruppe gefunden: reicht
    }
    return { none: false, groups, tried };
}

const isGz = async (file) => /\.gz$/i.test(file.name) || new Uint8Array(await file.slice(0, 2).arrayBuffer()).join() === '31,139';
// Textstrom einer Datei, .gz wird beim Lesen entpackt (kein Entpacken von Hand nötig)
function textStream(file, gz) {
    let st = file.stream();
    if (gz) st = st.pipeThrough(new DecompressionStream('gzip'));
    return st.pipeThrough(new TextDecoderStream());
}
async function sampleOf(file, gz) {
    if (!gz) return file.slice(0, 65536).text();
    const rd = textStream(file, true).getReader();
    let s = '';
    while (s.length < 65536) { const { value, done } = await rd.read(); if (done) break; s += value; }
    try { await rd.cancel(); } catch { /* Strom schon zu */ }
    return s;
}

async function importFile(file) {
    const db = D.env.db(), t = D.env.t;
    if (/^wikipedia/i.test(file.name) && await wikiHeinzHatWikipedia()) { const e = new Error('inWiki'); e.code = 'inWiki'; throw e; }
    const gz = await isGz(file);
    if (gz && typeof DecompressionStream === 'undefined') throw new Error('nogz');
    const fmt = detect(await sampleOf(file, gz));
    const meta = { id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: niceName(file.name, t, document.documentElement.lang), count: 0, size: file.size, added: Date.now() };
    await db.dictCreate(meta);
    let n = 0, seen = 0;
    const flush = async (batch) => { if (!batch.length) return; await db.dictAdd(meta.id, batch); n += batch.length; D.busy = t('d_busy', { n, name: meta.name }); render(); };
    try {
        if (fmt === 'json') {
            let txt = ''; const rd = textStream(file, gz).getReader();
            for (;;) { const { value, done } = await rd.read(); if (done) break; txt += value; }
            const all = parseJson(txt).filter(wanted); for (let i = 0; i < all.length; i += BATCH) await flush(all.slice(i, i + BATCH));
        } else {
            const rd = textStream(file, gz).getReader();
            let rest = '', batch = [];
            for (;;) {
                const { value, done } = await rd.read();
                rest += value || '';
                const lines = rest.split(/\r?\n/); rest = done ? '' : lines.pop();
                if (done && lines.length === 0 && rest) lines.push(rest);
                for (const l of lines) { const e = parseLine(l, fmt); seen++; if (e && wanted(e)) { batch.push(e); if (batch.length >= BATCH) { await flush(batch); batch = []; } } }
                if (done) break;
            }
            await flush(batch);
        }
    } catch (e) {
        await db.dictRemove(meta.id);
        throw e;
    }
    if (!n) { await db.dictRemove(meta.id); throw new Error('empty'); }
    return { name: meta.name, count: n };
}

async function render() {
    const my = ++D.seq;
    const box = $('dict'); box.hidden = !D.open; box.textContent = '';
    if (!D.open) return;
    const t = D.env.t, db = D.env.db();
    const head = document.createElement('div'); head.className = 'dh-fth';
    const h = document.createElement('b'); h.textContent = t('d_title0');
    const x = Object.assign(document.createElement('button'), { type: 'button', className: 'pill', textContent: t('ft_close') }); x.dataset.dc = 'close';
    head.append(h, x); box.appendChild(head);
    // Nur der neueste Aufruf zeichnet (D.seq): mehrere gleichzeitige Aufrufe (Fortschritt beim Import) verdoppelten sonst die Liste
    const list = db ? await db.dictList() : [];
    const wikiDa = list.some(istWikiKopie) && await wikiHeinzHatWikipedia();
    if (my !== D.seq) return;
    if (!list.length) { const p = document.createElement('p'); p.className = 'help'; p.textContent = t('d_empty'); box.appendChild(p); }
    list.forEach(m => {
        const r = document.createElement('div'); r.className = 'dh-dictrow';
        const s = document.createElement('span'); s.textContent = m.name + ' · ' + t('d_count', { n: m.count });
        const b = Object.assign(document.createElement('button'), { type: 'button', className: 'pill', textContent: t('d_del') }); b.dataset.dc = 'del'; b.dataset.id = m.id;
        const rn = Object.assign(document.createElement('button'), { type: 'button', className: 'pill', textContent: t('d_ren') }); rn.dataset.dc = 'ren'; rn.dataset.id = m.id; rn.dataset.name = m.name;
        r.append(s, rn, b); box.appendChild(r);
        if (istWikiKopie(m) && wikiDa) { const h = document.createElement('p'); h.className = 'help'; h.textContent = t('d_wikiMoved'); box.appendChild(h); }
    });
    if (D.busy) { const p = document.createElement('p'); p.className = 'help'; p.textContent = D.busy; box.appendChild(p); }
    else {
        const lab = document.createElement('label'); lab.className = 'pill acc dh-addbtn';
        const sp = document.createElement('span'); sp.textContent = t('d_add');
        const inp = Object.assign(document.createElement('input'), { type: 'file', id: 'file-dict', className: 'sr-only', accept: '.tsv,.csv,.txt,.json,.jsonl,.ndjson,.gz,text/*,application/json,application/gzip' });
        inp.multiple = true; lab.append(sp, inp); box.appendChild(lab);
        const p = document.createElement('p'); p.className = 'help'; p.textContent = t('d_help'); box.appendChild(p);
    }
}

export function initDict(env) {
    D.env = env;
    $('b-dict').addEventListener('click', () => { D.open = !D.open; render(); });
    $('dict').addEventListener('click', async (e) => {
        const b = e.target.closest('[data-dc]'); if (!b) return;
        if (b.dataset.dc === 'close') { D.open = false; render(); }
        else if (b.dataset.dc === 'ren') {
            const row = b.parentElement, inp = Object.assign(document.createElement('input'), { type: 'text', className: 'inp', value: b.dataset.name, maxLength: 60 });
            const ok = Object.assign(document.createElement('button'), { type: 'button', className: 'pill acc', textContent: 'OK' }); ok.dataset.dc = 'rok'; ok.dataset.id = b.dataset.id;
            row.textContent = ''; row.append(inp, ok); inp.focus(); inp.select();
        }
        else if (b.dataset.dc === 'rok') { const v = b.parentElement.querySelector('input').value.trim(); if (v) await D.env.db().dictRename(b.dataset.id, v); render(); }
        else if (b.dataset.dc === 'del') {
            if (D.busy) return;
            const t = D.env.t; let last = 0;
            D.busy = t('d_deleting', { n: 0 }); render();
            try { await D.env.db().dictRemove(b.dataset.id, (n) => { if (n - last >= 20000) { last = n; D.busy = t('d_deleting', { n }); render(); } }); }
            catch { D.env.say(t('d_delFail'), 'err'); }
            D.busy = ''; render();
        }
    });
    $('dict').addEventListener('change', async (e) => {
        if (e.target.id !== 'file-dict') return;
        const files = Array.from(e.target.files || []); e.target.value = '';
        for (const f of files) {
            try { const r = await importFile(f); D.busy = ''; env.say(env.t('d_done', { name: r.name, n: r.count }), 'ok'); }
            catch (err) { D.busy = ''; env.say(env.t(err && err.code === 'full' ? 'e_full' : err && err.code === 'inWiki' ? 'd_inWiki' : 'd_bad', { name: f.name }), 'err'); }
        }
        D.busy = ''; render();
    });
}
