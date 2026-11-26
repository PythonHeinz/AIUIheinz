/* tools/wikiheinz/mod/volltext.js – ganze Artikel vom eigenen Server (Variante B, ZIM-Datei) und die Auswahl der Abschnitte, die zur Frage passen.
 *   volltextQuelle(holen) -> { status(), artikel(titel) }   `holen(url)` = async -> { status, json }; Antworten werden kurz gemerkt
 *     status() -> { available, datei?, eintraege?, error?, text? }      artikel(titel) -> { titel, intro, abschnitte: [{ h, text }], infobox: [[Name, Wert]], zeichen } | null
 *   waehleAbschnitte(artikel, begriffe, { maxZeichen }) -> Text für den Auszug: Einleitung, passende Infobox-Zeilen und die am besten passenden Abschnitte
 * Die Wahl der Abschnitte macht der Code (Wörter zählen), nicht das Modell. */
import { keyOf } from './schluessel.js';

export function volltextQuelle(holen, { statusMs = 20000, max = 40 } = {}) {
    let st = null, stZeit = 0; const cache = new Map();
    return {
        async status(neu) {
            if (!neu && st && Date.now() - stZeit < statusMs) return st;
            try { const r = await holen('/api/wiki/status'); st = r && r.json && typeof r.json === 'object' ? r.json : { available: false, error: 'offline' }; }
            catch (e) { st = { available: false, error: 'offline' }; }
            stZeit = Date.now(); if (!st.available) cache.clear(); return st;
        },
        async artikel(titel) {
            const k = String(titel || ''); if (!k) return null;
            if (cache.has(k)) return cache.get(k);
            let a = null;
            try { const r = await holen('/api/wiki/artikel?titel=' + encodeURIComponent(k)); a = r && r.status === 200 && r.json && r.json.titel ? r.json : null; } catch (e) { a = null; }
            if (cache.size >= max) cache.delete(cache.keys().next().value);
            cache.set(k, a); return a;
        }
    };
}

const kuerze = (x, n) => { x = String(x || '').replace(/\s+/g, ' ').trim(); if (x.length <= n) return x; const h = x.slice(0, n), m = [...h.matchAll(/[.!?](?=\s|$)/g)]; return m.length && m[m.length - 1].index + 1 >= n * 0.5 ? h.slice(0, m[m.length - 1].index + 1) : h.replace(/\s+\S*$/, '') + ' …'; };
const tokens = (begriffe) => { const s = new Set(); for (const b of begriffe || []) for (const w of keyOf(b).split(/[^a-z0-9Ͱ-ϿЀ-ӿ]+/).filter(x => x.length > 2)) s.add(w); return [...s]; };
const zaehle = (text, ws) => { const k = keyOf(text); let n = 0; for (const w of ws) { let i = k.indexOf(w); while (i >= 0 && n < 50) { n++; i = k.indexOf(w, i + w.length); } } return n; };

export function waehleAbschnitte(a, begriffe, { maxZeichen = 1200 } = {}) {
    if (!a) return '';
    const ws = tokens(begriffe), teile = [], intro = String(a.intro || '');
    const info = (a.infobox || []).filter(([n, v]) => v && ws.some(w => keyOf(n).includes(w))).slice(0, 4).map(([n, v]) => n + ': ' + v).join('; ');
    const abs = (a.abschnitte || []).map((s, i) => ({ s, i, p: zaehle(s.h, ws) * 3 + zaehle(s.text, ws) })).filter(x => x.p > 0).sort((x, y) => y.p - x.p || x.i - y.i);
    if (!abs.length) return kuerze(intro, maxZeichen);
    teile.push(kuerze(intro, Math.min(380, Math.round(maxZeichen * 0.35))));
    if (info) teile.push(kuerze('Infobox – ' + info, 200));
    let rest = maxZeichen - teile.join(' ').length;
    for (const { s } of abs) {
        if (rest < 160) break;
        const t = (s.h ? s.h + ': ' : '') + kuerze(s.text, Math.min(rest - 4, 600)); teile.push(t); rest -= t.length + 1;
    }
    return teile.join(' ');
}
