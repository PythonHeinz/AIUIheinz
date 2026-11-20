/* tools/filter/mod/db.js – eigene IndexedDB "heinz_filter" (Schlüssel-Wert), nur für dieses Werkzeug (Insel).
 * dbGet(key), dbPut(key, value), dbDel(key): Promise; ohne IndexedDB (oder bei Fehler) Rückfall auf den Speicher der Seite,
 * dbInfo() sagt, was gerade gilt. Die Datenbank `heinz` wird nicht berührt; Inhalte (Eingabe, Ergebnisse) gehen nicht ins Backup. */
const NAME = 'heinz_filter', STORE = 'kv';
const mem = new Map();
let dbp = null, mode = 'indexeddb';

function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
        try {
            const r = indexedDB.open(NAME, 1);
            r.onupgradeneeded = () => { r.result.createObjectStore(STORE); };
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
            r.onblocked = () => reject(new Error('blocked'));
        } catch (e) { reject(e); }
    }).catch(() => { mode = 'memory'; return null; });
    return dbp;
}
function req(db, kind, key, value) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, kind === 'get' ? 'readonly' : 'readwrite'), st = tx.objectStore(STORE);
        const r = kind === 'get' ? st.get(key) : kind === 'put' ? st.put(value, key) : st.delete(key);
        tx.oncomplete = () => resolve(kind === 'get' ? r.result : undefined);
        tx.onerror = tx.onabort = () => reject(tx.error);
    });
}
async function run(kind, key, value) {
    const db = await open();
    if (db) { try { return await req(db, kind, key, value); } catch (e) { mode = 'memory'; } }
    if (kind === 'get') return mem.get(key);
    if (kind === 'put') mem.set(key, value); else mem.delete(key);
}
export const dbGet = (key) => run('get', key);
export const dbPut = (key, value) => run('put', key, value);
export const dbDel = (key) => run('del', key);
export const dbInfo = () => ({ mode });
