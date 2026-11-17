/* tools/convert2/ui/reader.js – Vollbild-Leseansicht für ein gelesenes EPUB (Book aus mod/epub-lesen.js). Reine Oberfläche, keine Formatlogik. */
import { $ } from './base.js';

const S = { book: null, i: 0, size: 17, t: (k) => k, onSize: () => {}, font: 'serif' };

function chapterIndex(href) { const h = (href || '').split('#')[0]; return S.book.chapters.findIndex(c => c.href === h); }

async function show(i, anchor) {
    const b = S.book;
    i = Math.max(0, Math.min(b.chapters.length - 1, i));
    S.i = i;
    const body = $('r-body');
    body.innerHTML = await b.chapterBody(i);
    body.scrollTop = 0;
    if (anchor) { const el = body.querySelector('[id="' + anchor.replace(/"/g, '') + '"]'); if (el) el.scrollIntoView(); }
    const c = b.chapters[i];
    $('r-pos').textContent = S.t('r_chapter', { n: i + 1, m: b.chapters.length }) + (c.title ? ' · ' + c.title : '');
    $('r-prev').disabled = i === 0;
    $('r-next').disabled = i === b.chapters.length - 1;
    $('r-tocbox').hidden = true;
}

function buildToc() {
    const box = $('r-tocbox');
    box.textContent = '';
    const items = S.book.toc.length ? S.book.toc : S.book.chapters.map(c => ({ title: c.title || c.href, href: c.href, level: 1 }));
    items.forEach(it => {
        const idx = chapterIndex(it.href);
        if (idx < 0) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'l' + Math.min(it.level, 3);
        btn.textContent = it.title;
        btn.addEventListener('click', () => show(idx, (it.href.split('#')[1] || '')));
        box.appendChild(btn);
    });
}

function applySize() { $('r-body').style.fontSize = S.size + 'px'; }

let wired = false;
function wire() {
    if (wired) return;
    wired = true;
    $('r-close').addEventListener('click', closeReader);
    $('r-toc').addEventListener('click', () => { $('r-tocbox').hidden = !$('r-tocbox').hidden; });
    $('r-prev').addEventListener('click', () => show(S.i - 1));
    $('r-next').addEventListener('click', () => show(S.i + 1));
    $('r-smaller').addEventListener('click', () => { S.size = Math.max(13, S.size - 1); applySize(); S.onSize(S.size); });
    $('r-larger').addEventListener('click', () => { S.size = Math.min(30, S.size + 1); applySize(); S.onSize(S.size); });
    document.addEventListener('keydown', (e) => { if ($('reader').hidden) return; if (e.key === 'Escape') closeReader(); else if (e.key === 'ArrowRight') show(S.i + 1); else if (e.key === 'ArrowLeft') show(S.i - 1); });
}

export async function openReader(book, ctx) {
    wire();
    S.book = book; S.t = ctx.t; S.size = ctx.size || 17; S.onSize = ctx.onSize || (() => {}); S.font = ctx.font || 'serif';
    $('r-body').className = 'c2-book ' + S.font;
    applySize();
    buildToc();
    $('reader').hidden = false;
    document.body.style.overflow = 'hidden';
    await show(0);
}

export function closeReader() {
    $('reader').hidden = true;
    document.body.style.overflow = '';
    $('r-body').textContent = '';
}
