/* tools/convert2/ui/main.js – Einstieg von Convert2: Eingabe, Zielformat, Blatt/Code, Ausgabe, Leseansicht. Nur Oberfläche; alle Formatarbeit machen die Module in ../mod/. */
import { Heinz, HeinzStore, $ } from './base.js';
import { D } from './i18n.js';
import { detect } from '../mod/erkennen.js';
import { convertMarkdown, FORMAT_LIST } from '../mod/umwandeln.js';
import { htmlToMarkdown } from '../mod/html.js';
import { readEpub, epubToMarkdown } from '../mod/epub-lesen.js';
import { headings, } from '../mod/markdown.js';
import { fileName } from '../mod/text.js';
import { openReader } from './reader.js';

const K = (n) => 'heinz_convert2_' + n;
const MAX_MB = 20, DRAFT_MAX = 200000;
const t = (k, v) => Heinz.t(D, k, v);
const LABELS = { en: { NOTE: 'Note', WARNING: 'Warning', TIP: 'Tip' }, de: { NOTE: 'Hinweis', WARNING: 'Warnung', TIP: 'Tipp' } };

const state = { fmt: 'tsv', view: 'sheet', font: 'sans', result: null, md: '', det: 'empty', failed: false, seq: 0, epubOpened: false, draftWarned: false, lastMsg: null };

// ---------- Texte ----------
function applyI18n() {
    document.documentElement.lang = Heinz.lang;
    document.querySelectorAll('[data-i]').forEach(e => { e.textContent = t(e.getAttribute('data-i')); });
    document.querySelectorAll('[data-ph]').forEach(e => { e.placeholder = t(e.getAttribute('data-ph')); });
    document.querySelectorAll('[data-i-label]').forEach(e => { const s = t(e.getAttribute('data-i-label')); e.setAttribute('aria-label', s); e.title = s; });
    document.title = 'AIUIheinz · ' + t('title');
    renderFormats();
    renderDetect();
    renderCount();
    render();
}

function renderFormats() {
    const sel = $('fmt');
    sel.textContent = '';
    ['data', 'office', 'doc'].forEach(g => {
        const og = document.createElement('optgroup');
        og.label = t('g_' + g);
        FORMAT_LIST.filter(f => f.group === g).forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = t('f_' + f.id); og.appendChild(o); });
        sel.appendChild(og);
    });
    sel.value = state.fmt;
}

function renderDetect() {
    const key = state.epubOpened ? 'det_epub' : state.failed ? 'det_htmlfail' : 'det_' + state.det.replace('-', '_');
    $('det').textContent = state.det === 'empty' && !state.epubOpened ? '' : t(key);
}
function renderCount() { const n = $('in').value.length; $('count').textContent = n ? t('chars', { n: n.toLocaleString(Heinz.lang) }) : ''; }

function msg(text, kind) {
    const el = $('msg');
    el.textContent = text;
    el.className = 'notice' + (kind ? ' ' + kind : '');
    el.hidden = false;
    clearTimeout(msg.t);
    msg.t = setTimeout(() => { el.hidden = true; }, 7000);
}

// ---------- Umwandlung ----------
function titleOf() {
    const own = $('etitle').value.trim();
    if (own) return own;
    const h = headings(state.md)[0];
    return h ? h.text : '';
}
function opts() { return { title: $('etitle').value.trim() || undefined, author: $('eauthor').value.trim() || undefined, language: Heinz.lang, labels: LABELS[Heinz.lang] }; }

let timer = 0;
function schedule() {
    clearTimeout(timer);
    const n = $('in').value.length;
    timer = setTimeout(run, n > 200000 ? 600 : n > 20000 ? 300 : 100);
}

async function run() {
    const seq = ++state.seq;
    const raw = $('in').value;
    renderCount();
    saveDraft(raw);
    const d = detect(raw);
    state.det = d.type; state.md = d.md; state.failed = !!d.failed;
    renderDetect();
    $('etitle').placeholder = titleOf();
    if (!d.md) { state.result = null; render(); document.documentElement.setAttribute('data-c2', 'ready'); return; }
    let r;
    try { r = await convertMarkdown(d.md, state.fmt, opts()); } catch (e) { msg(String(e.message || e), 'err'); return; }
    if (seq !== state.seq) return;
    state.result = r;
    render();
    document.documentElement.setAttribute('data-c2', 'ready');
}

function render() {
    const r = state.result;
    const paper = $('paper');
    if (!r) { paper.innerHTML = '<p class="empty"></p>'; paper.firstChild.textContent = state.failed ? t('det_htmlfail') : t('emptyPaper'); }
    else paper.innerHTML = r.html;
    $('out').value = r ? r.text : '';
    const hint = $('codehint');
    hint.hidden = !(r && (r.kind !== 'text')) || state.view !== 'code';
    hint.textContent = r ? (r.kind === 'binary' ? t('codeEpub') : r.kind === 'print' ? t('codePdf') : '') : '';
    paper.hidden = state.view !== 'sheet';
    $('out').hidden = state.view !== 'code';
    $('epubopts').hidden = state.fmt !== 'epub';
    $('b-copy').disabled = !r || r.kind === 'binary';
    ['b-download', 'b-reader', 'b-print', 'b-share'].forEach(id => { $(id).disabled = !r; });
    $('b-share').hidden = !navigator.share;
    document.querySelectorAll('#seg-view button').forEach(b => b.classList.toggle('on', b.dataset.view === state.view));
    document.querySelectorAll('#seg-font button').forEach(b => b.classList.toggle('on', b.dataset.font === state.font));
    paper.className = 'c2-paper ' + state.font;
}

// ---------- Eingabe ----------
function saveDraft(raw) {
    if (raw.length > DRAFT_MAX) {
        HeinzStore.remove(K('draft'));
        if (!state.draftWarned) { state.draftWarned = true; msg(t('m_draftTooBig'), 'warn'); }
        return;
    }
    state.draftWarned = false;
    HeinzStore.set(K('draft'), raw);
}

function setInput(text, epub) {
    $('in').value = text;
    state.epubOpened = !!epub;
    schedule();
}

function insertAtCursor(el, text) {
    const s = el.selectionStart, e = el.selectionEnd;
    el.setRangeText(text, s, e, 'end');
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

function htmlToClean(html) {
    try { return htmlToMarkdown(html); } catch { return ''; }
}

async function pasteButton() {
    const el = $('in');
    try {
        if (navigator.clipboard && navigator.clipboard.read) {
            const items = await navigator.clipboard.read();
            for (const it of items) {
                if ($('cleanpaste').checked && it.types.includes('text/html')) {
                    const md = htmlToClean(await (await it.getType('text/html')).text());
                    if (md) { setInput(md); msg(t('m_pasted'), 'ok'); return; }
                }
                if (it.types.includes('text/plain')) { setInput(await (await it.getType('text/plain')).text()); msg(t('m_pasted'), 'ok'); return; }
            }
        }
        if (navigator.clipboard && navigator.clipboard.readText) { setInput(await navigator.clipboard.readText()); msg(t('m_pasted'), 'ok'); return; }
    } catch { /* blockiert */ }
    el.focus();
    msg(t('m_pasteBlocked'), 'warn');
}

async function openFile(file) {
    if (!file) return;
    if (file.size > MAX_MB * 1048576) { msg(t('m_tooBig', { n: MAX_MB }), 'warn'); return; }
    try {
        const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
        const isZip = head[0] === 0x50 && head[1] === 0x4b && head[2] === 3 && head[3] === 4;
        if (/\.epub$/i.test(file.name) || file.type === 'application/epub+zip' || isZip) {
            const book = await readEpub(new Uint8Array(await file.arrayBuffer()));
            const md = await epubToMarkdown(book, { title: true });
            setInput(md, true);
            if (book.metadata.title) $('etitle').value = book.metadata.title;
            if (book.metadata.creator) $('eauthor').value = book.metadata.creator;
        } else {
            setInput(await file.text());   // die Erkennung übernimmt detect()
        }
    } catch (e) { msg(t('m_loadFail', { why: String(e.message || e) }), 'err'); }
}

// ---------- Ausgabe ----------
function baseName(ext) { return fileName(titleOf() || 'convert2', ext); }

function download() {
    const r = state.result;
    if (!r) return msg(t('m_nothing'), 'warn');
    if (r.kind === 'print') return print();
    const blob = r.kind === 'binary' ? new Blob([r.bytes], { type: r.mime }) : new Blob([r.text], { type: r.mime + ';charset=utf-8' });
    const name = baseName(r.ext);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
    msg(t('m_saved', { name }), 'ok');
}

async function copy() {
    const r = state.result;
    if (!r) return msg(t('m_nothing'), 'warn');
    if (r.kind === 'binary') return msg(t('m_epubNoCopy'), 'warn');
    try {
        if (r.id === 'htmlRich' && window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
            try {
                await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([r.html], { type: 'text/html' }), 'text/plain': new Blob([r.text], { type: 'text/plain' }) })]);
                return msg(t('m_copiedRich'), 'ok');
            } catch { /* weiter mit Text */ }
        }
        await Heinz.copy(r.text);
        msg(t('m_copied'), 'ok');
    } catch { msg(t('m_copyFail'), 'warn'); }
}

async function share() {
    const r = state.result;
    if (!r || !navigator.share) return download();
    try {
        if (r.kind !== 'print') {
            const file = new File([r.kind === 'binary' ? r.bytes : r.text], baseName(r.ext), { type: r.mime });
            if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: titleOf() || 'Convert2' }); return msg(t('m_shared'), 'ok'); }
        }
        if (r.text) { await navigator.share({ title: titleOf() || 'Convert2', text: r.text }); return msg(t('m_shared'), 'ok'); }
        download();
    } catch (e) { if (e && e.name !== 'AbortError') download(); }
}

function print() { msg(t('m_printHint'), 'ok'); setTimeout(() => window.print(), 50); }

async function reader() {
    if (!state.md) return msg(t('m_nothing'), 'warn');
    try {
        const r = state.fmt === 'epub' && state.result ? state.result : await convertMarkdown(state.md, 'epub', opts());
        const book = await readEpub(r.bytes);
        await openReader(book, { t, font: state.font === 'sans' ? 'sans' : 'serif', size: HeinzStore.get(K('rsize'), 17), onSize: (n) => HeinzStore.set(K('rsize'), n) });
    } catch (e) { msg(String(e.message || e), 'err'); }
}

// ---------- Start ----------
async function start() {
    await HeinzStore.open();
    state.fmt = FORMAT_LIST.some(f => f.id === HeinzStore.get(K('fmt'))) ? HeinzStore.get(K('fmt')) : 'tsv';
    state.view = HeinzStore.get(K('view')) === 'code' ? 'code' : 'sheet';
    state.font = HeinzStore.get(K('font')) === 'serif' ? 'serif' : 'sans';
    $('cleanpaste').checked = HeinzStore.get(K('clean'), true) !== false;
    $('etitle').value = HeinzStore.get(K('etitle'), '') || '';
    $('eauthor').value = HeinzStore.get(K('eauthor'), '') || '';
    $('in').value = HeinzStore.get(K('draft'), '') || '';

    Heinz.header({ sub: { en: D.en.sub, de: D.de.sub }, back: '/' });
    Heinz.onLang(applyI18n);
    applyI18n();
    Heinz.enhanceSelects('select.sel');

    $('in').addEventListener('input', () => { state.epubOpened = false; schedule(); });
    $('in').addEventListener('paste', (e) => {
        if (!$('cleanpaste').checked) return;
        const cd = e.clipboardData;
        const html = cd && cd.getData('text/html');
        if (!html) return;
        const md = htmlToClean(html);
        if (md && md.trim() !== (cd.getData('text/plain') || '').trim()) { e.preventDefault(); insertAtCursor($('in'), md); }
    });
    $('b-paste').addEventListener('click', pasteButton);
    $('file').addEventListener('change', (e) => { openFile(e.target.files[0]); e.target.value = ''; });
    $('b-clear').addEventListener('click', () => { $('in').value = ''; state.epubOpened = false; schedule(); $('in').focus(); });
    $('cleanpaste').addEventListener('change', (e) => HeinzStore.set(K('clean'), e.target.checked));
    $('fmt').addEventListener('change', (e) => { state.fmt = e.target.value; HeinzStore.set(K('fmt'), state.fmt); schedule(); });
    ['etitle', 'eauthor'].forEach(id => $(id).addEventListener('input', () => { HeinzStore.set(K(id), $(id).value); schedule(); }));
    document.querySelectorAll('#seg-view button').forEach(b => b.addEventListener('click', () => { state.view = b.dataset.view; HeinzStore.set(K('view'), state.view); render(); }));
    document.querySelectorAll('#seg-font button').forEach(b => b.addEventListener('click', () => { state.font = b.dataset.font; HeinzStore.set(K('font'), state.font); render(); }));
    $('b-copy').addEventListener('click', copy);
    $('b-download').addEventListener('click', download);
    $('b-share').addEventListener('click', share);
    $('b-reader').addEventListener('click', reader);
    $('b-print').addEventListener('click', print);
    await run();
}

start();
