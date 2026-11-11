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
 *   HeinzProviders.runtime(id, model[, settings])  { options, keepAlive } the load-relevant values every tool must send to Ollama
 *                                                  (num_thread, num_ctx, keep_alive), read from heinz_settings; empty for other engines
 *   HeinzProviders.prepare(id, model)            Promise: Ollama only, releases every other loaded model before this one runs
 *   HeinzProviders.status(id, model[, { handshake }])  Promise<{ code, color, key, names }> connection state for the status ring of every tool
 *                                                  (red offline/blocked, yellow handshake, orange model asleep, blue ready, green is set by the page while answering)
 *   Rule for every tool that loads an Ollama model: take options and keepAlive from runtime() and call prepare() first.
 *   Ollama reloads a model when threads or context differ between two requests, so tools must not send their own values.
 *
 * Offline rule: a request to any address other than this device (localhost, 127.0.0.1, ::1) is refused with
 * code ONLINE_BLOCKED unless the user switched "Allow online" on. Only the messages passed in req are sent:
 * no chat list, no database, nothing from localStorage except the key of the chosen provider.
 * stats (same shape for every engine): { promptTokens, outputTokens, reasoningTokens, visibleTokens, totalTokens, source,
 *   loadMs, promptMs, evalMs, tokensPerSec (= visible per second), tokensPerSecAll (visible + thinking), approx, finishReason }
 *   Whether outputTokens already contain the thinking tokens is open (lib/capabilities.json stats.outputIncludesReasoning):
 *   until measured nothing is subtracted, both numbers are reported separately.
 *
 * HeinzCaps (second script block, same file): what each engine and model accepts, read from lib/capabilities.json.
 *   HeinzCaps.load()                      Promise, loads the data once (on failure every setting stays adjustable)
 *   HeinzCaps.cell(providerId, baseUrl, modelId, key)    { state, hint, recommended, status, ... } for one setting
 *   HeinzCaps.thinking(providerId, baseUrl, modelId)     thinking rule of the model or null
 *   Resolution exactly as rules.resolve in the data file and the reference resolver tests/test_capabilities.py.
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
        { id: 'google', name: 'Google AI Studio (native)', format: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', needsKey: true,
          keyUrl: 'https://aistudio.google.com/apikey', region: 'US',
          note: { en: 'Google\'s own interface (generateContent): top_k, real thinking tokens, model list with limits. Your messages leave this device.', de: 'Googles eigene Schnittstelle (generateContent): top_k, echte Denk-Token, Modellliste mit Grenzen. Deine Nachrichten verlassen dieses Gerät.' } },
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
    function cleanUrl(u) { return String(u || '').trim().replace(/\/+$/, ''); }
    // Own OpenAI-compatible engines (any number, each with its own address and key): heinz_engines = [{id, name, baseUrl}]. The built-in "custom" entry keeps its own storage (heinz_custom).
    P.userEngines = function () { var a = lsGet('heinz_engines', []); return Array.isArray(a) ? a : []; };
    P.addEngine = function (name, url) {
        var a = P.userEngines(), id = 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
        a.push({ id: id, name: String(name || '').trim() || 'Engine', baseUrl: cleanUrl(url) });
        lsSet('heinz_engines', a); return id;
    };
    P.updateEngine = function (id, patch) {
        var a = P.userEngines();
        a.forEach(function (e) { if (e.id === id) { if (patch.name !== undefined) e.name = String(patch.name).trim() || e.name; if (patch.baseUrl !== undefined) e.baseUrl = cleanUrl(patch.baseUrl); } });
        lsSet('heinz_engines', a);
    };
    P.removeEngine = function (id) {
        lsSet('heinz_engines', P.userEngines().filter(function (e) { return e.id !== id; }));
        P.setKey(id, '');
    };
    P.isUserEngine = function (id) { return P.userEngines().some(function (e) { return e.id === id; }); };
    P.getCustomUrl = function (id) {
        if (id && id !== 'custom') { var e = P.userEngines().filter(function (x) { return x.id === id; })[0]; return e ? e.baseUrl : ''; }
        return (lsGet('heinz_custom', {}) || {}).baseUrl || '';
    };
    P.setCustomUrl = function (u, id) {
        if (id && id !== 'custom') { P.updateEngine(id, { baseUrl: u }); return; }
        lsSet('heinz_custom', { baseUrl: cleanUrl(u) });
    };

    // ---------- definitions ----------
    P.list = function () {
        return DEFAULTS.map(function (d) { return P.get(d.id); }).concat(P.userEngines().map(function (e) { return P.get(e.id); }));
    };
    P.get = function (id) {
        var ue = P.userEngines().filter(function (x) { return x.id === id; })[0];
        if (ue) {
            var c = DEFAULTS.filter(function (d) { return d.id === 'custom'; })[0];
            return { id: ue.id, name: ue.name, format: 'openai', baseUrl: ue.baseUrl, needsKey: false, custom: true, user: true, note: c.note, local: P.isLocalUrl(ue.baseUrl) };
        }
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
        if (p.format === 'gemini') return googleNativeModels(p, signal);   // no fallback: this provider is the native route itself
        if (p.format === 'openai' && String(p.baseUrl).indexOf(GOOGLE_HOST) >= 0) {
            // Google AI Studio: the native list knows which models can chat (generateContent) and brings limits and thinking support.
            try { return await googleNativeModels(p, signal); }
            catch (e) { if (e && e.name === 'AbortError') throw e; P.modelNote = { engine: p.id, native: 'failed', message: String(e && e.message || e) }; }
        }
        var r2 = await fetch(p.baseUrl + '/models', { signal: signal, headers: headers(p) });
        if (!r2.ok) throw await httpError(r2);
        var d2 = await r2.json();
        return (d2.data || []).map(function (m) { return m.id; }).filter(Boolean);
    };

    // ---------- Google AI Studio: native model list (GET /v1beta/models, key in the header, never in the URL) ----------
    var GOOGLE_HOST = 'generativelanguage.googleapis.com';
    var meta = {};
    P.lastExchange = null;                    // last request body and raw usage of an OpenAI-style chat (no key), for the test export
    P.modelNote = null;                       // { native: 'failed', message } when the native list could not be read; the compatible list is shown instead
    P.modelMeta = function (id) { return meta[id] || null; };
    async function googleNativeModels(p, signal) {
        var all = [], token = '', pages = 0;
        do {
            var url = 'https://' + GOOGLE_HOST + '/v1beta/models?pageSize=1000' + (token ? '&pageToken=' + encodeURIComponent(token) : '');
            var r = await fetch(url, { signal: signal, headers: { 'x-goog-api-key': P.getKey(p.id) } });
            if (!r.ok) throw await httpError(r);
            var d = await r.json();
            all = all.concat(d.models || []);
            token = d.nextPageToken || '';
        } while (token && ++pages < 10);
        meta = {};
        var out = all.filter(function (m) { return m && m.name && (!m.supportedGenerationMethods || m.supportedGenerationMethods.indexOf('generateContent') >= 0); });
        out.forEach(function (m) {
            meta[m.name] = { displayName: m.displayName || '', inputTokenLimit: m.inputTokenLimit || 0, outputTokenLimit: m.outputTokenLimit || 0,
                thinking: m.thinking === undefined ? null : !!m.thinking, topK: m.topK === undefined ? null : m.topK, maxTemperature: m.maxTemperature === undefined ? null : m.maxTemperature };
        });
        P.modelNote = null;
        return out.map(function (m) { return m.name; }).sort(function (a, b) { return b.localeCompare(a, 'en', { numeric: true }); });
    }

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
    // ---------- shared Ollama runtime (one rule for the test bench, the chat and every later tool) ----------
    // Threads and context decide whether Ollama keeps a loaded model or reloads it, and how fast it answers on the phone.
    // The values are kept in heinz_settings (threads per model name, params.ctx, useDefault) and maintained on the test bench page.
    P.KEEP_ALIVE = '30m';
    P.DEFAULT_THREADS = 4;
    P.DEFAULT_CTX = 8192;
    function savedSettings() { try { return JSON.parse(localStorage.getItem('heinz_settings')) || {}; } catch (e) { return {}; } }
    P.threadsFor = function (model, settings) {
        var s = settings || savedSettings(), v = s.threads && s.threads[model];
        return (typeof v === 'number' && v >= 0 && v <= 8) ? v : P.DEFAULT_THREADS;
    };
    P.runtime = function (id, model, settings) {
        var p = P.get(id), r = { options: {}, keepAlive: undefined };
        if (!p || p.format !== 'ollama') return r;
        var s = settings || savedSettings(), n = P.threadsFor(model, s);
        if (n > 0) r.options.num_thread = n;   // 0 = Ollama default: send nothing
        if (!s.useDefault) { var c = s.params && s.params.ctx; r.options.num_ctx = (typeof c === 'number' && c > 0) ? c : P.DEFAULT_CTX; }
        r.keepAlive = P.KEEP_ALIVE;
        return r;
    };
    // ---------- shared connection status (one meaning of the ring colours for the test bench, the chat and every later tool) ----------
    // code names the i18n key every page defines for its tooltip (key); online engines are never asked: nothing leaves the device by itself.
    //   red:    cloudOff (Allow online is off) | cloudNoKey | offline (local engine not reachable)
    //   yellow: handshake (online engine configured, model list not yet read; only when the page passes handshake: false)
    //   orange: asleep (Ollama reachable, the chosen model is not in memory)
    //   blue:   cloudReady | engineUp | loaded (Ollama model is in memory)
    var STATUS_KEY = { cloudOff: 'stCloudOff', cloudNoKey: 'stCloudNoKey', handshake: 'stHandshake', cloudReady: 'stCloudReady', engineUp: 'stEngineUp', offline: 'stOffline', asleep: 'stOnline', loaded: 'stDefault' };
    var STATUS_COLOR = { cloudOff: 'red', cloudNoKey: 'red', offline: 'red', handshake: 'yellow', asleep: 'orange', cloudReady: 'blue', engineUp: 'blue', loaded: 'blue' };
    function statusOf(code, names) { return { code: code, color: STATUS_COLOR[code], key: STATUS_KEY[code], names: names || [] }; }
    P.status = async function (id, model, opts) {
        var p = P.get(id); opts = opts || {};
        if (!p) return statusOf('offline');
        if (!p.local) {
            if (!P.onlineAllowed()) return statusOf('cloudOff');
            if (p.needsKey && !P.getKey(id)) return statusOf('cloudNoKey');
            return statusOf(opts.handshake === false ? 'handshake' : 'cloudReady');
        }
        if (p.format !== 'ollama') { var up = false; try { up = await P.ping(id); } catch (e) { up = false; } return statusOf(up ? 'engineUp' : 'offline'); }
        try {
            var names = await P.loaded(id);
            return statusOf(names.some(function (n) { return n.indexOf(model) === 0; }) ? 'loaded' : 'asleep', names);
        } catch (e) { return statusOf('offline'); }
    };
    // Only the chosen model stays in memory: several models held with a long keep_alive compete for the phone's RAM and slow each other down.
    P.prepare = async function (id, model) {
        var p = P.get(id);
        if (!p || p.format !== 'ollama') return;
        try {
            var others = (await P.loaded(id)).filter(function (n) { return n !== model; });
            await Promise.all(others.map(function (n) { return P.unload(id, n); }));
        } catch (e) { /* engine not reachable: nothing to release */ }
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
        return p.format === 'ollama' ? chatOllama(p, req) : p.format === 'gemini' ? chatGemini(p, req) : chatOpenAI(p, req);
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
        var tps = evalMs > 0 && f.eval_count ? f.eval_count / (evalMs / 1000) : 0;
        return { text: text, stats: {
            promptTokens: f.prompt_eval_count || 0, outputTokens: f.eval_count || 0, reasoningTokens: 0, visibleTokens: f.eval_count || 0,
            totalTokens: (f.prompt_eval_count || 0) + (f.eval_count || 0), source: 'provider', finishReason: f.done_reason || '',
            loadMs: (f.load_duration || 0) / 1e6, promptMs: (f.prompt_eval_duration || 0) / 1e6, evalMs: evalMs,
            tokensPerSec: tps, tokensPerSecAll: tps, approx: false } };
    }

    // ---------- Google AI Studio, native route: POST models/<id>:streamGenerateContent?alt=sse, key in the header ----------
    // req.thinking = { kind: 'level'|'budget', value } from the model rule (lib/capabilities.json); never mixed with reasoning_effort.
    async function chatGemini(p, req) {
        var o = req.options || {};
        var name = /^models\//.test(req.model) ? req.model : 'models/' + req.model;
        var system = [], contents = [];
        (req.messages || []).forEach(function (m) {
            if (m.role === 'system') system.push(m.content);
            else contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
        });
        var gc = {};
        if (typeof o.temperature === 'number') gc.temperature = o.temperature;
        if (typeof o.top_p === 'number') gc.topP = o.top_p;
        if (typeof o.top_k === 'number') gc.topK = o.top_k;
        if (o.num_predict > 0) gc.maxOutputTokens = o.num_predict;
        if (o.stop && o.stop.length) gc.stopSequences = o.stop.slice(0, 5);   // at most 5
        if (req.thinking && req.thinking.value !== undefined && req.thinking.value !== null) {
            gc.thinkingConfig = req.thinking.kind === 'budget' ? { thinkingBudget: req.thinking.value } : { thinkingLevel: req.thinking.value };
        }
        var body = { contents: contents };
        if (system.length) body.systemInstruction = { parts: [{ text: system.join('\n\n') }] };
        if (Object.keys(gc).length) body.generationConfig = gc;
        var url = p.baseUrl + '/' + name + ':streamGenerateContent?alt=sse';
        var t0 = Date.now(), tFirst = 0, chunks = 0, usage = null, text = '', finish = '';
        var ex = P.lastExchange = { provider: p.id, url: p.baseUrl + '/' + name + ':streamGenerateContent', body: body, usage: null, finish: '', chunks: 0, firstMs: 0, totalMs: 0, status: 0 };
        var res = await fetch(url, { method: 'POST', signal: req.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': P.getKey(p.id) }, body: JSON.stringify(body) });
        ex.status = res.status;
        if (!res.ok) throw await httpError(res);
        function handle(data) {
            var json = JSON.parse(data);
            if (json.error) throw fail('ENGINE', json.error.message || JSON.stringify(json.error));
            if (json.promptFeedback && json.promptFeedback.blockReason) throw fail('ENGINE', 'Blocked: ' + json.promptFeedback.blockReason);
            if (json.usageMetadata) usage = json.usageMetadata;
            var c = json.candidates && json.candidates[0];
            if (c && c.finishReason) finish = c.finishReason === 'STOP' ? 'stop' : c.finishReason === 'MAX_TOKENS' ? 'length' : String(c.finishReason).toLowerCase();
            var parts = c && c.content && c.content.parts || [];
            parts.forEach(function (pt) {
                if (pt.thought || typeof pt.text !== 'string' || !pt.text) return;   // thought summaries are not requested; never shown as answer
                if (!tFirst) tFirst = Date.now();
                chunks++; text += pt.text; if (req.onDelta) req.onDelta(pt.text);
            });
        }
        var reader = res.body.getReader(), decoder = new TextDecoder(), buffer = '';
        while (true) {
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
        ex.usage = usage; ex.finish = finish; ex.chunks = chunks; ex.firstMs = tFirst ? tFirst - t0 : 0; ex.totalMs = t1 - t0;
        var real = !!(usage && usage.candidatesTokenCount !== undefined);
        var out = real ? usage.candidatesTokenCount : chunks;
        var rt = usage && usage.thoughtsTokenCount ? usage.thoughtsTokenCount : 0;
        var prompt = usage ? (usage.promptTokenCount || 0) : 0;
        var evalMs = tFirst ? Math.max(1, t1 - tFirst) : 0, secs = evalMs / 1000;
        return { text: text, stats: {
            promptTokens: prompt, outputTokens: out, reasoningTokens: rt, reasoningDerived: false, visibleTokens: out,
            totalTokens: usage && usage.totalTokenCount ? usage.totalTokenCount : prompt + out + rt,
            source: real ? 'provider' : 'estimate', finishReason: finish,
            loadMs: 0, promptMs: tFirst ? tFirst - t0 : 0, evalMs: evalMs,
            tokensPerSec: evalMs > 0 && out > 4 ? (out - 1) / secs : 0,
            tokensPerSecAll: evalMs > 0 && out + rt > 4 ? (out + rt - 1) / secs : 0,
            approx: !real } };
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
        // One switch "thinking" for all models: reasoning_effort only, never together with thinking_level or thinking_budget.
        if (req.reasoningEffort) body.reasoning_effort = req.reasoningEffort;
        var t0 = Date.now(), tFirst = 0, chunks = 0, usage = null, text = '', finish = '';
        // For test export: what was sent (never the key) and what came back, raw. Read with HeinzProviders.lastExchange.
        var ex = P.lastExchange = { provider: p.id, url: p.baseUrl + '/chat/completions', body: body, usage: null, finish: '', chunks: 0, firstMs: 0, totalMs: 0, status: 0 };
        var res = await fetch(p.baseUrl + '/chat/completions', { method: 'POST', signal: req.signal, headers: headers(p), body: JSON.stringify(body) });
        ex.status = res.status;
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
        ex.usage = usage; ex.finish = finish; ex.chunks = chunks; ex.firstMs = tFirst ? tFirst - t0 : 0; ex.totalMs = t1 - t0;
        var out = usage && usage.completion_tokens ? usage.completion_tokens : chunks;
        var rt = usage && usage.completion_tokens_details ? (usage.completion_tokens_details.reasoning_tokens || 0) : 0;
        var prompt = usage ? (usage.prompt_tokens || 0) : 0;
        // Google (compatible route) reports no reasoning_tokens, but total_tokens contains them (measured 11.11.2026: total 5563, prompt 78, completion 165).
        // The difference is shown as derived thinking tokens, marked as such.
        var rtDerived = false;
        if (!rt && usage && usage.total_tokens > prompt + (usage.completion_tokens || 0)) { rt = usage.total_tokens - prompt - (usage.completion_tokens || 0); rtDerived = true; }
        var evalMs = tFirst ? Math.max(1, t1 - tFirst) : 0;
        var secs = evalMs / 1000;
        // visible = outputTokens as the engine counts them: nothing is subtracted while it is unknown whether they include the thinking tokens
        return { text: text, stats: {
            promptTokens: prompt, outputTokens: out, reasoningTokens: rt, reasoningDerived: rtDerived, visibleTokens: out, totalTokens: prompt + out + rt,
            source: usage && usage.completion_tokens ? 'provider' : 'estimate', finishReason: finish,
            loadMs: 0, promptMs: tFirst ? tFirst - t0 : 0, evalMs: evalMs,
            tokensPerSec: evalMs > 0 && out > 4 ? (out - 1) / secs : 0,       // very short answers give no usable speed (a few tokens in a few ms)
            tokensPerSecAll: evalMs > 0 && out + rt > 4 ? (out + rt - 1) / secs : 0,
            approx: !(usage && usage.completion_tokens) } };
    }
})();

/* ---------- HeinzCaps: what an engine and model accepts (data: lib/capabilities.json) ---------- */
(function () {
    'use strict';
    var C = window.HeinzCaps = {};
    var data = null, loading = null;

    function modelId(id) { return String(id || '').replace(/^models\//, ''); }

    // Loads the data once. On any failure the data stays empty and every setting stays adjustable (cell returns state "on").
    C.load = function () {
        if (loading) return loading;
        loading = fetch('lib/capabilities.json').then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) { data = d && d.engines && d.rules ? d : null; return data; })
            .catch(function () { data = null; return null; });
        return loading;
    };
    C.ready = function () { return !!data; };
    C.data = function () { return data; };

    // 1. the first endpoint rule whose hostContains is part of baseUrl, otherwise the engine named like the provider, otherwise "openai"
    C.engineFor = function (providerId, baseUrl) {
        if (!data) return '';
        var rules = data.endpointRules || [];
        for (var i = 0; i < rules.length; i++) if (String(baseUrl || '').indexOf(rules[i].hostContains) >= 0) return rules[i].engine;
        return data.engines[providerId] ? providerId : 'openai';
    };
    // 2. the first model rule of this engine whose pattern fits the model id (without a leading "models/")
    C.modelRule = function (engine, id) {
        if (!data) return null;
        var mid = modelId(id), list = data.models || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].engine !== engine && list[i].engine !== (data.engines[engine] || {}).modelRulesFrom) continue;
            try { if (new RegExp(list[i].match, 'i').test(mid)) return list[i]; } catch (e) { /* bad pattern: skip */ }
        }
        return null;
    };
    // 3. the cell = engine cell, overridden by the model cell
    C.cell = function (providerId, baseUrl, id, key) {
        if (!data) return { state: 'on' };
        var engine = C.engineFor(providerId, baseUrl);
        var eng = data.engines[engine];
        var base = {}, src = eng && eng.params && eng.params[key];
        if (src) Object.keys(src).forEach(function (k) { base[k] = src[k]; });
        else base.state = 'on';
        var m = C.modelRule(engine, id);
        if (m && m.params && m.params[key]) Object.keys(m.params[key]).forEach(function (k) { base[k] = m.params[key][k]; });
        return base;
    };
    C.thinking = function (providerId, baseUrl, id) {
        if (!data) return null;
        var m = C.modelRule(C.engineFor(providerId, baseUrl), id);
        return (m && m.thinking) || null;
    };
    C.label = function (key, lang) {
        var p = data && data.parameters && data.parameters[key];
        return p && p.label ? (p.label[lang] || p.label.en) : key;
    };
})();
