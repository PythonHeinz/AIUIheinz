/* lib/chat/wissen.js – Schalterzeile „Wissen ▾“ über dem Eingabefeld des Heinz Chat.
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. Zustand und Bedienung liegen in lib/shared/wissen-schalter.js (auch das Dashboard nutzt sie),
 * die Konfiguration liefert nur die Voreinstellung (Feld `wissen`), solange der Schalter nie bedient wurde. */

import { Heinz, HeinzWissen, PV, baueSchalter, baueSeitenleiste } from './base.js';
import { t } from './i18n.js';
import { state } from './state.js';

function texte() { return { an: t('wBtn'), mehr: t('wMore'), quellen: t('wSrc'), alle: t('wAll'), begriffe: t('wTerms'), app: t('wApp'), modell: t('wModel'), hilfe: t('wHelp'), ein: t('wOn'), aus: t('wOff') }; }
export function initWissen() {
    var leiste = baueSeitenleiste({ label: t('wTools') });
    var sw = baueSchalter(leiste.punkt({ id: 'wissen' }).el, {
        beiZustand: function (z) { leiste.markiere(z.an); },
        texte: texte(), quellenListe: function () { return HeinzWissen.quellen(); },
        voreinstellung: function () { var c = PV.chatConfig(); return c && state.S && c.model === state.S.model ? c.wissen : null; }
    });
    Heinz.onLang(function () { sw.texte(texte()); });
}
