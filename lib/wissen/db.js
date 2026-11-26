/* lib/wissen/db.js – eigene IndexedDB „heinz_wikiheinz“ (Insel: die Datenbank „heinz“ und andere Werkzeuge werden nicht berührt).
 * Gleiche Schnittstelle wie speicher.js. Speicher: `quellen` (Schlüssel id) und `eintraege` (Schlüssel [q, k, t]); die Vorsilbensuche ist ein Bereich über [q, k].
 * Ohne IndexedDB oder bei einem Fehler beim Öffnen: Rückfall auf den Arbeitsspeicher (info().art === 'memory'), die Oberfläche zeigt dann einen Hinweis.
 * Inhalte gehen nicht ins App-Backup; „Mein Wiki“ braucht deshalb den eigenen Export (eigene.js). */
import { neuerSpeicher } from './speicher.js';
const NAME = 'heinz_wikiheinz', STAPEL = 20000;
const wrap = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const fertig = (tx) => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = tx.onabort = () => rej(tx.error); });

export async function oeffne() {
    let db;
    try {
        db = await new Promise((res, rej) => {
            const r = indexedDB.open(NAME, 1);
            r.onupgradeneeded = () => { r.result.createObjectStore('quellen', { keyPath: 'id' }); r.result.createObjectStore('eintraege', { keyPath: ['q', 'k', 't'] }); };
            r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked'));
        });
    } catch (e) { return neuerSpeicher(); }
    const E = (m) => db.transaction('eintraege', m).objectStore('eintraege');
    return {
        async quellen() { return wrap(db.transaction('quellen').objectStore('quellen').getAll()); },
        async quelle(id) { return (await wrap(db.transaction('quellen').objectStore('quellen').get(id))) || null; },
        async quelleSetzen(q) { const tx = db.transaction('quellen', 'readwrite'); tx.objectStore('quellen').put(q); await fertig(tx); },
        async add(qid, einträge) { const tx = db.transaction('eintraege', 'readwrite'), st = tx.objectStore('eintraege'); for (const e of einträge) st.put({ ...e, q: qid }); await fertig(tx); },
        async put(e) { const tx = db.transaction('eintraege', 'readwrite'); tx.objectStore('eintraege').put(e); await fertig(tx); },
        async loesche(qid, k, t) { const tx = db.transaction('eintraege', 'readwrite'); tx.objectStore('eintraege').delete([qid, k, t]); await fertig(tx); },
        async hole(qid, k) { return wrap(E('readonly').getAll(IDBKeyRange.bound([qid, k], [qid, k, '￿']))); },
        async praefix(qid, k, limit) { return wrap(E('readonly').getAll(IDBKeyRange.bound([qid, k], [qid, k + '￿', '￿']), limit || 50)); },
        async alle(qid) { return wrap(E('readonly').getAll(IDBKeyRange.bound([qid], [qid, []]))); },
        async quelleLoeschen(id, onProgress) {                          // in Stücken: Millionen Einträge sprengen sonst eine einzige Transaktion; der Eintrag der Liste zuletzt (bei Abbruch bleibt er sichtbar)
            const q = await this.quelle(id), gesamt = (q && q.anzahl) || 0; let n = 0;
            for (;;) {
                const tx = db.transaction('eintraege', 'readwrite'), st = tx.objectStore('eintraege'), fin = fertig(tx);
                const keys = await wrap(st.getAllKeys(IDBKeyRange.bound([id], [id, []]), STAPEL));
                keys.forEach(k => st.delete(k)); await fin; n += keys.length;
                if (onProgress) onProgress(n, gesamt);
                if (keys.length < STAPEL) break;
            }
            const tx = db.transaction('quellen', 'readwrite'); tx.objectStore('quellen').delete(id); await fertig(tx);
        },
        info() { return { art: 'indexeddb' }; },
    };
}
