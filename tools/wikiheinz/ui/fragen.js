/* tools/wikiheinz/ui/fragen.js – Reiter „Fragen“: Frage eingeben, Modell wählen, Antwort mit den verwendeten Auszügen. Modellzugriff nur über HeinzProviders; der Ablauf steht in ../mod/frage.js. */
import { Heinz, HeinzStore, HeinzProviders as PV, $ } from './base.js';
import { S, t, on, emit, msg, esc } from './state.js';
import { beantworte } from '../mod/frage.js';

const KEY = 'heinz_wikiheinz_settings', DEF = { provider: 'ollama', model: 'qwen2.5:3b', temp: 0.2, maxTok: 300, scope: '' };
let cfg = { ...DEF }, ac = null, onlineOk = '', last = null, status = '', modelSeq = 0, modelleGeladen = false;
const attr = (s) => esc(String(s)).replace(/"/g, '&quot;');
const speichern = () => { const s = HeinzStore.get(KEY, {}) || {}; s.fragen = { ...cfg }; return HeinzStore.set(KEY, s); };

export function onlineState() { const p = PV.get(cfg.provider); if (!p || p.local) return 'local'; return PV.onlineAllowed() ? 'online' : 'blocked'; }
const providerName = () => { const p = PV.get(cfg.provider); return p ? p.name : cfg.provider; };

function renderOnline() {
    const el = $('onl'), st = onlineState();
    if (st === 'local') { el.hidden = true; el.textContent = ''; }
    else { el.hidden = false; el.className = 'notice ' + (st === 'blocked' ? 'err' : 'warn'); el.textContent = st === 'blocked' ? t('onlineOff') : t('onlineWarn', { name: providerName() }); }
    $('b-ask').disabled = !!ac || st === 'blocked'; renderRt();
}
function renderRt() {
    let rt = t('ctxNone');
    try { const o = PV.runtime(cfg.provider, cfg.model).options || {}, p = []; if (o.num_thread) p.push('threads ' + o.num_thread); if (o.num_ctx) p.push('context ' + o.num_ctx); if (p.length) rt = p.join(', '); } catch (e) { /* Vorgabe */ }
    $('rtinfo').textContent = t('ctxInfo', { rt });
}
function fillProviders() {
    const sel = $('provider'); sel.textContent = '';
    const list = PV.list().filter(p => p.local || PV.onlineAllowed());
    if (!list.some(p => p.id === cfg.provider)) { const c = PV.get(cfg.provider); if (c) list.push(c); }
    list.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name + (p.local ? '' : ' ☁'); sel.appendChild(o); });
    sel.value = cfg.provider;
}
async function fillModels() {
    const seq = ++modelSeq, sel = $('model'); sel.textContent = '';
    let names = []; try { names = await PV.models(cfg.provider); } catch (e) { names = []; }
    if (seq !== modelSeq) return;
    if (cfg.model && names.indexOf(cfg.model) < 0) names = [cfg.model].concat(names);
    names.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o); });
    sel.value = cfg.model; $('modelhelp').textContent = t('modelHelp') + (names.length <= 1 ? ' ' + t('modelNone') : ''); renderRt();
}
function fillScope() {
    const sel = $('scope'); sel.textContent = '';
    const a = document.createElement('option'); a.value = ''; a.textContent = t('scopeAll'); sel.appendChild(a);
    S.quellen.forEach(q => { const o = document.createElement('option'); o.value = q.id; o.textContent = q.name; sel.appendChild(o); });
    sel.value = S.quellen.some(q => q.id === cfg.scope) ? cfg.scope : '';
}

function zeigeStatus(s) { status = s; $('askstatus').textContent = s ? t({ suche: 'stSuche', lese: 'stLese', antworte: 'stAntworte' }[s]) : ''; }
function zeigeAntwort() {
    const r = last, box = $('antwort'); box.hidden = !r; if (!r) return;
    const b = r.begriffe.join(', ');
    $('ant-text').innerHTML = r.status === 'ok' ? r.antwort.split(/\n+/).filter(Boolean).map(p => '<p>' + esc(p) + '</p>').join('') : '<p>' + esc(t('notFoundAnswer', { b })) + '</p>';
    $('ant-hinweis').textContent = r.status === 'ok' && r.ohneBeleg ? t('noCite') : '';
    $('ant-qkopf').hidden = !r.quellen.length;
    $('ant-quellen').innerHTML = r.quellen.map(q => '<details class="wh-ex' + (q.zitiert ? ' zit' : '') + '"><summary>[' + q.nr + '] ' + esc(q.titel) + (q.zitiert ? ' · ' + esc(t('cited')) : '') + '</summary><p>' + esc(q.auszug) + '</p><small>' + esc(q.angabe) +
        (q.link ? ' · <a href="' + attr(q.link) + '" target="_blank" rel="noopener noreferrer">' + esc(t('openWiki')) + '</a>' : '') + ' · <a href="#" data-q="' + attr(q.q) + '" data-t="' + attr(q.titel) + '">' + esc(t('excerptOf')) + '</a></small></details>').join('');
    $('ant-fact').textContent = t('fact', { engine: r.engine, model: r.model, von: t(r.von === 'modell' ? 'vonModell' : 'vonCode'), b });
}
function errText(e) {
    if (e instanceof TypeError) return t('offline');
    if (e && e.code === 'ONLINE_BLOCKED') return t('blocked');
    if (e && e.http === 404) return t('modelNotFound', { m: cfg.model });
    return t('failed', { m: String(e && e.message || e) });
}

async function fragen() {
    if (ac) return;
    const frage = $('f-frage').value.trim();
    if (!frage) return msg(t('noQuestion'), 'err');
    if (!cfg.model) return msg(t('noModel'), 'err');
    msg('');
    const st = onlineState(); if (st === 'blocked') return;
    if (st === 'online' && onlineOk !== cfg.provider) {                       // Frage und Auszüge verlassen das Gerät: eigene Rückfrage
        const el = $('onl'); el.hidden = false; el.className = 'notice warn'; el.textContent = t('onlineAsk', { name: providerName() }) + ' ';
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; b.textContent = t('onlineYes');
        b.addEventListener('click', () => { onlineOk = cfg.provider; renderOnline(); fragen(); }); el.appendChild(b); return;
    }
    ac = new AbortController(); $('b-ask').hidden = true; $('b-askstop').hidden = false; last = null; zeigeAntwort();
    try { await PV.prepare(cfg.provider, cfg.model); } catch (e) { /* die erste Anfrage meldet ein echtes Problem */ }
    const rt = PV.runtime(cfg.provider, cfg.model) || {};
    const senden = async (a, signal) => {
        const suche = a.art === 'begriffe';
        const r = await PV.chat(cfg.provider, { model: cfg.model, system: a.system, messages: [{ role: 'user', content: a.user }], format: a.format, signal,
            options: Object.assign({}, rt.options || {}, { temperature: suche ? 0 : cfg.temp, num_predict: suche ? 80 : cfg.maxTok }), keepAlive: rt.keepAlive });
        return r.text;
    };
    try {
        const r = await beantworte({ frage, sp: S.sp, quellen: cfg.scope ? [cfg.scope] : undefined, senden, signal: ac.signal, onStatus: zeigeStatus, sprache: Heinz.lang });
        last = { ...r, engine: cfg.provider, model: cfg.model };
    } catch (e) { if (ac.signal.aborted) msg(t('aborted'), 'warn'); else msg(errText(e), 'err'); }
    ac = null; zeigeStatus(''); $('b-ask').hidden = false; $('b-askstop').hidden = true; renderOnline(); zeigeAntwort();
}

export function initFragen() {
    cfg = { ...DEF, ...((HeinzStore.get(KEY, {}) || {}).fragen || {}) };
    $('temp').value = cfg.temp; $('maxtok').value = cfg.maxTok;
    const num = (d) => (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : d; };
    $('temp').addEventListener('input', (e) => { cfg.temp = num(DEF.temp)(e.target.value); speichern(); });
    $('maxtok').addEventListener('input', (e) => { cfg.maxTok = num(DEF.maxTok)(e.target.value); speichern(); });
    $('scope').addEventListener('change', (e) => { cfg.scope = e.target.value; speichern(); });
    $('provider').addEventListener('change', (e) => { cfg.provider = e.target.value; cfg.model = ''; onlineOk = ''; speichern(); renderOnline(); fillModels().then(() => { const s = $('model'); if (!cfg.model && s.options.length) { cfg.model = s.options[0].value; s.value = cfg.model; speichern(); renderRt(); } }); });
    $('model').addEventListener('change', (e) => { cfg.model = e.target.value; speichern(); PV.setActiveModel(cfg.provider, cfg.model); renderRt(); });
    $('b-ask').addEventListener('click', fragen);
    $('b-askstop').addEventListener('click', () => { if (ac) ac.abort(); });
    $('f-frage').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); fragen(); } });
    $('ant-quellen').addEventListener('click', (ev) => { const a = ev.target.closest('a[data-q]'); if (a) { ev.preventDefault(); emit('open', { q: a.dataset.q, titel: a.dataset.t }); } });
    on('quellen', fillScope); on('lang', () => { fillProviders(); fillScope(); renderOnline(); zeigeAntwort(); zeigeStatus(status); });
    on('tabwechsel', (name) => { if (name === 'fragen' && !modelleGeladen) { modelleGeladen = true; fillModels(); } });   // die Modellliste wird erst beim ersten Öffnen des Reiters von der lokalen Engine geholt
    fillProviders(); fillScope(); renderOnline();
}
