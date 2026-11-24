/* tools/docheinz/ui/woerterbuch.js – Wörterbücher: Verwaltung in der Bibliothek (Import, Liste, Löschen) und Nachschlagen für den Leser.
 *   initDict({ db(), t, say(text, art) })   verdrahtet Knopf #b-dict und Feld #dict der Bibliothek
 *   lookup(auswahl, sprache) -> Promise<{ none, groups: [{ word, items: [{ name, o, d }] }], tried }>   (none: kein Wörterbuch eingelesen)
 * Alles bleibt auf dem Gerät (IndexedDB, Stores dict und dictmeta). */
import { $ } from './base.js';
import { detect, parseLine, parseJson, candidates, keyOf, words } from '../mod/woerterbuch.js';

const D = { env: null, open: false, busy: '' };
const BATCH = 4000;

export async function lookup(sel, lang) {
    const db = D.env && D.env.db();
    const metas = db ? await db.dictList() : [];
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
            const hits = await db.dictFind([c]);
            if (hits.length) { items = hits; break; }
        }
        const key = items.map(x => x.dict + ':' + x.w + ':' + x.d.slice(0, 20)).join('|');
        if (items.length && !seen.has(key)) { seen.add(key); groups.push({ word: w, items: items.map(x => ({ name: names[x.dict] || '', o: x.o, d: x.d })) }); }
        if (groups.length && w === ws.join(' ') && ws.length > 1) break;           // Wortgruppe gefunden: reicht
    }
    return { none: false, groups, tried };
}

async function importFile(file) {
    const db = D.env.db(), t = D.env.t;
    const sample = await file.slice(0, 65536).text(), fmt = detect(sample);
    const meta = { id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: file.name.replace(/\.[^.]+$/, '') || file.name, count: 0, size: file.size, added: Date.now() };
    await db.dictCreate(meta);
    let n = 0;
    const flush = async (batch) => { if (!batch.length) return; await db.dictAdd(meta.id, batch); n += batch.length; D.busy = t('d_busy', { n, name: meta.name }); render(); };
    try {
        if (fmt === 'json') { const all = parseJson(await file.text()); for (let i = 0; i < all.length; i += BATCH) await flush(all.slice(i, i + BATCH)); }
        else {
            const rd = file.stream().pipeThrough(new TextDecoderStream()).getReader();
            let rest = '', batch = [];
            for (;;) {
                const { value, done } = await rd.read();
                rest += value || '';
                const lines = rest.split(/\r?\n/); rest = done ? '' : lines.pop();
                if (done && lines.length === 0 && rest) lines.push(rest);
                for (const l of lines) { const e = parseLine(l, fmt); if (e) { batch.push(e); if (batch.length >= BATCH) { await flush(batch); batch = []; } } }
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
    const box = $('dict'); box.hidden = !D.open; box.textContent = '';
    if (!D.open) return;
    const t = D.env.t, db = D.env.db();
    const head = document.createElement('div'); head.className = 'dh-fth';
    const h = document.createElement('b'); h.textContent = t('d_title0');
    const x = Object.assign(document.createElement('button'), { type: 'button', className: 'pill', textContent: t('ft_close') }); x.dataset.dc = 'close';
    head.append(h, x); box.appendChild(head);
    const list = db ? await db.dictList() : [];
    if (!list.length) { const p = document.createElement('p'); p.className = 'help'; p.textContent = t('d_empty'); box.appendChild(p); }
    list.forEach(m => {
        const r = document.createElement('div'); r.className = 'dh-dictrow';
        const s = document.createElement('span'); s.textContent = m.name + ' · ' + t('d_count', { n: m.count });
        const b = Object.assign(document.createElement('button'), { type: 'button', className: 'pill', textContent: t('d_del') }); b.dataset.dc = 'del'; b.dataset.id = m.id;
        r.append(s, b); box.appendChild(r);
    });
    if (D.busy) { const p = document.createElement('p'); p.className = 'help'; p.textContent = D.busy; box.appendChild(p); }
    else {
        const lab = document.createElement('label'); lab.className = 'pill acc dh-addbtn';
        const sp = document.createElement('span'); sp.textContent = t('d_add');
        const inp = Object.assign(document.createElement('input'), { type: 'file', id: 'file-dict', className: 'sr-only', accept: '.tsv,.csv,.txt,.json,.jsonl,.ndjson,text/*,application/json' });
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
        else if (b.dataset.dc === 'del') { await D.env.db().dictRemove(b.dataset.id); render(); }
    });
    $('dict').addEventListener('change', async (e) => {
        if (e.target.id !== 'file-dict') return;
        const files = Array.from(e.target.files || []); e.target.value = '';
        for (const f of files) {
            try { const r = await importFile(f); D.busy = ''; env.say(env.t('d_done', { name: r.name, n: r.count }), 'ok'); }
            catch (err) { D.busy = ''; env.say(env.t(err && err.code === 'full' ? 'e_full' : 'd_bad', { name: f.name }), 'err'); }
        }
        D.busy = ''; render();
    });
}
