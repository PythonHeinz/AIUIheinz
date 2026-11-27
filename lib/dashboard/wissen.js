/* lib/dashboard/wissen.js – Wissensabfrage im Dashboard: Schalterzeile über dem Eingabefeld und Auszüge vor dem Senden.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. Zustand und Bedienung liegen in lib/shared/wissen-schalter.js (auch der Heinz Chat nutzt sie).
 * Nur Engines auf diesem Gerät: Auszüge gehen nie an eine Online-Engine. Der Baustein ruft kein Modell selbst auf; `senden` kommt von hier. */

import { HeinzWissen, PV, baueSchalter, baueSeitenleiste, frageFuerSuche, systemMit, wissenZustand } from './base.js';
import { t } from './i18n.js';
import { settings } from './state.js';
import { menuInfo, openMenu } from './menu.js';

function texte() { return { an: t('wBtn'), mehr: t('wMore'), quellen: t('wSrc'), alle: t('wAll'), begriffe: t('wTerms'), app: t('wApp'), modell: t('wModel'), hilfe: t('wHelp'), ein: t('wOn'), aus: t('wOff') }; }
let schalter = null, leiste = null, punkte = [];
const SEITEN = [['cfgs', 'i-save', 'mzCfg'], ['perf', 'i-gauge', 'gPerf'], ['conn', 'i-lock', 'mzConn'], ['app', 'i-contrast', 'gApp']];
function frischeZeilen() { const m = menuInfo(); punkte.forEach(function (x) { x.p.setze(t(x.titel), m[x.id]); }); }
export function initWissen() {
    leiste = baueSeitenleiste({ label: t('wTools'), beiOeffnen: frischeZeilen });
    schalter = baueSchalter(leiste.punkt({ id: 'wissen' }).el, { beiZustand: function (z) { leiste.markiere(z.an); }, texte: texte(), quellenListe: function () { return HeinzWissen.quellen(); } });
    punkte = SEITEN.map(function (x) { return { id: x[0], titel: x[2], p: leiste.punkt({ id: x[0], icon: x[1], titel: t(x[2]), unter: '', klick: function () { leiste.schliesse(); openMenu(x[0]); } }) }; });
    frischeZeilen();
}
export function repaintWissen() { if (schalter) schalter.texte(texte()); frischeZeilen(); }

// Zustand für diese Anfrage: null = aus. Eine Online-Engine bekommt nie Auszüge (Rückgabe { lokal: false }).
export function wissenJetzt() {
    const w = wissenZustand(); if (!w.an) return null;
    const p = PV.get(settings.provider);
    return p && p.local ? w : { lokal: false };
}
// Kurze Nachfragen („Das ist falsch“) haben kein Thema: lief die vorige Antwort mit Quellen, geht die vorige Frage in die Suche ein. `verlauf` = Verlauf vor der neuen Frage.
export function frageFuerWissen(q, verlauf) {
    const n = verlauf.length, a = verlauf[n - 1], u = verlauf[n - 2];
    return frageFuerSuche(q, u && u.role === 'user' ? u.content : '', !!(a && a.role === 'assistant' && a.quellen && a.quellen.length));
}
export function holeWissen(frage, w, model, signal, onPhase) {
    const rt = PV.runtime(settings.provider, model, settings).options || {};
    const laufzeit = {}; ['num_ctx', 'num_thread'].forEach(function (k) { if (rt[k]) laufzeit[k] = rt[k]; });   // Laufzeit wie die Antwort, damit Ollama das Modell nicht neu lädt
    const senden = function (a) {
        return PV.chat(settings.provider, { model: model, system: a.system, messages: [{ role: 'user', content: a.user }], format: a.format, signal: signal, backend: settings.backend,
            options: Object.assign(laufzeit, { temperature: 0, num_predict: 80 }) }).then(function (r) { return r.text; });
    };
    return HeinzWissen.kontext(frage, { senden: senden, quellen: w.quellen && w.quellen.length ? w.quellen : undefined, begriffeVom: w.begriffe === 'modell' ? 'modell' : 'app', signal: signal, onStatus: onPhase });
}
// Auszüge in die Systemnachricht (gibt es keine, wird eine angelegt)
export function mitWissen(msgs, k) {
    if (!k) return msgs;
    const first = msgs[0];
    if (first && first.role === 'system') return [{ role: 'system', content: systemMit(first.content, k) }].concat(msgs.slice(1));
    return [{ role: 'system', content: systemMit('', k) }].concat(msgs);
}
