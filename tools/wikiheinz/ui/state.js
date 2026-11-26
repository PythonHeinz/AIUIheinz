/* tools/wikiheinz/ui/state.js – gemeinsamer Zustand, Meldungen, kleine Ereignisse, Hilfen. */
import { Heinz, $, HeinzMarkdown } from './base.js';
import { D } from './i18n.js';
import { volltextQuelle } from '../../../lib/wissen/volltext.js';
export const t = (k, v) => Heinz.t(D, k, v);
export { $ };
/** Ganze Artikel vom eigenen Server (ZIM-Datei, Variante B); nur Anfragen an die eigene Adresse. */
export const zim = volltextQuelle(async (u) => { const r = await fetch(u, { cache: 'no-store' }); let j = null; try { j = await r.json(); } catch (e) { j = null; } return { status: r.status, json: j }; });
export const S = { sp: null, quellen: [], tab: 'stoebern', laeuft: false };
const subs = {};
export const on = (n, f) => { (subs[n] = subs[n] || []).push(f); };
export const emit = (n, ...a) => { (subs[n] || []).forEach(f => f(...a)); };
export const esc = HeinzMarkdown.esc;
export const jetzt = () => new Date().toISOString().slice(0, 10);
export const quelleVon = (id) => S.quellen.find(q => q.id === id) || null;
export const eigene = () => S.quellen.find(q => q.art === 'eigen') || null;
export const zahl = (n) => Number(n || 0).toLocaleString(Heinz.lang === 'de' ? 'de-DE' : 'en-US');
export async function ladeQuellen() { S.quellen = (await S.sp.quellen()).sort((a, b) => (a.art === 'eigen') - (b.art === 'eigen') || (a.name < b.name ? -1 : 1)); emit('quellen'); }

export function msg(text, kind) {
    const el = $('msg');
    el.textContent = text; el.className = 'notice' + (kind ? ' ' + kind : ''); el.hidden = !text;
    clearTimeout(msg.t);
    if (text && kind !== 'err') msg.t = setTimeout(() => { el.hidden = true; }, 8000);
}
export function herunterladen(name, daten, typ) {
    const url = URL.createObjectURL(new Blob([daten], { type: typ })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    msg(t('exported', { n: name }), 'ok');
}
