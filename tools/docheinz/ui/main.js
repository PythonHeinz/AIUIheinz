/* tools/docheinz/ui/main.js – Einstieg von docHeinz: Bibliothek (Hinzufügen, Liste, Suche, Sortierung, Löschen) und Start der Leseansicht. Formatarbeit machen die Module in ../mod/. */
import { Heinz, HeinzStore, $ } from './base.js';
import { D } from './i18n.js';
import { openDb, storage, persist } from '../mod/db.js';
import { formatOf, openSource, describe, BuchFehler } from '../mod/buch.js';
import { makeRecord, signature, filterSort, percent, initial, hue } from '../mod/bibliothek.js';
import { findCover } from '../mod/cover.js';
import { scaleCover } from './bild.js';
import { isFont, DEFAULT_FONT } from '../mod/schriften.js';
import { openReader, close as closeReader, applyTheme, applySize, applyBtns, relabel, THEMES } from './leser.js';

const K = (n) => 'heinz_docheinz_' + n;
const MAX_MB = 150;
const t = (k, v) => Heinz.t(D, k, v);
const state = { db: null, books: [], q: '', sort: 'recent', size: 19, theme: 'auto', font: 'serif', btns: false, gap: true, confirm: '', msgs: [] };
const coverUrls = [];
const SORTS = ['recent', 'title', 'author', 'added', 'progress'];
const mb = (n) => (n >= 1e9 ? (n / 1e9).toFixed(1) + ' GB' : n >= 1e6 ? (n / 1e6).toFixed(n < 1e7 ? 1 : 0) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB');

function msg(lines, kind) {
    const el = $('msg');
    el.textContent = [].concat(lines).join('\n');
    el.className = 'notice dh-msg' + (kind ? ' ' + kind : '');
    el.hidden = false;
    clearTimeout(msg.t);
    msg.t = setTimeout(() => { el.hidden = true; }, 9000);
}

function applyI18n() {
    document.documentElement.lang = Heinz.lang;
    document.querySelectorAll('[data-i]').forEach(e => { e.textContent = t(e.getAttribute('data-i')); });
    document.querySelectorAll('[data-ph]').forEach(e => { e.placeholder = t(e.getAttribute('data-ph')); });
    document.querySelectorAll('[data-i-label]').forEach(e => { const s = t(e.getAttribute('data-i-label')); e.setAttribute('aria-label', s); e.title = s; });
    document.title = 'AIUIheinz · ' + t('title');
    const sel = $('sort');
    sel.textContent = '';
    SORTS.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = t('so_' + s); sel.appendChild(o); });
    sel.value = state.sort;
    relabel(t, Heinz.lang);
    render();
    storeLine();
}

// ---------- Liste ----------
function bookRow(b) {
    const row = document.createElement('div');
    row.className = 'dh-book';
    row.dataset.id = b.id;
    if (state.confirm === b.id) {
        row.classList.add('ask');
        const q = document.createElement('span');
        q.className = 'dh-ask';
        q.textContent = t('delAsk', { t: b.title });
        const no = document.createElement('button'); no.type = 'button'; no.className = 'pill'; no.textContent = t('delNo'); no.dataset.act = 'no';
        const yes = document.createElement('button'); yes.type = 'button'; yes.className = 'pill danger'; yes.textContent = t('delYes'); yes.dataset.act = 'yes';
        row.append(q, no, yes);
        return row;
    }
    const open = document.createElement('button');
    open.type = 'button'; open.className = 'dh-open'; open.dataset.act = 'open';
    const cover = document.createElement('span');
    cover.className = 'dh-cover'; cover.textContent = initial(b.title);
    cover.style.setProperty('--h', hue(b.title));
    if (b.cover instanceof Blob) {
        const img = document.createElement('img');
        img.alt = ''; img.decoding = 'async';
        const u = URL.createObjectURL(b.cover);
        coverUrls.push(u);
        img.src = u;
        cover.textContent = ''; cover.classList.add('has');
        cover.appendChild(img);
    }
    const tx = document.createElement('span'); tx.className = 'dh-tx';
    const ti = document.createElement('b'); ti.textContent = b.title;
    const au = document.createElement('small'); au.textContent = [b.author, t('fmt_' + b.format), mb(b.size)].filter(Boolean).join(' · ');
    const p = percent(b, b.ch, b.frac);
    const pr = document.createElement('small'); pr.className = 'dh-pct';
    pr.textContent = b.done || p >= 99 ? t('done') : (p > 0 || b.lastRead ? t('pct', { n: p }) : t('unread'));
    const bar = document.createElement('span'); bar.className = 'dh-bar'; const fill = document.createElement('i'); fill.style.width = (b.done ? 100 : p) + '%'; bar.appendChild(fill);
    tx.append(ti, au, pr, bar);
    open.append(cover, tx);
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'ibtn dh-del'; del.dataset.act = 'del'; del.setAttribute('aria-label', t('del') + ': ' + b.title); del.title = t('del');
    del.innerHTML = '<svg class="i"><use href="../../lib/icons.svg#i-trash"/></svg>';
    row.append(open, del);
    return row;
}

function render() {
    const list = $('list');
    list.textContent = '';
    coverUrls.splice(0).forEach(u => URL.revokeObjectURL(u));
    const shown = filterSort(state.books, state.q, state.sort);
    shown.forEach(b => list.appendChild(bookRow(b)));
    $('tools').hidden = state.books.length < 2 && !state.q;
    $('count').textContent = state.books.length ? (state.books.length === 1 ? t('count_one') : t('count_n', { n: state.books.length })) : '';
    const empty = $('empty');
    empty.hidden = shown.length > 0;
    empty.textContent = state.books.length ? t('emptyQ') : t('empty0');
}

async function storeLine() {
    const s = await storage();
    const el = $('store');
    if (s.usage == null || s.quota == null) { el.textContent = ''; return; }
    const warn = s.quota > 0 && s.usage / s.quota > 0.9;
    el.textContent = t(warn ? 'stWarn' : 'st', { u: mb(s.usage), q: mb(s.quota) });
    el.classList.toggle('dh-warn', warn);
}

async function reload() { state.books = await state.db.list(); render(); }

// ---------- Titelbild ----------
async function withCover(rec, bytes) {
    rec.coverTried = true;
    const c = await findCover(bytes);
    const blob = c ? await scaleCover(c.bytes, c.type) : null;
    if (blob) rec.cover = blob;
}
// Bücher aus Phase 1 bekommen ihr Titelbild nachträglich, einmal je Buch
async function backfillCovers() {
    for (const b of state.books.filter(x => x.format === 'epub' && !x.cover && !x.coverTried)) {
        try {
            const blob = await state.db.file(b.id);
            const patch = { coverTried: true };
            if (blob) { const c = await findCover(new Uint8Array(await blob.arrayBuffer())); const sc = c ? await scaleCover(c.bytes, c.type) : null; if (sc) patch.cover = sc; }
            Object.assign(b, patch);
            await state.db.update(b.id, patch);
        } catch { /* dieses Buch bleibt ohne Bild */ }
    }
    render();
}

// ---------- Hinzufügen ----------
async function addFiles(files) {
    files = Array.from(files || []);
    if (!files.length) return;
    const lines = [];
    let added = 0;
    persist();
    const known = new Set(state.books.map(b => b.sig));
    for (const f of files) {
        const name = f.name || 'book';
        try {
            if (f.size > MAX_MB * 1048576) { lines.push(t('e_big', { name, n: MAX_MB })); continue; }
            if (known.has(signature(name, f.size))) { lines.push(t('m_dup', { name })); continue; }
            const format = formatOf(name, f.type);
            const bytes = new Uint8Array(await f.arrayBuffer());
            const src = await openSource(bytes, format, name);
            const { lens } = await describe(src);
            const rec = makeRecord(src, { name, size: f.size, lens });
            if (format === 'epub') await withCover(rec, bytes);
            await state.db.put(rec, new Blob([bytes], { type: f.type || 'application/octet-stream' }));
            known.add(rec.sig);
            added++;
        } catch (e) {
            if (e instanceof BuchFehler) lines.push(t('e_' + e.code, { name, ext: e.detail }));
            else if (e && e.code === 'full') lines.push(t('e_full', { name }));
            else lines.push(t('e_unreadable', { name }));
        }
    }
    await reload();
    storeLine();
    if (added) lines.unshift(t('m_added', { n: added }));
    else if (!lines.length) lines.push(t('m_none'));
    msg(lines, added && lines.length === 1 ? 'ok' : (added ? 'warn' : 'err'));
}

// ---------- Öffnen ----------
async function openBook(id) {
    const rec = state.books.find(b => b.id === id);
    if (!rec) return;
    try {
        const blob = await state.db.file(id);
        if (!blob) throw new Error('file');
        const src = await openSource(new Uint8Array(await blob.arrayBuffer()), rec.format, rec.name);
        await state.db.update(id, { lastRead: Date.now() });
        rec.lastRead = Date.now();
        await openReader(rec, src, {
            t, lang: () => Heinz.lang, cover: rec.cover instanceof Blob ? rec.cover : null, size: state.size, theme: state.theme, font: state.font, btns: state.btns, gap: state.gap,
            onProgress: async ({ ch, frac, pct }) => { Object.assign(rec, { ch, frac, done: pct >= 99 || rec.done && pct >= 95 }); try { await state.db.update(id, { ch, frac, done: rec.done }); } catch { /* Fortschritt ist nicht kritisch */ } },
            onSettings: (p) => { if (p.size) { state.size = p.size; HeinzStore.set(K('size'), p.size); } if (p.theme) { state.theme = p.theme; HeinzStore.set(K('theme'), p.theme); } if (p.font) { state.font = p.font; HeinzStore.set(K('font'), p.font); } if ('gap' in p) { state.gap = p.gap; HeinzStore.set(K('gap'), p.gap ? 1 : 0); } if ('btns' in p) { state.btns = p.btns; HeinzStore.set(K('btns'), p.btns ? 1 : 0); } },
            onClose: () => { render(); },
        });
    } catch (e) {
        closeReader();
        msg(t('e_open'), 'err');
    }
}

async function remove(id) {
    await state.db.remove(id);
    state.confirm = '';
    await reload();
    storeLine();
    msg(t('m_deleted'), 'ok');
}

async function start() {
    await HeinzStore.open();
    state.sort = SORTS.includes(HeinzStore.get(K('sort'))) ? HeinzStore.get(K('sort')) : 'recent';
    const sz = +HeinzStore.get(K('size'), 19); state.size = sz >= 14 && sz <= 34 ? sz : 19;
    state.theme = THEMES.includes(HeinzStore.get(K('theme'))) ? HeinzStore.get(K('theme')) : 'auto';
    state.font = isFont(HeinzStore.get(K('font'))) ? HeinzStore.get(K('font')) : DEFAULT_FONT;
    state.btns = +HeinzStore.get(K('btns'), 0) === 1;
    state.gap = +HeinzStore.get(K('gap'), 1) !== 0;
    Heinz.header({ sub: { en: D.en.sub, de: D.de.sub }, back: '/' });
    Heinz.onLang(applyI18n);
    applyTheme(state.theme);
    applyI18n();
    Heinz.enhanceSelects('select.sel');

    $('file').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
    $('q').addEventListener('input', (e) => { state.q = e.target.value; render(); });
    $('sort').addEventListener('change', (e) => { state.sort = e.target.value; HeinzStore.set(K('sort'), state.sort); render(); });
    $('list').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-act]');
        const row = e.target.closest('.dh-book');
        if (!btn || !row) return;
        const id = row.dataset.id;
        if (btn.dataset.act === 'open') openBook(id);
        else if (btn.dataset.act === 'del') { state.confirm = id; render(); }
        else if (btn.dataset.act === 'no') { state.confirm = ''; render(); }
        else if (btn.dataset.act === 'yes') remove(id);
    });
    document.addEventListener('dragover', (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) { e.preventDefault(); document.body.classList.add('dh-drop'); } });
    document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('dh-drop'); });
    document.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); document.body.classList.remove('dh-drop'); addFiles(e.dataTransfer.files); } });

    try { state.db = await openDb(); await reload(); }
    catch { msg(t('e_idb'), 'err'); $('b-add').setAttribute('aria-disabled', 'true'); $('file').disabled = true; }
    document.documentElement.setAttribute('data-dh', 'ready');
    if (state.db) backfillCovers();
}

start();
