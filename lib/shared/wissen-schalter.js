/* lib/shared/wissen-schalter.js – Wissensabfrage zuschaltbar, unabhängig von Konfiguration und Seite (Heinz Chat und Dashboard).
 * ES module (docs/MODULE.md). Leaf: importiert nichts; die Seiten reichen Texte und die Quellenliste herein.
 *   wissenGespeichert()            -> { an, quellen, begriffe } | null   (null = der Schalter wurde noch nie bedient)
 *   wissenZustand(voreinstellung)  -> gespeicherter Zustand, sonst die Voreinstellung (Feld `wissen` einer Konfiguration), sonst aus
 *   setzeWissen(patch, vor)        -> neuer Zustand; wird gespeichert (localStorage `heinz_wissen`) und an alle Schalter gemeldet (auch anderer Tabs)
 *   systemMit(basis, k)            -> Systemtext plus nummerierter Auszugs-Zusatz (oder Hinweis „kein Auszug gefunden“); k = Ergebnis von HeinzWissen.kontext
 *   frageFuerSuche(q, vorigeFrage, vorigeHatteQuellen) -> kurze Nachfragen (höchstens 4 Wörter) suchen mit der vorigen Frage mit
 *   quellenKurz(verwendet)         -> was an der Nachricht gespeichert wird: [{ nr, titel, link, lizenz, angabe }]
 *   chipListe(text, quellen)       -> { alle, liste }: nur die im Text zitierten [n], sonst alle vorgelegten Auszüge
 *   baueSchalter(host, o)          -> Schalterzeile „Wissen ▾“ (Quelle, Suchbegriffe) in `host`; o = { texte, quellenListe(): Promise<[{id, name}]>, voreinstellung(), beiAenderung(z) }
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

// ---- Schalterzeile ----
export function baueSchalter(host, o) {
    const T = o.texte, el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
    host.textContent = ''; host.classList.add('wsw');
    const zeile = el('div', 'wsw-row'), an = el('button', 'pill wsw-an', T.an), mehr = el('button', 'pill wsw-mehr');
    an.type = 'button'; mehr.type = 'button'; mehr.setAttribute('aria-label', T.mehr); mehr.setAttribute('aria-expanded', 'false'); mehr.textContent = '▾';
    const panel = el('div', 'wsw-panel'); panel.hidden = true;
    const lq = el('small', 'help', T.quellen), sq = el('select', 'inp'), lt = el('small', 'help', T.begriffe), st = el('select', 'inp'), hilfe = el('small', 'help', T.hilfe);
    [['app', T.app], ['modell', T.modell]].forEach(([v, n]) => { const op = el('option', '', n); op.value = v; st.appendChild(op); });
    panel.append(lq, sq, lt, st, hilfe); zeile.append(an, mehr); host.append(zeile, panel);
    const lies = () => wissenZustand(o.voreinstellung && o.voreinstellung());
    function zeige() {
        const z = lies();
        an.classList.toggle('on', z.an); an.setAttribute('aria-pressed', z.an ? 'true' : 'false');
        st.value = z.begriffe;
        if (z.quellen[0] && !Array.prototype.some.call(sq.options, op => op.value === z.quellen[0])) { const op = el('option', '', z.quellen[0]); op.value = z.quellen[0]; sq.appendChild(op); }
        sq.value = z.quellen[0] || '';
    }
    function fuelleQuellen() {
        return Promise.resolve(o.quellenListe ? o.quellenListe() : []).then(l => {
            sq.textContent = ''; const alle = el('option', '', T.alle); alle.value = ''; sq.appendChild(alle);
            (l || []).forEach(q => { const op = el('option', '', q.name || q.id); op.value = q.id; sq.appendChild(op); });
            zeige();
        }, () => { sq.textContent = ''; const alle = el('option', '', T.alle); alle.value = ''; sq.appendChild(alle); zeige(); });
    }
    const aendern = (patch) => { const z = setzeWissen(patch, o.voreinstellung && o.voreinstellung()); zeige(); if (o.beiAenderung) o.beiAenderung(z); };
    an.addEventListener('click', () => aendern({ an: !lies().an }));
    mehr.addEventListener('click', () => { panel.hidden = !panel.hidden; mehr.setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) fuelleQuellen(); });
    sq.addEventListener('change', () => aendern({ quellen: sq.value ? [sq.value] : [] }));
    st.addEventListener('change', () => aendern({ begriffe: st.value }));
    window.addEventListener('heinz-wissen', zeige);
    window.addEventListener('storage', (e) => { if (e.key === KEY) zeige(); });
    fuelleQuellen();
    return { zeige, texte(neu) { Object.assign(T, neu); an.textContent = T.an; mehr.setAttribute('aria-label', T.mehr); lq.textContent = T.quellen; lt.textContent = T.begriffe; hilfe.textContent = T.hilfe; st.options[0].textContent = T.app; st.options[1].textContent = T.modell; if (sq.options[0]) sq.options[0].textContent = T.alle; } };
}
