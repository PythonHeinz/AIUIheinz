/* tools/docheinz/ui/leser.js – Leseansicht im Seitenmodus: kein Scrollbalken, Seiten aus Textumfang, Schriftgröße, Schrift und Fenstergröße.
 * Umblättern durch Tippen links/rechts neben den Text, Steuerung (Zurück, Inhalt, Einstellungen, Stand) nur auf Tipp an den oberen Rand und ohne den Text zu verschieben.
 * Reine Oberfläche; Buchinhalt kommt bereinigt aus mod/buch.js, die Seitenrechnung steht in mod/seiten.js. */
import { $ } from './base.js';
import { percent } from '../mod/bibliothek.js';
import { pageCount, clampPage, fracOfPage, fracEnd, pageOfFrac, pageOfOffset, zoneOf, turn } from '../mod/seiten.js';
import { initSelection, resetSelection, closeSheet, closeAna, consumePop, anaIsOpen, buildAiChips, hasWahl, clearWahl } from './auswahl.js';
import { FONTS, fontOf, isFont, DEFAULT_FONT } from '../mod/schriften.js';

export const THEMES = ['auto', 'lt', 'sepia', 'dk', 'black'];
const S = { rec: null, src: null, ch: 0, page: 0, pages: 1, step: 0, size: 19, theme: 'auto', font: DEFAULT_FONT, btns: false, t: (k) => k, lang: () => 'en', cb: {}, open: false, timer: 0, raf: 0, seq: 0, pushed: false, wired: false, hadSel: false, gap: false, ui: false, onCover: false, coverUrl: '' };

const body = () => $('r-body');
const lastCh = () => S.src.chapters.length - 1;

// ---------- Seiten ----------
function measure() {
    const pg = $('r-page'), cs = getComputedStyle(pg);
    const iw = pg.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ih = pg.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    return { w: Math.max(120, Math.floor(Math.min(iw, 640))), h: Math.max(120, Math.floor(ih)) };
}
function layout(frac) {
    const b = body(), { w, h } = measure();
    const cl = $('r-clip');
    cl.style.width = w + 'px'; cl.style.height = h + 'px';
    b.style.width = w + 'px'; b.style.height = h + 'px'; b.style.columnWidth = w + 'px'; b.style.setProperty('--ph', h + 'px');
    b.style.transform = 'none';
    S.step = w;
    S.pages = pageCount(b.scrollWidth, w);
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
    clearHit(); clearWahl();
    if (S.onCover) { if (dir > 0) { showCover(false); save(true); } return; }
    const r = turn({ ch: S.ch, page: S.page }, dir, S.pages, S.src.chapters.length);
    if (!r) { if (dir < 0) showCover(true); return; }
    if (r.ch === S.ch) goPage(r.page);
    else show(r.ch, '', 0, r.page);          // 'first' oder 'last'
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
function closeUi() { if (S.ui || !$('r-set').hidden || !$('r-toc').hidden) showUi(false); }

function buildToc() {
    const box = $('r-toc');
    box.textContent = '';
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
    const box = $('seg-font');
    box.textContent = '';
    const lang = S.lang() === 'de' ? 'de' : 'en';
    FONTS.forEach(f => {
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.font = f.id; b.textContent = f.label[lang];
        b.classList.toggle('on', f.id === S.font);
        box.appendChild(b);
    });
}

export function applyTheme(theme) { S.theme = THEMES.includes(theme) ? theme : 'auto'; $('reader').setAttribute('data-rt', S.theme); document.querySelectorAll('#seg-theme button').forEach(b => b.classList.toggle('on', b.dataset.rt === S.theme)); }
export function applyGap(on) { S.gap = !!on; $('reader').dataset.gap = S.gap ? '1' : '0'; document.querySelectorAll('#seg-gap button').forEach(b => b.classList.toggle('on', (b.dataset.gap === '1') === S.gap)); }
export function applySize(px) { S.size = Math.max(14, Math.min(34, Math.round(px) || 19)); body().style.fontSize = S.size + 'px'; $('r-size').value = S.size; $('r-sizev').textContent = S.size; if (S.open) scheduleLayout(); }
export function applyBtns(on) { S.btns = !!on; $('r-prev').hidden = $('r-next').hidden = !S.btns; document.querySelectorAll('#seg-btns button').forEach(b => b.classList.toggle('on', (b.dataset.btns === '1') === S.btns)); }
export async function applyFont(id) {
    S.font = isFont(id) ? id : DEFAULT_FONT;
    $('reader').setAttribute('data-font', S.font);
    document.querySelectorAll('#seg-font button').forEach(b => b.classList.toggle('on', b.dataset.font === S.font));
    const spec = fontOf(S.font).load;
    if (spec) { try { await Promise.all(spec.map(x => document.fonts.load(x))); } catch { /* Rückfall auf die nächste Schrift der Liste */ } }
    if (S.open) scheduleLayout();
}

function onTap(e) {
    const hadSel = S.hadSel; S.hadSel = false;
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
    if (z === 'top') showUi(true);
    else if (z === 'next') go(1);
    else if (z === 'prev') go(-1);
}

function wire() {
    if (S.wired) return;
    S.wired = true;
    // Pfeil: bei offenem Einstellungs- oder Inhaltsfeld nur dieses schließen (zurück ins Buch), sonst den Reader verlassen
    $('r-close').addEventListener('click', () => { if (!$('r-set').hidden || !$('r-toc').hidden) { $('r-set').hidden = true; $('r-toc').hidden = true; $('reader').dataset.set = '0'; return; } if (S.pushed) { S.leaving = true; history.back(); } else close(); });
    $('r-toc-b').addEventListener('click', () => { panel('toc'); });
    $('r-set-b').addEventListener('click', () => { if (panel('set')) buildAiChips(); });
    document.querySelectorAll('#seg-gap button').forEach(b => b.addEventListener('click', () => { applyGap(b.dataset.gap === '1'); S.cb.onSettings({ gap: S.gap }); }));
    $('r-prev').addEventListener('click', () => go(-1));
    $('r-next').addEventListener('click', () => go(1));
    $('r-size').addEventListener('input', (e) => { applySize(+e.target.value); S.cb.onSettings({ size: S.size }); });
    document.querySelectorAll('#seg-theme button').forEach(b => b.addEventListener('click', () => { applyTheme(b.dataset.rt); S.cb.onSettings({ theme: S.theme }); }));
    document.querySelectorAll('#seg-btns button').forEach(b => b.addEventListener('click', () => { applyBtns(b.dataset.btns === '1'); S.cb.onSettings({ btns: S.btns }); }));
    $('seg-font').addEventListener('click', (e) => { const b = e.target.closest('button[data-font]'); if (!b) return; applyFont(b.dataset.font); S.cb.onSettings({ font: S.font }); });
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
        // Zurück-Geste: erst Einstellungen/Inhalt/Leiste schließen, im Buch bleiben; erst danach den Reader verlassen
        const leaving = S.leaving; S.leaving = false;
        if (!leaving && (S.ui || !$('r-set').hidden || !$('r-toc').hidden)) { history.pushState({ dh: 1 }, ''); closeUi(); return; }
        S.pushed = false; close();
    });
}

export async function openReader(rec, src, ctx) {
    wire();
    S.rec = rec; S.src = src; S.t = ctx.t; S.lang = ctx.lang || S.lang; S.cb = ctx;
    applyTheme(ctx.theme); applySize(ctx.size); applyBtns(ctx.btns); applyGap(ctx.gap === true);
    buildFonts();
    await applyFont(ctx.font);
    buildToc();
    S.open = true;
    showUi(false);
    $('reader').hidden = false;
    document.body.style.overflow = 'hidden';
    history.pushState({ dh: 1 }, ''); S.pushed = true;
    initSelection({ isOpen: () => S.open, rec: () => S.rec, src: () => S.src, t: (k, v) => S.t(k, v), lang: () => S.lang(), jump, pageText });
    setCover(ctx.cover || null);
    const start = !(rec.ch > 0 || rec.frac > 0);
    await show(rec.ch || 0, '', rec.frac || 0);
    showCover(start);
}

export function close() {
    if (!S.open) return;
    save(true);
    resetSelection(); clearHit();
    S.open = false; S.seq++;
    cancelAnimationFrame(S.raf);
    $('reader').hidden = true;
    document.body.style.overflow = '';
    body().textContent = '';
    $('r-cover').hidden = true; S.onCover = false;
    if (S.coverUrl) { URL.revokeObjectURL(S.coverUrl); S.coverUrl = ''; }
    S.cb.onClose();
    S.rec = null; S.src = null;
}
export const isOpen = () => S.open;
export function relabel(t, lang) { S.t = t; if (lang) S.lang = () => lang; buildFonts(); if (S.open) updatePos(); }
