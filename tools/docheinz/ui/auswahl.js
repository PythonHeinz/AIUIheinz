/* tools/docheinz/ui/auswahl.js – Markierungsleiste der Leseansicht: Suchen im Buch, Erklären und Zusammenfassen über das aktive Modell des Dashboards.
 * Sprachmodelle nur über lib/providers.js (HeinzProviders, docs/LOKALE_MODELLE.md): activeModel, runtime, prepare, chat. Nichts wird dort geändert.
 * Es geht nur der markierte Abschnitt (und Buchtitel/Autor) an das Modell; Cloud-Anbieter nur mit „Online erlauben“. */
import { $, HeinzStore } from './base.js';
import { HeinzProviders as PV } from '../../../lib/providers.js';
import { findAll, normalizeQuery } from '../mod/suche.js';
import { buildRequest, trimHistory } from '../mod/ki.js';
import { wordBounds } from '../mod/wahl.js';

const MAX_QUERY = 80;
const AI_KEY = 'heinz_docheinz_ai';
const A = { conv: null, anaOpen: false, anaPushed: false, skipPop: false, anaAc: null, anaRun: 0, env: null, text: '', range: null, drag: null, lp: 0, sup: false, pressing: false, anchor: null, px: 0, py: 0, pid: 0, timer: 0, ac: null, cache: new Map(), run: 0, wired: false };

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
    A.text = selectedText();
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

function openSheet(title, sub) {
    const sh = $('r-sheet');
    $('rs-title').textContent = title;
    $('rs-sub').textContent = sub || '';
    $('rs-sub').hidden = !sub;
    $('rs-body').textContent = '';
    $('rs-stop').hidden = true; $('rs-copy').hidden = true; $('rs-more').hidden = true;
    sh.hidden = false;
    clearWahl();
}
export function closeSheet() {
    A.run++;
    if (A.ac) { A.ac.abort(); A.ac = null; }
    $('r-sheet').hidden = true;
}
const t = (k, v) => A.env.t(k, v);
const line = (cls, text) => { const p = document.createElement('p'); p.className = cls; p.textContent = text; return p; };

// ---------- Modellwahl für Erklären und Analyse ----------
// Eigene Zuweisung des Werkzeugs; ohne sie gilt das im Dashboard aktive Modell. Gewählt wird wie bei allen Tools auch als aktives Modell gesetzt (Regel 4, docs/LOKALE_MODELLE.md).
export function aiChoice() {
    const c = HeinzStore.get(AI_KEY, null);
    if (c && c.provider && c.model && PV.get(c.provider)) return c;
    return PV.activeModel();
}
async function setAi(provider, model) {
    await HeinzStore.set(AI_KEY, { provider, model });
    PV.setActiveModel(provider, model);
}
function aiLabel(c) { const p = c && PV.get(c.provider); return c && p ? c.model + ' · ' + p.name : ''; }
export async function buildAiChips() {
    const box = $('seg-ai'), cur = $('ai-cur');
    const show = () => { const c = HeinzStore.get(AI_KEY, null); const act = aiChoice(); cur.textContent = c && PV.get(c.provider) ? A.env.t('r_aiCur', { m: aiLabel(c) }) : (act ? A.env.t('r_aiCur', { m: aiLabel(act) }) + ' · ' : '') + A.env.t('r_aiNone'); box.querySelectorAll('button').forEach(b => b.classList.toggle('on', !!c && b.dataset.p === c.provider && b.dataset.m === c.model)); };
    box.textContent = '';
    cur.textContent = A.env.t('r_aiLoad');
    const provs = PV.list().filter(p => p.baseUrl && (p.local || (PV.onlineAllowed() && (!p.needsKey || PV.getKey(p.id)))));
    let any = false;
    await Promise.all(provs.map(async (p) => {
        let names = [];
        try { names = await PV.models(p.id); } catch { names = []; }
        names.forEach(m => {
            any = true;
            const b = document.createElement('button');
            b.type = 'button'; b.dataset.p = p.id; b.dataset.m = m;
            b.append(document.createTextNode(m), Object.assign(document.createElement('small'), { textContent: p.name + (p.local ? '' : ' · online') }));
            b.addEventListener('click', async () => { await setAi(p.id, m); show(); });
            box.appendChild(b);
        });
    }));
    if (!any) { cur.textContent = A.env.t('r_aiFail'); return; }
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
async function ask(kind, passage) {
    const my = ++A.run;
    openSheet(t(kind === 'explain' ? 's_explainT' : 's_sumT'), '');
    const box = $('rs-body');
    const act = aiChoice();
    const p = act && PV.get(act.provider);
    if (!p) { box.appendChild(line('dh-sline', t('s_noModel'))); return; }
    const req = buildRequest(kind, passage, { lang: A.env.lang(), title: A.env.rec().title, author: A.env.rec().author });
    $('rs-sub').textContent = act.model + ' · ' + p.name;
    $('rs-sub').hidden = false;
    if (!p.local) {
        if (!PV.onlineAllowed()) { box.appendChild(line('dh-sline err', t('s_blocked'))); return; }
        box.appendChild(line('dh-sline warn', t('s_sent', { p: p.name })));
    }
    if (req.clipped) box.appendChild(line('dh-sline', t('s_clipped')));
    const out = document.createElement('p'); out.className = 'dh-sout';
    box.appendChild(out);
    const wait = line('dh-sline', t('s_working')); box.appendChild(wait);
    const ac = A.ac = new AbortController();
    $('rs-stop').hidden = false;
    let text = '';
    try {
        const rt = PV.runtime(act.provider, act.model);
        await PV.prepare(act.provider, act.model);
        await PV.chat(act.provider, { model: act.model, system: req.system, messages: req.messages, options: rt.options, keepAlive: rt.keepAlive, stream: true, signal: ac.signal,
            onDelta: (d) => { if (my !== A.run) return; text += d; out.textContent = text; if (wait.parentNode) wait.remove(); } });
        if (my !== A.run) return;
        if (!text.trim()) out.textContent = t('s_empty');
        else { $('rs-copy').hidden = false; $('rs-more').hidden = false; A.conv = { kind, passage, local: p.local, provider: act.provider, model: act.model, name: p.name, msgs: [req.messages[0], { role: 'assistant', content: text }], page: A.env.pageText ? A.env.pageText() : '' }; }
    } catch (e) {
        if (my !== A.run || (e && e.name === 'AbortError')) { if (text) { $('rs-copy').hidden = false; $('rs-more').hidden = false; A.conv = { kind, passage, local: p.local, provider: act.provider, model: act.model, name: p.name, msgs: [req.messages[0], { role: 'assistant', content: text }], page: A.env.pageText ? A.env.pageText() : '' }; } }
        else {
            const code = e && e.code;
            box.appendChild(line('dh-sline err', code === 'ONLINE_BLOCKED' ? t('s_blocked') : code === 'NO_KEY' ? t('s_nokey') : t('s_err')));
        }
    } finally {
        if (my === A.run) { if (wait.parentNode) wait.remove(); $('rs-stop').hidden = true; A.ac = null; }
    }
}

// ---------- Fenster „Analyse“ (Nachfragen; der Verlauf lebt nur, solange es offen ist) ----------
function addMsg(role, text) {
    const d = document.createElement('div');
    d.className = 'dh-m ' + (role === 'user' ? 'u' : 'a');
    const sp = document.createElement('span'); sp.textContent = text; d.appendChild(sp);
    $('ra-body').appendChild(d);
    $('ra-body').scrollTop = $('ra-body').scrollHeight;
    return d;
}
function addCopy(d) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pill'; b.textContent = t('s_copy');
    b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(d.querySelector('span').textContent); } catch { /* keine Berechtigung */ } });
    d.appendChild(b);
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
    const first = buildRequest(c.kind, c.passage, { lang: A.env.lang(), title: A.env.rec().title, author: A.env.rec().author, page: ctxOn() ? c.page : '' });
    const hist = trimHistory([first.messages[0]].concat(c.msgs.slice(1)).concat([{ role: 'user', content: q }]));
    const out = addMsg('assistant', t('s_working'));
    const span = out.querySelector('span');
    const ac = A.anaAc = new AbortController();
    $('ra-stop').hidden = false; $('ra-send').hidden = true; $('ra-q').value = '';
    let text = '';
    try {
        const rt = PV.runtime(c.provider, c.model);
        await PV.prepare(c.provider, c.model);
        await PV.chat(c.provider, { model: c.model, system: first.system, messages: hist, options: rt.options, keepAlive: rt.keepAlive, stream: true, signal: ac.signal,
            onDelta: (d) => { if (my !== A.anaRun) return; text += d; span.textContent = text; $('ra-body').scrollTop = $('ra-body').scrollHeight; } });
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
    A.env = env;
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
        const text = A.text;
        if (b.dataset.sel === 'copy') { try { navigator.clipboard.writeText(text); } catch { /* keine Berechtigung */ } clearWahl(); }
        else if (b.dataset.sel === 'search') search(text); else ask(b.dataset.sel, text);
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
    $('rs-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('rs-body').querySelector('.dh-sout').textContent); } catch { /* keine Berechtigung */ } });
}
export function resetSelection() { closeAna(true); A.conv = null; closeSheet(); clearWahl(); A.cache.clear(); }
