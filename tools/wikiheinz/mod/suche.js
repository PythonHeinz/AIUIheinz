/* tools/wikiheinz/mod/suche.js – Titel-Vorsilbe, Weiterleitungen, Volltext in „Mein Wiki“ (rein; der Speicher kommt als Parameter).
 *   suche(speicher, text, { quellen, limit, folge }) -> [{ q, titel, text, via, genau }]
 *     Treffer nach Titel-Vorsilbe in den Quellen (alle, wenn `quellen` fehlt); Weiterleitungen werden bis zu 3 Mal verfolgt (`via` = Titel, unter dem gefunden wurde);
 *     Reihenfolge: genauer Treffer, dann eigene Seiten vor Importquellen, dann kürzerer Titel, dann alphabetisch.
 *   volltext(speicher, qid, text, limit) -> Seiten einer Quelle, in denen alle Wörter vorkommen (Titel zählt mehr)
 *   suchbegriffe(speicher, begriffe, { quellen, proBegriff, gesamt }) -> Treffer mehrerer Begriffe ohne Doppelte (für den Frage-Ablauf) */
import { keyOf } from './schluessel.js';

async function lies(sp, qid, e, folge) {
    let cur = e, via = '', n = 0;
    while (folge && cur.v && n < 3) {
        const z = (await sp.hole(qid, keyOf(cur.v))).find(x => x.t === cur.v) || (await sp.hole(qid, keyOf(cur.v)))[0];
        if (!z) return null;
        via = via || e.t; cur = z; n++;
    }
    if (cur.v) return null;
    return { q: qid, titel: cur.t, text: cur.x, via: via && via !== cur.t ? via : '', k: cur.k };
}

export async function suche(sp, text, { quellen, limit = 20, folge = true } = {}) {
    const k = keyOf(text); if (!k) return [];
    const qs = quellen || (await sp.quellen()).map(q => q.id), meta = new Map((await sp.quellen()).map(q => [q.id, q]));
    const treffer = [], gesehen = new Set();
    for (const qid of qs) {
        for (const e of await sp.praefix(qid, k, limit * 4)) {
            const r = await lies(sp, qid, e, folge); if (!r) continue;
            const id = qid + '|' + r.titel; if (gesehen.has(id)) continue; gesehen.add(id);
            r.genau = e.k === k; treffer.push(r);
        }
    }
    treffer.sort((a, b) => (b.genau - a.genau) || ((meta.get(b.q) && meta.get(b.q).art === 'eigen') - (meta.get(a.q) && meta.get(a.q).art === 'eigen')) ||
        a.titel.length - b.titel.length || (a.titel < b.titel ? -1 : a.titel > b.titel ? 1 : 0));
    return treffer.slice(0, limit);
}

export async function volltext(sp, qid, text, limit = 20) {
    const ws = String(text || '').normalize('NFC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 1); if (!ws.length) return [];
    const out = [];
    for (const e of await sp.alle(qid)) {
        const t = String(e.t || '').toLowerCase(), x = String(e.x || '').toLowerCase(), tg = (e.tags || []).join(' ').toLowerCase();
        if (!ws.every(w => t.includes(w) || x.includes(w) || tg.includes(w))) continue;
        out.push({ q: qid, titel: e.t, text: e.x, via: '', k: e.k, punkte: ws.reduce((s, w) => s + (t.includes(w) ? 3 : 0) + (tg.includes(w) ? 2 : 0) + (x.includes(w) ? 1 : 0), 0) });
    }
    out.sort((a, b) => b.punkte - a.punkte || a.titel.length - b.titel.length);
    return out.slice(0, limit);
}

export async function suchbegriffe(sp, begriffe, { quellen, proBegriff = 3, gesamt = 3 } = {}) {
    const out = [], gesehen = new Set();
    for (const b of begriffe || []) {
        const ts = await suche(sp, b, { quellen, limit: proBegriff });
        for (const t of ts) { const id = t.q + '|' + t.titel; if (!gesehen.has(id)) { gesehen.add(id); out.push(t); } }
        if (out.length >= gesamt) break;
    }
    return out.slice(0, gesamt);
}
