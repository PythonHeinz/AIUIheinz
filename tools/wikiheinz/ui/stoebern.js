/* tools/wikiheinz/ui/stoebern.js – Reiter „Stöbern“: Suche, Trefferliste, Artikelansicht mit Quellenangabe. Logik in ../../../lib/wissen/. */
import { HeinzMarkdown } from './base.js';
import { $, t, S, on, emit, esc, quelleVon, eigene, zim } from './state.js';
import { suche, volltext } from '../../../lib/wissen/suche.js';
import { angabe, linkZu } from '../../../lib/wissen/quelle.js';
import { rueckverweise } from '../../../lib/wissen/eigene.js';
import { keyOf } from '../../../lib/wissen/schluessel.js';

const attr = (s) => esc(String(s)).replace(/"/g, '&quot;');
const kurz = (x) => { const s = String(x || '').replace(/[#>*_`\[\]]+/g, ' ').replace(/\s+/g, ' ').trim(); return s.length > 140 ? s.slice(0, 137).replace(/\s+\S*$/, '') + ' …' : s; };
let seq = 0, cur = null, timer = 0;

export function zeigeTreffer(liste, q) {
    const box = $('treffer'), neu = document.createDocumentFragment();
    for (const r of liste) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'wh-hit'; b.dataset.q = r.q; b.dataset.t = r.titel;
        const qu = quelleVon(r.q), tag = (qu ? qu.name : r.q) + (r.voll ? ' · ' + t('fulltext') : '');
        b.innerHTML = '<b>' + esc(r.titel) + '</b>' + (r.via ? '<small>' + esc(t('redirectFrom', { v: r.via })) + '</small>' : '') + '<small>' + esc(kurz(r.text)) + '</small><span class="wh-tag">' + esc(tag) + '</span>';
        neu.appendChild(b);
    }
    box.replaceChildren(neu);
    $('suchinfo').textContent = !S.quellen.length ? t('none') : !keyOf(q) ? '' : liste.length ? t('hits', { n: liste.length }) : t('noHit', { q });
}

async function suchen() {
    const id = ++seq, q = $('q').value;
    if (!keyOf(q)) { if (id === seq) zeigeTreffer([], ''); return; }
    const r = await suche(S.sp, q, { limit: 30 }), e = eigene();
    if (e && keyOf(q).length >= 3) for (const v of await volltext(S.sp, e.id, q, 10)) if (!r.some(x => x.q === v.q && x.titel === v.titel)) r.push({ ...v, voll: true });
    if (id === seq) zeigeTreffer(r, q);
}

function renderWiki(text) {
    const links = [], md = String(text || '').replace(/\[\[([^\[\]|]+?)(?:\|([^\[\]]*))?\]\]/g, (m, a, b) => { links.push([a.trim(), (b || a).trim()]); return 'WHLINK' + (links.length - 1) + 'END'; });
    return HeinzMarkdown.parse(md).replace(/WHLINK(\d+)END/g, (m, i) => '<a data-wh="' + attr(links[i][0]) + '">' + esc(links[i][1]) + '</a>');
}
const absaetze = (x) => String(x || '').split(/\n+/).filter(Boolean).map(p => '<p>' + esc(p) + '</p>').join('');

export async function oeffne(qid, titel) {
    let e = (await S.sp.hole(qid, keyOf(titel))).find(x => x.t === titel) || (await S.sp.hole(qid, keyOf(titel)))[0], via = '', n = 0;
    while (e && e.v && n++ < 3) { via = via || e.t; const k = keyOf(e.v); e = (await S.sp.hole(qid, k)).find(x => x.t === e.v) || (await S.sp.hole(qid, k))[0]; }
    if (!e || e.v) { emit('msg', t('notFound', { t: titel }), 'err'); return; }
    cur = { q: qid, e, via }; zeige(); window.scrollTo(0, 0);
}

async function zeigeVoll(c) {
    const box = $('a-voll'); box.hidden = true; box.replaceChildren();
    const q = quelleVon(c.q); if (!q || !q.wikipedia) return;
    const st = await zim.status(); if (!st.available) return;
    const a = await zim.artikel(c.e.t); if (!a || cur !== c) return;
    const h = [];
    if (a.infobox && a.infobox.length) h.push('<h3>' + esc(t('infobox')) + '</h3><dl class="wh-info">' + a.infobox.map(([n, v]) => '<dt>' + esc(n) + '</dt><dd>' + esc(v) + '</dd>').join('') + '</dl>');
    for (const s of a.abschnitte || []) h.push('<h3>' + esc(s.h) + '</h3><p>' + esc(s.text) + '</p>');
    if (!h.length) return;
    box.innerHTML = '<div class="help">' + esc(t('fullFromZim', { f: st.datei })) + '</div>' + h.join(''); box.hidden = false;
}

async function zeige() {
    if (!cur) return;
    const { e, via } = cur, q = quelleVon(cur.q), mein = q && q.art === 'eigen';
    $('v-suche').hidden = true; $('v-art').hidden = false;
    $('a-titel').textContent = e.t; $('a-via').textContent = via ? t('redirectFrom', { v: via }) : '';
    $('a-text').innerHTML = mein ? renderWiki(e.x) : absaetze(e.x);
    $('a-tools').hidden = !mein;
    const teile = [];
    if (mein) {
        const h = e.h ? [e.h.autor, e.h.buch, e.h.kapitel].filter(Boolean).join(', ') : '';
        if (h) teile.push(esc(t('origin', { o: h })));
        if ((e.tags || []).length) teile.push(esc(t('tagsLine', { t: e.tags.map(x => '#' + x).join(' ') })));
        if (e.g) teile.push(esc(e.g));
    } else if (q) {
        teile.push(esc(q.stand ? t('extract', { name: q.name, stand: q.stand }) : t('extractNoStand', { name: q.name })), esc(angabe(q, e.t)));
        const l = linkZu(q, e.t); if (l) teile.push('<a href="' + attr(l) + '" target="_blank" rel="noopener noreferrer">' + esc(t('openWiki')) + '</a>');
    }
    $('a-quelle').innerHTML = teile.join('<br>');
    zeigeVoll(cur);
    const rb = mein ? await rueckverweise(S.sp, cur.q, e.t) : [];
    $('a-rueck').hidden = !rb.length;
    $('a-rueck').innerHTML = rb.length ? esc(t('backlinks', { l: '' })) + rb.map(x => '<a data-wh="' + attr(x.t) + '" class="wh-text"><u>' + esc(x.t) + '</u></a>').join(', ') : '';
    if (mein) for (const a of $('a-text').querySelectorAll('a[data-wh]')) { const r = await suche(S.sp, a.dataset.wh, { limit: 1 }); if (!r[0] || !r[0].genau) a.classList.add('neu'); }
}

async function folge(titel) {
    const r = await suche(S.sp, titel, { limit: 3 }), g = r.find(x => x.genau) || null;
    if (g) return oeffne(g.q, g.titel);
    emit('edit', { titel });
}

export function initStoebern() {
    $('q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(suchen, 150); });
    $('treffer').addEventListener('click', (ev) => { const b = ev.target.closest('.wh-hit'); if (b) oeffne(b.dataset.q, b.dataset.t); });
    $('b-back').addEventListener('click', () => { cur = null; $('v-art').hidden = true; $('v-suche').hidden = false; });
    $('b-edit').addEventListener('click', () => { if (cur) emit('edit', { titel: cur.e.t, q: cur.q }); });
    for (const id of ['a-text', 'a-rueck']) $(id).addEventListener('click', (ev) => { const a = ev.target.closest('a[data-wh]'); if (a) { ev.preventDefault(); folge(a.dataset.wh); } });
    on('open', ({ q, titel }) => { emit('tab', 'stoebern'); oeffne(q, titel); });
    on('quellen', () => { if (!cur) suchen(); });
    on('geaendert', () => { if (cur) { const { q, e } = cur; cur = null; oeffne(q, e.t); } });
    on('lang', () => { zeige(); suchen(); });
    suchen();
}
