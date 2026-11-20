/* tools/docheinz/ui/main.js – Einstieg von docHeinz: Bibliothek (Hinzufügen, Liste, Suche, Sortierung, Löschen) und Start der Leseansicht. Formatarbeit machen die Module in ../mod/. */
import { Heinz, HeinzStore, $ } from './base.js';
import { D } from './i18n.js';
import { openDb, storage, persist } from '../mod/db.js';
import { formatOf, openSource, describe, BuchFehler } from '../mod/buch.js';
import { makeRecord, signature, filterSort, percent, initial } from '../mod/bibliothek.js';
import { findCover } from '../mod/cover.js';
import { scaleCover, photoToPage, enhanceForOcr } from './bild.js';
import { imagesToPdf, readPhotoPages } from '../mod/bilder-pdf.js';
import { openCamera, cameraSupported } from './kamera.js';
import { isFont, DEFAULT_FONT } from '../mod/schriften.js';
import { exportBook, FORMATS } from '../mod/exportieren.js';
import { LANGS, makeRecognizer } from '../mod/ocr.js';
import { COLORS } from '../mod/markierung.js';
import { openReader, close as closeReader, applyTheme, applySize, applyBtns, relabel, THEMES } from './leser.js';

const K = (n) => 'heinz_docheinz_' + n;
const MAX_MB = 150;
const t = (k, v) => Heinz.t(D, k, v);
const state = { db: null, books: [], q: '', sort: 'recent', ocrAsk: '', photoAsk: '', addTo: '', ocrLang: '', ocrJob: null, size: 19, theme: 'auto', font: 'serif', btns: false, gap: false, look: {}, bookLook: {}, profiles: [], confirm: '', msgs: [], exp: '', expFmt: 'epub', expNotes: false };
const coverUrls = [];
const SORTS = ['recent', 'title', 'author', 'added', 'progress'];
const mb = (n) => (n >= 1e9 ? (n / 1e9).toFixed(1) + ' GB' : n >= 1e6 ? (n / 1e6).toFixed(n < 1e7 ? 1 : 0) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB');

function msg(lines, kind) {
    const el = $('msg');
    el.textContent = [].concat(lines).join('\n');
    el.className = 'notice dh-msg' + (kind ? ' ' + kind : '');
    el.hidden = false;
    clearTimeout(msg.t);
    msg.t = setTimeout(() => { el.hidden = true; }, kind === 'ok' ? 9000 : 60000);
    el.onclick = () => { el.hidden = true; };
    el.scrollIntoView({ block: 'nearest' });
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
    row.className = 'row dh-book';
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
    if (state.exp === b.id) return exportRow(b, row);
    if (state.ocrAsk === b.id) return ocrRow(b, row);
    if (state.photoAsk === b.id) return photoRow(b, row);
    const open = document.createElement('button');
    open.type = 'button'; open.className = 'dh-open'; open.dataset.act = 'open';
    const cover = document.createElement('span');
    cover.className = 'tile dh-cover'; cover.textContent = initial(b.title);
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
    const au = document.createElement('small'); au.className = 'dh-meta';
    const mt = document.createElement('span'); mt.textContent = [b.author, t('fmt_' + b.format), mb(b.size)].filter(Boolean).join(' · ');
    const p = percent(b, b.ch, b.frac);
    const pr = document.createElement('span'); pr.className = 'dh-pct';
    const job = state.ocrJob && state.ocrJob.id === b.id ? state.ocrJob : null;
    const need = b.ocrTotal && (b.ocr || []).length < b.ocrTotal;
    pr.textContent = job ? t('o_run', { i: job.i, n: b.ocrTotal }) : need ? t('o_part', { i: (b.ocr || []).length, n: b.ocrTotal }) : b.done || p >= 99 ? t('done') : (p > 0 || b.lastRead ? t('pct', { n: p }) : t('unread'));
    au.append(mt, pr);
    tx.append(ti, au);
    if (b.done || p > 0) { const bar = document.createElement('span'); bar.className = 'dh-bar'; const fill = document.createElement('i'); fill.style.width = (b.done ? 100 : p) + '%'; bar.appendChild(fill); tx.appendChild(bar); }   // kein leerer Balken bei 0 %
    open.append(cover, tx);
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'ibtn dh-del'; del.dataset.act = 'del'; del.setAttribute('aria-label', t('del') + ': ' + b.title); del.title = t('del');
    del.innerHTML = '<svg class="i"><use href="../../lib/icons.svg#i-trash"/></svg>';
    const ex = document.createElement('button');
    ex.type = 'button'; ex.className = 'ibtn dh-exp'; ex.dataset.act = 'exp'; ex.setAttribute('aria-label', t('x_export') + ': ' + b.title); ex.title = t('x_export');
    ex.innerHTML = '<svg class="i"><use href="../../lib/icons.svg#i-download"/></svg>';
    const extra = [];
    if (need || job) {
        const oc = document.createElement('button');
        oc.type = 'button'; oc.className = 'pill acc dh-ocr'; oc.dataset.act = job ? 'ocrstop' : 'ocr'; oc.textContent = job ? '■' : 'OCR';
        oc.setAttribute('aria-label', (job ? t('o_stop') : t('o_start')) + ': ' + b.title); oc.title = job ? t('o_stop') : t('o_start');
        extra.push(oc);
    }
    if (b.photo && !job) {
        const pa = document.createElement('button');
        pa.type = 'button'; pa.className = 'pill dh-ocr'; pa.dataset.act = 'padd'; pa.textContent = '+ ' + t('p_page');
        pa.setAttribute('aria-label', t('p_addTitle', { t: b.title })); pa.title = t('p_addTitle', { t: b.title });
        extra.push(pa);
    }
    row.append(open, ...extra, ex, del);
    return row;
}

// ---------- Seiten zu einem Foto-Buch hinzufügen ----------
function photoRow(b, row) {
    row.classList.add('exp');
    const h = document.createElement('b'); h.className = 'dh-xh'; h.textContent = t('p_addTitle', { t: b.title });
    const hp = document.createElement('p'); hp.className = 'help'; hp.textContent = t('p_addHelp', { n: b.ocrTotal });
    const bt = document.createElement('div'); bt.className = 'dh-xb';
    const no = Object.assign(document.createElement('button'), { type: 'button', className: 'pill', textContent: t('delNo') }); no.dataset.act = 'pno';
    const gal = Object.assign(document.createElement('button'), { type: 'button', className: 'pill', textContent: t('p_gallery') }); gal.dataset.act = 'pgal';
    const cam = Object.assign(document.createElement('button'), { type: 'button', className: 'pill acc', id: 'p-cam', textContent: t('p_camera') }); cam.dataset.act = 'pcam';
    bt.append(no, gal, cam); row.append(h, hp, bt);
    return row;
}
async function appendPhotos(id, files) {
    files = byTime(files || []);
    if (!files.length) return;
    try {
        const add = [];
        for (let i = 0; i < files.length; i++) { msg(t('p_reading', { i: i + 1, n: files.length }), 'ok'); add.push(await photoToPage(files[i])); }
        await appendPages(id, add);
    } catch { msg(t('p_err'), 'err'); }
}
async function appendPages(id, add) {
    const rec = state.books.find(b => b.id === id);
    if (!rec || !add.length) return;
    try {
        const blob = await state.db.file(id);
        const old = readPhotoPages(new Uint8Array(await blob.arrayBuffer()));
        const pdf = imagesToPdf([...old, ...add]);
        const src = await openSource(pdf, 'pdf', rec.name, { ocr: rec.ocr || [] });
        const { lens } = await describe(src);
        Object.assign(rec, { size: pdf.length, sig: signature(rec.name, pdf.length), ocrTotal: old.length + add.length, chapters: src.chapters.length, toc: src.toc.map(x => ({ title: x.title, href: x.href, level: x.level })), lens });
        await state.db.put(rec, new Blob([pdf], { type: 'application/pdf' }));
        state.photoAsk = ''; state.ocrAsk = id;
        await reload();
        msg(t('p_added', { n: add.length }), 'ok');
    } catch { msg(t('p_err'), 'err'); }
}

// ---------- Texterkennung (OCR) ----------
function ocrRow(b, row) {
    row.classList.add('exp');
    const h = document.createElement('b'); h.className = 'dh-xh'; h.textContent = t('o_head', { t: b.title });
    const sel = document.createElement('select'); sel.className = 'sel'; sel.id = 'o-lang'; sel.setAttribute('aria-label', t('o_lang'));
    LANGS.forEach(l => sel.appendChild(Object.assign(document.createElement('option'), { value: l, textContent: t('o_l_' + l.replace('+', '_')) })));
    sel.value = state.ocrLang || (Heinz.lang === 'de' ? 'deu' : 'eng');
    const hp = document.createElement('p'); hp.className = 'help'; hp.textContent = t('o_help', { i: (b.ocr || []).length, n: b.ocrTotal });
    const bt = document.createElement('div'); bt.className = 'dh-xb';
    const no = Object.assign(document.createElement('button'), { type: 'button', className: 'pill', textContent: t('delNo') }); no.dataset.act = 'ocrno';
    const go = Object.assign(document.createElement('button'), { type: 'button', className: 'pill acc', id: 'o-go', textContent: t('o_go') }); go.dataset.act = 'ocrgo';
    bt.append(no, go); row.append(h, sel, hp, bt);
    return row;
}
async function runOcr(id, lang) {
    const rec = state.books.find(b => b.id === id);
    if (!rec || state.ocrJob) return;
    const job = { id, i: (rec.ocr || []).length, stop: false };
    state.ocrJob = job; state.ocrAsk = ''; state.ocrLang = lang; render();
    let lock = null, rz = null;
    try {
        try { lock = navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch { /* ohne Bildschirmsperre */ }
        msg(t('o_loading'), 'ok');
        const blob = await state.db.file(id);
        const src = await openSource(new Uint8Array(await blob.arrayBuffer()), 'pdf', rec.name, { ocr: rec.ocr || [] });
        rz = await makeRecognizer(lang);
        const canvas = document.createElement('canvas');
        for (let p = (rec.ocr || []).length + 1; p <= rec.ocrTotal && !job.stop; p++) {
            job.i = p; msg(t('o_page', { i: p, n: rec.ocrTotal }), 'ok'); render();
            await src.pdf.render(p, canvas, 1800, 1).done;
            if (rec.photo) enhanceForOcr(canvas);
            const text = await rz.recognize(canvas);
            rec.ocr = (rec.ocr || []).concat([text.trim() ? text : ' ']);
            await state.db.update(id, { ocr: rec.ocr });
        }
        canvas.width = canvas.height = 1;
        const done = rec.ocr.length >= rec.ocrTotal;
        if (done || job.stop) {
            const s2 = await openSource(new Uint8Array(await blob.arrayBuffer()), 'pdf', rec.name, { ocr: rec.ocr });
            const { lens } = await describe(s2);
            rec.lens = lens; await state.db.update(id, { lens });
        }
        msg(done ? t('o_done', { name: rec.title }) : t('o_paused', { i: rec.ocr.length, n: rec.ocrTotal }), done ? 'ok' : 'warn');
    } catch (e) {
        msg(t('o_err'), 'err');
    } finally {
        if (rz) { try { rz.end(); } catch { /* beendet */ } }
        if (lock) { try { lock.release(); } catch { /* freigegeben */ } }
        state.ocrJob = null; render();
    }
}

// ---------- Export ----------
function exportRow(b, row) {
    row.classList.add('exp');
    const h = document.createElement('b'); h.className = 'dh-xh'; h.textContent = t('x_export') + ': ' + b.title;
    const sel = document.createElement('select'); sel.className = 'sel'; sel.id = 'x-fmt'; sel.setAttribute('aria-label', t('x_fmt'));
    FORMATS.forEach(f => sel.appendChild(Object.assign(document.createElement('option'), { value: f.id, textContent: t('x_f_' + f.id) })));
    sel.value = state.expFmt;
    row.append(h, sel);
    const n = (b.marks || []).length;
    if (n) {
        const lab = document.createElement('label'); lab.className = 'row dh-xs';
        lab.innerHTML = '<span class="tx"><b></b><small></small></span><span class="sw"><input type="checkbox" id="x-notes"><i></i></span>';
        lab.querySelector('b').textContent = t('x_notes'); lab.querySelector('small').textContent = t('x_notesS', { n });
        lab.querySelector('input').checked = state.expNotes;
        row.appendChild(lab);
    }
    const bt = document.createElement('div'); bt.className = 'dh-xb';
    const no = Object.assign(document.createElement('button'), { type: 'button', className: 'pill', textContent: t('delNo') }); no.dataset.act = 'xno';
    const go = Object.assign(document.createElement('button'), { type: 'button', className: 'pill acc', id: 'x-go', textContent: t('x_go') }); go.dataset.act = 'xgo';
    bt.append(no, go); row.appendChild(bt);
    return row;
}
function saveFile(blob, name) {
    const a = document.createElement('a'), u = URL.createObjectURL(blob);
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 8000);
}
function printHtml(html) {
    const f = document.createElement('iframe');
    f.className = 'dh-printframe'; f.setAttribute('aria-hidden', 'true'); f.srcdoc = html;
    f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { /* ohne Druckdialog */ } setTimeout(() => f.remove(), 120000); };
    document.body.appendChild(f);
}
async function runExport(id) {
    const rec = state.books.find(x => x.id === id);
    if (!rec) return;
    const fmt = state.expFmt, notes = state.expNotes && (rec.marks || []).length ? rec.marks : null;
    state.exp = ''; render();
    msg(t('x_working'), 'ok');
    try {
        const blob = await state.db.file(id);
        if (!blob) throw new Error('file');
        const src = await openSource(new Uint8Array(await blob.arrayBuffer()), rec.format, rec.name, rec.ocrTotal ? { ocr: rec.ocr || [] } : {});
        const labels = { color: COLORS.map(c => t('mk_' + c)), note: t('m_noteL'), ai: t('mk_ai'), count: t('m_count'), part: t('r_part', { n: '{n}' }), pageNote: t('mk_pn'), section: t('x_notesH') };
        const out = await exportBook(src, rec, fmt, { notes, labels, language: Heinz.lang });
        if (out.kind === 'print') { printHtml(out.html); msg(t('x_pdf'), 'ok'); return; }
        saveFile(new Blob([out.bytes || out.text], { type: out.mime }), out.name);
        msg(t('x_done', { f: out.name }), 'ok');
    } catch (e) {
        msg(t('x_err'), 'err');
    }
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
// Reihenfolge von Fotos: nach Aufnahmezeit (Dateinamen der Galerie sind nicht chronologisch); ohne Zeitangaben bleibt die Auswahlreihenfolge
function byTime(list) {
    const l = Array.from(list);
    return l.every(f => f.lastModified > 0) ? l.map((f, i) => [f, i]).sort((a, b) => a[0].lastModified - b[0].lastModified || a[1] - b[1]).map(x => x[0]) : l;
}
function makePhotoFile(pages) {
    const d = new Date(), z = n => String(n).padStart(2, '0');
    const name = t('p_name') + ' ' + d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + ' ' + z(d.getHours()) + z(d.getMinutes()) + '.pdf';
    return new File([imagesToPdf(pages)], name, { type: 'application/pdf' });
}
async function addFiles(files, pre) {
    files = Array.from(files || []);
    let photoName = '';
    if (pre && pre.length) { const pf = makePhotoFile(pre); photoName = pf.name; files = [pf]; }
    if (!files.length) return;
    const lines = [];
    // Fotos von Buchseiten: alle Bilder dieser Auswahl werden ein Buch (Bilder -> PDF -> Texterkennung)
    const isImg = f => /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|bmp|gif|heic|heif)$/i.test(f.name || '');
    const imgs = byTime(files.filter(isImg));
    if (imgs.length) {
        files = files.filter(f => !isImg(f));
        try {
            const pages = [];
            for (let i = 0; i < imgs.length; i++) { msg(t('p_reading', { i: i + 1, n: imgs.length }), 'ok'); pages.push(await photoToPage(imgs[i])); }
            const pf = makePhotoFile(pages); photoName = pf.name; files.unshift(pf);
        } catch { lines.push(t('p_err')); }
    }
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
            msg(t('m_reading', { name }), 'ok');
            let src, scan = false;
            try { src = await openSource(bytes, format, name); }
            catch (e) { if (e instanceof BuchFehler && e.code === 'scanned') { src = await openSource(bytes, format, name, { ocr: [] }); scan = true; } else throw e; }
            const { lens } = await describe(src, (i, n) => { if (n > 1) msg(t('m_reading', { name }) + ' ' + Math.round(100 * i / n) + ' %', 'ok'); });
            const rec = makeRecord(src, { name, size: f.size, lens });
            if (scan) { rec.ocr = []; rec.ocrTotal = src.pages; if (name === photoName) { rec.photo = true; rec.title = name.replace(/\.pdf$/, ''); } else lines.push(t('o_scanAdded', { name })); }
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
    if (photoName) { const pb = state.books.find(b => b.name === photoName); if (pb && pb.ocrTotal) { state.ocrAsk = pb.id; state.confirm = ''; state.exp = ''; render(); } }
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
        const src = await openSource(new Uint8Array(await blob.arrayBuffer()), rec.format, rec.name, rec.ocrTotal ? { ocr: rec.ocr || [] } : {});
        await state.db.update(id, { lastRead: Date.now() });
        rec.lastRead = Date.now();
        await openReader(rec, src, {
            t, lang: () => Heinz.lang, cover: rec.cover instanceof Blob ? rec.cover : null, size: state.size, theme: state.theme, font: state.font, look: state.look, bookLook: state.bookLook[id] || null, profiles: state.profiles, btns: state.btns, gap: state.gap,
            onLook: ({ global, book }) => {
                state.size = global.size; state.theme = global.theme; state.font = global.font;
                HeinzStore.set(K('size'), global.size); HeinzStore.set(K('theme'), global.theme); HeinzStore.set(K('font'), global.font);
                state.look = Object.fromEntries(Object.entries(global).filter(([k]) => !['size', 'theme', 'font'].includes(k))); HeinzStore.set(K('look'), state.look);
                if (book) state.bookLook[id] = book; else delete state.bookLook[id];
                HeinzStore.set(K('booklook'), state.bookLook);
            },
            onProfiles: (list) => { state.profiles = list; HeinzStore.set(K('profiles'), list); },
            marks: rec.marks || [],
            onMarks: async (list) => { rec.marks = list; try { await state.db.update(id, { marks: list }); } catch { /* Markierungen bleiben im Speicher, bis der Reader schließt */ } },
            onProgress: async ({ ch, frac, pct }) => { Object.assign(rec, { ch, frac, done: pct >= 99 || rec.done && pct >= 95 }); try { await state.db.update(id, { ch, frac, done: rec.done }); } catch { /* Fortschritt ist nicht kritisch */ } },
            onSettings: (p) => { if (p.size) { state.size = p.size; HeinzStore.set(K('size'), p.size); } if (p.theme) { state.theme = p.theme; HeinzStore.set(K('theme'), p.theme); } if (p.font) { state.font = p.font; HeinzStore.set(K('font'), p.font); } if ('gap' in p) { state.gap = p.gap; HeinzStore.set(K('gap'), p.gap ? 1 : 0); } if ('btns' in p) { state.btns = p.btns; HeinzStore.set(K('btns'), p.btns ? 1 : 0); } },
            onClose: () => { render(); },
        });
    } catch (e) {
        console.error('open', e && e.message);
        closeReader();
        msg(t('e_open'), 'err');
    }
}

async function remove(id) {
    await state.db.remove(id);
    if (state.bookLook[id]) { delete state.bookLook[id]; HeinzStore.set(K('booklook'), state.bookLook); }
    state.confirm = '';
    await reload();
    storeLine();
    msg(t('m_deleted'), 'ok');
}

async function start() {
    await HeinzStore.open();
    state.sort = SORTS.includes(HeinzStore.get(K('sort'))) ? HeinzStore.get(K('sort')) : 'recent';
    const sz = +HeinzStore.get(K('size'), 19); state.size = sz >= 10 && sz <= 60 ? sz : 19;
    state.look = HeinzStore.get(K('look'), {}) || {}; state.bookLook = HeinzStore.get(K('booklook'), {}) || {}; state.profiles = HeinzStore.get(K('profiles'), []) || [];
    state.theme = THEMES.includes(HeinzStore.get(K('theme'))) ? HeinzStore.get(K('theme')) : 'auto';
    state.font = isFont(HeinzStore.get(K('font'))) ? HeinzStore.get(K('font')) : DEFAULT_FONT;
    state.btns = +HeinzStore.get(K('btns'), 0) === 1;
    state.gap = +HeinzStore.get(K('gap'), 0) === 1;
    Heinz.header({ sub: { en: D.en.sub, de: D.de.sub }, back: '/' });
    Heinz.onLang(applyI18n);
    applyTheme(state.theme);
    applyI18n();
    Heinz.enhanceSelects('select.sel');

    $('file').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
    $('file-cam').addEventListener('change', (e) => { appendPhotos(state.addTo, e.target.files); e.target.value = ''; });
    $('file-pg').addEventListener('change', (e) => { appendPhotos(state.addTo, e.target.files); e.target.value = ''; });
    if (cameraSupported()) { $('b-cam').hidden = false; $('b-cam').addEventListener('click', () => openCamera({ t, onDone: (pg) => addFiles([], pg), onCancel: () => {}, onError: () => msg(t('k_denied'), 'warn') })); }
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
        else if (btn.dataset.act === 'exp') { state.exp = id; state.confirm = ''; render(); }
        else if (btn.dataset.act === 'xno') { state.exp = ''; render(); }
        else if (btn.dataset.act === 'xgo') runExport(id);
        else if (btn.dataset.act === 'padd') { state.photoAsk = id; state.confirm = ''; state.exp = ''; state.ocrAsk = ''; render(); }
        else if (btn.dataset.act === 'pno') { state.photoAsk = ''; render(); }
        else if (btn.dataset.act === 'pcam') { state.addTo = id; if (cameraSupported()) openCamera({ t, onDone: (pg) => appendPages(id, pg), onCancel: () => {}, onError: () => $('file-cam').click() }); else $('file-cam').click(); }
        else if (btn.dataset.act === 'pgal') { state.addTo = id; $('file-pg').click(); }
        else if (btn.dataset.act === 'ocr') { state.ocrAsk = id; state.confirm = ''; state.exp = ''; render(); }
        else if (btn.dataset.act === 'ocrno') { state.ocrAsk = ''; render(); }
        else if (btn.dataset.act === 'ocrgo') runOcr(id, document.getElementById('o-lang').value);
        else if (btn.dataset.act === 'ocrstop' && state.ocrJob) { state.ocrJob.stop = true; msg(t('o_stopping'), 'ok'); }
    });
    $('list').addEventListener('change', (e) => {
        if (e.target.id === 'x-fmt') state.expFmt = e.target.value;
        else if (e.target.id === 'x-notes') state.expNotes = e.target.checked;
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
