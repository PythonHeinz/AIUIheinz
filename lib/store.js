/* lib/store.js – storage layer of the app (Beschluss docs/KONZEPT.md 22.4 and 20.6): everything the pages keep (settings, conversations, results).
 * Plain script, no build. Global: HeinzStore. Values are JSON; keys start with "heinz".
 *   HeinzStore.open()               -> Promise (never rejects); load the backend once before the first read (idempotent)
 *   HeinzStore.get(key, fallback)   -> value (synchronous, from the opened backend); fallback when missing or not valid JSON
 *   HeinzStore.set(key, value)      -> Promise; writes through to the backend; a failed write is reported (onProblem), the old value stays
 *   HeinzStore.remove(key)          -> Promise
 *   HeinzStore.exportAll(withKeys)  -> Promise of { key: rawJsonString } for all "heinz*" keys (API keys "heinz_keys" only with withKeys)
 *   HeinzStore.importAll(data)      -> Promise; writes all "heinz*" keys of a backup (old backup files work unchanged)
 *   HeinzStore.info()               -> { backend: 'indexeddb' | 'localstorage', problems: [...] } (synchronous)
 *   HeinzStore.status()             -> Promise of info() plus { persisted, usage, quota, migrated } (navigator.storage; null where unknown)
 *   HeinzStore.onProblem(fn)        -> fn({ code, key, message }) now for known problems and later for new ones.
 *                                      codes: fallback (IndexedDB not usable, localStorage in use), quota (storage full, write not done),
 *                                      write (other write error), migrate (copy check failed, localStorage kept), nearfull (80 % of the quota used)
 * Which keys live where (KEEP_LOCAL = small switches stay in localStorage, everything else routed here goes to IndexedDB):
 *   conversations: heinz_chats, heinz_slim_chats, heinz_current     results: heinz_series, heinz_speedtest     media: reserved (empty object store)
 *   API keys (heinz_keys), settings and engine lists stay in localStorage; no export without the "keys" tick.
 * Reading stays synchronous: open() loads the routed records into memory once; writes go to memory first and to IndexedDB after.
 * Backend contract (a test or a later version swaps only this object with setBackend):
 *   { open(): Promise, get(key): string|null (sync, after open), put(key, raw): Promise, del(key): Promise, keys(): Promise<string[]> } */
export const HeinzStore = (function () {
    'use strict';
    var ROUTE = { heinz_chats: 'conversations', heinz_slim_chats: 'conversations', heinz_current: 'conversations', heinz_series: 'results', heinz_speedtest: 'results' };
    var DB_NAME = 'heinz', DB_VERSION = 1, STORES = ['conversations', 'results', 'media'];
    var MIGRATION_KEY = 'heinz_idb_migration';      // in localStorage: which keys were copied (never exported, never imported)
    var NOT_SAVED = {}; NOT_SAVED[MIGRATION_KEY] = 1;
    var problems = [], listeners = [];

    function report(code, key, err) {
        var p = { code: code, key: key || '', message: err && err.message ? String(err.message) : '' };
        if (!problems.some(function (q) { return q.code === code && q.key === p.key; })) problems.push(p);
        listeners.forEach(function (f) { try { f(p); } catch (e) {} });
    }
    function isQuota(e) { return !!e && (e.name === 'QuotaExceededError' || e.code === 22 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED'); }

    // ---------- localStorage (small switches; also the fallback for everything) ----------
    var local = {
        get: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        put: function (key, raw) {
            try { localStorage.setItem(key, raw); return Promise.resolve(); } catch (e) { console.warn('localStorage not available', e); return Promise.reject(e); }
        },
        del: function (key) { try { localStorage.removeItem(key); } catch (e) {} return Promise.resolve(); },
        keys: function () {
            var out = [];
            try { for (var i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); } catch (e) {}
            return out;
        }
    };

    // ---------- IndexedDB helpers ----------
    function idbOpen() {
        return new Promise(function (resolve, reject) {
            if (!window.indexedDB) return reject(new Error('indexedDB is not available'));
            var done = false, timer = setTimeout(function () { if (!done) { done = true; reject(new Error('indexedDB did not answer')); } }, 4000), rq;
            function fin(ok, v) { if (done) { if (ok && v && v.close) v.close(); return; } done = true; clearTimeout(timer); ok ? resolve(v) : reject(v); }
            try { rq = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { return fin(false, e); }
            rq.onupgradeneeded = function () {
                var db = rq.result;
                STORES.forEach(function (n) { if (!db.objectStoreNames.contains(n)) db.createObjectStore(n); });
            };
            rq.onsuccess = function () { fin(true, rq.result); };
            rq.onerror = function () { fin(false, rq.error || new Error('indexedDB open failed')); };
        });
    }
    function idbLoad(db, name) {
        return new Promise(function (resolve, reject) {
            var m = {}, t = db.transaction(name, 'readonly'), rq = t.objectStore(name).openCursor();
            rq.onsuccess = function () { var c = rq.result; if (c) { if (typeof c.value === 'string') m[c.key] = c.value; c.continue(); } };
            t.oncomplete = function () { resolve(m); };
            t.onerror = t.onabort = function () { reject(t.error || new Error('read failed')); };
        });
    }
    function idbPut(db, name, key, raw) {
        return new Promise(function (resolve, reject) {
            var t = db.transaction(name, 'readwrite');
            try { t.objectStore(name).put(raw, key); } catch (e) { return reject(e); }
            t.oncomplete = function () { resolve(); };
            t.onerror = t.onabort = function () { reject(t.error || new Error('write failed')); };
        });
    }
    function idbDel(db, name, key) {
        return new Promise(function (resolve, reject) {
            var t = db.transaction(name, 'readwrite');
            try { t.objectStore(name).delete(key); } catch (e) { return reject(e); }
            t.oncomplete = function () { resolve(); };
            t.onerror = t.onabort = function () { reject(t.error || new Error('delete failed')); };
        });
    }
    function idbGet(db, name, key) {
        return new Promise(function (resolve, reject) {
            var t = db.transaction(name, 'readonly'), rq = t.objectStore(name).get(key);
            t.oncomplete = function () { resolve(rq.result === undefined ? null : rq.result); };
            t.onerror = t.onabort = function () { reject(t.error || new Error('read failed')); };
        });
    }

    // ---------- default backend: routed keys in IndexedDB (with a copy in memory), the rest in localStorage ----------
    var db = null, mode = 'local', cache = {};      // mode: 'idb' | 'local' (fallback or before open)
    function routed(key) { return mode === 'idb' && Object.prototype.hasOwnProperty.call(ROUTE, key); }
    function countOf(raw) { try { var v = JSON.parse(raw); return Array.isArray(v) ? v.length : 1; } catch (e) { return -1; } }
    function readFlag() { try { var f = JSON.parse(local.get(MIGRATION_KEY)); if (f && f.done && typeof f.done === 'object') return f; } catch (e) {} return { done: {} }; }

    // Copy what the old version kept in localStorage. Each key is written, read back and compared (full text and number of entries) before it counts as
    // moved; the old entry stays untouched (way back stays open), only the flag in MIGRATION_KEY marks it. A key marked once is never copied again,
    // so a conversation list emptied later does not come back from the old copy.
    function migrate() {
        var flag = readFlag(), keys = Object.keys(ROUTE), changed = false;
        function step(i) {
            if (i >= keys.length) {
                if (changed) { try { localStorage.setItem(MIGRATION_KEY, JSON.stringify(flag)); } catch (e) { /* flag lost: next start checks again and finds the keys in IndexedDB */ } }
                return Promise.resolve(true);
            }
            var k = keys[i], store = ROUTE[k];
            if (flag.done[k]) return step(i + 1);
            if (cache[k] !== undefined) { flag.done[k] = { at: new Date().toISOString(), n: countOf(cache[k]), already: true }; changed = true; return step(i + 1); }
            var raw = local.get(k);
            if (raw === null || raw === undefined) return step(i + 1);
            return idbPut(db, store, k, raw).then(function () { return idbGet(db, store, k); }).then(function (back) {
                if (back !== raw || countOf(back) !== countOf(raw)) throw new Error('copy of ' + k + ' differs from the original');
                cache[k] = raw; flag.done[k] = { at: new Date().toISOString(), n: countOf(raw), bytes: raw.length }; changed = true;
                return step(i + 1);
            }).catch(function (e) {
                idbDel(db, store, k).catch(function () {});     // no half copy: it would count as "already moved" at the next start
                report(isQuota(e) ? 'quota' : 'migrate', k, e);
                return false;
            });
        }
        return step(0);
    }

    var defaultBackend = {
        open: function () {
            return idbOpen().then(function (d) {
                db = d;
                db.onversionchange = function () { try { db.close(); } catch (e) {} };
                return Promise.all(['conversations', 'results'].map(function (n) { return idbLoad(db, n); }));
            }).then(function (parts) {
                cache = {}; parts.forEach(function (m) { Object.keys(m).forEach(function (k) { cache[k] = m[k]; }); });
                return migrate();
            }).then(function (ok) {
                if (!ok) { mode = 'local'; cache = {}; try { db.close(); } catch (e) {} db = null; return; }   // keep working from the untouched old copy
                mode = 'idb';
                if (window.navigator && navigator.storage) {
                    if (navigator.storage.persisted) navigator.storage.persisted().then(function (p) { return p || (navigator.storage.persist ? navigator.storage.persist() : false); }).catch(function () {});
                    if (navigator.storage.estimate) navigator.storage.estimate().then(function (e) { if (e && e.quota && e.usage / e.quota >= 0.8) report('nearfull', '', null); }).catch(function () {});
                }
            }, function (e) {
                mode = 'local'; db = null; cache = {};
                report('fallback', '', e);
            });
        },
        get: function (key) {
            if (routed(key)) return cache[key] === undefined ? null : cache[key];
            return local.get(key);
        },
        put: function (key, raw) {
            if (!routed(key)) return local.put(key, raw).catch(function (e) { report(isQuota(e) ? 'quota' : 'write', key, e); throw e; });
            var before = cache[key];
            cache[key] = raw;       // readers see the new value at once; if the write fails, the old one comes back
            return idbPut(db, ROUTE[key], key, raw).catch(function (e) {
                if (cache[key] === raw) { if (before === undefined) delete cache[key]; else cache[key] = before; }
                report(isQuota(e) ? 'quota' : 'write', key, e);
                throw e;
            });
        },
        del: function (key) {
            if (!routed(key)) return local.del(key);
            var before = cache[key];
            delete cache[key];
            return idbDel(db, ROUTE[key], key).catch(function (e) { if (before !== undefined && cache[key] === undefined) cache[key] = before; report('write', key, e); throw e; });
        },
        keys: function () {
            var out = local.keys();
            if (mode === 'idb') {
                out = out.filter(function (k) { return !Object.prototype.hasOwnProperty.call(ROUTE, k); });     // old copies of moved keys do not count
                Object.keys(cache).forEach(function (k) { out.push(k); });
            }
            return Promise.resolve(out);
        }
    };

    var backend = defaultBackend, opened = null;
    var Store = window.HeinzStore = {
        setBackend: function (b) { backend = b; opened = null; },
        open: function () { if (!opened) opened = Promise.resolve(backend.open()).catch(function (e) { report('fallback', '', e); }); return opened; },
        get: function (key, fallback) {
            try { var v = backend.get(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
        },
        set: function (key, value) { return Promise.resolve(backend.put(key, JSON.stringify(value))).catch(function () {}); },
        remove: function (key) { return Promise.resolve(backend.del(key)).catch(function () {}); },
        exportAll: function (withKeys) {
            return Promise.resolve(backend.keys()).then(function (keys) {
                var data = {};
                keys.forEach(function (k) {
                    if (k.indexOf('heinz') !== 0 || NOT_SAVED[k] || (k === 'heinz_keys' && !withKeys)) return;
                    var v = backend.get(k);
                    if (v !== null && v !== undefined) data[k] = v;
                });
                return data;
            });
        },
        importAll: function (data) {
            return Promise.all(Object.keys(data).filter(function (k) { return k.indexOf('heinz') === 0 && !NOT_SAVED[k]; }).map(function (k) {
                return backend.put(k, data[k]);
            }));
        },
        info: function () { return { backend: backend === defaultBackend && mode === 'idb' ? 'indexeddb' : 'localstorage', problems: problems.slice() }; },
        status: function () {
            var info = Store.info(); info.persisted = null; info.usage = null; info.quota = null; info.migrated = Object.keys(readFlag().done);
            var jobs = [];
            if (window.navigator && navigator.storage) {
                if (navigator.storage.persisted) jobs.push(navigator.storage.persisted().then(function (p) { info.persisted = !!p; }).catch(function () {}));
                if (navigator.storage.estimate) jobs.push(navigator.storage.estimate().then(function (e) { info.usage = e.usage; info.quota = e.quota; }).catch(function () {}));
            }
            return Promise.all(jobs).then(function () { return info; });
        },
        onProblem: function (fn) { listeners.push(fn); problems.forEach(function (p) { try { fn(p); } catch (e) {} }); }
    };
    return Store;
})();
