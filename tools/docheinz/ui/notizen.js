/* tools/docheinz/ui/notizen.js – Übersicht aller Markierungen und Notizen über alle Bücher (Logik in ../mod/sammlung.js).
 * initNotes({ t, books, open, save }) einmal beim Start; renderNotes() nach jeder Änderung der Liste.
 *   open(bookId, jumpTo) öffnet das Buch an der Stelle; save(bookId, marks) speichert die geänderten Markierungen des Buchs. */
import { $ } from './base.js';
import { collect, markTags, filterItems, groupItems, countBy, toMarkdownAll } from '../mod/sammlung.js';
import { COLORS, updateMark, removeMark } from '../mod/markierung.js';
import { parseTags } from '../mod/bibliothek.js';

const S = { env: null, open: false, q: '', color: '', tag: '', notesOnly: false, by: 'book', edit: '' };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const btn = (cls, text, data) => { const b = el('button', cls, text); b.type = 'button'; Object.assign(b.dataset, data || {}); return b; };
const labels = () => { const t = S.env.t; return { title: t('nt_mdTitle'), color: COLORS.map(c => t('mk_' + c)), note: t('m_noteL'), ai: t('mk_ai'), pageNote: t('mk_pn'), untagged: t('nt_untagged'), count: t('nt_mdCount') }; };
const current = () => filterItems(collect(S.env.books()), { q: S.q, color: S.color, tag: S.tag, notesOnly: S.notesOnly });
export const markdown = () => toMarkdownAll(current(), S.by, labels());

export function renderNotes(keepFocus) {
    const box = $('notes'); if (!box || !S.env) return;
    box.hidden = !S.open;
    if (!S.open) { box.textContent = ''; return; }
    const t = S.env.t, all = collect(S.env.books()), tags = markTags(all);
    if (S.tag && !tags.some(x => x.tag.toLowerCase() === S.tag.toLowerCase())) S.tag = '';
    const items = filterItems(all, { q: S.q, color: S.color, tag: S.tag, notesOnly: S.notesOnly }), c = countBy(items);
    const hadFocus = keepFocus && document.activeElement && document.activeElement.id === 'nt-q', pos = hadFocus ? document.activeElement.selectionStart : 0;
    box.textContent = '';
    const head = el('div', 'dh-fth'); head.append(el('b', '', t('nt_title')), btn('pill', t('ft_close'), { nt: 'close' })); box.appendChild(head);
    if (!all.length) { box.appendChild(el('p', 'help', t('nt_none'))); return; }
    const q = el('input', 'inp'); q.id = 'nt-q'; q.type = 'search'; q.autocomplete = 'off'; q.spellcheck = false; q.placeholder = t('nt_search'); q.value = S.q; box.appendChild(q);
    const cols = el('div', 'dh-chips');
    cols.appendChild(btn('pill' + (!S.color ? ' acc' : ''), t('tg_all'), { ntc: '' }));
    COLORS.forEach((k, i) => { const b = btn('pill dh-ntc c' + i + (S.color === k ? ' acc' : ''), t('mk_' + k), { ntc: k }); b.setAttribute('aria-pressed', S.color === k ? 'true' : 'false'); cols.appendChild(b); });
    cols.appendChild(btn('pill' + (S.notesOnly ? ' acc' : ''), t('mk_onlyN'), { nt: 'notes' }));
    box.appendChild(cols);
    if (tags.length) {
        const tb = el('div', 'dh-chips');
        tb.appendChild(btn('pill' + (!S.tag ? ' acc' : ''), t('tg_all'), { ntt: '' }));
        tags.forEach(x => { const on = S.tag && x.tag.toLowerCase() === S.tag.toLowerCase(); const b = btn('pill' + (on ? ' acc' : ''), '#' + x.tag + ' ' + x.count, { ntt: x.tag }); b.setAttribute('aria-pressed', on ? 'true' : 'false'); tb.appendChild(b); });
        box.appendChild(tb);
    }
    const by = el('div', 'dh-chips');
    by.appendChild(el('small', 'help', t('nt_by')));
    [['book', 'nt_byBook'], ['tag', 'nt_byTag'], ['color', 'nt_byColor']].forEach(([k, key]) => by.appendChild(btn('pill' + (S.by === k ? ' acc' : ''), t(key), { ntb: k })));
    box.appendChild(by);
    box.appendChild(el('p', 'help', t('nt_count', { n: c.marks, b: c.books, m: c.notes })));
    const ex = el('div', 'dh-xb'); ex.append(btn('pill', t('m_copyMd'), { nt: 'copy' }), btn('pill acc', t('m_export'), { nt: 'save' })); box.appendChild(ex);
    for (const g of groupItems(items, S.by)) {
        const title = S.by === 'book' ? g.title : S.by === 'tag' ? (g.key === '' ? t('nt_untagged') : '#' + g.title) : g.key === 'pn' ? t('mk_pn') : t('mk_' + g.key);
        box.appendChild(el('div', 'dh-group', title + ' · ' + g.items.length));
        g.items.forEach(({ book, mark: m }) => {
            const row = el('div', 'dh-ni'), id = book.id + '|' + m.id;
            const b = btn('dh-mq ' + (m.pn ? 'cp' : 'c' + m.color), '', { nt: 'go', b: book.id, m: m.id });
            b.append(el('span', 'q', m.pn ? (m.text ? m.text + ' …' : '') : m.text), el('small', '', (S.by === 'book' ? '' : book.title + ' · ') + (m.pn ? t('mk_pn') + ' · ' : '') + t('r_part', { n: m.ch + 1 })));
            if (m.note) b.appendChild(el('span', 'n', (m.ai ? t('mk_ai') + ': ' : '') + m.note));
            if ((m.tags || []).length) b.appendChild(el('small', 'dh-tags', m.tags.map(x => '#' + x).join(' ')));
            row.appendChild(b);
            const side = el('div', 'dh-nside'); side.append(btn('ibtn dh-tgbtn', '#', { nt: 'tg', id }), btn('ibtn', '', { nt: 'del', id }));
            side.lastChild.setAttribute('aria-label', t('mk_del')); side.lastChild.innerHTML = '<svg class="i"><use href="../../lib/icons.svg#i-trash"/></svg>';
            side.firstChild.setAttribute('aria-label', t('tg_btn'));
            row.appendChild(side);
            if (S.edit === id) {
                const ed = el('div', 'dh-nedit'), inp = el('input', 'inp'); inp.id = 'nt-tg'; inp.type = 'text'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.placeholder = t('tg_phM'); inp.value = (m.tags || []).join(', ');
                inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveTags(book.id, m.id, inp.value); });
                const used = tags.filter(x => !(m.tags || []).some(c => c.toLowerCase() === x.tag.toLowerCase())).slice(0, 10), chips = el('div', 'dh-chips');
                used.forEach(x => chips.appendChild(btn('pill', '#' + x.tag, { nt: 'tgadd', tag: x.tag })));
                const bt = el('div', 'dh-xb'); bt.append(btn('pill', t('delNo'), { nt: 'tgno' }), btn('pill acc', t('tg_ok'), { nt: 'tgok', b: book.id, m: m.id }));
                ed.append(inp, chips, bt); row.appendChild(ed);
            }
            box.appendChild(row);
        });
    }
    if (!items.length) box.appendChild(el('p', 'help', t('nt_empty')));
    if (hadFocus) { const n = $('nt-q'); n.focus(); try { n.setSelectionRange(pos, pos); } catch { /* ok */ } }
}

async function saveTags(bookId, markId, text) {
    const b = S.env.books().find(x => x.id === bookId); if (!b) return;
    b.marks = updateMark(b.marks, markId, { tags: parseTags(text) });
    await S.env.save(bookId, b.marks);
    S.edit = ''; S.env.refresh();
}

function download(name, text) {
    const a = document.createElement('a'), u = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
}

export function initNotes(env) {
    S.env = env;
    $('b-notes').addEventListener('click', () => { S.open = !S.open; renderNotes(); if (S.open) $('notes').scrollIntoView({ block: 'nearest' }); });
    const box = $('notes');
    box.addEventListener('input', (e) => { if (e.target.id === 'nt-q') { S.q = e.target.value; renderNotes(true); } });
    box.addEventListener('click', async (e) => {
        const b = e.target.closest('button'); if (!b) return;
        const d = b.dataset;
        if ('ntc' in d) { S.color = d.ntc; renderNotes(); }
        else if ('ntt' in d) { S.tag = d.ntt; renderNotes(); }
        else if ('ntb' in d) { S.by = d.ntb; renderNotes(); }
        else if (d.nt === 'close') { S.open = false; renderNotes(); }
        else if (d.nt === 'notes') { S.notesOnly = !S.notesOnly; renderNotes(); }
        else if (d.nt === 'copy') { try { await navigator.clipboard.writeText(markdown()); S.env.say(S.env.t('nt_copied'), 'ok'); } catch { S.env.say(S.env.t('nt_copyFail'), 'warn'); } }
        else if (d.nt === 'save') download('docheinz-notizen.md', markdown());
        else if (d.nt === 'go') { const bk = S.env.books().find(x => x.id === d.b), m = bk && bk.marks.find(x => x.id === d.m); if (m) S.env.open(d.b, m.pn ? { ch: m.ch, frac: m.frac || 0 } : { ch: m.ch, start: m.start, len: m.len }); }
        else if (d.nt === 'tg') { S.edit = S.edit === d.id ? '' : d.id; renderNotes(); const i = $('nt-tg'); if (i) i.focus(); }
        else if (d.nt === 'tgno') { S.edit = ''; renderNotes(); }
        else if (d.nt === 'tgok') saveTags(d.b, d.m, $('nt-tg').value);
        else if (d.nt === 'tgadd') { const i = $('nt-tg'); i.value = parseTags(i.value + ',' + d.tag).join(', '); i.focus(); }
        else if (d.nt === 'del') { const [bid, mid] = d.id.split('|'), bk = S.env.books().find(x => x.id === bid); if (bk) { bk.marks = removeMark(bk.marks, mid); await S.env.save(bid, bk.marks); S.env.refresh(); } }
    });
}
