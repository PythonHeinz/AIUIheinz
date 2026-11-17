/* tools/docheinz/mod/db.js – eigene Datenbank des Werkzeugs: IndexedDB „docheinz“ (Insel-Modul, keine Oberfläche, kein Netz).
 * Stores: books (keyPath id: Metadaten, Lesestand) und files (keyPath id: { id, blob } die Buchdatei). lib/store.js bleibt unberührt.
 *   openDb(name?) -> Promise<Db>; wirft Error('idb'), wenn IndexedDB fehlt oder gesperrt ist
 *   Db: put(record, blob), list(), get(id), file(id) -> Blob|null, update(id, patch) -> record|null, remove(id), clear(), close()
 *   storage() -> Promise<{ usage, quota, persisted }>   (Werte null, wo der Browser sie nicht nennt)
 *   persist() -> Promise<boolean>
 * Ein volles Gerät meldet put() als Error mit code 'full'. */
export const DB_NAME = 'docheinz';
export const DB_VERSION = 1;

const wrap = req => new Promise((ok, no) => { req.onsuccess = () => ok(req.result); req.onerror = () => no(req.error); });
const done = tx => new Promise((ok, no) => { tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error); tx.onabort = () => no(tx.error || new Error('abort')); });
const full = e => e && (e.name === 'QuotaExceededError' || (e.code === 22));

export function openDb(name = DB_NAME) {
    return new Promise((ok, no) => {
        if (typeof indexedDB === 'undefined') { no(new Error('idb')); return; }
        let req;
        try { req = indexedDB.open(name, DB_VERSION); } catch { no(new Error('idb')); return; }
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
        };
        req.onerror = () => no(new Error('idb'));
        req.onblocked = () => no(new Error('idb'));
        req.onsuccess = () => ok(make(req.result));
    });
}

function make(db) {
    return {
        async put(record, blob) {
            const tx = db.transaction(['books', 'files'], 'readwrite');
            const fin = done(tx);
            try {
                tx.objectStore('books').put(record);
                if (blob) tx.objectStore('files').put({ id: record.id, blob });
                await fin;
            } catch (e) {
                if (full(e)) { const err = new Error('full'); err.code = 'full'; throw err; }
                throw e;
            }
            return record;
        },
        async list() { return wrap(db.transaction('books').objectStore('books').getAll()); },
        async get(id) { return (await wrap(db.transaction('books').objectStore('books').get(id))) || null; },
        async file(id) { const r = await wrap(db.transaction('files').objectStore('files').get(id)); return r ? r.blob : null; },
        async update(id, patch) {
            const tx = db.transaction('books', 'readwrite');
            const st = tx.objectStore('books');
            const cur = await wrap(st.get(id));
            if (!cur) return null;
            const next = Object.assign({}, cur, patch);
            st.put(next);
            await done(tx);
            return next;
        },
        async remove(id) {
            const tx = db.transaction(['books', 'files'], 'readwrite');
            tx.objectStore('books').delete(id); tx.objectStore('files').delete(id);
            await done(tx);
        },
        async clear() {
            const tx = db.transaction(['books', 'files'], 'readwrite');
            tx.objectStore('books').clear(); tx.objectStore('files').clear();
            await done(tx);
        },
        close() { db.close(); },
    };
}

export async function storage() {
    const s = (typeof navigator !== 'undefined' && navigator.storage) || null;
    let est = null, persisted = null;
    try { est = s && s.estimate ? await s.estimate() : null; } catch { est = null; }
    try { persisted = s && s.persisted ? await s.persisted() : null; } catch { persisted = null; }
    return { usage: est && est.usage != null ? est.usage : null, quota: est && est.quota != null ? est.quota : null, persisted };
}
export async function persist() {
    try { return !!(navigator.storage && navigator.storage.persist && await navigator.storage.persist()); } catch { return false; }
}
