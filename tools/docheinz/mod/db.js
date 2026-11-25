/* tools/docheinz/mod/db.js – eigene Datenbank des Werkzeugs: IndexedDB „docheinz“ (Insel-Modul, keine Oberfläche, kein Netz).
 * Stores: books (keyPath id: Metadaten, Lesestand), files (keyPath id: { id, blob } die Buchdatei) und texts (keyPath id: { id, key, chapters } Kapiteltexte für die Volltextsuche, ab Version 2). lib/store.js bleibt unberührt.
 *   openDb(name?) -> Promise<Db>; wirft Error('idb'), wenn IndexedDB fehlt oder gesperrt ist
 *   Db: put(record, blob), list(), get(id), file(id) -> Blob|null, update(id, patch) -> record|null, remove(id), clear(), close()
 *       dictList() -> [{ id, name, count }], dictCreate(meta), dictRename(id, name), dictAdd(id, [[schlüssel, text, original], …]), dictFind([schlüssel]) -> [{ dict, w, d, o }], dictRemove(id, onProgress) (Wörterbücher, ab Version 3)
 *       getText(id) -> { id, key, chapters } | null, putText(id, key, chapters)
 *   storage() -> Promise<{ usage, quota, persisted }>   (Werte null, wo der Browser sie nicht nennt)
 *   persist() -> Promise<boolean>
 * Ein volles Gerät meldet put() als Error mit code 'full'. */
export const DB_NAME = 'docheinz';
export const DB_VERSION = 3;

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
            if (!db.objectStoreNames.contains('texts')) db.createObjectStore('texts', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('dictmeta')) db.createObjectStore('dictmeta', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('dict')) { const d = db.createObjectStore('dict', { autoIncrement: true }); d.createIndex('w', 'w'); d.createIndex('dict', 'dict'); }
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
        async getText(id) { return (await wrap(db.transaction('texts').objectStore('texts').get(id))) || null; },
        async putText(id, key, chapters) {
            const tx = db.transaction('texts', 'readwrite'); const fin = done(tx);
            tx.objectStore('texts').put({ id, key, chapters });
            try { await fin; } catch (e) { if (full(e)) { const err = new Error('full'); err.code = 'full'; throw err; } throw e; }
        },
        async dictList() { return wrap(db.transaction('dictmeta').objectStore('dictmeta').getAll()); },
        async dictCreate(meta) {
            const tx = db.transaction('dictmeta', 'readwrite'); const fin = done(tx);
            tx.objectStore('dictmeta').put(meta); await fin; return meta;
        },
        async dictAdd(id, entries) {                                                   // ein Stapel Einträge; zählt in den Metadaten mit
            const tx = db.transaction(['dict', 'dictmeta'], 'readwrite'); const fin = done(tx);
            const st = tx.objectStore('dict'), mt = tx.objectStore('dictmeta');
            entries.forEach(e => st.add({ dict: id, w: e[0], d: e[1], o: e[2] || e[0], r: e[4] || '' }));
            const m = await wrap(mt.get(id)); if (m) { m.count = (m.count || 0) + entries.length; mt.put(m); }
            try { await fin; } catch (e) { if (full(e)) { const err = new Error('full'); err.code = 'full'; throw err; } throw e; }
        },
        async dictRename(id, name) {
            const tx = db.transaction('dictmeta', 'readwrite'); const fin = done(tx);
            const st = tx.objectStore('dictmeta'), m = await wrap(st.get(id));
            if (m) { m.name = String(name).slice(0, 60); st.put(m); }
            await fin;
        },
        async dictFind(keys) {
            const ix = db.transaction('dict').objectStore('dict').index('w'), out = [];
            for (const k of keys) { const r = await wrap(ix.getAll(k, 20)); r.forEach(x => out.push(x)); }
            return out;
        },
        async dictRemove(id, onProgress) {                              // in Stücken von 20000 Einträgen: große Wörterbücher (1 Mio.+) sprengen sonst eine einzige Transaktion
            let n = 0;
            for (;;) {
                const tx = db.transaction('dict', 'readwrite'), st = tx.objectStore('dict'), fin = done(tx);
                const keys = await wrap(st.index('dict').getAllKeys(IDBKeyRange.only(id), 20000));
                keys.forEach(k => st.delete(k));
                await fin;
                n += keys.length; if (onProgress) onProgress(n);
                if (keys.length < 20000) break;
            }
            const tx = db.transaction('dictmeta', 'readwrite'); tx.objectStore('dictmeta').delete(id); await done(tx);   // Eintrag der Liste zuletzt: bei Abbruch bleibt er sichtbar und lässt sich erneut löschen
        },
        async remove(id) {
            const tx = db.transaction(['books', 'files', 'texts'], 'readwrite');
            tx.objectStore('books').delete(id); tx.objectStore('files').delete(id); tx.objectStore('texts').delete(id);
            await done(tx);
        },
        async clear() {
            const tx = db.transaction(['books', 'files', 'texts'], 'readwrite');
            tx.objectStore('books').clear(); tx.objectStore('files').clear(); tx.objectStore('texts').clear();
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
