/* tools/docheinz/ui/statistik.js – „Weiterlesen“-Karte und Lesestatistik der Bibliothek (Logik in ../mod/statistik.js).
 * initStat({ t, lang, books, log, open, cover }) einmal beim Start; resume() und renderStat() nach jeder Änderung der Liste. */
import { $ } from './base.js';
import { overview, lastDays, hm, resumeBook, remaining } from '../mod/statistik.js';
import { percent, initial } from '../mod/bibliothek.js';

const S = { env: null, open: false };
export function dur(t, secs) { const { h, m } = hm(secs); return secs > 0 && !h && !m ? t('st_lt1') : h ? t('st_hm', { h, m }) : t('st_m', { m }); }
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export function resume() {
    const box = $('sec-resume'); if (!box || !S.env) return;
    const t = S.env.t, b = resumeBook(S.env.books());
    box.textContent = ''; box.hidden = !b;
    if (!b) return;
    const p = percent(b, b.ch, b.frac), left = remaining(b, p);
    const btn = el('button', 'dh-resumebtn'); btn.type = 'button'; btn.setAttribute('aria-label', t('rs_title') + ': ' + b.title);
    const cover = el('span', 'tile dh-cover', initial(b.title)), u = S.env.cover(b);
    if (u) { const img = document.createElement('img'); img.alt = ''; img.src = u; cover.textContent = ''; cover.classList.add('has'); cover.appendChild(img); }
    const tx = el('span', 'dh-tx');
    const meta = [t('pct', { n: p })]; if (left) meta.push(t('st_left', { x: dur(t, left) }));
    const bar = el('span', 'dh-bar'), fill = document.createElement('i'); fill.style.width = p + '%'; bar.appendChild(fill);
    tx.append(el('small', 'dh-rslab', t('rs_title')), el('b', '', b.title), el('small', 'dh-meta', meta.join(' · ')), bar);
    btn.append(cover, tx, el('span', 'dh-rsgo', '›'));
    btn.addEventListener('click', () => S.env.open(b.id));
    box.appendChild(btn);
}

export function renderStat() {
    const box = $('stat'); if (!box || !S.env) return;
    box.hidden = !S.open; box.textContent = '';
    if (!S.open) return;
    const t = S.env.t, books = S.env.books(), log = S.env.log(), o = overview(books, log);
    const head = el('div', 'dh-fth'); head.append(el('b', '', t('st_title')));
    const x = el('button', 'pill', t('ft_close')); x.type = 'button'; x.dataset.st = 'close'; head.appendChild(x); box.appendChild(head);
    const kp = el('div', 'dh-kpis');
    [['st_today', o.today], ['st_week', o.week], ['st_total', o.total]].forEach(([k, v]) => { const c = el('div', 'dh-kpi'); c.append(el('b', '', dur(t, v) || '0'), el('small', '', t(k))); kp.appendChild(c); });
    box.appendChild(kp);
    const days = lastDays(log, 7), max = Math.max(60, ...days.map(d => d.secs));
    const bars = el('div', 'dh-bars'); bars.setAttribute('role', 'img'); bars.setAttribute('aria-label', t('st_week'));
    days.forEach(d => {
        const col = el('div', 'dh-barcol'), v = el('i'); v.style.height = Math.max(d.secs ? 4 : 0, Math.round(d.secs / max * 100)) + '%'; v.title = dur(t, d.secs);
        const lab = el('small', '', new Date(d.key + 'T12:00:00').toLocaleDateString(S.env.lang(), { weekday: 'short' }));
        const wrap = el('span', 'dh-barwrap'); wrap.appendChild(v); col.append(wrap, lab); bars.appendChild(col);
    });
    box.appendChild(bars);
    box.appendChild(el('p', 'help', t('st_books', { d: o.done, s: o.started, n: books.length })));
    if (!o.books.length) box.appendChild(el('p', 'help', t('st_none')));
    else {
        box.appendChild(el('div', 'caps', t('st_top')));
        o.books.slice(0, 10).forEach(r => {
            const row = el('div', 'dh-strow'), tt = el('span', 'dh-stt', r.rec.title);
            const m = [dur(t, r.secs), t('pct', { n: r.pct })]; if (r.left) m.push(t('st_left', { x: dur(t, r.left) }));
            row.append(tt, el('small', '', m.join(' · '))); box.appendChild(row);
        });
    }
    box.appendChild(el('p', 'help', t('st_help')));
}

export function initStat(env) {
    S.env = env;
    $('b-stat').addEventListener('click', () => { S.open = !S.open; renderStat(); });
    $('stat').addEventListener('click', (e) => { if (e.target.closest('[data-st=close]')) { S.open = false; renderStat(); } });
}
