/* tools/docheinz/ui/leser.js – Leseansicht im Seitenmodus: kein Scrollbalken, Seiten aus Textumfang, Schriftgröße, Schrift und Fenstergröße.
 * Umblättern durch Tippen links/rechts neben den Text, Steuerung (Zurück, Inhalt, Einstellungen, Stand) nur auf Tipp an den oberen Rand und ohne den Text zu verschieben.
 * Reine Oberfläche; Buchinhalt kommt bereinigt aus mod/buch.js, die Seitenrechnung steht in mod/seiten.js. */
import { $ } from './base.js';
import { percent } from '../mod/bibliothek.js';
import { pageCount, clampPage, fracOfPage, fracEnd, pageOfFrac, pageOfOffset, zoneOf, turn } from '../mod/seiten.js';
import { buildLookUi, sync as syncLook } from './satz.js';
import { DEFAULTS, clean, full } from '../mod/satz.js';
import { initVorlesen, startReading, stopReading, afterTurn, isReading, supported as ttsOk } from './vorlesen.js';
import { askChapter, initSelection, resetSelection, closeSheet, closeAna, consumePop, anaIsOpen, hasWahl, clearWahl, drawMarks, markTap, mkOpen, hideMk, renderMarkList, pageNote } from './auswahl.js';
import { openOriginal, closeOriginal, isOriginalOpen } from './pdfansicht.js';
import { FONTS, fontOf, isFont, DEFAULT_FONT } from '../mod/schriften.js';

export const THEMES = ['auto', 'lt', 'sepia', 'dk', 'black', 'custom'];
const S = { rec: null, src: null, ch: 0, page: 0, pages: 1, step: 0, size: 19, theme: 'auto', font: DEFAULT_FONT, btns: false, full: false, t: (k) => k, lang: () => 'en', cb: {}, open: false, timer: 0, raf: 0, seq: 0, pushed: false, wired: false, hadSel: false, gap: false, g: { ...DEFAULTS }, b: null, bookOn: false, prof: [], maxw: 640, cols: 1, ui: false, onCover: false, coverUrl: '' };

const body = () => $('r-body');
const lastCh = () => S.src.chapters.length - 1;

// ---------- Seiten ----------
function measure() {
    const pg = $('r-page'), cs = getComputedStyle(pg);
    const iw = pg.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ih = pg.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    return { w: Math.max(120, Math.floor(Math.min(iw, S.maxw || 640))), h: Math.max(120, Math.floor(ih)) };
}
function layout(frac) {
    const b = body(), { w, h } = measure();
    const cl = $('r-clip');
    // Eine Seite = eine oder zwei Spalten; die nächste Seite beginnt hinter dem Spaltenabstand g (bei einer Spalte g = 0)
    const two = S.cols === 2 && w >= 180, g = two ? 28 : 0, cw = two ? Math.floor((w - g) / 2) : w, W = two ? 2 * cw + g : w;
    cl.style.width = W + 'px'; cl.style.height = h + 'px';
    b.style.width = W + 'px'; b.style.height = h + 'px'; b.style.columnWidth = cw + 'px'; b.style.columnGap = g + 'px'; b.style.setProperty('--ph', h + 'px');
    b.style.transform = 'none';
    S.step = W + g;
    S.pages = pageCount(b.scrollWidth + g, S.step);
    goPage(pageOfFrac(frac, S.pages));
}
function relayout() {
    if (!S.open || !S.src) return;
    clearWahl();
    layout(fracOfPage(S.page, S.pages));
}
function scheduleLayout() {
    cancelAnimationFrame(S.raf);
    S.raf = requestAnimationFrame(relayout);
}
function goPage(i) {
    S.page = clampPage(i, S.pages);
    body().style.transform = 'translateX(' + (-S.page * S.step) + 'px)';        // Seiten werden verschoben, nie gescrollt: so kann auch die Markierung nichts verrücken
    updatePos();
    save(false);
}

function updatePos() {
    if (S.onCover) return 0;
    const p = percent(S.rec, S.ch, fracEnd(S.page, S.pages));
    $('r-pos').textContent = S.t('r_pos', { p: S.page + 1, n: S.pages }) + (S.rec.chapters > 1 ? ' · ' + S.t('r_posc', { c: S.ch + 1, m: S.rec.chapters }) : '') + ' · ' + S.t('pct', { n: p });
    $('r-prog').style.width = p + '%';
    const r = $('reader');
    r.dataset.page = S.page + 1; r.dataset.pages = S.pages; r.dataset.ch = S.ch + 1;
    const here = { ch: S.ch, page: S.page };
    $('r-prev').disabled = false;
    $('r-next').disabled = turn(here, 1, S.pages, S.src.chapters.length) === null;
    return p;
}
function save(now) {
    clearTimeout(S.timer);
    const run = () => { if (!S.rec || S.onCover) return; S.cb.onProgress({ ch: S.ch, frac: fracOfPage(S.page, S.pages), pct: percent(S.rec, S.ch, fracEnd(S.page, S.pages)) }); };
    if (now) run(); else S.timer = setTimeout(run, 500);
}

async function show(i, anchor, frac, at) {
    const src = S.src, seq = ++S.seq;
    i = Math.max(0, Math.min(src.chapters.length - 1, i));
    S.ch = i;
    const b = body();
    b.setAttribute('lang', S.rec.language || document.documentElement.lang || 'en');   // Silbentrennung
    const html = await src.html(i);          // bereinigt (mod/sauber.js, Positivliste)
    if (seq !== S.seq || !S.open) return;
    b.innerHTML = html;
    const imgs = Array.from(b.querySelectorAll('img'));
    await Promise.race([Promise.all(imgs.map(m => (m.decode ? m.decode().catch(() => {}) : Promise.resolve()))), new Promise(r => setTimeout(r, 600))]);
    if (seq !== S.seq || !S.open) return;
    layout(frac || 0);
    drawMarks();
    if (anchor) {
        const el = b.querySelector('[id="' + anchor.replace(/["\\]/g, '') + '"]');
        if (el) goPage(pageOfOffset(el.getBoundingClientRect().left - b.getBoundingClientRect().left, S.step, S.pages));
    } else if (at === 'last') goPage(S.pages - 1);
    const c = src.chapters[i];
    $('r-title').textContent = c.title || S.rec.title;
    closeUi();
    if (!S.onCover) save(true);
}

function go(dir) {
    const rd = isReading();                         // beim Vorlesen: von Hand blättern setzt das Vorlesen auf der neuen Seite fort
    clearHit(); clearWahl();
    if (S.onCover) { if (dir > 0) { showCover(false); save(true); } return; }
    const r = turn({ ch: S.ch, page: S.page }, dir, S.pages, S.src.chapters.length);
    if (!r) { if (dir < 0) showCover(true); return; }
    if (r.ch === S.ch) { goPage(r.page); if (rd) afterTurn(false); }
    else { const p = show(r.ch, '', 0, r.page); if (rd) Promise.resolve(p).then(() => afterTurn(true)); }          // 'first' oder 'last'
}

// ---------- Fundstelle anspringen (Suche) ----------
function clearHit() { try { if (window.CSS && CSS.highlights) CSS.highlights.delete('dh-hit'); } catch { /* ohne Hervorhebung */ } }
async function jump(ch, start, len) {
    showCover(false);
    await show(ch, '', 0);
    const b = body(), w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
    let pos = 0, n;
    while ((n = w.nextNode())) {
        const l = n.nodeValue.length;
        if (start < pos + l) {
            const r = document.createRange(), o = start - pos;
            r.setStart(n, o); r.setEnd(n, Math.min(l, o + len));
            const x = r.getBoundingClientRect().left - b.getBoundingClientRect().left;
            goPage(pageOfOffset(x, S.step, S.pages));
            try { if (window.CSS && CSS.highlights && window.Highlight) CSS.highlights.set('dh-hit', new Highlight(r)); } catch { /* ohne Hervorhebung */ }
            return;
        }
        pos += l;
    }
}

// sichtbarer Text der aktuellen Seite (für „Mit Seitentext“), höchstens 4000 Zeichen
function pageText() {
    const b = body(), x0 = S.page * S.step - 1, x1 = x0 + S.step + 2, base = b.getBoundingClientRect().left;
    const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT), r = document.createRange();
    let out = '', n;
    while ((n = w.nextNode()) && out.length < 4000) {
        r.selectNodeContents(n);
        const rc = r.getBoundingClientRect();
        if (!rc.width && !rc.height) continue;
        const l = rc.left - base;
        if (l >= x1) break;
        if (rc.right - base > x0 + 2) out += n.nodeValue + ' ';
    }
    return out.replace(/\s+/g, ' ').trim();
}

// ---------- Titelseite ----------
function setCover(blob) {
    if (S.coverUrl) { URL.revokeObjectURL(S.coverUrl); S.coverUrl = ''; }
    const img = $('r-cimg');
    if (blob) { S.coverUrl = URL.createObjectURL(blob); img.src = S.coverUrl; } else img.removeAttribute('src');
    img.hidden = !blob;
    $('r-ctitle').hidden = !!blob;
    $('r-ct').textContent = S.rec.title || '';
    $('r-ca').textContent = S.rec.author || '';
}
function showCover(on) {
    S.onCover = on;
    $('r-cover').hidden = !on;
    $('reader').dataset.cover = on ? '1' : '0';
    $('r-prev').disabled = on;
    if (on) { $('r-title').textContent = S.rec.title; $('r-pos').textContent = S.t('r_cover'); $('r-prog').style.width = '0%'; }
    else updatePos();
}

// ---------- Steuerung ----------
function showUi(on) { S.ui = on; $('r-ov').hidden = !on; $('r-ovfoot').hidden = !on; if (!on) { $('r-set').hidden = true; $('r-toc').hidden = true; } $('reader').dataset.set = !$('r-set').hidden ? '1' : '0'; }
function panel(which) {                 // 'set' | 'toc': eines auf, das andere zu; zweiter Aufruf schließt es wieder (Leiste bleibt)
    const a = $(which === 'set' ? 'r-set' : 'r-toc'), b = $(which === 'set' ? 'r-toc' : 'r-set');
    b.hidden = true; a.hidden = !a.hidden;
    $('reader').dataset.set = !$('r-set').hidden ? '1' : '0';
    return !a.hidden;
}
const PAGES = { main: null, fmt: 'main', ai: 'main', font: 'fmt', space: 'fmt', layout: 'fmt', text: 'fmt', color: 'fmt', ctl: 'fmt', prof: 'fmt' };
function setPage(name) {                // Untermenüs im selben Blatt; name null = eine Ebene zurück
    const box = $('r-set'), cur = box.dataset.pg || 'main', to = name === null ? PAGES[cur] : name;
    if (!to || !(to in PAGES)) return;
    box.dataset.pg = to;
    box.querySelectorAll('.dh-sp').forEach(sp => { sp.hidden = sp.dataset.p !== to; });
    $('rs-back').hidden = to === 'main';
    $('rs-ttl').textContent = S.t(to === 'main' ? 'm_set' : 'm_' + to);
    box.scrollTop = 0;
}
function closeUi() { if (S.ui || !$('r-set').hidden || !$('r-toc').hidden) showUi(false); }

function tocTab(name) {
    $('r-tabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
    $('r-tocl').hidden = name !== 'toc'; $('r-markl').hidden = name !== 'marks';
    if (name === 'marks') renderMarkList($('r-markl'), (m) => { closeUi(); if (m.pn) { showCover(false); show(m.ch, '', m.frac || 0); } else jump(m.ch, m.start, m.len); }, () => { closeUi(); pageNote(); });
}
function buildToc() {
    const box = $('r-tocl');
    box.textContent = '';
    tocTab('toc');
    const src = S.src;
    const items = src.toc.length ? src.toc : [];
    if (!items.length) { const p = document.createElement('p'); p.className = 'dh-notoc'; p.textContent = S.t('r_noToc'); box.appendChild(p); return; }
    items.forEach(it => {
        const hit = src.resolve(it.href);
        if (!hit) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'l' + Math.min(it.level || 1, 3);
        btn.textContent = it.title || S.t('r_part', { n: hit.index + 1 });
        btn.addEventListener('click', () => { showCover(false); show(hit.index, hit.anchor); });
        box.appendChild(btn);
    });
}

function buildFonts() {
    const sel = $('sel-font');
    sel.textContent = '';
    const lang = S.lang() === 'de' ? 'de' : 'en';
    FONTS.forEach(f => sel.appendChild(Object.assign(document.createElement('option'), { value: f.id, textContent: f.label[lang] })));
    sel.value = S.font;
}

export function applyTheme(theme) { S.theme = THEMES.includes(theme) ? theme : 'auto'; $('reader').setAttribute('data-rt', S.theme); $('sel-theme').value = S.theme; }
// ---------- Aussehen: global, pro Buch überschreibbar ----------
const CTX = { themes: THEMES, isFont };
const eff = () => full(S.g, S.bookOn ? S.b : null);
function applyTypo(e) {
    const r = $('reader'), st = r.style;
    st.setProperty('--lh', e.lh); st.setProperty('--ps', e.ps + 'em'); st.setProperty('--ind', e.ind + 'em'); st.setProperty('--mx', e.mx + 'px'); st.setProperty('--my', e.my + 'px');
    st.setProperty('--ws', e.ws + 'em'); st.setProperty('--ls', e.ls + 'em'); st.setProperty('--fw', e.fw); st.setProperty('--cfg', e.fgc); st.setProperty('--cbg', e.bgc);
    r.dataset.just = e.just; r.dataset.hyph = e.hyph; r.dataset.wid = e.wid;
    $('r-page').style.filter = e.bri === 100 ? '' : 'brightness(' + e.bri / 100 + ')';
    S.maxw = e.maxw; S.cols = e.cols;
    if (S.open) scheduleLayout();
}
function applyLook() {
    const e = eff();
    applyTheme(e.theme); applySize(e.size); applyFont(e.font); applyTypo(e);
    syncLook();
}
function saveLook() { if (S.cb.onLook) S.cb.onLook({ global: S.g, book: S.bookOn && S.b && Object.keys(S.b).length ? S.b : null }); }
function setLook(k, v) {
    const o = clean({ [k]: v }, CTX);
    if (!(k in o)) return;
    const put = (key, val) => { if (S.bookOn) S.b = Object.assign(S.b || {}, { [key]: val }); else S.g[key] = val; };
    put(k, o[k]);
    if (k === 'fgc' || k === 'bgc') put('theme', 'custom');
    applyLook(); saveLook();
}
const lookApi = () => ({
    t: S.t,
    get: (k) => eff()[k],
    set: setLook,
    scope: () => S.bookOn,
    setScope: (book) => { S.bookOn = !!book; S.b = book ? (S.b || {}) : null; applyLook(); saveLook(); },
    reset: () => { if (S.bookOn) S.b = {}; else S.g = { ...DEFAULTS }; applyLook(); saveLook(); },
    profiles: () => S.prof,
    saveProfile: (name) => { const look = clean(eff(), CTX); const same = S.prof.find(p => p.name === name); if (same) same.look = look; else S.prof.push({ id: 'p' + Date.now().toString(36), name, look }); S.cb.onProfiles && S.cb.onProfiles(S.prof); },
    applyProfile: (id) => { const p = S.prof.find(x => x.id === id); if (!p) return; if (S.bookOn) S.b = { ...p.look }; else S.g = { ...S.g, ...p.look }; applyLook(); saveLook(); },
    deleteProfile: (id) => { S.prof = S.prof.filter(p => p.id !== id); S.cb.onProfiles && S.cb.onProfiles(S.prof); },
});

export function applyGap(on) { S.gap = !!on; $('reader').dataset.gap = S.gap ? '1' : '0'; $('sw-gap').checked = S.gap; }
export function applySize(px) { S.size = Math.max(10, Math.min(60, Math.round(px) || 19)); body().style.fontSize = S.size + 'px'; $('r-size').value = S.size; $('r-sizev').textContent = S.size; if (S.open) scheduleLayout(); }
export function applyBtns(on) { S.btns = !!on; $('r-prev').hidden = $('r-next').hidden = !S.btns; $('sw-btns').checked = S.btns; }
export async function applyFont(id) {
    S.font = isFont(id) ? id : DEFAULT_FONT;
    $('reader').setAttribute('data-font', S.font);
    $('sel-font').value = S.font;
    const spec = fontOf(S.font).load;
    if (spec) { try { await Promise.all(spec.map(x => document.fonts.load(x))); } catch { /* Rückfall auf die nächste Schrift der Liste */ } }
    if (S.open) scheduleLayout();
}

function onTap(e) {
    if (S.full) fullscreen(true);
    const hadSel = S.hadSel; S.hadSel = false;
    if (mkOpen()) { if (!markTap(e.clientX, e.clientY)) hideMk(); return; }          // Leiste einer Markierung offen: Tippen schließt sie (oder öffnet die nächste)
    if (hadSel || hasWahl()) { clearWahl(); return; }                                 // Markierung aktiv: Tippen hebt sie nur auf, kein Blättern
    const a = e.target.closest && e.target.closest('a[data-go]');
    if (a) {
        e.preventDefault();
        const hit = S.src.resolve(a.getAttribute('data-go'));
        if (!hit) return;
        if (hit.index === S.ch) {
            const b = body(), el = hit.anchor && b.querySelector('[id="' + hit.anchor.replace(/["\\]/g, '') + '"]');
            if (el) goPage(pageOfOffset(el.getBoundingClientRect().left - b.getBoundingClientRect().left, S.step, S.pages));
            closeUi();
        } else show(hit.index, hit.anchor);
        return;
    }
    if (!$('r-sheet').hidden) { closeSheet(); return; }
    if (S.ui) { closeUi(); return; }
    const r = $('r-page').getBoundingClientRect();
    const z = zoneOf(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
    if (z !== 'top' && markTap(e.clientX, e.clientY)) return;                       // Tippen auf markierten Text öffnet die Leiste der Markierung
    if (z === 'top') showUi(true);
    else if (z === 'next') go(1);
    else if (z === 'prev') go(-1);
}

function wire() {
    if (S.wired) return;
    S.wired = true;
    // Pfeil: bei offenem Einstellungs- oder Inhaltsfeld nur dieses schließen (zurück ins Buch), sonst den Reader verlassen
    $('r-close').addEventListener('click', () => { if (!$('r-set').hidden && ($('r-set').dataset.pg || 'main') !== 'main') { setPage(null); return; } if (!$('r-set').hidden || !$('r-toc').hidden) { $('r-set').hidden = true; $('r-toc').hidden = true; $('reader').dataset.set = '0'; return; } if (S.pushed) { S.leaving = true; history.back(); } else close(); });
    $('r-toc-b').addEventListener('click', () => { if (panel('toc')) tocTab('toc'); });
    $('r-tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) tocTab(b.dataset.tab); });
    $('r-orig-b').addEventListener('click', () => {
        const r = S.src.pdf.range(S.ch), f = fracOfPage(S.page, S.pages);
        history.pushState({ dh: 1 }, '');
        openOriginal(S.src, r.from + Math.round(f * (r.to - r.from)), { onClose: (pg) => { const ch = S.src.pdf.chapterOf(pg), q = S.src.pdf.range(ch); show(ch, '', q.to > q.from ? (pg - q.from) / (q.to - q.from + 1) : 0); showUi(false); } });
    });
    $('r-set-b').addEventListener('click', () => { if (panel('set')) setPage('main'); });
    $('sw-gap').addEventListener('change', (e) => { applyGap(e.target.checked); S.cb.onSettings({ gap: S.gap }); });
    $('r-prev').addEventListener('click', () => go(-1));
    $('r-next').addEventListener('click', () => go(1));
    $('r-size').addEventListener('input', (e) => setLook('size', +e.target.value));
    $('sel-theme').addEventListener('change', (e) => setLook('theme', e.target.value));
    $('sel-scope').addEventListener('change', (e) => lookApi().setScope(e.target.value === '1'));
    $('look-reset').addEventListener('click', () => lookApi().reset());
    const setFull = (on) => { S.full = on; $('sw-full').checked = on; S.cb.onSettings({ full: on }); fullscreen(on); fsIcon(); };
    $('r-fs').addEventListener('click', () => setFull(!S.full));
    document.addEventListener('fullscreenchange', fsIcon);
    $('sw-btns').addEventListener('change', (e) => { applyBtns(e.target.checked); S.cb.onSettings({ btns: S.btns }); });
    $('sel-font').addEventListener('change', (e) => setLook('font', e.target.value));
    $('r-set').addEventListener('click', (e) => {
        const tt = e.target.closest('#tts-row');
        if (tt) { $('r-set').hidden = true; $('reader').dataset.set = '0'; startReading(); return; }
        const c = e.target.closest('[data-chap]');
        if (c) { $('r-set').hidden = true; $('reader').dataset.set = '0'; askChapter(c.dataset.chap === 'sum' ? 'summary' : 'explain', c.dataset.chap === 'ask'); return; }
        const g = e.target.closest('[data-go]'); if (g) setPage(g.dataset.go);
    });
    $('rs-back').addEventListener('click', () => setPage(null));
    const pg = $('r-page');
    pg.addEventListener('pointerdown', () => { S.hadSel = hasWahl(); }, true);
    pg.addEventListener('click', onTap);
    if (window.ResizeObserver) new ResizeObserver(() => { if (S.open) scheduleLayout(); }).observe(pg);
    else window.addEventListener('resize', () => { if (S.open) scheduleLayout(); });
    document.addEventListener('keydown', (e) => {
        if (!S.open || e.target.matches('input, select, textarea') || (anaIsOpen() && e.key !== 'Escape')) return;
        if (e.key === 'Escape') { if (anaIsOpen()) closeAna(false); else if (!$('r-sheet').hidden) closeSheet(); else if (S.ui) closeUi(); else $('r-close').click(); }
        else if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); }
        else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
    });
    document.addEventListener('visibilitychange', () => { if (S.open && document.visibilityState === 'hidden') save(true); });
    window.addEventListener('pagehide', () => { if (S.open) save(true); });
    window.addEventListener('popstate', () => {
        if (consumePop()) return;
        if (!S.open) return;
        if (isOriginalOpen()) { history.pushState({ dh: 1 }, ''); closeOriginal(); return; }
        // Zurück-Geste: erst Einstellungen/Inhalt/Leiste schließen, im Buch bleiben; erst danach den Reader verlassen
        const leaving = S.leaving; S.leaving = false;
        if (!leaving && (S.ui || !$('r-set').hidden || !$('r-toc').hidden)) { history.pushState({ dh: 1 }, ''); closeUi(); return; }
        S.pushed = false; close();
    });
}

// Vollbild beim Lesen: nur der Text, keine Statusleiste und keine Navigationsleiste. Der Browser erlaubt es nur nach einer Berührung; geht es verloren
// (App-Wechsel, Wischen vom Rand), holt das nächste Tippen im Leser es zurück. Ohne Unterstützung passiert nichts.
function fsIcon() { const on = !!document.fullscreenElement || S.full; const u = $('r-fs-i'); if (u) u.setAttribute('href', '../../lib/icons.svg#' + (on ? 'i-shrink' : 'i-expand')); }
function fullscreen(on) {
    try {
        const d = document, el = d.documentElement;
        if (!on) { if (d.fullscreenElement && d.exitFullscreen) { const r = d.exitFullscreen(); if (r && r.catch) r.catch(() => {}); } return; }
        if ( !d.fullscreenElement && el.requestFullscreen) { const r = el.requestFullscreen({ navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); }
    } catch { /* ohne Vollbild weiterlesen */ }
}
export async function openReader(rec, src, ctx) {
    wire();
    S.full = ctx.full === true; $('sw-full').checked = S.full; fullscreen(S.full); fsIcon();
    $('r-fs').hidden = !document.documentElement.requestFullscreen;
    S.rec = rec; S.src = src; S.t = ctx.t; S.lang = ctx.lang || S.lang; S.cb = ctx;
    S.g = { ...DEFAULTS, ...clean({ size: ctx.size, theme: ctx.theme, font: ctx.font, ...(ctx.look || {}) }, CTX) };
    S.b = ctx.bookLook && Object.keys(clean(ctx.bookLook, CTX)).length ? clean(ctx.bookLook, CTX) : null;
    S.bookOn = !!S.b;
    S.prof = Array.isArray(ctx.profiles) ? ctx.profiles.slice() : [];
    applyBtns(ctx.btns); applyGap(ctx.gap === true);
    buildFonts();
    buildLookUi(lookApi());
    applyTypo(eff()); applyTheme(eff().theme); applySize(eff().size);
    await applyFont(eff().font);
    syncLook();
    buildToc();
    $('r-orig-b').hidden = !src.pdf;
    S.open = true;
    showUi(false);
    $('reader').hidden = false;
    document.body.style.overflow = 'hidden';
    history.pushState({ dh: 1 }, ''); S.pushed = true;
    initSelection({ marks: ctx.marks, onMarks: (l) => S.cb.onMarks && S.cb.onMarks(l), ch: () => S.ch, frac: () => fracOfPage(S.page, S.pages), isOpen: () => S.open, rec: () => S.rec, src: () => S.src, t: (k, v) => S.t(k, v), lang: () => S.lang(), jump, pageText });
    initVorlesen({
        body, rec: () => S.rec, lang: () => S.lang(), t: (k, v) => S.t(k, v), isOpen: () => S.open,
        pageInfo: () => ({ page: S.page, step: S.step }),
        ready: () => { if (S.onCover) showCover(false); closeUi(); clearHit(); clearWahl(); },
        relayout: () => scheduleLayout(),
        follow: (r) => {                                                      // gelesenen Satz markieren, Seite nachführen
            const b = body(), q = r.getClientRects()[0] || r.getBoundingClientRect();
            goPage(pageOfOffset(q.left - b.getBoundingClientRect().left, S.step, S.pages));
            const cl = $('r-clip').getBoundingClientRect(), q2 = r.getClientRects()[0] || r.getBoundingClientRect();          // Gegenprobe: liegt der Satz sichtbar im Blatt?
            if (q2.left >= cl.right - 2) goPage(S.page + Math.max(1, Math.floor((q2.left - cl.left) / S.step)));
            else if (q2.left < cl.left - 2) goPage(S.page - Math.max(1, Math.ceil((cl.left - q2.left) / S.step)));
            try { if (window.CSS && CSS.highlights && window.Highlight) CSS.highlights.set('dh-read', new Highlight(r)); } catch { /* ohne Hervorhebung */ }
        },
        nextChapter: async () => { if (S.ch + 1 >= S.src.chapters.length) return false; await show(S.ch + 1, '', 0); return true; },
    });
    $('tts-row').hidden = !ttsOk();
    setCover(ctx.cover || null);
    const start = !(rec.ch > 0 || rec.frac > 0);
    await show(rec.ch || 0, '', rec.frac || 0);
    showCover(start);
    if (ctx.jumpTo) await jump(ctx.jumpTo.ch, ctx.jumpTo.start, ctx.jumpTo.len);          // Treffer der Volltextsuche der Bibliothek
}

export function close() {
    if (!S.open) return;
    stopReading();
    save(true);
    closeOriginal(true); resetSelection(); clearHit();
    S.open = false; S.seq++;
    cancelAnimationFrame(S.raf);
    $('reader').hidden = true;
    document.body.style.overflow = '';
    body().textContent = '';
    $('r-cover').hidden = true; S.onCover = false;
    if (S.coverUrl) { URL.revokeObjectURL(S.coverUrl); S.coverUrl = ''; }
    S.cb.onClose();                                  // Vollbild bleibt an: Chrome zeigt den Hinweis zum Beenden sonst bei jedem Buch neu; endet beim Verlassen der Seite von selbst
    S.rec = null; S.src = null;
}
export const isOpen = () => S.open;
export function relabel(t, lang) { S.t = t; if (lang) S.lang = () => lang; buildFonts(); if (S.open) { updatePos(); buildLookUi(lookApi()); } }
