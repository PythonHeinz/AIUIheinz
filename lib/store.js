/* lib/store.js – storage layer of the test bench (Beschluss docs/KONZEPT.md 22.4): everything the pages keep (settings, conversations, results).
 * Plain script, no build. Global: HeinzStore. Values are JSON; keys start with "heinz".
 *   HeinzStore.open()               -> Promise; load the backend once before the first read (idempotent)
 *   HeinzStore.get(key, fallback)   -> value (synchronous, from the opened backend); fallback when missing or not valid JSON
 *   HeinzStore.set(key, value)      -> Promise; writes through to the backend
 *   HeinzStore.remove(key)          -> Promise
 *   HeinzStore.exportAll(withKeys)  -> Promise of { key: rawJsonString } for all "heinz*" keys (API keys "heinz_keys" only with withKeys)
 *   HeinzStore.importAll(data)      -> Promise; writes all "heinz*" keys of a backup
 * Backend contract (the storage strand swaps only this object, e.g. for IndexedDB, and keeps the calls in the pages):
 *   { open(): Promise, get(key): string|null (sync, after open), put(key, raw): Promise, del(key): Promise, keys(): Promise<string[]> }
 * Default backend: localStorage (small, synchronous, shared by all pages of the same address). */
(function () {
    'use strict';
    var localBackend = {
        open: function () { return Promise.resolve(); },
        get: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        put: function (key, raw) {
            try { localStorage.setItem(key, raw); return Promise.resolve(); } catch (e) { console.warn('localStorage not available', e); return Promise.reject(e); }
        },
        del: function (key) { try { localStorage.removeItem(key); } catch (e) {} return Promise.resolve(); },
        keys: function () {
            var out = [];
            try { for (var i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); } catch (e) {}
            return Promise.resolve(out);
        }
    };
    var backend = localBackend, opened = null;
    var Store = window.HeinzStore = {
        setBackend: function (b) { backend = b; opened = null; },
        open: function () { if (!opened) opened = Promise.resolve(backend.open()); return opened; },
        get: function (key, fallback) {
            try { var v = backend.get(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
        },
        set: function (key, value) { return Promise.resolve(backend.put(key, JSON.stringify(value))).catch(function () {}); },
        remove: function (key) { return Promise.resolve(backend.del(key)); },
        exportAll: function (withKeys) {
            return Promise.resolve(backend.keys()).then(function (keys) {
                var data = {};
                keys.forEach(function (k) {
                    if (k.indexOf('heinz') !== 0 || (k === 'heinz_keys' && !withKeys)) return;
                    var v = backend.get(k);
                    if (v !== null && v !== undefined) data[k] = v;
                });
                return data;
            });
        },
        importAll: function (data) {
            return Promise.all(Object.keys(data).filter(function (k) { return k.indexOf('heinz') === 0; }).map(function (k) {
                return backend.put(k, data[k]);
            }));
        }
    };
})();
