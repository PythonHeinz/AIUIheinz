/* lib/shared/wissen-schalter.js – Wissensabfrage zuschaltbar, unabhängig von Konfiguration und Seite (Heinz Chat und Dashboard).
 * ES module (docs/MODULE.md). Leaf: importiert nichts; die Seiten reichen Texte und die Quellenliste herein.
 *   wissenGespeichert()            -> { an, quellen, begriffe } | null   (null = der Schalter wurde noch nie bedient)
 *   wissenZustand(voreinstellung)  -> gespeicherter Zustand, sonst die Voreinstellung (Feld `wissen` einer Konfiguration), sonst aus
 *   setzeWissen(patch, vor)        -> neuer Zustand; wird gespeichert (localStorage `heinz_wissen`) und an alle Schalter gemeldet (auch anderer Tabs)
 *   systemMit(basis, k)            -> Systemtext plus nummerierter Auszugs-Zusatz (oder Hinweis „kein Auszug gefunden“); k = Ergebnis von HeinzWissen.kontext
 *   frageFuerSuche(q, vorigeFrage, vorigeHatteQuellen) -> kurze Nachfragen (höchstens 4 Wörter) suchen mit der vorigen Frage mit
 *   quellenKurz(verwendet)         -> was an der Nachricht gespeichert wird: [{ nr, titel, link, lizenz, angabe }]
 *   chipListe(text, quellen)       -> { alle, liste }: nur die im Text zitierten [n], sonst alle vorgelegten Auszüge
 *   baueSchalter(host, o)          -> kleiner runder Wiki-Knopf in `host` (Tippen = an/aus, langes Drücken = Popover mit Quelle und Suchbegriffen); o = { texte, quellenListe(): Promise<[{id, name}]>, voreinstellung(), beiAenderung(z) }
 * Nur Zustand und Oberfläche: Suche und Modellaufrufe machen die Seiten über HeinzWissen. */

const KEY = 'heinz_wissen';
const AUS = { an: false, quellen: [], begriffe: 'app' };

function sauber(o) {
    if (!o || typeof o !== 'object') return null;
    return { an: o.an === true, quellen: Array.isArray(o.quellen) ? o.quellen.map(String).slice(0, 20) : [], begriffe: o.begriffe === 'modell' ? 'modell' : 'app' };
}
export function wissenGespeichert() {
    try { return sauber(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return null; }
}
export function wissenZustand(voreinstellung) { return wissenGespeichert() || sauber(voreinstellung) || Object.assign({}, AUS); }
export function setzeWissen(patch, voreinstellung) {
    const z = sauber(Object.assign({}, wissenZustand(voreinstellung), patch));
    try { localStorage.setItem(KEY, JSON.stringify(z)); } catch (e) { /* Speicher voll: der Zustand gilt nur bis zum Neuladen */ }
    window.dispatchEvent(new CustomEvent('heinz-wissen', { detail: z }));
    return z;
}

export function systemMit(basis, k) {
    basis = basis || '';
    if (!k) return basis;
    const add = k.text && k.verwendet && k.verwendet.length
        ? 'Knowledge excerpts follow, numbered. Use them to answer and cite the number like [1] right after the statement an excerpt supports. If no excerpt fits the question, say so; answer only if you are sure and mark it as your own assessment.\n\n' + k.text
        : 'No knowledge excerpt was found for this question. Say so; answer only if you are sure and mark it as your own assessment.';
    return basis ? basis + '\n\n' + add : add;
}
export function frageFuerSuche(q, vorigeFrage, vorigeHatteQuellen) {
    return vorigeHatteQuellen && vorigeFrage && String(q).trim().split(/\s+/).length <= 4 ? vorigeFrage + ' ' + q : q;
}
export function quellenKurz(verwendet) {
    return (verwendet || []).map(v => ({ nr: v.nr, titel: v.titel, link: v.link || '', lizenz: v.lizenz || '', angabe: v.angabe || '' }));
}
export function chipListe(text, quellen) {
    const zit = {}; String(text || '').replace(/\[(\d+)\]/g, (x, n) => { zit[n] = 1; return x; });
    const nur = (quellen || []).filter(q => zit[q.nr]);
    return nur.length ? { alle: false, liste: nur } : { alle: true, liste: quellen || [] };
}

// ---- Schalter: kleiner runder Wiki-Knopf in der Eingabezeile ----
// Tippen schaltet die Wissensabfrage an/aus (Knopf farbig = an). Langes Drücken (oder Rechtsklick) öffnet ein kleines Popover mit Quelle und Suchbegriffen.
export function baueSchalter(host, o) {
    const T = o.texte, el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
    host.textContent = ''; host.classList.add('wsw');
    const an = el('button', 'round wsw-an'); an.type = 'button';
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), use = document.createElementNS(NS, 'use');
    svg.setAttribute('class', 'i'); use.setAttribute('href', '/lib/icons.svg#i-book'); svg.appendChild(use); an.appendChild(svg);
    const panel = el('div', 'wsw-panel'); panel.hidden = true; panel.setAttribute('role', 'dialog');
    const kopf = el('div', 'wsw-head', T.an), lq = el('small', 'help', T.quellen), sq = el('select', 'inp'), lt = el('small', 'help', T.begriffe), st = el('select', 'inp'), hilfe = el('small', 'help', T.hilfe);
    [['app', T.app], ['modell', T.modell]].forEach(([v, n]) => { const op = el('option', '', n); op.value = v; st.appendChild(op); });
    panel.append(kopf, lq, sq, lt, st, hilfe); host.append(an, panel);
    const lies = () => wissenZustand(o.voreinstellung && o.voreinstellung());
    function beschrifte() { an.title = T.an + ' – ' + T.mehr; an.setAttribute('aria-label', T.an + ' – ' + T.mehr); }
    function zeige() {
        const z = lies();
        an.classList.toggle('acc', z.an); an.classList.toggle('on', z.an); an.setAttribute('aria-pressed', z.an ? 'true' : 'false');
        st.value = z.begriffe;
        if (z.quellen[0] && !Array.prototype.some.call(sq.options, op => op.value === z.quellen[0])) { const op = el('option', '', z.quellen[0]); op.value = z.quellen[0]; sq.appendChild(op); }
        sq.value = z.quellen[0] || '';
    }
    function fuelleQuellen() {
        const alleOption = () => { sq.textContent = ''; const alle = el('option', '', T.alle); alle.value = ''; sq.appendChild(alle); };
        return Promise.resolve(o.quellenListe ? o.quellenListe() : []).then(l => {
            alleOption(); (l || []).forEach(q => { const op = el('option', '', q.name || q.id); op.value = q.id; sq.appendChild(op); }); zeige();
        }, () => { alleOption(); zeige(); });
    }
    const aendern = (patch) => { const z = setzeWissen(patch, o.voreinstellung && o.voreinstellung()); zeige(); if (o.beiAenderung) o.beiAenderung(z); };
    const schliesse = () => { panel.hidden = true; };
    const oeffne = () => { fuelleQuellen(); panel.hidden = false; };
    let timer = 0, lang = false;
    an.addEventListener('pointerdown', () => { lang = false; clearTimeout(timer); timer = setTimeout(() => { lang = true; oeffne(); }, 450); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => an.addEventListener(ev, () => clearTimeout(timer)));
    an.addEventListener('contextmenu', (e) => { e.preventDefault(); lang = true; oeffne(); });
    an.addEventListener('click', () => { if (lang) { lang = false; return; } if (!panel.hidden) { schliesse(); return; } aendern({ an: !lies().an }); });
    document.addEventListener('pointerdown', (e) => { if (!panel.hidden && !host.contains(e.target)) schliesse(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesse(); });
    sq.addEventListener('change', () => aendern({ quellen: sq.value ? [sq.value] : [] }));
    st.addEventListener('change', () => aendern({ begriffe: st.value }));
    window.addEventListener('heinz-wissen', zeige);
    window.addEventListener('storage', (e) => { if (e.key === KEY) zeige(); });
    beschrifte(); fuelleQuellen();
    return { zeige, texte(neu) { Object.assign(T, neu); beschrifte(); kopf.textContent = T.an; lq.textContent = T.quellen; lt.textContent = T.begriffe; hilfe.textContent = T.hilfe; st.options[0].textContent = T.app; st.options[1].textContent = T.modell; if (sq.options[0]) sq.options[0].textContent = T.alle; } };
}
