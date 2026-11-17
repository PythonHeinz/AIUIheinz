/* tools/docheinz/ui/leser.js – Leseansicht (Scrollmodus): Kapitel, Inhaltsverzeichnis, Schriftgröße, Thema, Fortschritt. Reine Oberfläche; Buchinhalt kommt bereinigt aus mod/buch.js. */
import { $ } from './base.js';
import { percent } from '../mod/bibliothek.js';

export const THEMES = ['auto', 'lt', 'sepia', 'dk', 'black'];
const S = { rec: null, src: null, ch: 0, size: 19, theme: 'auto', t: (k) => k, cb: {}, open: false, timer: 0, pushed: false, wired: false };

const body = () => $('r-body');
const fracNow = () => { const b = body(); const max = b.scrollHeight - b.clientHeight; return max > 2 ? Math.max(0, Math.min(1, b.scrollTop / max)) : (b.scrollTop > 0 ? 1 : 0); };
const setFrac = (f) => { const b = body(); const max = b.scrollHeight - b.clientHeight; b.scrollTop = max > 0 ? f * max : 0; };

function updatePos() {
    const p = percent(S.rec, S.ch, fracNow());
    $('r-pos').textContent = (S.rec.chapters > 1 ? S.t('r_pos', { n: S.ch + 1, m: S.rec.chapters }) + ' · ' : '') + S.t('pct', { n: p });
    return p;
}
function save(now) {
    clearTimeout(S.timer);
    const run = () => { if (!S.rec) return; const f = fracNow(); const p = percent(S.rec, S.ch, f); S.cb.onProgress({ ch: S.ch, frac: f, pct: p }); };
    if (now) run(); else S.timer = setTimeout(run, 500);
}

async function show(i, anchor, frac) {
    const src = S.src;
    i = Math.max(0, Math.min(src.chapters.length - 1, i));
    S.ch = i;
    const b = body();
    b.innerHTML = await src.html(i);          // bereinigt (mod/sauber.js, Positivliste)
    b.scrollTop = 0;
    const imgs = Array.from(b.querySelectorAll('img'));
    await Promise.race([Promise.all(imgs.map(m => (m.decode ? m.decode().catch(() => {}) : Promise.resolve()))), new Promise(r => setTimeout(r, 600))]);
    if (anchor) { const el = b.querySelector('[id="' + anchor.replace(/["\\]/g, '') + '"]'); if (el) el.scrollIntoView(); }
    else if (frac) setFrac(frac);
    const c = src.chapters[i];
    $('r-title').textContent = c.title || S.rec.title;
    $('r-prev').disabled = i === 0;
    $('r-next').disabled = i === src.chapters.length - 1;
    $('r-toc').hidden = true; $('r-set').hidden = true;
    updatePos();
    save(true);
}

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
        btn.addEventListener('click', () => show(hit.index, hit.anchor));
        box.appendChild(btn);
    });
}

export function applyTheme(theme) { S.theme = THEMES.includes(theme) ? theme : 'auto'; $('reader').setAttribute('data-rt', S.theme); document.querySelectorAll('#seg-theme button').forEach(b => b.classList.toggle('on', b.dataset.rt === S.theme)); }
export function applySize(px) { S.size = Math.max(14, Math.min(34, Math.round(px) || 19)); body().style.fontSize = S.size + 'px'; $('r-size').value = S.size; $('r-sizev').textContent = S.size; }

function wire() {
    if (S.wired) return;
    S.wired = true;
    $('r-close').addEventListener('click', () => { if (S.pushed) history.back(); else close(); });
    $('r-toc-b').addEventListener('click', () => { $('r-set').hidden = true; $('r-toc').hidden = !$('r-toc').hidden; });
    $('r-set-b').addEventListener('click', () => { $('r-toc').hidden = true; $('r-set').hidden = !$('r-set').hidden; });
    $('r-prev').addEventListener('click', () => show(S.ch - 1));
    $('r-next').addEventListener('click', () => show(S.ch + 1));
    $('r-size').addEventListener('input', (e) => { const f = fracNow(); applySize(+e.target.value); setFrac(f); S.cb.onSettings({ size: S.size }); });
    document.querySelectorAll('#seg-theme button').forEach(b => b.addEventListener('click', () => { applyTheme(b.dataset.rt); S.cb.onSettings({ theme: S.theme }); }));
    body().addEventListener('scroll', () => { if (!S.open) return; updatePos(); save(false); }, { passive: true });
    body().addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('a[data-go]');
        if (!a) return;
        e.preventDefault();
        const hit = S.src.resolve(a.getAttribute('data-go'));
        if (!hit) return;
        if (hit.index === S.ch) { const el = hit.anchor && body().querySelector('[id="' + hit.anchor.replace(/["\\]/g, '') + '"]'); if (el) el.scrollIntoView(); } else show(hit.index, hit.anchor);
    });
    document.addEventListener('keydown', (e) => { if (!S.open || e.target.matches('input')) return; if (e.key === 'Escape') $('r-close').click(); else if (e.key === 'ArrowRight') show(S.ch + 1); else if (e.key === 'ArrowLeft') show(S.ch - 1); });
    document.addEventListener('visibilitychange', () => { if (S.open && document.visibilityState === 'hidden') save(true); });
    window.addEventListener('pagehide', () => { if (S.open) save(true); });
    window.addEventListener('popstate', () => { if (S.open) { S.pushed = false; close(); } });
}

export async function openReader(rec, src, ctx) {
    wire();
    S.rec = rec; S.src = src; S.t = ctx.t; S.cb = ctx;
    applyTheme(ctx.theme); applySize(ctx.size);
    buildToc();
    S.open = true;
    $('reader').hidden = false;
    document.body.style.overflow = 'hidden';
    history.pushState({ dh: 1 }, ''); S.pushed = true;
    await show(rec.ch || 0, '', rec.frac || 0);
}

export function close() {
    if (!S.open) return;
    save(true);
    S.open = false;
    $('reader').hidden = true;
    document.body.style.overflow = '';
    body().textContent = '';
    S.cb.onClose();
    S.rec = null; S.src = null;
}
export const isOpen = () => S.open;
export function relabel(t) { S.t = t; if (S.open) updatePos(); }
