/* tools/docheinz/ui/auswahl.js – Markierungsleiste der Leseansicht: Suchen im Buch, Erklären und Zusammenfassen über das aktive Modell des Dashboards.
 * Sprachmodelle nur über lib/providers.js (HeinzProviders, docs/LOKALE_MODELLE.md): activeModel, runtime, prepare, chat. Nichts wird dort geändert.
 * Es geht nur der markierte Abschnitt (und Buchtitel/Autor) an das Modell; Cloud-Anbieter nur mit „Online erlauben“. */
import { $, HeinzStore } from './base.js';
import { HeinzProviders as PV } from '../../../lib/providers.js';
import { findAll, normalizeQuery } from '../mod/suche.js';
import { buildRequest, trimHistory, MAX_CHARS, CHAPTER_MAX_ONLINE } from '../mod/ki.js';
import { wordBounds } from '../mod/wahl.js';
import { mdToHtml } from '../mod/markdown.js';
import { lookup } from './woerterbuch.js';
import { shortDef } from '../mod/woerterbuch.js';
import { wikiOn, wikiLookup } from './wikipedia.js';
import { HeinzWissen } from './base.js';
import { sauber } from '../mod/sauber.js';
import { makeMark, cleanMarks, addMark, updateMark, removeMark, markAt, relocate, sortMarks, toMarkdown, COLORS, MAX_MARKS, MAX_MARK_TAGS } from '../mod/markierung.js';
import { parseTags } from '../mod/bibliothek.js';

const MAX_QUERY = 80;
const AI_KEY = 'heinz_docheinz_ai';
const A = { conv: null, anaOpen: false, anaPushed: false, skipPop: false, anaAc: null, anaRun: 0, env: null, text: '', range: null, drag: null, lp: 0, sup: false, pressing: false, anchor: null, px: 0, py: 0, pid: 0, timer: 0, ac: null, cache: new Map(), run: 0, wired: false, marks: [], mk: null, off: null, onlyNotes: false };

// ---------- Eigene Auswahl ----------
// Die native Auswahl ist im Lesetext abgeschaltet (Chrome blendet dort Menü und Suchfeld ein). Langer Druck markiert ein Wort, zwei Griffe ziehen die Markierung auf;
// gezeichnet wird mit der CSS-Highlight-API, die Aktionsleiste sitzt an der Markierung. Reichweite: nur die sichtbare Seite.
const LONG_MS = 450, MOVE_PX = 10, HANDLE_DY = 20;
const body = () => $('r-body');
const hl = (on) => { try { if (window.CSS && CSS.highlights) { if (on) CSS.highlights.set('dh-sel', new Highlight(A.range)); else CSS.highlights.delete('dh-sel'); } } catch { /* ohne Hervorhebung */ } };
function caretAt(x, y) {
    let n = null, o = 0;
    if (document.caretPositionFromPoint) { const c = document.caretPositionFromPoint(x, y); if (c) { n = c.offsetNode; o = c.offset; } }
    else if (document.caretRangeFromPoint) { const c = document.caretRangeFromPoint(x, y); if (c) { n = c.startContainer; o = c.startOffset; } }
    if (!n || n.nodeType !== 3 || !body().contains(n)) return null;
    return { node: n, off: o };
}
function wordAt(x, y) {
    const c = caretAt(x, y);
    if (!c) return null;
    const w = wordBounds(c.node.nodeValue, c.off);
    if (!w) return null;
    const r = document.createRange(); r.setStart(c.node, w[0]); r.setEnd(c.node, w[1]);
    return r;
}
const before = (an, ao, bn, bo) => { const r = document.createRange(); r.setStart(an, ao); r.setEnd(an, ao); const q = document.createRange(); q.setStart(bn, bo); q.setEnd(bn, bo); return r.compareBoundaryPoints(Range.START_TO_START, q) <= 0; };
function rangeOf(sn, so, en, eo) {
    const r = document.createRange();
    if (before(sn, so, en, eo)) { r.setStart(sn, so); r.setEnd(en, eo); } else { r.setStart(en, eo); r.setEnd(sn, so); }
    return r;
}
function rects() { return Array.from(A.range.getClientRects()).filter(r => r.width > 0 && r.height > 0); }
function selectedText() { return A.range ? A.range.toString().replace(/\s+/g, ' ').trim() : ''; }
export const hasWahl = () => !!A.range;
export function clearWahl() {
    hideMk();
    A.range = null; A.text = ''; A.drag = null; clearTimeout(A.lp);
    hl(false);
    ['r-sel', 'r-h1', 'r-h2'].forEach(id => { const e = $(id); if (e) e.hidden = true; });
}
function placeUi(showBar) {
    const rs = A.range ? rects() : [];
    if (!rs.length) { clearWahl(); return; }
    const first = rs[0], last = rs[rs.length - 1];
    const h1 = $('r-h1'), h2 = $('r-h2');
    h1.hidden = h2.hidden = false;
    h1.style.left = first.left + 'px'; h1.style.top = first.bottom + 'px';
    h2.style.left = last.right + 'px'; h2.style.top = last.bottom + 'px';
    const bar = $('r-sel');
    bar.hidden = !showBar;
    if (!showBar) return;
    A.text = selectedText(); A.off = selOffsets();
    bar.querySelector('[data-sel=search]').hidden = A.text.length > MAX_QUERY;
    const bw = bar.offsetWidth || 260, bh = bar.offsetHeight || 48, top0 = 64 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0);
    let y = first.top - bh - 12;
    if (y < top0) y = last.bottom + 40;                                   // oben kein Platz: unter die Markierung samt Griffen
    y = Math.min(y, innerHeight - bh - 8);
    const cx = (first.left + last.right) / 2;
    bar.style.left = Math.max(8, Math.min(innerWidth - bw - 8, (rs.length > 1 ? innerWidth / 2 : cx) - bw / 2)) + 'px';
    bar.style.top = Math.max(8, y) + 'px';
}
function setRange(r, showBar = true) { A.range = r; hl(true); placeUi(showBar); }
const hideBar = () => { A.text = ''; $('r-sel').hidden = true; };
function startPress(e) {
    A.sup = false; clearTimeout(A.lp);
    if (!A.env || !A.env.isOpen() || e.button > 0 || !$('r-sheet').hidden) return;
    A.px = e.clientX; A.py = e.clientY; A.pid = e.pointerId;
    A.lp = setTimeout(() => {
        const w = wordAt(A.px, A.py);
        if (!w) return;
        A.sup = true; A.pressing = true; A.anchor = w;
        setRange(w, false);
        try { navigator.vibrate && navigator.vibrate(12); } catch { /* ohne Vibration */ }
    }, LONG_MS);
}
function movePress(e) {
    if (e.pointerId !== A.pid) return;
    if (A.pressing) {                                                       // Finger bleibt unten: Markierung vom ersten Wort aus aufziehen
        const c = caretAt(e.clientX, e.clientY - 4);
        if (!c) return;
        const w = wordBounds(c.node.nodeValue, c.off);
        const e0 = w ? (before(A.anchor.startContainer, A.anchor.startOffset, c.node, w[0]) ? [c.node, w[1]] : [c.node, w[0]]) : [c.node, c.off];
        const sa = before(A.anchor.startContainer, A.anchor.startOffset, c.node, e0[1]) ? [A.anchor.startContainer, A.anchor.startOffset] : [A.anchor.endContainer, A.anchor.endOffset];
        setRange(rangeOf(sa[0], sa[1], e0[0], e0[1]), false);
        return;
    }
    if (A.lp && Math.hypot(e.clientX - A.px, e.clientY - A.py) > MOVE_PX) { clearTimeout(A.lp); A.lp = 0; }
}
function endPress(e) {
    clearTimeout(A.lp); A.lp = 0;
    if (A.pressing) { A.pressing = false; if (A.range) placeUi(true); }
}
function dragHandle(which, ev) {
    ev.preventDefault(); ev.stopPropagation();
    A.drag = which; $('r-sel').hidden = true;
    ev.target.setPointerCapture && ev.target.setPointerCapture(ev.pointerId);
}
function moveHandle(ev) {
    if (!A.drag || !A.range) return;
    const c = caretAt(ev.clientX, ev.clientY - HANDLE_DY);
    if (!c) return;
    const fixed = A.drag === 'start' ? [A.range.endContainer, A.range.endOffset] : [A.range.startContainer, A.range.startOffset];
    if (fixed[0] === c.node && fixed[1] === c.off) return;
    const startFirst = before(c.node, c.off, fixed[0], fixed[1]);
    A.drag = startFirst ? 'start' : 'end';
    setRange(rangeOf(c.node, c.off, fixed[0], fixed[1]), false);
}
function dropHandle() { if (A.drag) { A.drag = null; if (A.range) placeUi(true); } }

// ---------- Markierungen und Notizen (Phase 3) ----------
// Eine Markierung sitzt an Kapitel und Zeichenposition im Kapiteltext (gleiche Zählung wie bei der Suche), gezeichnet mit der CSS-Highlight-API (4 Farben).
const MKCOL = 'heinz_docheinz_markcolor';
const textNodes = () => { const w = document.createTreeWalker(body(), NodeFilter.SHOW_TEXT), out = []; let n; while ((n = w.nextNode())) out.push(n); return out; };
const bodyText = () => textNodes().map(n => n.nodeValue).join('');
function offsetOf(node, off) { let pos = 0; for (const n of textNodes()) { if (n === node) return pos + off; pos += n.nodeValue.length; } return -1; }
function rangeAt(start, len) {
    const end = start + len; let pos = 0, started = false; const r = document.createRange();
    for (const n of textNodes()) {
        const l = n.nodeValue.length;
        if (!started && start < pos + l) { r.setStart(n, start - pos); started = true; }
        if (started && end <= pos + l) { r.setEnd(n, end - pos); return r; }
        pos += l;
    }
    return null;
}
function selOffsets() {
    if (!A.range || !A.env || !A.env.ch) return null;
    const s = offsetOf(A.range.startContainer, A.range.startOffset), e = offsetOf(A.range.endContainer, A.range.endOffset);
    if (s < 0 || e <= s) return null;
    const text = bodyText().slice(s, e);
    return text.trim() ? { ch: A.env.ch(), start: s, len: e - s, text } : null;
}
const persist = () => { try { A.env && A.env.onMarks && A.env.onMarks(A.marks); } catch { /* Speichern ist nicht kritisch */ } };
export const marksList = () => A.marks;
export function drawMarks() {
    try {
        if (!(window.CSS && CSS.highlights && window.Highlight) || !A.env) return;
        const ch = A.env.ch(), txt = bodyText(), hs = COLORS.map(() => new Highlight());
        let moved = false;
        A.marks.forEach((m, i) => {
            if (m.ch !== ch) return;
            const st = relocate(txt, m);
            if (st < 0) return;
            if (st !== m.start) { A.marks[i] = { ...m, start: st }; moved = true; }
            const r = rangeAt(st, m.len);
            if (r) hs[m.color].add(r);
        });
        hs.forEach((h, i) => CSS.highlights.set('dh-m' + i, h));
        if (moved) persist();
    } catch { /* ohne Hervorhebung */ }
}
function dropMarks() { try { if (window.CSS && CSS.highlights) COLORS.forEach((c, i) => CSS.highlights.delete('dh-m' + i)); } catch { /* ohne Hervorhebung */ } }
const slop = (r, x, y) => x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 4;
function markHit(x, y) {
    const c = caretAt(x, y);
    if (!c || !A.env.ch) return null;
    const m = markAt(A.marks, A.env.ch(), offsetOf(c.node, c.off));
    if (!m) return null;
    const r = rangeAt(m.start, m.len);
    return r && Array.from(r.getClientRects()).some(q => slop(q, x, y)) ? m : null;
}
export const mkOpen = () => !!A.mk;
export function hideMk() { A.mk = null; const b = $('r-mk'); if (b) b.hidden = true; }
function showMk(id) {
    const m = A.marks.find(x => x.id === id), r = m && rangeAt(m.start, m.len);
    const rs = r ? Array.from(r.getClientRects()).filter(q => q.width > 0 && q.height > 0) : [];
    if (!rs.length) { hideMk(); return; }
    A.mk = id;
    const bar = $('r-mk');
    bar.hidden = false;
    bar.querySelectorAll('[data-c]').forEach(b => { b.classList.toggle('on', +b.dataset.c === m.color); b.setAttribute('aria-label', t('mk_' + COLORS[+b.dataset.c])); b.title = t('mk_' + COLORS[+b.dataset.c]); });
    const first = rs[0], last = rs[rs.length - 1], bw = bar.offsetWidth || 260, bh = bar.offsetHeight || 48, top0 = 64 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0);
    let y = first.top - bh - 12;
    if (y < top0) y = last.bottom + 12;
    y = Math.min(y, innerHeight - bh - 8);
    bar.style.left = Math.max(8, Math.min(innerWidth - bw - 8, (first.left + last.right) / 2 - bw / 2)) + 'px';
    bar.style.top = Math.max(8, y) + 'px';
}
// Tippen auf Text: liegt eine Markierung darunter, öffnet sich ihre Leiste (true = Tippen verbraucht)
export function markTap(x, y) { const m = markHit(x, y); if (!m) return false; showMk(m.id); return true; }
function doMark() {
    const o = A.off || selOffsets();
    if (!o || A.marks.length >= MAX_MARKS) return;
    const m = makeMark({ ...o, color: +HeinzStore.get(MKCOL, 0) || 0 });
    A.marks = addMark(A.marks, m); persist();
    clearWahl(); drawMarks(); showMk(m.id);
}
// Notiz zur Seite (ohne markierten Text): hängt am Lesestand, der Auszug zeigt den Seitenanfang
export function pageNote() {
    if (!A.env || !A.env.frac || A.marks.length >= MAX_MARKS) return;
    const ex = squashTxt(A.env.pageText ? A.env.pageText() : '').slice(0, 90), at = { ch: A.env.ch(), frac: A.env.frac() };
    openSheet(t('mk_pn'), '');
    const box = $('rs-body');
    if (ex) { const q = document.createElement('blockquote'); q.className = 'dh-nq'; q.textContent = ex + ' …'; box.appendChild(q); }
    const ta = document.createElement('textarea'); ta.id = 'rs-note-t'; ta.className = 'dh-nt'; ta.maxLength = 4000; ta.placeholder = t('n_ph');
    const tf = tagField([]);
    const go = document.createElement('button'); go.type = 'button'; go.className = 'pill acc'; go.id = 'rs-note-go'; go.textContent = t('n_save');
    go.addEventListener('click', () => {
        const v = ta.value.trim();
        if (v) { A.marks = addMark(A.marks, makeMark({ ...at, pn: true, text: ex, note: v, tags: tf.value() })); persist(); }
        closeSheet();
    });
    box.append(ta, tf.wrap, go);
}
// Eingabefeld für Schlagwörter (Komma getrennt) mit Vorschlägen aus allen schon benutzten (env.usedTags)
function tagField(cur) {
    const wrap = document.createElement('div'); wrap.className = 'dh-tgf';
    const inp = document.createElement('input'); inp.id = 'rs-tags'; inp.className = 'inp'; inp.type = 'text'; inp.autocomplete = 'off'; inp.spellcheck = false;
    inp.placeholder = t('tg_phM'); inp.value = (cur || []).join(', '); wrap.appendChild(inp);
    const used = (A.env && A.env.usedTags ? A.env.usedTags() : []).filter(x => !(cur || []).some(c => c.toLowerCase() === x.toLowerCase())).slice(0, 10);
    if (used.length) {
        const box = document.createElement('div'); box.className = 'dh-chips';
        used.forEach(x => { const c = document.createElement('button'); c.type = 'button'; c.className = 'pill'; c.textContent = '#' + x; c.addEventListener('click', () => { inp.value = parseTags(inp.value + ',' + x).join(', '); }); box.appendChild(c); });
        wrap.appendChild(box);
    }
    return { wrap, value: () => parseTags(inp.value).slice(0, MAX_MARK_TAGS) };
}
const squashTxt = (x) => String(x || '').replace(/\s+/g, ' ').trim();
function openNote(id) {
    const m = A.marks.find(x => x.id === id);
    if (!m) return;
    openSheet(t('n_title'), '');
    const box = $('rs-body');
    const q = document.createElement('blockquote'); q.className = 'dh-nq'; q.textContent = m.text.length > 300 ? m.text.slice(0, 300) + ' …' : m.text;
    const ta = document.createElement('textarea'); ta.id = 'rs-note-t'; ta.className = 'dh-nt'; ta.maxLength = 4000; ta.value = m.note; ta.placeholder = t('n_ph');
    const tf = tagField(m.tags);
    const go = document.createElement('button'); go.type = 'button'; go.className = 'pill acc'; go.id = 'rs-note-go'; go.textContent = t('n_save');
    go.addEventListener('click', () => {
        const v = ta.value.trim();
        A.marks = updateMark(A.marks, id, { note: v, ai: v === m.note ? m.ai : false, tags: tf.value() }); persist(); closeSheet();
    });
    box.append(q, ta, tf.wrap, go);
}
// KI-Antwort als Notiz an der markierten Stelle (legt die Markierung an, falls es sie noch nicht gibt)
function aiToNote(c, text) {
    const o = c && c.off;
    if (!o || !text) return false;
    let m = A.marks.find(x => x.ch === o.ch && x.start === o.start && x.len === o.len);
    if (!m) { m = makeMark({ ...o, color: +HeinzStore.get(MKCOL, 0) || 0 }); A.marks = addMark(A.marks, m); }
    if (!m.note) A.marks = updateMark(A.marks, m.id, { note: text, ai: true, model: c.model });
    else A.marks = updateMark(A.marks, m.id, { note: m.note + '\n\n[' + t('mk_ai') + '] ' + text });
    persist(); drawMarks();
    return true;
}
const L = () => ({ pageNote: t('mk_pn'), color: COLORS.map(c => t('mk_' + c)), note: t('m_noteL'), ai: t('mk_ai'), count: t('m_count'), part: t('r_part', { n: '{n}' }) });
const chTitle = (ch) => { const c = A.env.src().chapters[ch]; return c && c.title || ''; };
const mdText = () => toMarkdown(A.env.rec(), A.marks, chTitle, L());
function exportMd() {
    const name = (A.env.rec().title || 'book').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'book';
    const a = document.createElement('a'), u = URL.createObjectURL(new Blob([mdText()], { type: 'text/markdown' }));
    a.href = u; a.download = name + '-notes.md'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
}
// Liste für das Register „Markierungen“ im Inhaltsfeld; onGo(m) springt zur Stelle
export function renderMarkList(box, onGo, onNew) {
    box.textContent = '';
    const head = document.createElement('div'); head.className = 'dh-mhead';
    const ex = Object.assign(document.createElement('button'), { type: 'button', className: 'pill', id: 'mk-export', textContent: t('m_export'), disabled: !A.marks.length });
    const cp = Object.assign(document.createElement('button'), { type: 'button', className: 'pill', id: 'mk-copy', textContent: t('m_copyMd'), disabled: !A.marks.length });
    ex.addEventListener('click', exportMd);
    cp.addEventListener('click', async () => { try { await navigator.clipboard.writeText(mdText()); } catch { /* keine Berechtigung */ } });
    const nw = Object.assign(document.createElement('button'), { type: 'button', className: 'pill', id: 'mk-new', textContent: t('mk_pnNew') });
    nw.addEventListener('click', () => onNew && onNew());
    const fl = Object.assign(document.createElement('button'), { type: 'button', className: 'pill' + (A.onlyNotes ? ' on' : ''), id: 'mk-filter', textContent: t('mk_onlyN') });
    fl.addEventListener('click', () => { A.onlyNotes = !A.onlyNotes; renderMarkList(box, onGo, onNew); });
    head.append(nw, fl, ex, cp); box.appendChild(head);
    if (!A.marks.length) { box.appendChild(Object.assign(document.createElement('p'), { className: 'dh-notoc', textContent: t('m_none') })); return; }
    sortMarks(A.marks).filter(m => !A.onlyNotes || m.note).forEach(m => {
        const row = document.createElement('div'); row.className = 'dh-mi'; row.dataset.id = m.id;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'dh-mq ' + (m.pn ? 'cp' : 'c' + m.color);
        const q = document.createElement('span'); q.className = 'q'; q.textContent = m.pn ? (m.text ? m.text + ' …' : '') : m.text;
        const sm = document.createElement('small'); sm.textContent = (m.pn ? t('mk_pn') + ' · ' : '') + (chTitle(m.ch) || t('r_part', { n: m.ch + 1 }));
        b.append(q, sm);
        if (m.note) { const n = document.createElement('span'); n.className = 'n'; n.textContent = (m.ai ? t('mk_ai') + ': ' : '') + m.note; b.appendChild(n); }
        if ((m.tags || []).length) { const g = document.createElement('small'); g.className = 'dh-tags'; g.textContent = m.tags.map(x => '#' + x).join(' '); b.appendChild(g); }
        b.addEventListener('click', () => onGo(m));
        const x = document.createElement('button'); x.type = 'button'; x.className = 'dh-mx'; x.setAttribute('aria-label', t('mk_del'));
        x.innerHTML = '<svg class="i"><use href="../../lib/icons.svg#i-trash"/></svg>';
        x.addEventListener('click', () => { A.marks = removeMark(A.marks, m.id); persist(); drawMarks(); renderMarkList(box, onGo); });
        row.append(b, x); box.appendChild(row);
    });
}

function openSheet(title, sub) {
    const sh = $('r-sheet');
    $('rs-title').textContent = title;
    $('rs-sub').textContent = sub || '';
    $('rs-sub').hidden = !sub;
    $('rs-body').textContent = '';
    $('rs-stop').hidden = true; $('rs-copy').hidden = true; $('rs-more').hidden = true; $('rs-note').hidden = true;
    sh.hidden = false;
    clearWahl();
}
export function closeSheet() {
    A.run++;
    if (A.ac) { A.ac.abort(); A.ac = null; }
    $('r-sheet').hidden = true;
}
const t = (k, v) => A.env.t(k, v);
// Antworten der Modelle sind Markdown: eigener Parser, dann durch die Positivliste (keine Skripte, Links nur als Text). Das Original bleibt in data-raw zum Kopieren.
function renderMd(el, text) {
    el.dataset.raw = text;
    el.classList.add('dh-md');
    try { el.innerHTML = sauber(mdToHtml(text)); } catch { el.textContent = text; }
}
const rawOf = (el) => (el && (el.dataset.raw || el.textContent)) || '';
const line = (cls, text) => { const p = document.createElement('p'); p.className = cls; p.textContent = text; return p; };

// ---------- Modellwahl für Erklären und Analyse ----------
// Eigene Zuweisung des Werkzeugs; ohne sie gilt das im Dashboard aktive Modell. Gewählt wird wie bei allen Tools auch als aktives Modell gesetzt (Regel 4, docs/LOKALE_MODELLE.md).
export function aiChoice() {
    const c = HeinzStore.get(AI_KEY, null);
    if (c && c.config) { const f = PV.configById(c.config); if (f && PV.get(f.provider)) return { provider: f.provider, model: f.model, config: f.id }; }
    if (c && c.provider && c.model && PV.get(c.provider)) return { provider: c.provider, model: c.model };
    return PV.activeModel();
}
async function setAi(provider, model, config) {
    await HeinzStore.set(AI_KEY, config ? { provider, model, config } : { provider, model });
    PV.setActiveModel(provider, model);
}
// Aus der gewählten Dashboard-Konfiguration: Systemprompt (leer = eingebauter), Ton, Stopp, Laufzeit (Kontext, Threads).
function aiSettings(act) {
    const cfg = act && act.config ? PV.configById(act.config) : null;
    const rt = PV.runtime(act.provider, act.model, undefined, cfg && cfg.runtime);
    const options = Object.assign({}, rt.options);
    if (cfg) { if (cfg.tone) Object.assign(options, cfg.tone); if (cfg.stop && cfg.stop.length) options.stop = cfg.stop.slice(); }
    return { system: cfg && cfg.prompt ? cfg.prompt : '', options, keepAlive: rt.keepAlive, cfg };
}
function aiLabel(c) { const p = c && PV.get(c.provider); if (!c || !p) return ''; const f = c.config ? PV.configById(c.config) : null; return (f ? f.name + ' · ' : '') + c.model + ' · ' + p.name; }
export async function buildAiChips(tr) {
    const T = tr || ((k, v) => A.env.t(k, v));
    const sel = $('sel-ai'), cur = $('ai-cur'), sw = $('sw-askfirst');
    sw.checked = askFirstOn();
    sel.textContent = '';
    // Nur Konfigurationen aus dem Dashboard (Modell, Prompt, Ton, Laufzeit); die Modellflut der Anbieter erscheint hier nicht.
    const ok = (id) => { const p = PV.get(id); return !!p && !!p.baseUrl && (p.local || (PV.onlineAllowed() && (!p.needsKey || PV.getKey(id)))); };
    sel.appendChild(Object.assign(document.createElement('option'), { value: '', textContent: T('r_aiDefault') }));
    PV.configs().filter(f => ok(f.provider)).forEach(f => sel.appendChild(Object.assign(document.createElement('option'), { value: f.id, textContent: f.name + ' · ' + f.model + (PV.get(f.provider).local ? '' : ' · online') })));
    const show = () => {
        const c = HeinzStore.get(AI_KEY, null), act = aiChoice();
        sel.value = c && c.config && PV.configById(c.config) ? c.config : '';
        cur.textContent = act ? T('r_aiCur', { m: aiLabel(act) }) : T('r_aiNone');
    };
    if (!sel.dataset.wired) {
        sel.dataset.wired = '1';
        sel.addEventListener('change', async () => {
            if (!sel.value) { await HeinzStore.set(AI_KEY, null); }
            else { const f = PV.configById(sel.value); if (f) await setAi(f.provider, f.model, f.id); }
            show();
        });
        sw.addEventListener('change', () => HeinzStore.set(ASKFIRST, sw.checked ? 1 : 0));
    }
    show();
}

// ---------- Suchen ----------
async function chapterText(i) {
    if (A.cache.has(i)) return A.cache.get(i);
    const html = await A.env.src().html(i);
    const txt = new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
    A.cache.set(i, txt);
    return txt;
}
async function dictSearch(text) {
    const q = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!q) return;
    const my = ++A.run;
    openSheet(t('d_sheetT', { q }), '');
    const box = $('rs-body');
    box.appendChild(line('dh-sline', t('s_working')));
    const lang = A.env.lang(), rl = (A.env.rec && A.env.rec().language) || lang;
    const t0 = performance.now();
    let r; try { r = await lookup(text, lang); } catch { r = { none: false, groups: [], tried: [] }; }
    const msDict = Math.round(performance.now() - t0);
    if (my !== A.run) return;
    box.textContent = '';
    const rows = [];                                                         // Kompaktansicht: je Wörterbuch ein Eintrag, Bedeutungen gekürzt; „Mehr anzeigen“ blendet den Rest ein
    r.groups.forEach(g => {
        const per = new Map();
        g.items.forEach(it => { const k = it.name || ''; per.set(k, (per.get(k) || 0) + 1); });
        const seenN = new Map();
        const sorted = g.items.slice().sort((a, b) => (+(a.o !== a.o.toLowerCase())) - (+(b.o !== b.o.toLowerCase())));   // klein geschriebene Wörter vor Namen
        sorted.forEach(it => {
            const idx = seenN.get(it.name || '') || 0; seenN.set(it.name || '', idx + 1);
            const h = document.createElement('div'); h.className = 'dh-dw'; h.textContent = it.o + (it.name ? ' · ' + it.name : '');
            const d = document.createElement('div'); d.className = 'dh-dd';
            const short = shortDef(it.d);
            d.textContent = short; d.dataset.full = it.d; d.dataset.short = short;
            const els = it.note ? (() => { const n = document.createElement('div'); n.className = 'help'; n.textContent = it.note; return [h, n, d]; })() : [h, d];
            const extra = idx >= 1;
            els.forEach(e => { if (extra) { e.hidden = true; e.dataset.extra = '1'; } box.appendChild(e); });
            rows.push({ extra, cut: short !== it.d });
        });
    });
    if (rows.some(x => x.extra || x.cut)) {
        const more = Object.assign(document.createElement('button'), { type: 'button', className: 'pill', textContent: t('d_more') });
        let open = false;
        more.addEventListener('click', () => {
            open = !open;
            box.querySelectorAll('[data-extra]').forEach(e => { e.hidden = !open; });
            box.querySelectorAll('.dh-dd').forEach(e => { e.textContent = open ? e.dataset.full : e.dataset.short; });
            more.textContent = t(open ? 'd_less' : 'd_more');
        });
        box.appendChild(more);
    }
    let wissenShown = false, msWiki = -1;
    try {                                                                   // WikiHeinz (lib/wissen/): nur lokale Quellen, keine Anfrage nach außen; ohne bereite Quelle bleibt der Block weg
        const t1 = performance.now();
        const w = await HeinzWissen.suche(q, { max: 2, voll: false });
        msWiki = Math.round(performance.now() - t1);
        if (my !== A.run) return;
        if (w.zustand === 'ok') {
            wissenShown = true;
            const h = document.createElement('div'); h.className = 'dh-dw'; h.textContent = t('wh_title'); box.appendChild(h);
            w.treffer.forEach(x => {
                const n = document.createElement('div'); n.className = 'dh-dw'; n.textContent = x.titel + ' · ' + x.quelle;
                const d = document.createElement('div'); d.className = 'dh-dd'; d.textContent = x.auszug;
                box.append(n, d);
                if (x.link && /^https?:/.test(x.link)) { const a = document.createElement('a'); a.href = x.link; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = t('wh_more'); a.className = 'help'; box.appendChild(a); }
                if (x.angabe) box.appendChild(line('help', x.angabe));
            });
        } else if (w.zustand === 'leer') box.appendChild(line('help', t('wh_none')));
    } catch { /* WikiHeinz nicht erreichbar: Wörterbuch bleibt */ }
    let wikiShown = false;
    if (wikiOn()) {                                                         // Wikipedia-Kurztext (nur mit Haken und „Online erlauben“; Treffer werden gemerkt)
        const hold = line('dh-sline', t('w_working')); box.appendChild(hold);
        const w = await wikiLookup(q, rl);
        if (my !== A.run) return;
        hold.remove();
        if (w.page) {
            wikiShown = true;
            const h = document.createElement('div'); h.className = 'dh-dw'; h.textContent = w.page.title + ' · Wikipedia' + (w.cached ? ' · ' + t('w_cached') : '');
            const d = document.createElement('div'); d.className = 'dh-dd'; d.textContent = w.page.extract;
            const a = document.createElement('a'); a.href = w.page.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = t('w_more'); a.className = 'help';
            box.append(h, d, a);
        } else if (w.blocked) box.appendChild(line('help', t('w_blocked')));
        else box.appendChild(line('help', t(w.failed ? 'w_failed' : 'w_none')));
    }
    if (!r.groups.length && !wikiShown && !wissenShown) box.appendChild(line('dh-sline', t(r.none ? 'd_none' : 'd_nohit')));
    box.appendChild(line('help', t('wh_ms', { d: msDict, w: msWiki < 0 ? '–' : msWiki })));    // Messwert zum Vergleich der beiden Wege (Wörterbuch-Kopie in docHeinz und lib/wissen/)
}
async function search(query) {
    query = normalizeQuery(query);
    if (!query) return;
    const my = ++A.run;
    openSheet(t('s_searchT', { q: query }), '');
    const box = $('rs-body');
    box.appendChild(line('dh-sline', t('s_working')));
    const src = A.env.src(), hits = [];
    for (let i = 0; i < src.chapters.length && hits.length < 60; i++) {
        let txt = '';
        try { txt = await chapterText(i); } catch { continue; }
        if (my !== A.run) return;
        findAll(txt, query, { max: 60 - hits.length }).forEach(h => hits.push(Object.assign(h, { ch: i })));
    }
    if (my !== A.run) return;
    box.textContent = '';
    $('rs-sub').textContent = hits.length ? t(hits.length >= 60 ? 's_hitsMax' : 's_hits', { n: hits.length }) : '';
    $('rs-sub').hidden = !hits.length;
    if (!hits.length) { box.appendChild(line('dh-sline', t('s_nohit'))); return; }
    hits.forEach(h => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'dh-hit';
        const ch = document.createElement('small');
        ch.textContent = (src.chapters[h.ch] && src.chapters[h.ch].title) || t('r_part', { n: h.ch + 1 });
        const tx = document.createElement('span');
        tx.append(document.createTextNode(h.before + ' '), Object.assign(document.createElement('mark'), { textContent: h.hit }), document.createTextNode(' ' + h.after));
        b.append(ch, tx);
        b.addEventListener('click', () => { closeSheet(); A.env.jump(h.ch, h.start, h.len); });
        box.appendChild(b);
    });
}

// ---------- Erklären, Zusammenfassen ----------
const ASKFIRST = 'heinz_docheinz_askfirst';
export const askFirstOn = () => +HeinzStore.get(ASKFIRST, 1) !== 0;
// Erst ein Feld für eine eigene Frage (leer = Standardauftrag, wie bisher), dann die Antwort.
function askFirst(kind, passage, off, chapter = false) {
    openSheet(t(kind === 'explain' ? 's_explainT' : 's_sumT'), '');
    const box = $('rs-body');
    const f = document.createElement('form'); f.className = 'dh-qform';
    const q = document.createElement('input'); q.type = 'text'; q.id = 'rs-q'; q.placeholder = t('s_askPh'); q.autocomplete = 'off'; q.maxLength = 500;
    const go = document.createElement('button'); go.type = 'submit'; go.className = 'pill acc'; go.id = 'rs-go'; go.textContent = t('s_go');
    f.append(q, go);
    f.addEventListener('submit', (e) => { e.preventDefault(); ask(kind, passage, q.value.trim(), off, chapter); });
    box.appendChild(f);
}
async function ask(kind, passage, question = '', off = null, chapter = false) {
    const my = ++A.run;
    openSheet(t(kind === 'explain' ? 's_explainT' : 's_sumT'), '');
    const box = $('rs-body');
    const act = aiChoice();
    const p = act && PV.get(act.provider);
    if (!p) { box.appendChild(line('dh-sline', t('s_noModel'))); return; }
    const as = aiSettings(act);
    const max = chapter && !p.local ? CHAPTER_MAX_ONLINE : MAX_CHARS;
    const req = buildRequest(kind, passage, { lang: A.env.lang(), title: A.env.rec().title, author: A.env.rec().author, system: as.system, question, max });
    $('rs-sub').textContent = aiLabel(act);
    $('rs-sub').hidden = false;
    if (!p.local) {
        if (!PV.onlineAllowed()) { box.appendChild(line('dh-sline err', t('s_blocked'))); return; }
        box.appendChild(line('dh-sline warn', t('s_sent', { p: p.name })));
    }
    if (req.clipped) box.appendChild(line('dh-sline', t('s_clipped')));
    const out = document.createElement('div'); out.className = 'dh-sout';
    box.appendChild(out);
    const wait = line('dh-sline', t('s_working')); box.appendChild(wait);
    const ac = A.ac = new AbortController();
    $('rs-stop').hidden = false;
    let text = '';
    try {
        await PV.prepare(act.provider, act.model);
        await PV.chat(act.provider, { model: act.model, system: req.system, messages: req.messages, options: as.options, keepAlive: as.keepAlive, stream: true, signal: ac.signal,
            onDelta: (d) => { if (my !== A.run) return; text += d; renderMd(out, text); if (wait.parentNode) wait.remove(); } });
        if (my !== A.run) return;
        if (!text.trim()) out.textContent = t('s_empty');
        else { $('rs-copy').hidden = false; $('rs-more').hidden = false; noteBtn(text, off, act.model); A.conv = { max, off, kind, passage, question, config: act.config || '', local: p.local, provider: act.provider, model: act.model, name: p.name, msgs: [req.messages[0], { role: 'assistant', content: text }], page: A.env.pageText ? A.env.pageText() : '' }; }
    } catch (e) {
        if (my !== A.run || (e && e.name === 'AbortError')) { if (text) { $('rs-copy').hidden = false; $('rs-more').hidden = false; noteBtn(text, off, act.model); A.conv = { max, off, kind, passage, question, config: act.config || '', local: p.local, provider: act.provider, model: act.model, name: p.name, msgs: [req.messages[0], { role: 'assistant', content: text }], page: A.env.pageText ? A.env.pageText() : '' }; } }
        else {
            const code = e && e.code;
            box.appendChild(line('dh-sline err', code === 'ONLINE_BLOCKED' ? t('s_blocked') : code === 'NO_KEY' ? t('s_nokey') : t('s_err')));
        }
    } finally {
        if (my === A.run) { if (wait.parentNode) wait.remove(); $('rs-stop').hidden = true; A.ac = null; }
    }
}

// Kapitel-KI: das aktuelle Kapitel (ohne Markierung) zusammenfassen, erklären oder dazu fragen. Lokal gehen die ersten MAX_CHARS Zeichen, an Cloud-Modelle bis CHAPTER_MAX_ONLINE.
export async function askChapter(kind, withQuestion = false) {
    if (!A.env || !A.env.ch) return;
    const text = (await chapterText(A.env.ch())).replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (withQuestion) askFirst(kind, text, null, true); else ask(kind, text, '', null, true);
}
function noteBtn(text, off, model) {
    const b = $('rs-note');
    b.hidden = !off; b.disabled = false; b.textContent = t('s_toNote');
    b.onclick = () => { if (aiToNote({ off, model }, text)) { b.textContent = t('s_noted'); b.disabled = true; } };
}

// ---------- Fenster „Analyse“ (Nachfragen; der Verlauf lebt nur, solange es offen ist) ----------
function addMsg(role, text) {
    const d = document.createElement('div');
    d.className = 'dh-m ' + (role === 'user' ? 'u' : 'a');
    const sp = document.createElement('div'); sp.className = 'dh-mc'; if (role === 'user') sp.textContent = text; else renderMd(sp, text); d.appendChild(sp);
    $('ra-body').appendChild(d);
    $('ra-body').scrollTop = $('ra-body').scrollHeight;
    return d;
}
function addCopy(d) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pill'; b.textContent = t('s_copy');
    b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(rawOf(d.querySelector('.dh-mc'))); } catch { /* keine Berechtigung */ } });
    d.appendChild(b);
    const c = A.conv;
    if (c && c.off) {
        const n = document.createElement('button');
        n.type = 'button'; n.className = 'pill'; n.textContent = t('s_toNote');
        n.addEventListener('click', () => { if (aiToNote(c, rawOf(d.querySelector('.dh-mc')))) { n.textContent = t('s_noted'); n.disabled = true; } });
        d.appendChild(n);
    }
}
function ctxOn() { return $('ra-seg').querySelector('button.on').dataset.ctx === '1'; }
function anaSub() {
    const c = A.conv;
    $('ra-sub').textContent = c.model + ' · ' + c.name + (c.local ? '' : ' · ' + t('s_sent', { p: c.name })) + (ctxOn() ? '\n' + t('s_ctxNote') : '');
}
function openAna() {
    const c = A.conv;
    if (!c) return;
    closeSheet();
    $('ra-body').textContent = '';
    $('ra-q').value = '';
    $('ra-seg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.ctx === '0'));
    $('ra-pass').textContent = c.passage.length > 600 ? c.passage.slice(0, 600) + ' …' : c.passage;
    anaSub();
    c.msgs.forEach((m, i) => { if (i === 0) return; const d = addMsg(m.role, m.content); if (m.role === 'assistant') addCopy(d); });
    $('r-ana').hidden = false;
    A.anaOpen = true;
    history.pushState({ dha: 1 }, ''); A.anaPushed = true;
    $('ra-q').focus({ preventScroll: true });
}
export function closeAna(fromPop) {
    A.anaRun++;
    if (A.anaAc) { A.anaAc.abort(); A.anaAc = null; }
    if (!A.anaOpen) return;
    A.anaOpen = false;
    $('r-ana').hidden = true;
    if (!fromPop && A.anaPushed) { A.skipPop = true; history.back(); }
    A.anaPushed = false;
}
// true, wenn die Zurück-Taste das Fenster schließt (und nicht den Reader)
export function consumePop() {
    if (A.skipPop) { A.skipPop = false; return true; }
    if (A.anaOpen) { closeAna(true); return true; }
    return false;
}
export const anaIsOpen = () => A.anaOpen;
async function followUp(q) {
    const c = A.conv, my = ++A.anaRun;
    q = String(q || '').trim();
    if (!q || !c || A.anaAc) return;
    addMsg('user', q);
    const as = aiSettings({ provider: c.provider, model: c.model, config: c.config });
    const first = buildRequest(c.kind, c.passage, { lang: A.env.lang(), title: A.env.rec().title, author: A.env.rec().author, page: ctxOn() ? c.page : '', system: as.system, question: c.question || '', max: c.max || MAX_CHARS });
    const hist = trimHistory([first.messages[0]].concat(c.msgs.slice(1)).concat([{ role: 'user', content: q }]));
    const out = addMsg('assistant', t('s_working'));
    const span = out.querySelector('.dh-mc');
    const ac = A.anaAc = new AbortController();
    $('ra-stop').hidden = false; $('ra-send').hidden = true; $('ra-q').value = '';
    let text = '';
    try {
        await PV.prepare(c.provider, c.model);
        await PV.chat(c.provider, { model: c.model, system: first.system, messages: hist, options: as.options, keepAlive: as.keepAlive, stream: true, signal: ac.signal,
            onDelta: (d) => { if (my !== A.anaRun) return; text += d; renderMd(span, text); $('ra-body').scrollTop = $('ra-body').scrollHeight; } });
        if (my !== A.anaRun) return;
        if (!text.trim()) span.textContent = t('s_empty');
    } catch (e) {
        if (my !== A.anaRun) return;
        if (!(e && e.name === 'AbortError')) { const code = e && e.code; span.textContent = code === 'ONLINE_BLOCKED' ? t('s_blocked') : code === 'NO_KEY' ? t('s_nokey') : t('s_err'); }
    } finally {
        if (my === A.anaRun) { A.anaAc = null; $('ra-stop').hidden = true; $('ra-send').hidden = false; }
    }
    if (text.trim()) { c.msgs.push({ role: 'user', content: q }, { role: 'assistant', content: text }); addCopy(out); }
    else if (!out.querySelector('.pill')) { /* Fehler- oder Leerantwort bleibt ohne Verlauf */ }
}

// ---------- Anschluss an die Leseansicht ----------
// env = { isOpen(), rec(), src(), t, lang(), jump(ch, start, len) }
export function initSelection(env) {
    A.env = env; A.marks = cleanMarks(env.marks); A.mk = null; A.off = null;
    A.cache.clear();
    if (A.wired) return;
    A.wired = true;
    const pg = $('r-page');
    pg.addEventListener('pointerdown', startPress);
    pg.addEventListener('pointermove', movePress);
    ['pointerup', 'pointercancel'].forEach(ev => pg.addEventListener(ev, endPress));
    pg.addEventListener('contextmenu', (e) => e.preventDefault());
    pg.addEventListener('click', (e) => { if (A.sup) { A.sup = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    [['r-h1', 'start'], ['r-h2', 'end']].forEach(([id, w]) => { const h = $(id); h.addEventListener('pointerdown', (e) => dragHandle(w, e)); h.addEventListener('pointermove', moveHandle); ['pointerup', 'pointercancel'].forEach(ev => h.addEventListener(ev, dropHandle)); });
    $('r-sel').addEventListener('pointerdown', (e) => e.preventDefault());       // Markierung bleibt beim Tippen auf die Leiste
    $('r-sel').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-sel]');
        if (!b || !A.text) return;
        const text = A.text, off = A.off;
        if (b.dataset.sel === 'mark') { doMark(); return; }
        if (b.dataset.sel === 'copy') { try { navigator.clipboard.writeText(text); } catch { /* keine Berechtigung */ } clearWahl(); }
        else if (b.dataset.sel === 'search') search(text); else if (b.dataset.sel === 'dict') dictSearch(text); else if (askFirstOn()) askFirst(b.dataset.sel, text, off); else ask(b.dataset.sel, text, '', off);
    });
    $('r-mk').addEventListener('pointerdown', (e) => e.preventDefault());
    $('r-mk').addEventListener('click', (e) => {
        const b = e.target.closest('button'), id = A.mk;
        if (!b || !id) return;
        if (b.dataset.c != null) { const c = +b.dataset.c; HeinzStore.set(MKCOL, c); A.marks = updateMark(A.marks, id, { color: c }); persist(); drawMarks(); showMk(id); }
        else if (b.dataset.mk === 'note') { hideMk(); openNote(id); }
        else if (b.dataset.mk === 'del') { A.marks = removeMark(A.marks, id); persist(); drawMarks(); hideMk(); }
    });
    $('rs-close').addEventListener('click', closeSheet);
    $('rs-more').addEventListener('click', openAna);
    $('ra-close').addEventListener('click', () => closeAna(false));
    $('ra-stop').addEventListener('click', () => { if (A.anaAc) A.anaAc.abort(); });
    $('ra-seg').addEventListener('click', (e) => { const b = e.target.closest('button[data-ctx]'); if (!b) return; $('ra-seg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); anaSub(); });
    $('ra-form').addEventListener('submit', (e) => { e.preventDefault(); followUp($('ra-q').value); });
    $('ra-q').addEventListener('input', (e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; });
    $('ra-q').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); followUp($('ra-q').value); } });
    $('rs-stop').addEventListener('click', () => { if (A.ac) A.ac.abort(); });
    $('rs-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(rawOf($('rs-body').querySelector('.dh-sout'))); } catch { /* keine Berechtigung */ } });
}
export function resetSelection() { closeAna(true); A.conv = null; closeSheet(); clearWahl(); dropMarks(); A.marks = []; A.cache.clear(); }
