/* Heinz UI provider layer (no build, plain script). Include with <script src="lib/providers.js"></script>.
 * One place that talks to language-model engines, shared by the chat page and later by other tools (for example convert2).
 *
 *   HeinzProviders.list(), get(id)               provider definitions (data, see DEFAULTS; user endpoint "custom")
 *   HeinzProviders.onlineAllowed() / setOnlineAllowed(bool)   the switch "Allow online", default OFF, key heinz_online
 *   HeinzProviders.getKey(id) / setKey(id, key)   API keys stay in this browser (heinz_keys), never in the repo
 *   HeinzProviders.models(id, signal)            Promise<string[]>   Ollama /api/tags, OpenAI-style /models
 *   HeinzProviders.chat(id, req)                 Promise<{ text, stats }>   streaming; req = { model, messages, options,
 *                                                  backend, keepAlive, signal, onDelta(text), stream }
 *   HeinzProviders.ping(id)                      Promise<boolean>    local engines only
 *   HeinzProviders.loaded(id) / unload(id, m)    Ollama only: models in memory / release one
 *
 * Offline rule: a request to any address other than this device (localhost, 127.0.0.1, ::1) is refused with
 * code ONLINE_BLOCKED unless the user switched "Allow online" on. Only the messages passed in req are sent:
 * no chat list, no database, nothing from localStorage except the key of the chosen provider.
 * stats (same shape for every engine): { promptTokens, outputTokens, loadMs, promptMs, evalMs, tokensPerSec, approx }
 */
(function () {
    'use strict';
    var P = window.HeinzProviders = {};

    // Providers as data. Online entries are never contacted while "Allow online" is off.
    // cors: 'unchecked' = not yet tried from a browser page (see docs/MODELLQUELLEN.md); a proxy in server.py is the fallback.
    var DEFAULTS = [
        { id: 'ollama', name: 'Ollama', format: 'ollama', baseUrl: 'http://localhost:11434', needsKey: false },
        { id: 'litert', name: 'LiteRT-LM', format: 'openai', baseUrl: 'http://127.0.0.1:9379/v1', needsKey: false, backends: ['cpu', 'gpu'] },
        { id: 'openrouter', name: 'OpenRouter', format: 'openai', baseUrl: 'https://openrouter.ai/api/v1', needsKey: true,
          keyUrl: 'https://openrouter.ai/keys', region: 'US', cors: 'unchecked',
          note: { en: 'One key, many models (free ones end in :free). Your messages leave this device.', de: 'Ein Schlüssel, viele Modelle (kostenlose enden auf :free). Deine Nachrichten verlassen dieses Gerät.' } },
        { id: 'groq', name: 'Groq', format: 'openai', baseUrl: 'https://api.groq.com/openai/v1', needsKey: true,
          keyUrl: 'https://console.groq.com/keys', region: 'US', cors: 'unchecked',
          note: { en: 'Fast open models. Your messages leave this device.', de: 'Schnelle offene Modelle. Deine Nachrichten verlassen dieses Gerät.' } },
        { id: 'mistral', name: 'Mistral', format: 'openai', baseUrl: 'https://api.mistral.ai/v1', needsKey: true,
          keyUrl: 'https://console.mistral.ai/api-keys', region: 'FR', cors: 'unchecked',
          note: { en: 'Servers in France. The free plan may use your input for training. Your messages leave this device.', de: 'Server in Frankreich. Der Gratisplan kann Eingaben zum Training nutzen. Deine Nachrichten verlassen dieses Gerät.' } },
        { id: 'custom', name: 'Custom (OpenAI-compatible)', format: 'openai', baseUrl: '', needsKey: false, custom: true,
          note: { en: 'Any OpenAI-compatible endpoint, for example your own server. A non-local address counts as online.', de: 'Beliebiger OpenAI-kompatibler Endpunkt, zum Beispiel dein eigener Server. Eine nicht lokale Adresse zählt als online.' } }
    ];

    // ---------- storage ----------
    function lsGet(k, f) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } }
    function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }

    P.onlineAllowed = function () { return lsGet('heinz_online', false) === true; };
    P.setOnlineAllowed = function (b) { lsSet('heinz_online', !!b); };
    P.getKey = function (id) { return (lsGet('heinz_keys', {}) || {})[id] || ''; };
    P.setKey = function (id, key) {
        var k = lsGet('heinz_keys', {}) || {};
        if (key) k[id] = key; else delete k[id];
        lsSet('heinz_keys', k);
    };
    P.getCustomUrl = function () { return (lsGet('heinz_custom', {}) || {}).baseUrl || ''; };
    P.setCustomUrl = function (u) { lsSet('heinz_custom', { baseUrl: String(u || '').trim().replace(/\/+$/, '') }); };

    // ---------- definitions ----------
    P.list = function () { return DEFAULTS.map(function (d) { return P.get(d.id); }); };
    P.get = function (id) {
        for (var i = 0; i < DEFAULTS.length; i++) {
            if (DEFAULTS[i].id === id) {
                var d = {}; Object.keys(DEFAULTS[i]).forEach(function (k) { d[k] = DEFAULTS[i][k]; });
                if (d.custom) d.baseUrl = P.getCustomUrl();
                d.local = P.isLocalUrl(d.baseUrl);
                return d;
            }
        }
        return null;
    };
    // Only this device counts as local. A LAN address (192.168.x.x) is another machine and therefore online.
    P.isLocalUrl = function (url) {
        try { var h = new URL(url).hostname; return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1'; }
        catch (e) { return false; }
    };

    function fail(code, message, extra) {
        var e = new Error(message); e.code = code;
        if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; });
        return e;
    }
    // Throws before anything is sent.
    function guard(p) {
        if (!p) throw fail('UNKNOWN_PROVIDER', 'Unknown provider');
        if (!p.baseUrl) throw fail('NO_URL', 'No address set for ' + p.name);
        if (!p.local && !P.onlineAllowed()) throw fail('ONLINE_BLOCKED', 'Online is switched off');
        if (p.needsKey && !P.getKey(p.id)) throw fail('NO_KEY', 'No API key for ' + p.name);
    }
    function headers(p) {
        var h = { 'Content-Type': 'application/json' };
        var key = P.getKey(p.id);
        if (key && p.format === 'openai') h['Authorization'] = 'Bearer ' + key;
        return h;
    }
    async function httpError(res) {
        var detail = '';
        try { detail = (await res.text()).slice(0, 200); } catch (e) { /* ignore */ }
        return fail('HTTP', 'HTTP ' + res.status + ' ' + detail, { http: res.status });
    }

    // ---------- model lists ----------
    P.models = async function (id, signal) {
        var p = P.get(id); guard(p);
        if (p.format === 'ollama') {
            var r = await fetch(p.baseUrl + '/api/tags', { signal: signal });
            if (!r.ok) throw await httpError(r);
            var d = await r.json();
            return (d.models || []).map(function (m) { return m.name; }).filter(function (n) { return !/embed/i.test(n); });
        }
        var r2 = await fetch(p.baseUrl + '/models', { signal: signal, headers: headers(p) });
        if (!r2.ok) throw await httpError(r2);
        var d2 = await r2.json();
        return (d2.data || []).map(function (m) { return m.id; }).filter(Boolean);
    };

    // Only local engines are pinged (the traffic light must never contact an online service by itself).
    P.ping = async function (id) {
        var p = P.get(id);
        if (!p || !p.local) return false;
        try { await P.models(id); return true; } catch (e) { return false; }
    };
    P.loaded = async function (id) {
        var p = P.get(id); guard(p);
        if (p.format !== 'ollama') return [];
        var r = await fetch(p.baseUrl + '/api/ps');
        var d = await r.json();
        return (d.models || []).map(function (m) { return m.name; });
    };
    // Values the model itself brings (Ollama: Modelfile parameters, else Ollama's own defaults)
    P.show = async function (id, model) {
        var p = P.get(id); guard(p);
        if (p.format !== 'ollama') return null;
        var r = await fetch(p.baseUrl + '/api/show', { method: 'POST', headers: headers(p), body: JSON.stringify({ model: model }) });
        if (!r.ok) return null;
        var d = await r.json(), o = { temp: 0.8, topp: 0.9, topk: 40, ctx: 4096 };
        String(d.parameters || '').split('\n').forEach(function (l) {
            var m = l.trim().match(/^(\w+)\s+(-?[\d.]+)/); if (!m) return;
            var v = parseFloat(m[2]);
            if (m[1] === 'temperature') o.temp = v; else if (m[1] === 'top_p') o.topp = v; else if (m[1] === 'top_k') o.topk = Math.round(v); else if (m[1] === 'num_ctx') o.ctx = Math.round(v);
        });
        return o;
    };
    P.unload = async function (id, model) {
        var p = P.get(id); guard(p);
        if (p.format !== 'ollama') return;
        await fetch(p.baseUrl + '/api/generate', { method: 'POST', headers: headers(p), body: JSON.stringify({ model: model, keep_alive: 0 }) });
    };

    // ---------- chat ----------
    P.chat = async function (id, req) {
        var p = P.get(id); guard(p);
        return p.format === 'ollama' ? chatOllama(p, req) : chatOpenAI(p, req);
    };

    async function chatOllama(p, req) {
        var body = { model: req.model, messages: req.messages, stream: req.stream !== false };
        if (req.keepAlive) body.keep_alive = req.keepAlive;
        if (req.options && Object.keys(req.options).length) body.options = req.options;
        var res = await fetch(p.baseUrl + '/api/chat', { method: 'POST', signal: req.signal, headers: headers(p), body: JSON.stringify(body) });
        if (!res.ok) throw await httpError(res);
        var text = '', final = null;
        function handle(json) {
            if (json.error) throw fail('ENGINE', json.error);
            if (json.message && json.message.content) { text += json.message.content; if (req.onDelta) req.onDelta(json.message.content); }
            if (json.done) final = json;
        }
        if (body.stream === false) { handle(await res.json()); }
        else {
            var reader = res.body.getReader(), decoder = new TextDecoder(), buffer = '';
            while (true) {   // NDJSON: parse only complete lines
                var chunk = await reader.read();
                if (chunk.done) break;
                buffer += decoder.decode(chunk.value, { stream: true });
                var idx;
                while ((idx = buffer.indexOf('\n')) >= 0) {
                    var line = buffer.slice(0, idx).trim(); buffer = buffer.slice(idx + 1);
                    if (line) handle(JSON.parse(line));
                }
            }
            buffer += decoder.decode();
            if (buffer.trim()) handle(JSON.parse(buffer.trim()));
        }
        var f = final || {};
        var evalMs = (f.eval_duration || 0) / 1e6;
        return { text: text, stats: {
            promptTokens: f.prompt_eval_count || 0, outputTokens: f.eval_count || 0,
            loadMs: (f.load_duration || 0) / 1e6, promptMs: (f.prompt_eval_duration || 0) / 1e6, evalMs: evalMs,
            tokensPerSec: evalMs > 0 && f.eval_count ? f.eval_count / (evalMs / 1000) : 0, approx: false } };
    }

    async function chatOpenAI(p, req) {
        var o = req.options || {};
        // LiteRT-LM picks CPU or GPU through the model field ("gemma4-e2b,gpu"), no server restart needed.
        var model = req.model;
        if (p.backends && req.backend && req.backend !== 'cpu' && p.backends.indexOf(req.backend) >= 0 && model.indexOf(',') < 0) model += ',' + req.backend;
        var body = { model: model, messages: req.messages, stream: true, stream_options: { include_usage: true } };
        if (typeof o.temperature === 'number') body.temperature = o.temperature;
        if (typeof o.top_p === 'number') body.top_p = o.top_p;
        if (o.num_predict > 0) body.max_tokens = o.num_predict;
        if (o.stop && o.stop.length) body.stop = o.stop;
        var t0 = Date.now(), tFirst = 0, chunks = 0, usage = null, text = '', finish = '';
        var res = await fetch(p.baseUrl + '/chat/completions', { method: 'POST', signal: req.signal, headers: headers(p), body: JSON.stringify(body) });
        if (!res.ok) throw await httpError(res);
        function handle(data) {
            if (data === '[DONE]') return;
            var json = JSON.parse(data);
            if (json.error) throw fail('ENGINE', json.error.message || JSON.stringify(json.error));
            if (json.usage) usage = json.usage;
            var c = json.choices && json.choices[0];
            if (c && c.finish_reason) finish = c.finish_reason;   // 'stop' = fertig, 'length' = Token-Grenze (bei Denk-Modellen zählen Denk-Token mit)
            var piece = c && c.delta && c.delta.content;
            if (piece) { if (!tFirst) tFirst = Date.now(); chunks++; text += piece; if (req.onDelta) req.onDelta(piece); }
        }
        var reader = res.body.getReader(), decoder = new TextDecoder(), buffer = '';
        while (true) {   // server-sent events: lines "data: {...}" and finally "data: [DONE]"
            var chunk = await reader.read();
            if (chunk.done) break;
            buffer += decoder.decode(chunk.value, { stream: true });
            var idx;
            while ((idx = buffer.indexOf('\n')) >= 0) {
                var line = buffer.slice(0, idx).trim(); buffer = buffer.slice(idx + 1);
                if (line.indexOf('data:') === 0) handle(line.slice(5).trim());
            }
        }
        buffer += decoder.decode();
        if (buffer.trim().indexOf('data:') === 0) handle(buffer.trim().slice(5).trim());
        var t1 = Date.now();
        var out = usage && usage.completion_tokens ? usage.completion_tokens : chunks;
        var evalMs = tFirst ? Math.max(1, t1 - tFirst) : 0;
        return { text: text, stats: {
            promptTokens: usage ? (usage.prompt_tokens || 0) : 0, outputTokens: out, finishReason: finish,
            reasoningTokens: usage && usage.completion_tokens_details ? (usage.completion_tokens_details.reasoning_tokens || 0) : 0,
            loadMs: 0, promptMs: tFirst ? tFirst - t0 : 0, evalMs: evalMs,
            tokensPerSec: evalMs > 0 && out > 1 ? (out - 1) / (evalMs / 1000) : 0, approx: !(usage && usage.completion_tokens) } };
    }
})();
