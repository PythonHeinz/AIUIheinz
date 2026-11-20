/* tools/filter/mod/bewerten.js – Bewerten: Anfrage bauen, Antwort prüfen, Schleife mit Abbruch und Wiederaufnahme (Insel-Modul).
 * Das Modell klassifiziert nur (ein Etikett je Eintrag); die Seite rät nie, sie parst und prüft gegen die erlaubten Etiketten.
 * Modellzugriff nur über die Funktion `senden`, die die Seite aus HeinzProviders.chat baut (kein fetch hier).
 * baueSchema(labels, mitGrund)                  JSON-Schema mit enum der erlaubten Etiketten (für Ollama `format`)
 * baueAnfrage({ regel, labels, text, mitGrund, maxZeichen }) -> { system, user, format, gekuerzt }
 * pruefeAntwort(roh, labels)                    -> { label: string|null, grund, quelle } ; label null = unklar
 * lauf(opts)                                    sequentiell; opts: { eintraege, labels, regel, mitGrund, senden(anfrage, signal) -> Promise<string>,
 *                                               signal, bereits: { [index]: ergebnis }, onErgebnis(erg, n, gesamt), istFatal(e) } -> { ergebnisse, fehler, abgebrochen, fatal } */

export const MAX_ZEICHEN = 500;

export function baueSchema(labels, mitGrund) {
    const properties = { label: { type: 'string', enum: labels.slice() } }, required = ['label'];
    if (mitGrund) { properties.why = { type: 'string' }; required.push('why'); }
    return { type: 'object', properties, required };
}

export function baueAnfrage(o) {
    const max = o.maxZeichen || MAX_ZEICHEN, text = String(o.text);
    const system = 'You are a strict classifier. ' + String(o.regel || '').trim() + ' Allowed labels: ' + o.labels.join(', ') +
        '. Answer only as JSON: {"label": "<one allowed label>"' + (o.mitGrund ? ', "why": "<max. 10 words>"' : '') + '}.';
    return { system, user: text.slice(0, max), format: baueSchema(o.labels, o.mitGrund), gekuerzt: text.length > max };
}

function treffer(wert, labels) {
    const v = String(wert == null ? '' : wert).trim().replace(/^["'`]+|["'`.,;:!]+$/g, '').trim().toLowerCase();
    return v ? labels.find(l => l.toLowerCase() === v) || null : null;
}

export function pruefeAntwort(roh, labels) {
    const text = String(roh == null ? '' : roh).trim();
    if (!text) return { label: null, grund: '', quelle: 'leer' };
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) {
        const m = /\{[\s\S]*\}/.exec(text);    // Antwort mit Text drumherum: erstes JSON-Objekt
        if (m) { try { obj = JSON.parse(m[0]); } catch (e2) { obj = null; } }
    }
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const grund = obj.why ? String(obj.why).trim() : '';
        return { label: treffer(obj.label, labels), grund, quelle: 'json' };
    }
    const direkt = treffer(text, labels);    // Rückfall ohne Schema: nur wenn die ganze Antwort ein erlaubtes Etikett ist
    return { label: direkt, grund: '', quelle: direkt ? 'text' : 'ungueltig' };
}

export function istFatalStandard(e) {
    return !!e && (e instanceof TypeError || e.code === 'ONLINE_BLOCKED' || e.code === 'UNKNOWN_PROVIDER' || e.code === 'NO_URL' || e.http === 404 || e.http === 401 || e.http === 403);
}

export async function lauf(o) {
    const sig = o.signal, bereits = o.bereits || {}, fatalFn = o.istFatal || istFatalStandard;
    const ergebnisse = [];
    let fehler = 0, fatal = null, abgebrochen = false;
    for (let i = 0; i < o.eintraege.length; i++) {
        if (sig && sig.aborted) { abgebrochen = true; break; }
        const e = o.eintraege[i];
        if (bereits[e.index]) { ergebnisse.push(bereits[e.index]); continue; }
        const a = baueAnfrage({ regel: o.regel, labels: o.labels, text: e.text, mitGrund: o.mitGrund, maxZeichen: o.maxZeichen });
        let erg;
        try {
            const roh = await o.senden(a, sig);
            const p = pruefeAntwort(roh, o.labels);
            erg = { index: e.index, text: e.text, row: e.row, label: p.label, grund: p.grund, quelle: p.quelle, gekuerzt: a.gekuerzt, fehler: false };
        } catch (err) {
            if ((err && err.name === 'AbortError') || (sig && sig.aborted)) { abgebrochen = true; break; }
            fehler++;
            erg = { index: e.index, text: e.text, row: e.row, label: null, grund: '', quelle: 'fehler', gekuerzt: a.gekuerzt, fehler: true, meldung: String(err && err.message || err) };
            if (fatalFn(err)) { fatal = err; ergebnisse.push(erg); if (o.onErgebnis) o.onErgebnis(erg, ergebnisse.length, o.eintraege.length); break; }
        }
        ergebnisse.push(erg);
        if (o.onErgebnis) o.onErgebnis(erg, ergebnisse.length, o.eintraege.length);
    }
    return { ergebnisse, fehler, abgebrochen, fatal };
}
