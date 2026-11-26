/* lib/wissen/import.js – Wikipedia-Auszug (jsonl, eine Zeile je Eintrag, Format des ZIM-Skripts) in einen Speicher schreiben.
 *   zeilenAus(chunks)        -> async-Generator von Zeilen aus Textstücken oder Bytes (Strom, nie die ganze Datei im Speicher)
 *   parseZeile(zeile)        -> { k, t, x, v } | null   (Weiterleitung: v = Zieltitel, x leer; Artikel: x = Einleitung; sonst null)
 *   importiere({ chunks, speicher, quelle, stapel, signal, onProgress }) -> { gelesen, gespeichert, abgebrochen }
 *     setzt auf `quelle.gelesen` fort (so viele Zeilen werden übersprungen), speichert nach jedem Stapel den Stand in der Quelle,
 *     bricht bei `signal.aborted` sauber nach dem Stapel ab; `quelle.fertig` ist erst nach dem letzten Stapel wahr. */
import { keyOf } from './schluessel.js';

export async function* zeilenAus(chunks) {
    const dec = new TextDecoder('utf-8'); let rest = '';
    for await (const c of chunks) {
        rest += typeof c === 'string' ? c : dec.decode(c, { stream: true });
        let i, start = 0;
        while ((i = rest.indexOf('\n', start)) >= 0) { yield rest.slice(start, i).replace(/\r$/, ''); start = i + 1; }
        rest = rest.slice(start);
    }
    rest += dec.decode();
    if (rest) yield rest.replace(/\r$/, '');
}

export function parseZeile(zeile) {
    if (!zeile || zeile.charCodeAt(0) !== 123) return null;
    let o; try { o = JSON.parse(zeile); } catch { return null; }
    const t = o && String(o.word || '').trim(); if (!t) return null;
    const s = Array.isArray(o.senses) ? o.senses[0] : null; if (!s) return null;
    const k = keyOf(t); if (!k) return null;
    if (Array.isArray(s.form_of) && s.form_of[0] && s.form_of[0].word) { const v = String(s.form_of[0].word).trim(); return v && v !== t ? { k, t, x: '', v } : null; }
    const g = Array.isArray(s.glosses) ? s.glosses.join('\n') : String(s.glosses || s.gloss || '');
    const x = g.trim(); return x ? { k, t, x, v: '' } : null;
}

export async function importiere({ chunks, speicher, quelle, stapel = 5000, signal, onProgress }) {
    const q = { ...quelle, fertig: false };
    let nr = 0, skip = Number(q.gelesen) || 0, puffer = [], gespeichert = Number(q.anzahl) || 0, abgebrochen = false;
    await speicher.quelleSetzen(q);
    const leere = async () => {
        if (puffer.length) { await speicher.add(q.id, puffer); gespeichert += puffer.length; puffer = []; }
        q.gelesen = nr; q.anzahl = gespeichert; await speicher.quelleSetzen(q);
        if (onProgress) onProgress({ gelesen: nr, gespeichert });
    };
    for await (const z of zeilenAus(chunks)) {
        nr++;
        if (nr <= skip) continue;
        const e = parseZeile(z); if (e) puffer.push(e);
        if (puffer.length >= stapel) { await leere(); if (signal && signal.aborted) { abgebrochen = true; break; } }
    }
    if (!abgebrochen) { await leere(); q.fertig = true; await speicher.quelleSetzen(q); }
    return { gelesen: nr, gespeichert, abgebrochen };
}
