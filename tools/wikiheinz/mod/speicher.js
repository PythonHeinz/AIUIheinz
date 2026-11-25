/* tools/wikiheinz/mod/speicher.js – Speicher im Arbeitsspeicher mit derselben Schnittstelle wie db.js (Tests und Rückfall ohne IndexedDB).
 * Schnittstelle (alles Promise): quellen(), quelle(id), quelleSetzen(q), quelleLoeschen(id, onProgress), add(qid, einträge), put(eintrag), loesche(qid, schluessel, titel),
 *   hole(qid, schluessel) -> [Eintrag], praefix(qid, schluessel, limit) -> [Eintrag], alle(qid) -> [Eintrag], info() -> { art }
 * Eintrag: { q: Quelle, k: Schlüssel, t: Titel, x: Text, v: Weiterleitung auf Titel oder '', … } (Mein Wiki zusätzlich tags, links, h Herkunft, g geändert) */
export function neuerSpeicher() {
    const qs = new Map(), eint = new Map();                             // eint: Quelle -> sortierbare Liste von Einträgen
    const liste = (q) => { if (!eint.has(q)) eint.set(q, []); return eint.get(q); };
    const cmp = (a, b) => a.k < b.k ? -1 : a.k > b.k ? 1 : a.t < b.t ? -1 : a.t > b.t ? 1 : 0;
    const sortiert = new Set();
    const ordne = (q) => { if (!sortiert.has(q)) { liste(q).sort(cmp); sortiert.add(q); } return liste(q); };
    return {
        async quellen() { return [...qs.values()].map(q => ({ ...q })); },
        async quelle(id) { const q = qs.get(id); return q ? { ...q } : null; },
        async quelleSetzen(q) { qs.set(q.id, { ...q }); },
        async quelleLoeschen(id, onProgress) { const n = liste(id).length; eint.delete(id); sortiert.delete(id); qs.delete(id); if (onProgress) onProgress(n, n); },
        async add(qid, einträge) { const l = liste(qid); for (const e of einträge) l.push({ ...e, q: qid }); sortiert.delete(qid); },
        async put(e) { const l = liste(e.q), i = l.findIndex(x => x.k === e.k && x.t === e.t); if (i >= 0) l[i] = { ...e }; else l.push({ ...e }); sortiert.delete(e.q); },
        async loesche(qid, k, t) { const l = liste(qid), i = l.findIndex(x => x.k === k && x.t === t); if (i >= 0) l.splice(i, 1); },
        async hole(qid, k) { return ordne(qid).filter(e => e.k === k).map(e => ({ ...e })); },
        async praefix(qid, k, limit) { const out = []; for (const e of ordne(qid)) { if (e.k < k) continue; if (!e.k.startsWith(k)) break; out.push({ ...e }); if (out.length >= (limit || 50)) break; } return out; },
        async alle(qid) { return liste(qid).map(e => ({ ...e })); },
        info() { return { art: 'memory' }; },
    };
}
