/* tools/docheinz/ui/auswahl.js – Markierungsleiste der Leseansicht: Suchen im Buch, Erklären und Zusammenfassen über das aktive Modell des Dashboards.
 * Sprachmodelle nur über lib/providers.js (HeinzProviders, docs/LOKALE_MODELLE.md): activeModel, runtime, prepare, chat. Nichts wird dort geändert.
 * Es geht nur der markierte Abschnitt (und Buchtitel/Autor) an das Modell; Cloud-Anbieter nur mit „Online erlauben“. */
import { $, HeinzStore } from './base.js';
import { HeinzProviders as PV } from '../../../lib/providers.js';
import { findAll, normalizeQuery } from '../mod/suche.js';
import { buildRequest, trimHistory } from '../mod/ki.js';

const MAX_QUERY = 80;
const AI_KEY = 'heinz_docheinz_ai';
const A = { conv: null, anaOpen: false, anaPushed: false, skipPop: false, anaAc: null, anaRun: 0, env: null, text: '', timer: 0, ac: null, cache: new Map(), run: 0, wired: false };

const sel = () => (window.getSelection ? window.getSelection() : null);
// Chrome blendet bei einer Markierung unten ein eigenes Suchfeld („Tippen, um Suchergebnisse zu sehen“) und über der Markierung sein Menü ein.
// Darum sitzt die Leiste oben; steht die Markierung selbst weit oben, wandert sie nach unten über das Chrome-Feld.
function placeBar() {
    const s = sel();
    if (!s || !s.rangeCount) return;
    const r = s.getRangeAt(0).getBoundingClientRect(), bar = $('r-sel');
    const gap = $('reader').dataset.gap === '1';
    const h = 52, low = innerHeight - (gap ? 118 : 14) - h;
    // Standard: unten über dem Chrome-Feld. Liegt dort die Markierung samt Chrome-Menü (darüber) und Griffen (darunter), wandert die Leiste nach oben.
    bar.classList.toggle('top', low < r.bottom + 50 && low + h > r.top - 90);
}
function selectedText() {
    const s = sel();
    if (!s || s.isCollapsed || !s.rangeCount) return '';
    const b = $('r-body');
    const r = s.getRangeAt(0);
    if (!b.contains(r.commonAncestorContainer)) return '';
    return s.toString().replace(/\s+/g, ' ').trim();
}
function updateBar() {
    A.text = A.env && A.env.isOpen() && $('r-sheet').hidden ? selectedText() : '';
    const bar = $('r-sel');
    if (A.text) placeBar();
    if (bar.hidden === !A.text) { if (A.text) bar.querySelector('[data-sel=search]').hidden = A.text.length > MAX_QUERY; return; }
    bar.hidden = !A.text;
    bar.querySelector('[data-sel=search]').hidden = A.text.length > MAX_QUERY;
}
const hideBar = () => { A.text = ''; $('r-sel').hidden = true; };

function openSheet(title, sub) {
    const sh = $('r-sheet');
    $('rs-title').textContent = title;
    $('rs-sub').textContent = sub || '';
    $('rs-sub').hidden = !sub;
    $('rs-body').textContent = '';
    $('rs-stop').hidden = true; $('rs-copy').hidden = true; $('rs-more').hidden = true;
    sh.hidden = false;
    hideBar();
    const s = sel(); if (s) s.removeAllRanges();
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
    // Auf dem Handy feuert die Markierung nicht in jedem Browser zuverlässig `selectionchange`: zusätzlich nach Fingerheben und im Takt prüfen.
    document.addEventListener('selectionchange', () => { clearTimeout(A.timer); A.timer = setTimeout(updateBar, 120); });
    ['pointerup', 'touchend', 'contextmenu'].forEach(ev => $('r-page').addEventListener(ev, () => setTimeout(updateBar, 250)));
    setInterval(() => { if (A.env && A.env.isOpen()) updateBar(); }, 500);
    $('r-sel').addEventListener('pointerdown', (e) => e.preventDefault());       // Markierung bleibt beim Tippen auf die Leiste
    $('r-sel').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-sel]');
        if (!b || !A.text) return;
        const text = A.text;
        if (b.dataset.sel === 'search') search(text); else ask(b.dataset.sel, text);
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
export function resetSelection() { closeAna(true); A.conv = null; closeSheet(); hideBar(); A.cache.clear(); }
