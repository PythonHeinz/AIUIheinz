/* Heinz UI shared core (no build, plain script). Include with <script src="/lib/core.js">.
 *   Heinz.lang / setLang / toggleLang / onLang   EN|DE, stored in heinz_settings.lang (same key the chat uses)
 *   Heinz.t(dict, key, vars)                     dict = { en:{...}, de:{...} }
 *   Heinz.store(toolId)                          localStorage with prefix heinz.<toolId>.<key>
 *   Heinz.theme / setTheme / applyTheme          'auto' | 'dk' | 'lt', stored in heinz_settings.theme, set on <html data-theme>
 *   Heinz.icon(name, cls)                        markup for a symbol of lib/icons.svg (name without 'i-')
 *   Heinz.header({ sub:{en,de}, back:'/' })      renders the INCIheinz-style header into #app-header
 *   Heinz.pingOllama(), Heinz.pingLiteRT()       status of the local engines (localhost only)
 * Offline rule: this file only talks to the page's own server and to localhost. */
(function () {
    'use strict';
    var H = window.Heinz = {};
    var OLLAMA = 'http://localhost:11434';
    var LITERT = 'http://127.0.0.1:9379';

    // ---------- logo ----------
    // "HEINZ / UI" as SVG text for the ring button (svg viewBox 0 0 34 22, 34x22 px). Values: docs/DESIGN.md.
    H.ringLogo = function (svg) {
        if (!svg) return;
        var f = 'font-family="system-ui, Roboto, \'Helvetica Neue\', Arial, sans-serif" font-weight="700" font-size="8" letter-spacing=".5" text-anchor="middle" fill="#e8eaed"';
        svg.innerHTML = '<text x="17.25" y="11.1" ' + f + '>HEINZ</text><text x="17.25" y="20.1" ' + f + '>UI</text>';
    };

    // ---------- storage ----------
    H.lsGet = function (k, f) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } };
    H.lsSet = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
    H.store = function (tool) {
        var p = 'heinz.' + tool + '.';
        return {
            get: function (k, f) { return H.lsGet(p + k, f); },
            set: function (k, v) { return H.lsSet(p + k, v); },
            del: function (k) { try { localStorage.removeItem(p + k); } catch (e) {} }
        };
    };

    // ---------- theme: auto | dk | lt (applied immediately, so include the script in <head> to avoid a flash) ----------
    H.theme = (function () { var t = H.lsGet('heinz_settings', {}).theme; return t === 'dk' || t === 'lt' ? t : 'auto'; })();
    H.applyTheme = function () { document.documentElement.setAttribute('data-theme', H.theme); };
    H.setTheme = function (t) {
        H.theme = t === 'dk' || t === 'lt' ? t : 'auto';
        var s = H.lsGet('heinz_settings', {}); s.theme = H.theme; H.lsSet('heinz_settings', s);
        H.applyTheme();
    };
    H.applyTheme();
    H.icon = function (name, cls) {
        return '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="' + (H.iconBase || '/lib/') + 'icons.svg#i-' + name + '"/></svg>';
    };

    // ---------- language (one switch for everything, same as the chat) ----------
    var listeners = [];
    H.lang = (function () { var s = H.lsGet('heinz_settings', {}); return s.lang === 'de' ? 'de' : 'en'; })();
    H.setLang = function (l) {
        H.lang = l === 'de' ? 'de' : 'en';
        var s = H.lsGet('heinz_settings', {}); s.lang = H.lang; H.lsSet('heinz_settings', s);
        document.documentElement.lang = H.lang;
        listeners.forEach(function (f) { try { f(H.lang); } catch (e) {} });
    };
    H.toggleLang = function () { H.setLang(H.lang === 'en' ? 'de' : 'en'); };
    H.onLang = function (f) { listeners.push(f); };
    H.t = function (dict, key, vars) {
        var s = (dict[H.lang] && dict[H.lang][key]) || (dict.en && dict.en[key]) || key;
        if (vars) Object.keys(vars).forEach(function (x) { s = s.split('{' + x + '}').join(vars[x]); });
        return s;
    };
    H.pick = function (o) { return o && typeof o === 'object' ? (o[H.lang] || o.en || '') : (o || ''); };
    H.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

    // ---------- header (INCIheinz look: ring with symbol, wordmark, small label) ----------
    var BRAIN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4285f4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 5.2C11.2 3.9 9.2 3.7 8 4.7 6.6 4.5 5.4 5.7 5.5 7.1 4.2 7.6 3.6 9.2 4.4 10.4 3.5 11.4 3.8 13.1 5 13.7 4.8 15.1 5.8 16.4 7.2 16.5 7.6 17.9 9.2 18.6 10.5 18 11.1 18.5 11.6 18.6 12 18.6Z"/>' +
        '<path d="M12 5.2C12.8 3.9 14.8 3.7 16 4.7 17.4 4.5 18.6 5.7 18.5 7.1 19.8 7.6 20.4 9.2 19.6 10.4 20.5 11.4 20.2 13.1 19 13.7 19.2 15.1 18.2 16.4 16.8 16.5 16.4 17.9 14.8 18.6 13.5 18 12.9 18.5 12.4 18.6 12 18.6Z"/>' +
        '<path d="M12 5.2V18.6"/><path d="M8.3 9.2C9.4 9.2 10.2 9.9 10.4 10.9M15.7 9.2C14.6 9.2 13.8 9.9 13.6 10.9"/></svg>';
    H.brainSvg = BRAIN;
    H.header = function (opts) {
        opts = opts || {};
        var host = document.getElementById('app-header');
        if (!host) return;
        function draw() {
            var left = opts.back
                ? '<a class="ib" href="' + H.esc(opts.back) + '" aria-label="Hub" title="Hub">&#8592;</a>'
                : '';
            host.innerHTML = '<header><div class="slot">' + left + '</div>' +
                '<a class="logo" href="/"><div class="ring">' + BRAIN + '</div><div><b>AIUI<span>heinz</span></b>' +
                '<small>' + H.esc(H.pick(opts.sub) || 'offline AI') + '</small></div></a>' +
                '<div class="slot right"><button class="lang-btn" id="lang-btn" type="button" aria-label="EN / DE"><span data-l="en">EN</span><span data-l="de">DE</span></button></div></header>';
            var b = document.getElementById('lang-btn');
            b.onclick = H.toggleLang;
            Array.prototype.forEach.call(b.querySelectorAll('span'), function (s) { s.classList.toggle('active', s.getAttribute('data-l') === H.lang); });
        }
        draw();
        H.onLang(draw);
    };

    // ---------- engine status (localhost only) ----------
    function timeout(ms) { var c = new AbortController(); setTimeout(function () { c.abort(); }, ms); return c.signal; }
    H.pingOllama = function () {
        return fetch(OLLAMA + '/api/tags', { signal: timeout(2500) }).then(function (r) { return r.json(); }).then(function (tags) {
            var chat = (tags.models || []).filter(function (m) { return !/embed/i.test(m.name); });
            return fetch(OLLAMA + '/api/ps', { signal: timeout(2500) }).then(function (r) { return r.json(); }).then(function (ps) {
                return { up: true, models: chat, loaded: (ps.models || []).map(function (m) { return m.name; }) };
            }, function () { return { up: true, models: chat, loaded: [] }; });
        }).catch(function () { return { up: false, models: [], loaded: [] }; });
    };
    // no-cors: resolves when the server answers at all, even if CORS is not allowed for this page
    H.pingLiteRT = function () {
        return fetch(LITERT + '/v1/models', { mode: 'no-cors', signal: timeout(2500) }).then(function () { return { up: true }; }, function () { return { up: false }; });
    };
    H.litertModels = function () {
        return fetch(LITERT + '/v1/models', { signal: timeout(2500) }).then(function (r) { return r.json(); }).then(function (j) {
            return (j.data || []).map(function (m) { return m.id; });
        }).catch(function () { return null; });   // null = unreachable or CORS not allowed
    };

    // ---------- installable app (manifest + service worker) ----------
    H.registerSW = function () {
        if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
            navigator.serviceWorker.register('/sw.js').catch(function () {});
        }
    };

    document.documentElement.lang = H.lang;
    H.registerSW();
})();
