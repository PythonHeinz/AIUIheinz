"""Page tests with Playwright and a simulated Ollama.

Setup (once):  pip install playwright && playwright install chromium
Run:           python3 tests/test_pages.py
Real models only run on the phone; here Ollama is answered by page.route().
"""
import json, os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import Server
from playwright.sync_api import sync_playwright

VIEWPORT = {"width": 426, "height": 803}  # Pixel 9 Pro
PAGES = ["/", "/hub.html", "/chat.html", "/lab.html", "/sheet.html", "/vitals.html", "/tools/models/index.html", "/tools/filter/index.html", "/tools/design/index.html", "/tools/design/modus.html", "/tools/heinz/index.html", "/tools/setup/index.html", "/tools/scan/index.html", "/tools/studio/index.html"]


class FakeOllama:
    """Answers /api/tags, /api/ps and /api/chat (NDJSON stream) for a page."""

    def __init__(self, page, chunks=("Hello", " world"), status=200, tags=("gemma2:2b", "qwen2.5:3b", "gemma:2b")):
        self.requests = []   # parsed /api/chat bodies (without preload requests)
        self.preloads = []   # preload requests (num_predict 1, stream false)
        self.unloads = []    # /api/generate bodies (model unload)
        self.loaded = False
        self.tags = tags
        self.chunks = chunks
        self.status = status
        page.route("**/localhost:11434/**", self.handle)

    def handle(self, route):
        url = route.request.url
        if url.endswith("/api/tags"):
            body = {"models": [{"name": n} for n in self.tags]}
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(body))
        if url.endswith("/api/ps"):
            return route.fulfill(status=200, content_type="application/json",
                                 body=json.dumps({"models": [{"name": "gemma2:2b"}]}))
        if url.endswith("/api/show"):
            return route.fulfill(status=200, content_type="application/json",
                                 body=json.dumps({"parameters": "temperature 1\ntop_k 64\nstop \"<end>\""}))
        if url.endswith("/api/generate"):
            self.unloads.append(json.loads(route.request.post_data))
            self.loaded = False
            return route.fulfill(status=200, content_type="application/json", body="{}")
        if url.endswith("/api/chat"):
            body = json.loads(route.request.post_data)
            if (body.get("options") or {}).get("num_predict") == 1:   # model preload
                self.preloads.append(body)
                return route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "done": True, "load_duration": 1000000000, "prompt_eval_count": 10, "eval_count": 1}))
            self.requests.append(body)
            if body.get("stream") is False:   # speed test: one JSON object, speed = 2.5 tokens/s per thread
                n = body["options"]["num_thread"]
                load = 100000000 if self.loaded else 5000000000
                self.loaded = True
                return route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "done": True, "load_duration": load, "prompt_eval_count": 25, "prompt_eval_duration": 500000000,
                    "eval_count": 32, "eval_duration": int(32 / (2.5 * n) * 1e9)}))
            if self.status != 200:
                return route.fulfill(status=self.status, body="nope")
            lines = [json.dumps({"message": {"role": "assistant", "content": c}, "done": False}) for c in self.chunks]
            lines.append(json.dumps({"done": True, "prompt_eval_count": 60, "eval_count": 92, "eval_duration": 4000000000, "load_duration": 2000000000, "prompt_eval_duration": 500000000}))
            return route.fulfill(status=200, content_type="application/x-ndjson", body="\n".join(lines) + "\n")
        return route.fulfill(status=404, body="")


class FakeOpenAI:
    """OpenAI-style engine (LiteRT-LM on 127.0.0.1:9379, or an online provider): /models and streamed /chat/completions."""

    def __init__(self, page, pattern, models=("gemma4-e2b",), chunks=("Hi", " there"), status=200, usage=True, finish="stop", reasoning=0, native=None, total=0):
        self.requests = []    # (headers, body) of /chat/completions
        self.native, self.native_calls = native, []    # Google: native list (/v1beta/models) as dicts; calls = (url, headers)
        self.model_calls = 0
        self.models, self.chunks, self.status, self.usage = models, chunks, status, usage
        self.finish, self.reasoning, self.total = finish, reasoning, total
        page.route(pattern, self.handle)

    def handle(self, route):
        url = route.request.url
        if route.request.method == "OPTIONS":
            return route.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*"})
        cors = {"access-control-allow-origin": "*"}
        if "/v1beta/models" in url:
            self.native_calls.append((url, route.request.headers))
            if self.native is None:
                return route.fulfill(status=404, headers=cors, body="no")
            return route.fulfill(status=200, content_type="application/json", headers=cors, body=json.dumps({"models": self.native}))
        if url.endswith("/models"):
            self.model_calls += 1
            if self.status != 200:
                return route.fulfill(status=self.status, headers=cors, body="nope")
            return route.fulfill(status=200, content_type="application/json", headers=cors,
                                 body=json.dumps({"data": [{"id": m} for m in self.models]}))
        if url.endswith("/chat/completions"):
            self.requests.append((route.request.headers, json.loads(route.request.post_data)))
            if self.status != 200:
                return route.fulfill(status=self.status, headers=cors, body="nope")
            lines = ["data: " + json.dumps({"choices": [{"delta": {"content": c}}]}) for c in self.chunks]
            lines.append("data: " + json.dumps({"choices": [{"delta": {}, "finish_reason": self.finish}]}))
            if self.usage:
                use = {"prompt_tokens": 21, "completion_tokens": 7}
                if self.total:
                    use["total_tokens"] = self.total
                if self.reasoning:
                    use["completion_tokens_details"] = {"reasoning_tokens": self.reasoning}
                lines.append("data: " + json.dumps({"choices": [], "usage": use}))
            lines.append("data: [DONE]")
            return route.fulfill(status=200, content_type="text/event-stream", headers=cors, body="\n\n".join(lines) + "\n\n")
        return route.fulfill(status=404, body="")


class FakeGemini:
    """Google AI Studio, native route: GET /v1beta/models and streamed POST /v1beta/models/<id>:streamGenerateContent."""

    def __init__(self, page, chunks=("Hi", " there"), status=200, thoughts=0, finish="STOP", models=None):
        self.requests = []      # (url, headers, body)
        self.list_calls = []
        self.chunks, self.status, self.thoughts, self.finish = chunks, status, thoughts, finish
        self.models = models if models is not None else [
            {"name": "models/gemini-3.8-flash", "inputTokenLimit": 1048576, "outputTokenLimit": 65536, "thinking": True, "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-2.5-flash", "inputTokenLimit": 1048576, "outputTokenLimit": 65536, "thinking": True, "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-embedding-2", "supportedGenerationMethods": ["embedContent"]}]
        page.route("https://generativelanguage.googleapis.com/v1beta/**", self.handle)

    def handle(self, route):
        url = route.request.url
        cors = {"access-control-allow-origin": "*"}
        if route.request.method == "OPTIONS":
            return route.fulfill(status=204, headers={**cors, "access-control-allow-headers": "*", "access-control-allow-methods": "*"})
        if ":streamGenerateContent" in url:
            self.requests.append((url, route.request.headers, json.loads(route.request.post_data)))
            if self.status != 200:
                return route.fulfill(status=self.status, headers=cors, body='{"error":{"message":"nope"}}')
            lines = []
            for c in self.chunks:
                lines.append("data: " + json.dumps({"candidates": [{"content": {"role": "model", "parts": [{"text": c}]}}]}))
            usage = {"promptTokenCount": 21, "candidatesTokenCount": 7, "totalTokenCount": 28 + self.thoughts}
            if self.thoughts:
                usage["thoughtsTokenCount"] = self.thoughts
            lines.append("data: " + json.dumps({"candidates": [{"content": {"role": "model", "parts": [{"text": ""}]}, "finishReason": self.finish}], "usageMetadata": usage}))
            return route.fulfill(status=200, content_type="text/event-stream", headers=cors, body="\r\n\r\n".join(lines) + "\r\n\r\n")
        if "/v1beta/models" in url:
            self.list_calls.append((url, route.request.headers))
            return route.fulfill(status=200, content_type="application/json", headers=cors, body=json.dumps({"models": self.models}))
        return route.fulfill(status=404, body="")


class PageTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = Server().start()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.srv.stop()

    def new_page(self, **fake):
        ctx = self.browser.new_context(viewport=VIEWPORT)
        page = ctx.new_page()
        self.errors, self.external = [], []
        page.on("pageerror", lambda e: self.errors.append(str(e)))
        page.on("request", lambda r: self.external.append(r.url) if not (
            r.url.startswith(self.srv.base) or "localhost:11434" in r.url or "127.0.0.1:9379" in r.url or r.url.startswith("data:") or r.url.startswith("blob:")) else None)
        self.ollama = FakeOllama(page, **fake)
        page.route("**/127.0.0.1:9379/**", lambda route: route.abort())   # LiteRT-LM not running in tests
        self.addCleanup(ctx.close)
        return page

    def menu(self, page, pg=None):
        """open the menu sheet (and one of its sub pages)"""
        page.click(".burger-btn")
        if pg:
            page.click("#menu-sheet [data-go=%s]" % pg)

    def set_model(self, page, name):
        page.click("#model-chip")
        page.click('#model-list [data-model="%s"]' % name)

    def proto(self, page, index=-1):
        """text of the test log under the answer with this index (default: the last one)"""
        page.evaluate("window.copyText = function (t) { window.__proto = t; return Promise.resolve(); }")
        page.evaluate("i => { const b = document.querySelectorAll('.msg-assistant .msg-proto'); b[i < 0 ? b.length + i : i].click(); }", index)
        return page.evaluate("window.__proto")

    def send(self, page, text):
        page.fill("#query", text)
        page.click("#send-btn")
        page.wait_for_function("document.querySelectorAll('.msg-assistant').length > 0 && !document.querySelector('#send-btn').classList.contains('stopping')")

    def test_all_pages_load_without_errors_and_stay_offline(self):
        page = self.new_page()
        for p in PAGES:
            page.goto(self.srv.base + p)
            page.wait_for_timeout(300)
        self.assertEqual(self.errors, [])
        self.assertEqual(self.external, [], "page made a request outside localhost")

    def test_chat_streams_answer_and_badges(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Hi there")
        self.assertEqual(page.inner_text(".msg-assistant").replace("📋", "").strip(), "Hello world")
        # every bubble has its own copy button (user and assistant)
        self.assertEqual(page.locator(".msg-user .msg-copy").count(), 1)
        self.assertEqual(page.locator(".msg-assistant .msg-copy").count(), 1)
        self.assertEqual(page.inner_text("#dash-p-tok"), "60")
        self.assertEqual(page.inner_text("#dash-a-tok"), "92")
        self.assertEqual(page.inner_text("#dash-speed"), "23.0")
        self.assertEqual(page.inner_text("#dash-start"), "2.5", "load + prompt processing time")
        body = self.ollama.requests[0]
        self.assertTrue(body["stream"])
        self.assertEqual(body["messages"][0]["role"], "system")
        self.assertEqual(body["messages"][-1], {"role": "user", "content": "Hi there"})
        self.assertIn("Respond in English.", body["messages"][0]["content"])
        self.assertEqual(self.errors, [])

    def test_language_switch_changes_system_prompt(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.click("#lang-btn")
        self.send(page, "Hallo")
        self.assertIn("Antworte auf Deutsch.", self.ollama.requests[0]["messages"][0]["content"])

    def test_mode_switch_sets_model_and_params(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        if page.is_checked("#use-default"):
            page.evaluate("var c=document.getElementById('use-default'); c.checked=false; c.dispatchEvent(new Event('change'))")
        page.click("#mode-bar [data-mode=audit]")
        page.fill("#context", "Some context text")
        self.send(page, "Check it")
        body = self.ollama.requests[0]
        self.assertEqual(body["model"], "qwen2.5:3b")
        self.assertAlmostEqual(body["options"]["temperature"], 0.15)
        self.assertEqual(body["messages"][0]["role"], "system")
        self.assertIn("Some context text", body["messages"][0]["content"], "audit keeps the context in the system message")
        self.assertEqual(body["messages"][-1]["content"], "Check it", "the user message stays the plain question")

    def test_http_error_is_shown_and_question_removed_from_history(self):
        page = self.new_page(status=404)
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Hi")
        self.assertIn("404", page.inner_text(".msg-assistant"))
        self.ollama.status = 200   # next attempt succeeds
        self.send(page, "Again")
        users = [m for m in self.ollama.requests[-1]["messages"] if m["role"] == "user"]
        self.assertEqual([m["content"] for m in users], ["Again"], "failed question must not stay in history")
        self.assertEqual(self.errors, [])

    # ---- Chat-Strang, Schritt 1 ----
    def test_num_thread_is_sent_saved_per_model_and_survives_default_values(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.send(page, "one")
        self.assertEqual(self.ollama.requests[0]["options"]["num_thread"], 4, "default is 4")
        page.evaluate("var e=document.getElementById('param-threads'); e.value=2; e.dispatchEvent(new Event('input'))")
        self.send(page, "two")
        self.assertEqual(self.ollama.requests[1]["options"]["num_thread"], 2)
        # saved per model: other model keeps default, original model keeps 2 after reload
        self.set_model(page, "gemma:2b")
        self.assertEqual(page.input_value("#param-threads"), "4")
        self.set_model(page, "gemma2:2b")
        self.assertEqual(page.input_value("#param-threads"), "2")
        page.reload()
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.assertEqual(page.input_value("#param-threads"), "2")
        # sent even with "default values" (threads are speed, not sampling)
        page.evaluate("var c=document.getElementById('use-default'); c.checked=true; c.dispatchEvent(new Event('change'))")
        self.send(page, "three")
        self.assertEqual(self.ollama.requests[-1]["options"], {"num_thread": 2})
        # 0 = Ollama default: not sent at all
        page.evaluate("var e=document.getElementById('param-threads'); e.value=0; e.dispatchEvent(new Event('input'))")
        self.send(page, "four")
        self.assertNotIn("options", self.ollama.requests[-1])

    def test_model_list_comes_from_ollama_and_heinz_mode_prefers_heinz_fakt(self):
        page = self.new_page(tags=("qwen2.5:3b", "heinz-fakt:latest", "nomic-embed-text:latest", "gemma2:2b"))
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        opts = page.eval_on_selector_all("#model-select option", "els => els.map(e => e.value)")
        self.assertIn("heinz-fakt:latest", opts)
        self.assertNotIn("nomic-embed-text:latest", opts, "embedding models are not chat models")
        page.click("#mode-bar [data-mode=heinz]")
        self.assertEqual(page.input_value("#model-select"), "heinz-fakt:latest")
        self.assertFalse(page.is_disabled("#model-chip"), "model stays selectable in every mode")
        if page.is_checked("#use-default"):
            page.evaluate("var c=document.getElementById('use-default'); c.checked=false; c.dispatchEvent(new Event('change'))")
        self.send(page, "Hey")
        body = self.ollama.requests[0]
        self.assertEqual(body["model"], "heinz-fakt:latest")
        self.assertEqual(body["options"]["stop"], ["As an AI", "Als KI"])

    def test_heinz_mode_falls_back_when_heinz_fakt_is_not_installed(self):
        page = self.new_page()   # default tags: no heinz-fakt
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        page.click("#mode-bar [data-mode=heinz]")
        self.assertEqual(page.input_value("#model-select"), "qwen2.5:3b")

    def test_own_system_prompt_sends_no_system_message(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("setSysSrc('model')")
        page.click("#mode-bar [data-mode=heinz]")
        page.fill("#context", "Some context")
        self.send(page, "Hey")
        msgs = self.ollama.requests[0]["messages"]
        self.assertEqual([m["role"] for m in msgs], ["user"], "no system message so the Modelfile persona stays")
        self.assertIn("Respond in English.", msgs[0]["content"])
        self.assertIn("Some context", msgs[0]["content"])
        self.assertTrue(msgs[0]["content"].startswith("Context / source text:"))
        self.assertIn("Hey", msgs[0]["content"])
        # history keeps the plain question (language line and context are request-only)
        self.send(page, "Again")
        users = [m for m in self.ollama.requests[1]["messages"] if m["role"] == "user"]
        self.assertEqual(users[0]["content"], "Hey", "earlier turns are sent as stored, without language line or context")
        self.assertIn("Respond in English.", users[1]["content"], "only the last user message carries it")
        stored = page.evaluate("JSON.parse(localStorage.getItem('heinz_current')).messages[0].content")
        self.assertEqual(stored, "Hey")

    def wait_preloads(self, page, n, timeout=6000):
        waited = 0
        while len(self.ollama.preloads) < n and waited < timeout:
            page.wait_for_timeout(100)   # lets Playwright serve the routed requests
            waited += 100
        self.assertGreaterEqual(len(self.ollama.preloads), n)

    def test_model_is_preloaded_with_same_options_and_not_twice(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.wait_preloads(page, 1)
        pre = self.ollama.preloads[0]
        self.assertEqual(pre["messages"][0]["role"], "system")
        self.assertEqual(pre["messages"][-1], {"role": "user", "content": "."})
        self.assertEqual(pre["keep_alive"], "30m")
        self.assertFalse(pre["stream"])
        self.send(page, "Hi")
        req = self.ollama.requests[0]
        self.assertEqual(req["keep_alive"], "30m")
        self.assertEqual(req["messages"][0]["content"], pre["messages"][0]["content"], "same system prompt so it stays cached")
        for k in ("num_ctx", "num_thread"):
            self.assertEqual(req["options"][k], pre["options"][k], k + " must match or Ollama reloads the model")
        page.wait_for_timeout(1800)
        self.assertEqual(len(self.ollama.preloads), 1, "no second preload for unchanged settings")

    def test_bench_skips_the_preload_when_the_model_is_loaded_with_the_same_options(self):
        # gemma2:2b is reported as loaded; the chat has just sent it with threads 2, context 8192: the bench must not send a preload
        page = self.new_page()
        page.add_init_script("if (!localStorage.getItem('heinz_settings')) { localStorage.setItem('heinz_settings', JSON.stringify({threads: {'gemma2:2b': 2}})); localStorage.setItem('heinz_lastreq', JSON.stringify({chat: {model: 'gemma2:2b', threads: 2, ctx: 8192, keep: '30m', preload: false, ts: Date.now()}})); }")
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        page.wait_for_timeout(2500)
        self.assertEqual(self.ollama.preloads, [], "loaded with the same options: no preload request")
        # different threads: the model would be reloaded, so the preload still runs
        page.evaluate("() => { const t = document.getElementById('param-threads'); t.value = 3; onThreads(); }")
        self.wait_preloads(page, 1)

    def test_preload_follows_mode_threads_and_can_be_switched_off(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.wait_preloads(page, 1)
        page.click("#mode-bar [data-mode=audit]")
        self.wait_preloads(page, 2)
        self.assertEqual(self.ollama.preloads[1]["model"], "qwen2.5:3b")
        page.evaluate("var e=document.getElementById('param-threads'); e.value=2; e.dispatchEvent(new Event('input'))")
        self.wait_preloads(page, 3)
        self.assertEqual(self.ollama.preloads[2]["options"]["num_thread"], 2)
        page.evaluate("var c=document.getElementById('preload-on'); c.checked=false; c.dispatchEvent(new Event('change'))")
        page.click("#mode-bar [data-mode=creative]")
        page.wait_for_timeout(2000)
        self.assertEqual(len(self.ollama.preloads), 3, "switched off: no further preload")
        self.assertFalse(page.evaluate("JSON.parse(localStorage.getItem('heinz_settings')).preload"))

    def test_context_changes_do_not_change_system_prompt(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.click("#mode-bar [data-mode=code]")
        self.send(page, "One")
        page.fill("#context", "Background text")
        self.send(page, "Two")
        a, b = self.ollama.requests[0]["messages"], self.ollama.requests[1]["messages"]
        self.assertEqual(a[0], b[0])
        self.assertNotIn("Background text", b[0]["content"])
        self.assertTrue(b[-1]["content"].startswith("Context / source text:\nBackground text\n\nTwo"))

    def test_fast_mode_limits_tokens_asks_for_plain_text_and_shows_raw_text(self):
        page = self.new_page(chunks=("**bold** and", " <b>tag</b>"))
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("var c=document.getElementById('fast-mode'); c.checked=true; c.dispatchEvent(new Event('change'))")
        page.evaluate("var n=document.getElementById('param-fastn'); n.value=96; n.dispatchEvent(new Event('change'))")
        self.send(page, "Hi")
        req = self.ollama.requests[0]
        self.assertEqual(req["options"]["num_predict"], 96)
        self.assertIn("plain text", req["messages"][0]["content"])
        html = page.inner_html(".msg-assistant")
        self.assertNotIn("<strong>", html)
        self.assertNotIn("<b>tag", html, "raw text is escaped, not interpreted")
        self.assertIn("**bold** and &lt;b&gt;tag&lt;/b&gt;", html)
        self.assertTrue(page.evaluate("JSON.parse(localStorage.getItem('heinz_current')).messages[1].plain"))
        page.reload()
        self.assertNotIn("<strong>", page.inner_html(".msg-assistant"), "history keeps the plain look")
        # normal mode again: no num_predict, markdown rendered
        page.evaluate("var c=document.getElementById('fast-mode'); c.checked=false; c.dispatchEvent(new Event('change'))")
        self.send(page, "Again")
        self.assertNotIn("num_predict", self.ollama.requests[-1]["options"])

    def test_mode_bar_switches_modes_follows_language_and_waits_while_generating(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        pills = page.query_selector_all("#mode-bar .mode-pill")
        self.assertEqual([p.get_attribute("data-mode") for p in pills], ["wilson", "heinz", "audit", "code", "creative"])
        self.assertEqual(page.evaluate("document.querySelector('#mode-bar .active').dataset.mode"), "wilson")
        self.assertFalse(page.is_visible("#mode-select"), "the dropdown is only the hidden state holder")
        self.send(page, "First chat")
        page.click("#mode-bar [data-mode=audit]")
        self.assertEqual(page.evaluate("document.querySelector('#mode-bar .active').dataset.mode"), "audit")
        self.assertEqual(page.input_value("#model-select"), "qwen2.5:3b")
        self.assertEqual(page.evaluate("JSON.parse(localStorage.getItem('heinz_settings')).mode"), "audit")
        self.assertEqual(page.evaluate("JSON.parse(localStorage.getItem('heinz_chats')).length"), 1, "old chat saved on mode switch")
        self.assertEqual(page.evaluate("document.querySelectorAll('.msg').length"), 0, "new mode starts a fresh chat")
        page.click("#lang-btn")
        self.assertEqual(page.inner_text("#mode-bar [data-mode=creative]").split(" ")[-1], "Kreativ")
        self.assertEqual(page.evaluate("document.querySelector('#mode-bar .active').dataset.mode"), "audit", "language switch keeps the mode")
        # every pill is on screen width-wise or reachable by sideways scroll, and tall enough to tap
        self.assertGreaterEqual(page.evaluate("document.querySelector('#mode-bar .mode-pill').getBoundingClientRect().height"), 40)
        page.reload()
        self.assertEqual(page.evaluate("document.querySelector('#mode-bar .active').dataset.mode"), "audit", "mode survives reload")

    def test_mode_bar_ignores_taps_while_an_answer_is_running(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("generating = true")
        page.click("#mode-bar [data-mode=code]")
        self.assertEqual(page.evaluate("settings.mode"), "wilson")
        page.evaluate("generating = false")
        page.click("#mode-bar [data-mode=code]")
        self.assertEqual(page.evaluate("settings.mode"), "code")

    def test_only_the_selected_model_stays_loaded(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.wait_preloads(page, 1)
        self.assertEqual(self.ollama.unloads, [], "the model in memory is the selected one: nothing to unload")
        page.click("#mode-bar [data-mode=audit]")   # qwen2.5:3b; the fake /api/ps still reports gemma2:2b
        self.wait_preloads(page, 2)
        self.assertIn({"model": "gemma2:2b", "keep_alive": 0}, self.ollama.unloads)
        self.assertNotIn("qwen2.5:3b", [u["model"] for u in self.ollama.unloads])
        self.ollama.unloads.clear()
        page.fill("#context", "text")
        self.send(page, "Go")
        self.assertIn({"model": "gemma2:2b", "keep_alive": 0}, self.ollama.unloads, "also before a real request")

    def test_saved_chats_are_listed_per_mode_and_load_into_their_own_mode(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Wilson question")
        page.click("#mode-bar [data-mode=code]")        # saves the Wilson chat
        self.send(page, "Code question")
        page.click("#mode-bar [data-mode=wilson]")      # saves the Code chat
        titles = lambda: page.eval_on_selector_all("#saved-list .saved-item .load", "els => els.map(e => e.firstChild.textContent)")
        self.assertEqual(titles(), ["Wilson question"], "only the chats of the active mode")
        page.click("#mode-bar [data-mode=audit]")
        self.assertEqual(titles(), [])
        self.assertIn("this mode", page.text_content("#saved-list"))
        page.click("#chats-open")
        page.click("#chats-scope")                       # all modes
        self.assertEqual(sorted(titles()), ["Code question", "Wilson question"])
        page.click("#saved-list .saved-item .load >> text=Code question")
        self.assertEqual(page.evaluate("settings.mode"), "code", "loading from the full list jumps into the chat's own mode")
        self.assertEqual(page.evaluate("document.querySelector('#mode-bar .active').dataset.mode"), "code")

    def test_chat_list_action_pills_of_the_last_entry_stay_fully_visible(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("var l=[]; for (let i=0;i<14;i++){ l.push({id:2000+i,title:'Chat '+i,mode:'wilson',messages:[],pinned:false,ts:'',model:'m'}); } lsSet('heinz_chats', l)")
        page.click("#chats-open")
        page.click("#saved-list .saved-item >> nth=-1 >> .more")
        page.wait_for_timeout(600)
        bottom = page.evaluate("document.querySelector('#saved-list .saved-item:last-child .acts2').getBoundingClientRect().bottom")
        self.assertLessEqual(bottom, page.evaluate("innerHeight") - 30, "pills must not touch the screen bottom")

    def test_select_opens_a_themed_popup_not_wider_than_the_field(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("openPanel && 0")  if False else None
        page.evaluate("document.body.insertAdjacentHTML('beforeend','<select id=tsel class=sel style=\"position:fixed;top:100px;left:20px;width:200px\"><option value=a>A</option><option value=b>B</option></select>')")
        page.click("#tsel")
        self.assertEqual(page.locator(".sel-pop .sel-opt").count(), 2)
        self.assertLessEqual(page.evaluate("document.querySelector('.sel-pop').getBoundingClientRect().width"), 200.5)
        page.click(".sel-pop .sel-opt >> nth=1")
        self.assertEqual(page.evaluate("document.getElementById('tsel').value"), "b")
        self.assertEqual(page.locator(".sel-pop").count(), 0)

    def test_selects_use_our_own_popup_with_the_width_of_the_select(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("openMenu(); showPage('speed')")
        page.wait_for_timeout(400)
        sel = page.evaluate("(function(){var s=document.getElementById('st-prompt');var r=s.getBoundingClientRect();return [r.width, s.options.length, s.value, s.options[s.options.length-1].value]})()")
        page.evaluate("document.getElementById('st-prompt').click()")
        self.assertEqual(page.locator(".hz-pop button").count(), sel[1])
        w = page.evaluate("document.querySelector('.hz-pop').getBoundingClientRect().width")
        self.assertLessEqual(abs(w - sel[0]), 1)
        page.evaluate("document.querySelector('.hz-pop button:last-child').click()")
        self.assertEqual(page.evaluate("document.getElementById('st-prompt').value"), sel[3])
        self.assertEqual(page.locator(".hz-pop").count(), 0)

    def test_several_own_engines_each_with_own_address_and_key(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("openMenu(); showPage('engine')")
        page.click("#eng-add")
        a = page.evaluate("settings.provider")
        self.assertTrue(a.startswith("u"))
        page.fill("#prov-name", "Home server")
        page.press("#prov-name", "Tab")
        page.fill("#prov-url", "http://192.168.1.5:8080/v1")
        page.press("#prov-url", "Tab")
        page.fill("#prov-key", "key-A")
        page.press("#prov-key", "Tab")
        page.click("#eng-add")
        b = page.evaluate("settings.provider")
        self.assertNotEqual(a, b)
        self.assertEqual(page.input_value("#prov-url"), "", "a new engine starts empty")
        page.fill("#prov-url", "http://10.0.0.9:1234/v1")
        page.press("#prov-url", "Tab")
        page.fill("#prov-key", "key-B")
        page.press("#prov-key", "Tab")
        page.evaluate("pickEngine('" + a + "')")
        self.assertEqual(page.input_value("#prov-url"), "http://192.168.1.5:8080/v1")
        self.assertEqual(page.input_value("#prov-key"), "key-A")
        self.assertEqual(page.input_value("#prov-name"), "Home server")
        self.assertIn("Home server", page.inner_text("#q-eng-list"))
        self.assertEqual(page.evaluate("HeinzProviders.getKey('" + b + "')"), "key-B")
        page.click("#eng-del")
        self.assertEqual(page.evaluate("HeinzProviders.userEngines().length"), 2, "first tap only arms")
        page.click("#eng-del")
        self.assertEqual(page.evaluate("HeinzProviders.userEngines().length"), 1)
        self.assertEqual(page.evaluate("HeinzProviders.getKey('" + a + "')"), "", "key removed with the engine")
        self.assertEqual(page.evaluate("settings.provider"), "ollama")
        self.assertEqual(page.locator("#provider-select").is_visible(), False, "no second engine picker under Connection details")

    def test_rename_chat_in_the_title_bar_and_pin_in_the_list(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Hi there")
        page.click(".chat-edit")
        page.fill(".bar .inline-edit", "Projekt A / Notizen")
        page.press(".bar .inline-edit", "Enter")
        self.assertEqual(page.inner_text("#chat-title"), "Projekt A / Notizen")
        page.evaluate("saveChatNow()")
        saved = page.evaluate("JSON.parse(localStorage.getItem('heinz_chats'))")
        self.assertEqual(saved[0]["title"], "Projekt A / Notizen")
        page.reload()
        self.assertEqual(page.inner_text("#chat-title"), "Projekt A / Notizen", "name survives a reload")
        page.click("#chats-open")
        page.click("#saved-list .saved-item .more")
        page.click("#saved-list .acts2 button:has-text('Pin')")
        self.assertEqual(page.locator("#saved-list .pinned").count(), 1)
        page.evaluate("var l=getSaved(); for (let i=0;i<6;i++){ l.push({id:1000+i,title:'x'+i,mode:'wilson',messages:[],pinned:i<4,ts:'',model:'m'}); } lsSet('heinz_chats', l)")
        page.evaluate("var n=0; window.alert=function(){window._alerted=true}; togglePin(1004); togglePin(1005)")
        self.assertTrue(page.evaluate("window._alerted === true"), "at most five pinned chats")

    def test_three_parameter_views_model_mode_mine_per_model_and_mode(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.menu(page)
        page.click("#seg-model")
        page.wait_for_function("document.getElementById('val-topk').innerText == '64'")
        self.assertEqual(page.inner_text("#val-temp"), "1")
        self.assertTrue(page.is_disabled("#param-temp"), "model values are locked")
        page.evaluate("closeAll()")
        self.send(page, "native")
        self.menu(page)
        self.assertNotIn("temperature", self.ollama.requests[-1]["options"], "model view sends nothing")
        page.click("#seg-mode")
        self.assertEqual(page.inner_text("#val-temp"), "0.75")
        self.assertTrue(page.is_disabled("#param-temp"))
        page.click("#seg-own")
        page.evaluate("var e=document.getElementById('param-temp'); e.value=0.3; e.dispatchEvent(new Event('input'))")
        self.assertFalse(page.is_disabled("#q-reset"), "reset is live once my values differ")
        self.assertIn("act", page.get_attribute("#q-reset", "class"))
        page.click("#q-save")
        self.assertTrue(page.is_disabled("#q-reset"))
        page.reload()
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.assertEqual(page.evaluate("paramSrc()"), "own", "saved values come back after a reload")
        self.assertEqual(page.input_value("#param-temp"), "0.3")
        page.evaluate("closeAll()")
        page.click("#mode-bar [data-mode=creative]")
        self.assertEqual(page.evaluate("paramSrc()"), "mode", "own values belong to model + mode")
        self.assertEqual(page.input_value("#param-temp"), "0.75")
        page.click("#mode-bar [data-mode=wilson]")
        self.assertEqual(page.input_value("#param-temp"), "0.3")
        self.menu(page)
        page.click("#seg-mode")
        self.assertEqual(page.input_value("#param-temp"), "0.75", "the mode preset is always recoverable")

    def test_equalizer_tap_shows_the_last_three_status_steps_and_all_count(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("stLog.length >= 1")
        page.evaluate("stLog.unshift({txt: 'a', color: 'blue', at: new Date()}); stLog.unshift({txt: 'b', color: 'orange', at: new Date()}); stLog.unshift({txt: 'c', color: 'green', at: new Date()}); stLog.length = 3")
        page.click("#eq-led")
        self.assertTrue(page.is_visible("#st-log"))
        self.assertEqual(page.locator("#st-log > div").count(), 3)
        page.mouse.click(200, 500)
        self.assertFalse(page.is_visible("#st-log"))
        page.evaluate("var l=getSaved(); for (let i=0;i<4;i++){ l.push({id:2000+i,title:'y'+i,mode:i<2?'wilson':'code',messages:[],ts:'',model:'m'}); } lsSet('heinz_chats', l); updateChatBar()")
        self.assertIn("4", page.text_content("#scope-all"))

    def test_own_system_prompt_is_sent_as_written_and_can_be_copied(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        page.click(".burger-btn")
        page.click("[data-pw=prompts]")
        self.assertIn("Wilson", page.input_value("#ps-text"), "the mode prompt is visible")
        self.assertTrue(page.is_disabled("#ps-copy") is False)
        page.click("#ps-own")
        self.assertTrue(page.is_disabled("#ps-copy"), "nothing to copy while mine is empty")
        page.fill("#ps-text", "You are a test agent.")
        page.evaluate("closeAll()")
        self.send(page, "Hi")
        self.assertEqual(self.ollama.requests[-1]["messages"][0], {"role": "system", "content": "You are a test agent."})
        page.reload()
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.assertEqual(page.evaluate("settings.ownPrompt"), "You are a test agent.", "one own prompt is kept")
        page.click(".burger-btn")
        page.click("[data-pw=prompts]")
        page.click("#ps-model")
        self.assertEqual(page.input_value("#ps-text"), "")
        self.assertTrue(page.is_disabled("#ps-copy"))

    def test_status_text_tap_expands_in_place_without_covering_the_page(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.getElementById('preload-status').textContent.length > 3")
        before = page.locator("#model-chip").bounding_box()
        page.click("#preload-status")
        self.assertEqual(page.evaluate("getComputedStyle(document.getElementById('preload-status')).position"), "static")
        after = page.locator("#model-chip").bounding_box()
        self.assertEqual(before, after, "the header does not move or get covered")
        self.assertTrue(page.is_visible("#query"), "the page stays usable")

    def test_mode_presets_only_ignores_my_values_prompt_and_model_but_keeps_threads(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        page.evaluate("settings.ownPrompt = 'MY PROMPT'; setSysSrc('own'); settings.modelParams = {}; settings.modelParams[modelKey()] = {temp: 0.2, topp: 0.5, topk: 11, ctx: 4096}; setParamSrc('own'); var th = document.getElementById('param-threads'); th.value = 3; onThreads()")
        page.evaluate("var c=document.getElementById('modes-only'); c.checked=true; c.dispatchEvent(new Event('change'))")
        self.send(page, "Hi")
        req = self.ollama.requests[-1]
        self.assertIn("Wilson", req["messages"][0]["content"])
        self.assertNotIn("MY PROMPT", json.dumps(req))
        self.assertEqual(req["options"]["temperature"], 0.75)
        self.assertEqual(req["options"]["num_thread"], 3, "threads stay a model setting")

    def test_backup_roundtrip_leaves_keys_out_unless_asked(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("lsSet('heinz_keys', {custom: 'SECRET'}); lsSet('heinz_chats', [{id: 1, title: 'Backed up', mode: 'wilson', messages: [], ts: '', model: 'm'}])")
        self.menu(page, "update")
        page.evaluate("window._dl = null; URL.createObjectURL = function (b) { window._blob = b; return 'blob:x'; }; HTMLAnchorElement.prototype.click = function () {}")
        page.evaluate("exportBackup()")
        txt = page.evaluate("window._blob.text()")
        self.assertIn("Backed up", txt)
        self.assertNotIn("SECRET", txt, "API keys stay out by default")
        page.check("#bk-keys")
        page.evaluate("exportBackup()")
        self.assertIn("SECRET", page.evaluate("window._blob.text()"))
        page.evaluate("localStorage.removeItem('heinz_chats'); window.confirm = function () { return true; }; window.location.reload = function () {}")
        page.evaluate("var r = JSON.parse(%s); Object.keys(r.data).forEach(function (k) { localStorage.setItem(k, r.data[k]); })" % json.dumps(txt))
        self.assertIn("Backed up", page.evaluate("localStorage.getItem('heinz_chats')"))

    def test_scroll_stays_when_reading_up_and_actions_sit_under_the_answer(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.assertEqual(page.locator(".msg-read").count(), 0)
        self.send(page, "Hi there")
        self.assertEqual(page.locator(".msg-assistant > .msg-acts .msg-read").count(), 1, "read aloud sits under the last answer")
        acts = page.locator(".msg-assistant > .msg-acts")
        self.assertEqual(acts.count(), 1, "copy/download row sits at the end of the answer")
        self.assertEqual(page.locator(".msg-assistant > .msg-acts .msg-copy").count(), 1)
        self.assertEqual(page.locator(".msg-assistant > .msg-acts .msg-dl").count(), 1)
        page.evaluate("for (let i = 0; i < 40; i++) { const d = document.createElement('div'); d.className = 'msg msg-user'; d.textContent = 'filler ' + i; chatBox.appendChild(d); } jumpBottom()")
        page.evaluate("chatBox.scrollTop = 0")
        page.wait_for_function("document.getElementById('jump-bottom').hidden === false")
        page.evaluate("stickBottom()")
        self.assertEqual(page.evaluate("chatBox.scrollTop"), 0, "live output must not pull the view down while reading above")
        page.click("#jump-bottom")
        self.assertTrue(page.evaluate("chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 5"))

    def test_status_ring_red_without_engine_blue_when_ready_green_while_answering(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.getElementById('status-dot').classList.contains('status-online')")
        self.assertIn("s-blue", page.evaluate("document.getElementById('status-dot').className"), "engine answers: blue")
        page.evaluate("generating = true; gotToken = false; renderRing()")
        self.assertTrue(page.evaluate("document.getElementById('status-dot').classList.contains('s-blue') && document.getElementById('status-dot').classList.contains('status-active')"), "waiting for the first token: blue")
        page.evaluate("gotToken = true; renderRing()")
        self.assertTrue(page.evaluate("document.getElementById('status-dot').classList.contains('s-green') && document.getElementById('status-dot').classList.contains('status-active')"), "answering: green")
        page.evaluate("generating = false; renderRing()")
        page.evaluate("preloadAbort = new AbortController(); renderRing()")
        self.assertTrue(page.evaluate("document.getElementById('status-dot').classList.contains('s-orange')"), "model loading: orange")
        page.evaluate("preloadAbort = null; renderRing()")
        page.route("**/localhost:11434/**", lambda r: r.abort())   # server gone: red
        page.evaluate("checkServer()")
        page.wait_for_function("document.getElementById('status-dot').classList.contains('s-red')")
        self.assertEqual(page.get_attribute("#status-dot", "href"), "index.html", "the ring leads to the hub")

    def set_free_model(self, page, name):
        self.menu(page, "engine")
        page.fill("#model-free", name)
        page.dispatch_event("#model-free", "change")
        page.keyboard.press("Escape")

    def pick_engine(self, page, engine):
        self.menu(page, "engine")
        page.evaluate("pickEngine(\'" + engine + "\')")
        page.keyboard.press("Escape")

    def test_online_is_off_by_default_nothing_leaves_and_online_engines_are_hidden(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        opts = page.eval_on_selector_all("#provider-select option", "els => els.map(e => e.value)")
        self.assertEqual(opts, ["ollama", "litert", "custom"])
        self.assertFalse(page.evaluate("HeinzProviders.onlineAllowed()"))
        code = page.evaluate("""async () => { try { await HeinzProviders.chat('openrouter', {model:'x', messages:[{role:'user',content:'hi'}]}); return 'sent'; } catch (e) { return e.code; } }""")
        self.assertEqual(code, "ONLINE_BLOCKED")
        self.send(page, "Hello")
        self.assertEqual(self.external, [], "no request left this device")

    def test_litert_engine_models_backend_stats_and_traffic_light(self):
        page = self.new_page()
        lit = FakeOpenAI(page, "**/127.0.0.1:9379/**", models=("gemma4-e2b", "other"))
        page.goto(self.srv.base + "/chat.html")
        self.pick_engine(page, "litert")
        page.wait_for_function("document.querySelectorAll('#model-select option').length === 2")
        self.assertEqual(page.input_value("#model-select"), "gemma4-e2b")
        page.wait_for_function("document.getElementById('status-dot').classList.contains('status-online')")
        n_preloads = len(self.ollama.preloads)
        page.fill("#query", "Hi")
        page.click("#send-btn")
        page.wait_for_function("document.querySelector('.msg-assistant') && document.querySelector('.msg-assistant').innerText.includes('Hi there')")
        h, body = lit.requests[0]
        self.assertEqual(body["model"], "gemma4-e2b", "CPU: plain model name")
        self.assertEqual(body["messages"][0]["role"], "system")
        self.assertNotIn("num_thread", json.dumps(body))
        self.assertEqual(page.inner_text("#dash-p-tok"), "21")
        self.assertEqual(page.inner_text("#dash-a-tok"), "7")
        self.menu(page, "engine")
        page.select_option("#backend-select", "gpu")
        page.keyboard.press("Escape")
        self.send(page, "Again")
        self.assertEqual(lit.requests[1][1]["model"], "gemma4-e2b,gpu", "GPU is chosen through the model field")
        self.assertEqual(len(self.ollama.preloads), n_preloads, "no Ollama preload while another engine is active")
        self.assertEqual(self.external, [])
        self.assertTrue(page.evaluate("JSON.parse(localStorage.getItem('heinz_current')).provider") == "litert")

    def test_online_engine_needs_switch_and_key_and_sends_only_the_current_chat(self):
        page = self.new_page()
        orr = FakeOpenAI(page, "https://openrouter.ai/**", models=("meta/free-model:free",))
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Private earlier question")      # an Ollama chat that must never reach the provider
        page.click("#mode-bar [data-mode=heinz]")        # saves it to the chat list
        page.click(".burger-btn")
        page.evaluate("var c=document.getElementById('online-on'); c.checked=true; c.dispatchEvent(new Event('change'))")
        page.click("#q-engine")
        self.assertFalse(page.locator("#q-eng-list [data-eng=openrouter]").evaluate("e => e.classList.contains('locked')"), "online engine unlocked in the engine list")
        opts = page.eval_on_selector_all("#provider-select option", "els => els.map(e => e.value)")
        self.assertIn("openrouter", opts)
        page.evaluate("pickEngine(\'" + "openrouter" + "\')")
        self.assertIn("API key", page.inner_text("#eng-key"))
        page.fill("#model-free", "meta/free-model:free")
        page.dispatch_event("#model-free", "change")
        page.keyboard.press("Escape")
        page.fill("#query", "Public question")
        page.click("#send-btn")
        page.wait_for_function("document.querySelector('.msg-assistant') && document.querySelector('.msg-assistant').innerText.includes('API key')")
        self.assertEqual(orr.requests, [], "no key: refused before anything is sent")
        self.menu(page, "engine")
        page.fill("#prov-key", "sk-test-123")
        page.dispatch_event("#prov-key", "change")
        page.keyboard.press("Escape")
        page.fill("#query", "Public question")
        page.click("#send-btn")
        page.wait_for_function("document.querySelector('.msg-assistant:last-of-type') && document.querySelector('.msg-assistant:last-of-type').innerText.includes('Hi there')")
        headers, body = orr.requests[0]
        self.assertEqual(headers["authorization"], "Bearer sk-test-123")
        self.assertEqual(body["model"], "meta/free-model:free")
        sent = json.dumps(body)
        self.assertNotIn("Private earlier question", sent, "only the current chat leaves the device")
        self.assertIn("Public question", sent)
        self.assertEqual(sorted(body.keys()), ["messages", "model", "stop", "stream", "stream_options", "temperature", "top_p"])
        self.assertEqual(page.evaluate("document.getElementById('status-dot').className"), "ring-btn metal status-dot status-cloud s-blue")
        self.assertIn("ONLINE", page.inner_text("#chip-engine").upper(), "header chip tells that this engine is online")
        # switching online off returns to Ollama
        page.click(".burger-btn")
        page.evaluate("var c=document.getElementById('online-on'); c.checked=false; c.dispatchEvent(new Event('change'))")
        self.assertEqual(page.evaluate("settings.provider"), "ollama")
        self.assertNotIn("openrouter", page.eval_on_selector_all("#provider-select option", "els => els.map(e => e.value)"))

    def test_online_errors_are_explained(self):
        page = self.new_page()
        orr = FakeOpenAI(page, "https://openrouter.ai/**", status=401)
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("HeinzProviders.setOnlineAllowed(true); HeinzProviders.setKey('openrouter', 'bad')")
        page.reload()
        self.pick_engine(page, "openrouter")
        self.set_free_model(page, "m")
        self.send(page, "Hi")
        text = page.inner_text(".msg-assistant")
        self.assertIn("HTTP 401", text)
        self.assertIn("API key rejected", text)

    def test_custom_endpoint_local_works_offline_and_remote_counts_as_online(self):
        page = self.new_page()
        loc = FakeOpenAI(page, "http://127.0.0.1:8080/**", models=("local-model",))
        remote = FakeOpenAI(page, "https://example.test/**")
        page.goto(self.srv.base + "/chat.html")
        self.pick_engine(page, "custom")
        self.menu(page, "engine")
        page.fill("#prov-url", "http://127.0.0.1:8080/v1"); page.dispatch_event("#prov-url", "change")
        page.wait_for_function("document.querySelectorAll('#model-select option').length === 1")
        page.keyboard.press("Escape")
        self.send(page, "Hi")
        self.assertEqual(len(loc.requests), 1, "a local address needs no online switch")
        self.menu(page, "engine")
        page.fill("#prov-url", "https://example.test/v1"); page.dispatch_event("#prov-url", "change")
        page.keyboard.press("Escape")
        self.send(page, "Hi again")
        self.assertEqual(remote.requests, [], "a remote address is blocked while online is off")
        self.assertIn("Online is switched off", page.inner_text(".msg-assistant:last-of-type"))

    def test_speed_test_is_ollama_only_and_online_chat_opens_locally_when_online_is_off(self):
        page = self.new_page()
        orr = FakeOpenAI(page, "https://openrouter.ai/**")
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("HeinzProviders.setOnlineAllowed(true); HeinzProviders.setKey('openrouter', 'k')")
        page.reload()
        self.pick_engine(page, "openrouter")
        self.set_free_model(page, "m")
        self.send(page, "Online chat")
        page.evaluate("saveChatNow()")
        self.menu(page, "speed")
        self.assertTrue(page.is_disabled("#st-start"), "speed test is greyed out for cloud engines")
        self.assertTrue(page.is_disabled("#st-termux"))
        page.evaluate("var c=document.getElementById('online-on'); c.checked=false; c.dispatchEvent(new Event('change'))")
        page.reload()
        page.click("#chats-open")
        page.click("#chats-scope")
        self.assertEqual(page.evaluate("JSON.parse(localStorage.getItem('heinz_chats'))[0].provider"), "openrouter")
        page.click("#saved-list .saved-item .load")
        self.assertEqual(page.evaluate("settings.provider"), "ollama", "an online chat opens locally while online is off")
        self.assertEqual(page.evaluate("chatHistory.length"), 2)

    def test_openai_stream_without_usage_is_marked_approximate(self):
        page = self.new_page()
        FakeOpenAI(page, "**/127.0.0.1:9379/**", chunks=("a", "b", "c"), usage=False)
        page.goto(self.srv.base + "/chat.html")
        r = page.evaluate("""async () => { const x = await HeinzProviders.chat('litert', {model:'m', messages:[{role:'user',content:'hi'}]}); return [x.text, x.stats.outputTokens, x.stats.approx]; }""")
        self.assertEqual(r, ["abc", 3, True])

    def test_cloud_answer_cut_by_token_limit_is_explained(self):
        # Handytest 10.11.2026 (Google AI Studio): Antworten wurden immer kürzer und endeten mitten im Wort.
        # Denk-Modelle zählen Denk-Token zur Grenze; die Seite muss den Abbruchgrund (finish_reason) zeigen.
        page = self.new_page()
        FakeOpenAI(page, "**/127.0.0.1:9379/**", chunks=("Ye",), finish="length", reasoning=90)
        page.goto(self.srv.base + "/chat.html")
        r = page.evaluate("""async () => { const x = await HeinzProviders.chat('litert', {model:'m', messages:[{role:'user',content:'hi'}]}); return [x.stats.finishReason, x.stats.reasoningTokens]; }""")
        self.assertEqual(r, ["length", 90])
        self.pick_engine(page, "litert")
        page.wait_for_function("document.querySelectorAll('#model-select option').length === 1")
        page.fill("#query", "Hi")
        page.click("#send-btn")
        page.wait_for_function("document.querySelector('.msg-assistant') && document.querySelector('.msg-assistant').innerText.includes('cut off')")
        self.assertIn("Ye", page.inner_text(".msg-assistant"))
        self.assertEqual(page.evaluate("chatHistory[chatHistory.length-1].content"), "Ye", "the note is not stored in the history")

    # ===== Schnittstellenwissen (docs/AUFTRAG_Chat_Schnittstellen.md): Regler nach Zustand, Denken =====
    GOOGLE = "https://generativelanguage.googleapis.com/v1beta/openai"

    def google_page(self, model, **fake):
        page = self.new_page()
        g = FakeOpenAI(page, "https://generativelanguage.googleapis.com/**", models=(model, "gemini-2.5-flash"), **fake)
        self.g_native_default = None
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("HeinzProviders.setOnlineAllowed(true)")
        page.reload()
        self.pick_engine(page, "custom")
        self.menu(page, "engine")
        page.fill("#prov-url", self.GOOGLE); page.dispatch_event("#prov-url", "change")
        page.wait_for_function("document.querySelectorAll('#model-select option').length >= 1")
        page.keyboard.press("Escape")
        page.evaluate("m => { document.getElementById('model-free').value = m; onModelFree(); }", model)
        page.wait_for_function("window.HeinzCaps && HeinzCaps.ready()")
        page.evaluate("renderCaps(); renderThink()")
        return page, g

    def test_blocked_controls_are_greyed_out_and_not_sent_while_unknown_ones_stay_active_with_tag(self):
        page, g = self.google_page("gemini-2.5-flash")   # top_k is only measured off on Gemini 3
        self.assertEqual(page.evaluate("document.getElementById('sc-ctx').dataset.capState"), "fixed")
        self.assertTrue(page.evaluate("document.getElementById('sc-ctx').classList.contains('cap-blocked')"))
        self.assertTrue(page.evaluate("document.querySelector('#sc-ctx input').disabled"))
        self.assertTrue(page.evaluate("document.getElementById('sc-threads').classList.contains('cap-blocked')"))
        # top_k is unknown on the compatible route: active, with tag
        self.assertEqual(page.evaluate("document.getElementById('sc-topk').dataset.capState"), "unknown")
        self.assertFalse(page.evaluate("document.getElementById('sc-topk').classList.contains('cap-blocked')"))
        self.assertIn("unverified", page.inner_text("#sc-topk .cap-tag").lower())
        # tapping a blocked card shows the reason
        page.evaluate("document.getElementById('sc-ctx').click()")
        self.assertIn("Fixed per model", page.inner_text("#sc-ctx .cap-text"))
        opts = page.evaluate("buildOptions(MODE_PRESETS[settings.mode])")
        self.assertNotIn("num_ctx", opts)
        self.assertNotIn("num_thread", opts)
        self.assertIn("temperature", opts)
        self.assertIn("top_k", opts, "unknown state is still sent")
        self.send(page, "Hi")
        body = g.requests[-1][1]
        self.assertNotIn("num_ctx", body)
        self.assertNotIn("num_thread", body)
        # counter test: the same controls are active and sent on Ollama
        page.evaluate("switchProvider('ollama')")
        page.wait_for_timeout(200)
        self.assertFalse(page.evaluate("document.getElementById('sc-ctx').classList.contains('cap-blocked')"))
        self.assertIn("num_ctx", page.evaluate("buildOptions(MODE_PRESETS[settings.mode])"))

    def test_thinking_switch_sends_reasoning_effort_never_with_thinking_level(self):
        page, g = self.google_page("gemini-3-flash")
        self.assertFalse(page.is_hidden("#think-row"))
        self.assertIn("model default", page.inner_text("#think-note").lower())
        self.send(page, "default")
        b0 = g.requests[-1][1]
        self.assertNotIn("reasoning_effort", b0, "default = send nothing")
        page.click("#think-deep")
        self.send(page, "deep")
        b1 = g.requests[-1][1]
        self.assertEqual(b1.get("reasoning_effort"), "high")
        for k in ("thinking_level", "thinking_budget"):
            self.assertNotIn(k, b1)
        self.assertNotIn("thinking_config", json.dumps(b1))
        page.click("#think-fast")
        self.send(page, "fast")
        self.assertEqual(g.requests[-1][1].get("reasoning_effort"), "low", "fast = the rule's fast stage")
        # state is saved per model and survives a reload
        page.reload()
        page.wait_for_function("window.HeinzCaps && HeinzCaps.ready()")
        self.assertEqual(page.evaluate("thinkStage()"), "fast")
        # tapping the active stage again goes back to the model default
        page.evaluate("renderThink()")
        page.click("#think-fast")
        self.assertEqual(page.evaluate("thinkEffort()"), "")

    def test_model_without_thinking_rule_shows_no_switch_and_sends_no_effort(self):
        page, g = self.google_page("some-unknown-model")
        self.assertTrue(page.is_hidden("#think-row"))
        self.send(page, "Hi")
        self.assertNotIn("reasoning_effort", g.requests[-1][1])
        # counter test: Ollama has no thinking switch either
        page.evaluate("switchProvider('ollama')")
        page.wait_for_timeout(200)
        self.assertTrue(page.is_hidden("#think-row"))

    def test_recommended_temperature_is_offered_never_set_silently(self):
        page, g = self.google_page("gemini-3-flash")
        before = page.evaluate("parseFloat(document.getElementById('param-temp').value)")
        self.assertNotEqual(before, 1.0)
        self.assertIn("Recommended: 1", page.inner_text("#sc-temp .cap-row"))
        self.assertEqual(page.evaluate("parseFloat(document.getElementById('param-temp').value)"), before, "nothing set silently")
        presets = page.evaluate("JSON.stringify(MODE_PRESETS)")
        page.evaluate("document.querySelector('#sc-temp [data-cap-apply]').click()")
        self.assertEqual(page.evaluate("parseFloat(document.getElementById('param-temp').value)"), 1.0)
        self.assertEqual(page.evaluate("JSON.stringify(MODE_PRESETS)"), presets, "mode presets untouched")
        self.assertEqual(page.locator("#sc-temp [data-cap-apply]").count(), 0, "button gone once applied")
        # counter test: a model without a recommendation shows no button
        page.evaluate("settings.model='gemini-2.5-flash'; document.getElementById('model-select').value='gemini-2.5-flash'; renderCaps()")
        self.assertEqual(page.locator("[data-cap-apply]").count(), 0)

    def test_reasoning_tokens_shown_separately_and_estimate_marked(self):
        page, g = self.google_page("gemini-3-flash", reasoning=40)
        self.send(page, "Hi")
        self.assertFalse(page.is_hidden("#m-think"))
        self.assertEqual(page.inner_text("#dash-think"), "40")
        self.assertEqual(page.inner_text("#dash-a-tok"), "7", "output tokens are not reduced by thinking tokens")
        txt = self.proto(page)
        self.assertIn("reasoningTokens 40", txt)
        self.assertIn("not comparable", txt)
        self.assertIn("frequency_penalty: error", txt)
        self.assertNotIn("AIza", txt)
        # counter test: no reasoning tokens, no chip
        page2, _ = self.google_page("gemini-3-flash")
        self.send(page2, "Hi")
        self.assertTrue(page2.is_hidden("#m-think"))
        # estimate (stream without usage) carries the tilde
        page3, _ = self.google_page("gemini-3-flash", usage=False)
        self.send(page3, "Hi")
        self.assertTrue(page3.inner_text("#dash-a-tok").startswith("~"))

    def test_capabilities_load_failure_keeps_all_controls_active(self):
        page = self.new_page()
        page.route("**/lib/capabilities.json", lambda route: route.fulfill(status=404, body=""))
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_timeout(300)
        self.assertEqual(page.locator(".cap-blocked").count(), 0)
        self.assertTrue(page.is_hidden("#think-row"))
        self.assertIn("num_ctx", page.evaluate("buildOptions(MODE_PRESETS[settings.mode])"))

    def test_online_off_sends_nothing_and_chosen_model_stays_per_engine(self):
        page = self.new_page()
        g = FakeOpenAI(page, "https://generativelanguage.googleapis.com/**", models=("a", "b"))
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("HeinzProviders.setOnlineAllowed(true)")
        page.reload()
        self.pick_engine(page, "custom")
        self.menu(page, "engine")
        page.fill("#prov-url", self.GOOGLE); page.dispatch_event("#prov-url", "change")
        page.wait_for_function("document.querySelectorAll('#model-select option').length >= 2")
        page.keyboard.press("Escape")
        page.evaluate("document.getElementById('model-free').value = 'gemini-3-flash'; onModelFree()")
        self.assertEqual(page.evaluate("settings.model"), "gemini-3-flash")
        # a list that does not contain the chosen model does not replace it
        page.evaluate("loadModels()")
        page.wait_for_timeout(300)
        self.assertEqual(page.evaluate("settings.model"), "gemini-3-flash")
        # engine and model survive a reload as a pair
        page.reload()
        page.wait_for_timeout(400)
        self.assertEqual(page.evaluate("[settings.provider, settings.model]"), ["custom", "gemini-3-flash"])
        # online off: back to local, no request to Google
        n = len(g.requests)
        page.evaluate("var c=document.getElementById('online-on'); c.checked=false; c.dispatchEvent(new Event('change'))")
        page.reload()
        self.send(page, "Hi")
        self.assertEqual(len(g.requests), n)
        self.assertEqual(page.evaluate("settings.provider"), "ollama")
        self.assertNotIn("gemini", page.evaluate("settings.model"), "no cloud model on a local engine")

    NATIVE = [
        {"name": "models/gemini-3.8-flash", "displayName": "Gemini 3.8 Flash", "inputTokenLimit": 1048576, "outputTokenLimit": 65536, "thinking": True, "supportedGenerationMethods": ["generateContent", "countTokens"]},
        {"name": "models/gemini-embedding-2", "inputTokenLimit": 8192, "outputTokenLimit": 1, "supportedGenerationMethods": ["embedContent"]},
        {"name": "models/gemini-2.5-flash", "inputTokenLimit": 1048576, "outputTokenLimit": 65536, "thinking": True, "supportedGenerationMethods": ["generateContent"]},
    ]

    def test_google_native_model_list_filters_to_chat_models_and_shows_limits(self):
        page, g = self.google_page("models/gemini-3.8-flash", native=self.NATIVE)
        page.evaluate("HeinzProviders.setKey('custom', 'AIza-test'); loadModels()")
        page.wait_for_function("MODELS.length === 2")
        self.assertEqual(page.evaluate("MODELS"), ["models/gemini-3.8-flash", "models/gemini-2.5-flash"], "no embedding model, newest first")
        url, hdr = g.native_calls[-1]
        self.assertNotIn("AIza", url, "the key never appears in the URL")
        self.assertEqual(hdr.get("x-goog-api-key"), "AIza-test")
        page.evaluate("renderModelSheet()")
        sheet = page.text_content("#model-list")
        self.assertIn("1M", sheet)
        self.assertIn("thinking", sheet)
        self.send(page, "Hi")
        self.assertIn("inputTokenLimit 1048576", self.proto(page))
        # counter test: another engine never asks Google for its list
        n = len(g.native_calls)
        page.evaluate("switchProvider('ollama')"); page.wait_for_timeout(200)
        self.assertEqual(len(g.native_calls), n)

    def test_google_native_list_failure_is_reported_and_compatible_list_is_used(self):
        page = self.new_page()
        g = FakeOpenAI(page, "https://generativelanguage.googleapis.com/v1beta/openai/**", models=("models/a", "models/b"))
        page.route("https://generativelanguage.googleapis.com/v1beta/models**", lambda r: r.abort())   # e.g. CORS: no workaround
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("HeinzProviders.setOnlineAllowed(true)")
        page.reload()
        self.pick_engine(page, "custom")
        self.menu(page, "engine")
        page.fill("#prov-url", self.GOOGLE); page.dispatch_event("#prov-url", "change")
        page.wait_for_function("MODELS.length === 2")
        self.assertIn("Native Google list not readable", page.text_content("#eng-status"))

    def test_google_native_list_is_not_requested_while_online_is_off(self):
        page = self.new_page()
        g = FakeOpenAI(page, "https://generativelanguage.googleapis.com/**", native=self.NATIVE)
        page.goto(self.srv.base + "/chat.html")
        code = page.evaluate("""async () => { HeinzProviders.setCustomUrl('https://generativelanguage.googleapis.com/v1beta/openai'); try { await HeinzProviders.models('custom'); return 'sent'; } catch (e) { return e.code; } }""")
        self.assertEqual(code, "ONLINE_BLOCKED")
        self.assertEqual(g.native_calls, [])

    def test_gemini_38_flash_fast_stage_is_low_because_minimal_is_rejected(self):
        # Handytest 11.11.2026: HTTP 400 "Thinking level MINIMAL is not supported" bei gemini-3.8-flash
        page, g = self.google_page("models/gemini-3.8-flash")
        page.click("#think-fast")
        self.send(page, "Hi")
        self.assertEqual(g.requests[-1][1].get("reasoning_effort"), "low")
        # all Gemini 3 flash versions use low (the user's rule from 11.11.2026); flash-lite keeps its own rule
        for m in ("models/gemini-3-flash-preview", "models/gemini-3.5-flash", "models/gemini-3.7-flash"):
            page.evaluate("m => { settings.model = m; document.getElementById('model-select').value = m; }", m)
            self.assertEqual(page.evaluate("thinkRule().fast"), "low", m)
        page.evaluate("settings.model='models/gemini-3.1-flash-lite'; document.getElementById('model-select').value='models/gemini-3.1-flash-lite'")
        self.assertEqual(page.evaluate("thinkRule().fast"), "minimal", "counter test: flash-lite is not changed")

    def test_very_short_answers_show_no_speed(self):
        page, g = self.google_page("gemini-3-flash", chunks=("OK",), usage=False)
        self.send(page, "Hi")
        self.assertEqual(page.inner_text("#dash-speed"), "–")

    def test_export_contains_last_request_body_and_raw_usage_without_key(self):
        page, g = self.google_page("gemini-3-flash", reasoning=5)
        page.evaluate("HeinzProviders.setKey('custom', 'AIza-secret')")
        page.evaluate("document.getElementById('param-temp').value = 0.3; onSlider()")
        self.send(page, "Hi")
        txt = self.proto(page)
        self.assertIn("Last request (custom, HTTP 200)", txt)
        self.assertIn('"temperature":0.3', txt)
        self.assertIn('"reasoning_tokens":5', txt)
        self.assertIn("chunks 2", txt)
        self.assertNotIn("AIza", txt)
        self.assertNotIn("Hi", txt.split("Last request")[1].split("Last response")[0].replace("[", ""), "message text is not exported")

    def test_online_back_on_does_not_return_to_cloud_engine(self):
        # Entwicklerbeschluss 11.11.2026: Standard ist offline; nach Online aus und wieder an bleibt die lokale Engine
        page, g = self.google_page("gemini-3-flash")
        page.evaluate("var c=document.getElementById('online-on'); c.checked=false; c.dispatchEvent(new Event('change'))")
        self.assertEqual(page.evaluate("settings.provider"), "ollama")
        page.evaluate("var c=document.getElementById('online-on'); c.checked=true; c.dispatchEvent(new Event('change'))")
        page.wait_for_timeout(200)
        self.assertEqual(page.evaluate("settings.provider"), "ollama")

    def test_thinking_tokens_are_derived_from_total_when_not_reported_separately(self):
        # Handytest 11.11.2026: Google meldet total_tokens 5563 bei Prompt 78 und Ausgabe 165, aber keine reasoning_tokens
        page, g = self.google_page("gemini-3-flash", total=5000)
        self.send(page, "Hi")
        self.assertFalse(page.is_hidden("#m-think"))
        self.assertEqual(page.inner_text("#dash-think"), "~" + str(5000 - 21 - 7))
        self.assertEqual(page.inner_text("#dash-a-tok"), "7", "output stays as reported")
        self.assertIn("derived", self.proto(page))
        # counter test: total equals prompt + output, so no thinking tokens appear
        page2, _ = self.google_page("gemini-3-flash", total=28)
        self.send(page2, "Hi")
        self.assertTrue(page2.is_hidden("#m-think"))

    def test_every_answer_has_its_own_test_log_taken_at_send_time_and_copy_values_has_no_log(self):
        page, g = self.google_page("gemini-3-flash")
        page.evaluate("document.getElementById('param-temp').value = 0.3; onSlider()")
        self.send(page, "first")
        page.evaluate("document.getElementById('param-temp').value = 0.9; onSlider()")
        self.send(page, "second")
        self.assertIn("temperature 0.3", self.proto(page, 0), "older answer keeps the values it was sent with")
        self.assertIn("temperature 0.9", self.proto(page, 1))
        self.assertIn('"temperature":0.3', self.proto(page, 0))
        # the settings button no longer carries a log (counter test)
        txt = page.evaluate("paramsText()")
        self.assertNotIn("Last request", txt)
        self.assertNotIn("Capabilities", txt)
        self.assertIn("PARAMETER temperature 0.9", txt)

    def test_test_log_of_a_failed_request_contains_status_and_error(self):
        page, g = self.google_page("gemini-3-flash")
        g.status = 400
        self.send(page, "Hi")
        txt = self.proto(page)
        self.assertIn("HTTP 400", txt)
        self.assertIn("Error:", txt)

    def test_sliders_use_full_width_with_short_label_even_when_hints_are_shown(self):
        # Handytest 11.11.2026: Temperatur-Regler war winzig, weil der Hinweis zwischen Name und Regler lag
        page, g = self.google_page("gemini-3-flash")
        self.menu(page)
        page.evaluate("renderCaps()")
        self.assertIn("Recommended", page.text_content("#sc-temp .cap-row"))
        w = page.evaluate("['param-temp','param-topp','param-topk','param-ctx'].map(id => Math.round(document.getElementById(id).getBoundingClientRect().width))")
        self.assertTrue(all(x > 100 for x in w), w)
        self.assertLess(max(w) - min(w), 3, "all sliders are equally wide")
        r = page.evaluate("""() => { const c = document.getElementById('sc-temp'), s = c.querySelector('input').getBoundingClientRect(), n = c.querySelector('.cap-row').getBoundingClientRect(), b = c.querySelector('b').getBoundingClientRect(); return [s.top, n.top, b.right <= s.left + 1]; }""")
        self.assertGreater(r[1], r[0], "the note sits below the slider")
        self.assertTrue(r[2], "the name sits to the left of the slider")
        self.assertEqual(page.inner_text("#sc-temp b"), "T°")
        # counter test: same widths on Ollama (no notes)
        page.evaluate("switchProvider('ollama')"); page.wait_for_timeout(300)
        w2 = page.evaluate("['param-temp','param-topp','param-topk','param-ctx'].map(id => Math.round(document.getElementById(id).getBoundingClientRect().width))")
        self.assertLess(max(w2) - min(w2), 3)
        self.assertLess(abs(w2[0] - w[0]), 3)

    # ===== Google AI Studio, native route (provider "google") =====
    def gemini_page(self, model="models/gemini-3.8-flash", **fake):
        page = self.new_page()
        g = FakeGemini(page, **fake)
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("HeinzProviders.setOnlineAllowed(true); HeinzProviders.setKey('google', 'AIza-native')")
        page.reload()
        self.pick_engine(page, "google")
        page.wait_for_function("MODELS.length >= 1")
        page.evaluate("m => { document.getElementById('model-select').value = m; onModelChange(); }", model)
        page.wait_for_function("window.HeinzCaps && HeinzCaps.ready()")
        page.evaluate("renderCaps(); renderThink()")
        return page, g

    def test_native_google_sends_generation_config_with_top_k_and_key_only_in_header(self):
        page, g = self.gemini_page()
        self.assertEqual(page.evaluate("MODELS"), ["models/gemini-3.8-flash", "models/gemini-2.5-flash"], "embedding model filtered")
        page.evaluate("document.getElementById('param-temp').value = 0.4; onSlider()")
        self.send(page, "Hi there")
        url, hdr, body = g.requests[-1]
        self.assertIn("/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse", url)
        self.assertNotIn("AIza", url)
        self.assertEqual(hdr.get("x-goog-api-key"), "AIza-native")
        gc = body["generationConfig"]
        self.assertEqual(gc["temperature"], 0.4)
        self.assertNotIn("topK", gc, "top_k is measured without effect on gemini-3.8-flash: not sent")
        self.assertIn("topP", gc)
        for k in ("num_ctx", "num_thread", "max_tokens", "reasoning_effort", "messages", "stream"):
            self.assertNotIn(k, body)
            self.assertNotIn(k, gc)
        self.assertNotIn("thinkingConfig", gc, "thinking stays at the model default")
        self.assertEqual(body["contents"][-1], {"role": "user", "parts": [{"text": "Hi there"}]})
        self.assertIn("systemInstruction", body, "the system prompt goes to systemInstruction")
        self.assertEqual(page.inner_text(".msg-assistant"), "Hi there")
        self.assertEqual(self.external and [u for u in self.external if "AIza" in u], [])
        # counter test: Gemini 2.5 is not measured, top_k stays active and is sent
        page.evaluate("document.getElementById('model-select').value = 'models/gemini-2.5-flash'; onModelChange()")
        self.send(page, "again")
        self.assertIn("topK", g.requests[-1][2]["generationConfig"])

    def test_native_google_thinking_level_and_budget_never_both_and_real_thought_tokens(self):
        page, g = self.gemini_page(thoughts=40)
        page.click("#think-deep")
        self.send(page, "deep")
        gc = g.requests[-1][2]["generationConfig"]
        self.assertEqual(gc["thinkingConfig"], {"thinkingLevel": "high"})
        self.assertNotIn("reasoning_effort", g.requests[-1][2])
        self.assertEqual(page.inner_text("#dash-think"), "40", "real value, no tilde")
        self.assertEqual(page.inner_text("#dash-a-tok"), "7")
        # budget kind for Gemini 2.5 (counter test: not a level)
        page.evaluate("document.getElementById('model-select').value = 'models/gemini-2.5-flash'; onModelChange()")
        page.click("#think-fast")
        self.send(page, "fast")
        tc = g.requests[-1][2]["generationConfig"]["thinkingConfig"]
        self.assertEqual(list(tc), ["thinkingBudget"])
        self.assertIsInstance(tc["thinkingBudget"], int)

    def test_native_google_temperature_goes_up_to_two_while_local_engine_stays_at_one(self):
        page, g = self.gemini_page()
        self.assertEqual(page.evaluate("document.getElementById('param-temp').max"), "2")
        page.evaluate("document.getElementById('param-temp').value = 2; onSlider()")
        self.send(page, "hot")
        self.assertEqual(g.requests[-1][2]["generationConfig"]["temperature"], 2)
        # honest labels for the native route
        page.click("#think-deep")
        self.assertEqual(page.inner_text("#think-note"), "sends thinkingLevel high")
        self.assertIn("-> thinkingLevel high", page.evaluate("capsStates()"))
        self.assertNotIn("reasoning_effort", page.evaluate("capsStates()"))
        # counter test: the local engine keeps the old limit
        page2 = self.new_page(); FakeOllama(page2)
        page2.goto(self.srv.base + "/chat.html")
        self.assertEqual(page2.evaluate("document.getElementById('param-temp').max"), "1.0")

    # ---------- test series (docs/KONZEPT.md 21, lib/testreihe.js) ----------
    def series_open(self, page):
        self.menu(page, "series")
        page.wait_for_selector("#sr-start")

    def series_fill(self, page, **v):
        for k, val in v.items():
            page.fill("#sr-" + k, val)

    def test_series_logic_parses_lists_expands_cross_product_threads_outermost_and_splits_export(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.assertEqual(page.evaluate("HeinzSeries.parseList('0, 0.5; 1 x 1', 'float')"), [0, 0.5, 1])
        self.assertEqual(page.evaluate("HeinzSeries.parseList('2 4 4 abc', 'int')"), [2, 4])
        rows = page.evaluate("HeinzSeries.expand({ axes: { temperature: [0, 1], top_k: [1, 64], num_thread: [2, 4] }, reps: 2 })")
        self.assertEqual(len(rows), 16)
        self.assertEqual([r["params"]["num_thread"] for r in rows], [2] * 8 + [4] * 8, "threads change least often")
        self.assertEqual([r["rep"] for r in rows[:4]], [1, 2, 1, 2], "repetitions are innermost")
        self.assertEqual([r["n"] for r in rows], list(range(1, 17)))
        self.assertEqual(page.evaluate("HeinzSeries.count({ axes: { temperature: [0, 1, 2] }, reps: 4 })"), 12)
        self.assertEqual(page.evaluate("HeinzSeries.count({ axes: {}, reps: 1 })"), 1, "no axis = one run")
        # export: split into parts, every run in exactly one part, no key anywhere
        parts = page.evaluate("""() => {
            const runs = []; for (let i = 1; i <= 30; i++) runs.push({ n: i, row: i, rep: 1, params: { temperature: i }, answer: 'x'.repeat(500), stats: { outputTokens: 10 }, at: 'now' });
            return HeinzSeries.exportParts({ model: 'm', engine: 'e', prompt: 'p', axes: {}, planned: 30 }, runs, { maxChars: 4000 });
        }""")
        self.assertGreater(len(parts), 1)
        self.assertEqual(sum(p.count('"run":') for p in parts), 30)
        self.assertIn("[Part 1 of %d]" % len(parts), parts[0])
        self.assertTrue(all(len(p) < 4600 for p in parts), [len(p) for p in parts])

    def test_series_runs_the_matrix_without_system_prompt_and_history_and_exports_runs(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.series_open(page)
        self.series_fill(page, prompt="Name one animal.", temp="0, 1", topk="1, 64", reps="1", max="50")
        self.assertIn("Runs: 4", page.inner_text("#sr-plan"))
        page.click("#sr-start")
        page.wait_for_function("document.getElementById('sr-status').textContent.startsWith('Done')", timeout=30000)
        reqs = self.ollama.requests
        self.assertEqual(len(reqs), 4)
        for r in reqs:
            self.assertEqual([m["role"] for m in r["messages"]], ["user"], "no system prompt, no history")
            self.assertEqual(r["messages"][0]["content"], "Name one animal.")
            self.assertEqual(r["options"]["num_predict"], 50)
        got = sorted((r["options"]["temperature"], r["options"]["top_k"]) for r in reqs)
        self.assertEqual(got, [(0, 1), (0, 64), (1, 1), (1, 64)])
        self.assertEqual(page.evaluate("chatHistory.length"), 0)
        self.assertEqual(page.locator("#chat-box .msg-assistant").count(), 0, "the chat stays untouched")
        self.assertEqual(page.evaluate("document.getElementById('sr-prog-i').style.width"), "100%")
        self.assertEqual(page.locator("#sr-table tr").count(), 5)
        page.evaluate("window.copyText = function (t) { window.__sr = t; return Promise.resolve(); }")
        page.click("#sr-copies [data-sr-copy='0']")
        txt = page.evaluate("window.__sr")
        self.assertIn("# Heinz UI test series", txt)
        self.assertIn("model gemma2:2b", txt)
        self.assertIn("system prompt: none", txt)
        self.assertEqual(txt.count('"run":'), 4)
        self.assertIn('"answer":"Hello world"', txt)
        self.assertIn("Capabilities", txt)
        # survives a reload
        page.reload()
        self.series_open(page)
        self.assertEqual(page.locator("#sr-table tr").count(), 5)

    def test_series_threads_axis_outermost_and_too_many_runs_block_the_start(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.series_open(page)
        self.series_fill(page, temp="0, 1", thr="2, 4", reps="1")
        page.click("#sr-start")
        page.wait_for_function("document.getElementById('sr-status').textContent.startsWith('Done')", timeout=30000)
        self.assertEqual([r["options"]["num_thread"] for r in self.ollama.requests], [2, 2, 4, 4])
        # counter test: 31 runs are refused
        self.series_fill(page, temp="0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1", thr="2, 4", reps="2")
        self.assertIn("too many", page.inner_text("#sr-plan"))
        self.assertTrue(page.is_disabled("#sr-start"))
        self.series_fill(page, reps="1")
        self.assertFalse(page.is_disabled("#sr-start"))

    def test_series_refuses_values_outside_the_allowed_range_before_any_request(self):
        page, g = self.gemini_page()
        self.series_open(page)
        n0 = len(g.requests)
        self.series_fill(page, temp="0", topp="2")   # the typo from the phone test: 2 belongs to temperature
        self.assertIn("Top-p: 2", page.inner_text("#sr-plan"))
        self.assertTrue(page.is_disabled("#sr-start"))
        self.series_fill(page, topp="", temp="0, 2")
        self.assertFalse(page.is_disabled("#sr-start"), "temperature goes up to 2 on Gemini")
        self.series_fill(page, temp="0, 3")
        self.assertIn("T\u00b0: 3", page.inner_text("#sr-plan"))
        self.assertTrue(page.is_disabled("#sr-start"))
        page.evaluate("srStart()"); page.evaluate("srStart()")   # the second call would confirm the cloud question
        page.wait_for_timeout(1500)
        self.assertEqual(len(g.requests), n0, "no request with a bad value, even when start is forced")

    def test_series_checks_parse_and_evaluate_by_code_with_counter_cases(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        pp = page.evaluate("HeinzSeries.parsePrompts('How many? => number:16 | max:20\\n\\nSecond one')")
        self.assertEqual([q["id"] for q in pp["prompts"]], ["p1", "p2"])
        self.assertEqual([r["type"] for r in pp["prompts"][0]["rules"]], ["number", "max"])
        self.assertEqual(pp["prompts"][1]["rules"], [])
        self.assertEqual(pp["error"], "")
        self.assertEqual(page.evaluate("HeinzSeries.parsePrompts('a => foo:1').errorInfo.code"), "unknown")
        self.assertEqual(page.evaluate("HeinzSeries.parsePrompts('a => contains').errorInfo.code"), "value")
        self.assertEqual(page.evaluate("HeinzSeries.parsePrompts('a => regex:(').errorInfo.code"), "regex")
        self.assertEqual(page.evaluate("HeinzSeries.parsePrompts('a => max:abc').errorInfo.code"), "number")

        def ok(rule, answer, finish="stop"):
            return page.evaluate("([r, a, f]) => HeinzSeries.check(HeinzSeries.parsePrompts('x => ' + r).prompts[0].rules, { answer: a, finish: f }).every(c => c.ok)", [rule, answer, finish])
        self.assertTrue(ok("number:16", "There are 16 primes."))
        self.assertFalse(ok("number:16", "There are 116 primes."), "a number is a whole number, not a part of one")
        self.assertFalse(ok("number:16", "Not 160 but 17."))
        self.assertTrue(ok("number:16", "16."))
        self.assertTrue(ok("contains:Hello", "oh, hello you"))
        self.assertFalse(ok("contains:xyz", "hello"))
        self.assertTrue(ok("not:xyz", "hello"))
        self.assertFalse(ok("not:hello", "Hello"))
        self.assertTrue(ok("json", '```json\n{"a": 1}\n```'))
        self.assertFalse(ok("json", "no json here"))
        self.assertTrue(ok("regex:^ok", "OK, fine"))
        self.assertFalse(ok("regex:^ok", "not ok"))
        self.assertTrue(ok("max:5", "abc"))
        self.assertFalse(ok("max:5", "abcdef"))
        self.assertFalse(ok("min:5", "abc"))
        self.assertTrue(ok("stop", "x", "stop"))
        self.assertFalse(ok("stop", "x", "length"))

    def test_series_runs_several_prompts_with_checks_and_reports_pass_and_fail(self):
        page = self.new_page(chunks=("Hello", " world"))
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.series_open(page)
        page.fill("#sr-prompt", "Say hello. => contains:hello | not:bye\nSay xyz. => contains:xyz | max:5\nPlain prompt without checks")
        self.assertIn("Runs: 3", page.inner_text("#sr-plan"))
        page.click("#sr-start")
        page.wait_for_function("document.getElementById('sr-status').textContent.startsWith('Done')", timeout=30000)
        self.assertEqual([r["messages"][0]["content"] for r in self.ollama.requests], ["Say hello.", "Say xyz.", "Plain prompt without checks"])
        self.assertIn("Checks: 1 of 2 runs passed.", page.inner_text("#sr-status"), "the prompt without checks is not counted")
        cells = page.eval_on_selector_all("#sr-table tr td:last-child", "els => els.map(e => e.textContent)")
        self.assertEqual(cells, ["\u2713", "fail", "\u2713"])
        page.evaluate("window.copyText = function (t) { window.__sr = t; return Promise.resolve(); }")
        page.click("#sr-copies [data-sr-copy='0']")
        txt = page.evaluate("window.__sr")
        self.assertIn("p2: Say xyz. => contains:xyz | max:5", txt)
        self.assertIn("checks: 1 of 2 runs passed all checks", txt)
        self.assertIn('"prompt":"p2"', txt)
        self.assertIn('"pass":false', txt)
        self.assertIn('"why":"text not found"', txt)
        self.assertIn('"pass":true', txt)
        # a bad rule blocks the start and nothing is sent
        n = len(self.ollama.requests)
        page.fill("#sr-prompt", "Say hello. => nonsense:1")
        self.assertIn("Unknown check", page.inner_text("#sr-plan"))
        self.assertTrue(page.is_disabled("#sr-start"))
        page.evaluate("srStart()")
        page.wait_for_timeout(500)
        self.assertEqual(len(self.ollama.requests), n)

    def test_series_after_reload_shows_no_running_bar_but_keeps_every_finished_run(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.series_open(page)
        self.series_fill(page, temp=", ".join(str(i / 20) for i in range(20)))
        page.click("#sr-start")
        page.wait_for_function("srRuns.length >= 2")
        saved = page.evaluate("JSON.parse(localStorage.getItem('heinz_series'))")   # still running: every finished run is already saved
        self.assertTrue(saved["unfinished"])
        self.assertGreaterEqual(len(saved["runs"]), 2)
        page.reload()   # the run is gone with the page; the saved rest must not look like a running test
        self.series_open(page)
        self.assertEqual(page.evaluate("document.getElementById('sr-prog-i').style.width"), "0px")
        self.assertIn("Nothing is running", page.inner_text("#sr-status"))
        self.assertIn("interrupted", page.inner_text("#sr-status"))
        self.assertTrue(page.is_visible("#sr-start"))
        self.assertFalse(page.is_visible("#sr-stop"))
        self.assertIn("app closed or page reloaded", page.evaluate("srExportParts().join('\\n')"), "the export says that the series was cut")
        # a series that ended normally is saved as finished
        self.series_fill(page, temp="0, 1")
        page.click("#sr-start")
        page.wait_for_function("document.getElementById('sr-status').textContent.startsWith('Done')", timeout=30000)
        self.assertFalse(page.evaluate("JSON.parse(localStorage.getItem('heinz_series')).unfinished"))
        self.assertEqual(page.evaluate("document.getElementById('sr-prog-i').style.width"), "100%", "a complete series shows a full bar")

    def test_series_estimate_uses_history_per_thinking_level_and_defaults_without(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        rows = "[{params:{think:'fast'}},{params:{think:'deep'}},{params:{think:'deep'}}]"
        hist = "[{params:{think:'fast'},totalMs:2000},{params:{think:'deep'},totalMs:10000},{params:{think:'deep'},totalMs:20000},{params:{think:'deep'},totalMs:99000,error:'x'},{params:{think:'fast'},totalMs:99000,aborted:true}]"
        r = page.evaluate("HeinzSeries.estimateSec(" + rows + "," + hist + ",{local:true})")
        self.assertAlmostEqual(r["sec"], 2 + 15 + 15, places=3, msg="mean per level; errors and aborted runs do not count")
        self.assertTrue(r["fromHistory"])
        r = page.evaluate("HeinzSeries.estimateSec(" + rows + ",[],{local:true})")   # counter case: no history
        self.assertAlmostEqual(r["sec"], 4 + 12 + 12, places=3)
        self.assertFalse(r["fromHistory"])
        r = page.evaluate("HeinzSeries.estimateSec(" + rows + "," + hist + ",{cloud:true})")
        self.assertAlmostEqual(r["sec"], 32 + 3 * 1.2, places=3, msg="cloud adds the pause between runs")

    def test_series_resume_runs_only_the_missing_runs_after_stop_and_after_reload(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.series_open(page)
        self.assertFalse(page.is_visible("#sr-resume"), "nothing to resume yet")
        self.series_fill(page, temp=", ".join(str(i / 20) for i in range(20)))
        page.click("#sr-start")
        page.wait_for_function("srRuns.length >= 2")
        page.click("#sr-stop")
        page.wait_for_function("document.getElementById('sr-status').textContent.startsWith('Stopped.')", timeout=30000)
        self.assertTrue(page.is_visible("#sr-resume"))
        self.assertRegex(page.inner_text("#sr-resume"), r"Resume \(\d+ open\)")
        page.reload()   # also works after the page was closed: spec and fixed values are saved with the series
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.series_open(page)
        self.assertTrue(page.is_visible("#sr-resume"))
        page.fill("#sr-temp", "1")   # changed form must not change the resumed series
        before = len(self.ollama.requests)
        kept = page.evaluate("srRuns.filter(r => !r.aborted && !r.error).length")
        page.click("#sr-resume")
        page.wait_for_function("document.getElementById('sr-status').textContent.startsWith('Done')", timeout=30000)
        self.assertEqual(len(self.ollama.requests) - before, 20 - kept, "only the open runs are requested")
        self.assertEqual(page.evaluate("srRuns.map(r => r.n)"), list(range(1, 21)), "no duplicates, no gaps")
        self.assertTrue(page.evaluate("srRuns.every(r => !r.aborted && !r.error)"))
        self.assertEqual(page.evaluate("srRuns.map(r => r.params.temperature)"), [i / 20 for i in range(20)])
        self.assertFalse(page.is_visible("#sr-resume"), "complete series: nothing left")
        self.assertEqual(page.evaluate("srMeta.stopped"), "")

    def test_series_resume_is_hidden_when_the_model_was_changed(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.series_open(page)
        self.series_fill(page, temp=", ".join(str(i / 20) for i in range(20)))
        page.click("#sr-start")
        page.wait_for_function("srRuns.length >= 1")
        page.click("#sr-stop")
        page.wait_for_function("document.getElementById('sr-status').textContent.startsWith('Stopped.')", timeout=30000)
        self.assertTrue(page.is_visible("#sr-resume"))
        other = page.evaluate("[...document.querySelectorAll('#model-select option')].map(o => o.value).find(v => v !== srMeta.model)")
        page.evaluate("(m) => { const e = document.getElementById('model-select'); e.value = m; e.dispatchEvent(new Event('change')); srRender(); srResumeBtn(); }", other)
        self.assertFalse(page.is_visible("#sr-resume"), "another model: results would be mixed")

    def test_series_start_and_stop_do_not_wait_for_a_hanging_wake_lock(self):
        page = self.new_page()
        # a wake lock that never answers (seen as a risk on the phone): the series must run and stop anyway
        page.add_init_script("Object.defineProperty(navigator, 'wakeLock', { value: { request: () => new Promise(() => {}) } })")
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.series_open(page)
        self.series_fill(page, temp="0, 1")
        page.click("#sr-start")
        page.wait_for_function("document.getElementById('sr-status').textContent.startsWith('Done')", timeout=30000)
        self.assertEqual(len(self.ollama.requests), 2)
        # stop between two runs: the loop checks the signal itself
        self.series_fill(page, temp="0, 0.2, 0.4, 0.6, 0.8, 1", reps="2")
        page.click("#sr-start")
        page.wait_for_function("srRuns.length >= 1")
        page.click("#sr-stop")
        page.wait_for_function("document.getElementById('sr-status').textContent.startsWith('Stopped.')", timeout=30000)
        self.assertTrue(page.evaluate("!seriesRunning"))
        self.assertTrue(page.is_visible("#sr-start"))

    def test_series_can_be_stopped_and_stops_after_three_errors_in_a_row(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.series_open(page)
        self.series_fill(page, temp="0, 0.5, 1", topk="1, 2, 3", reps="1")
        self.ollama.status = 500
        page.click("#sr-start")
        page.wait_for_function("document.getElementById('sr-status').textContent.startsWith('Stopped after three errors')", timeout=30000)
        self.assertEqual(len(self.ollama.requests), 3)
        self.assertIn("three errors in a row", page.evaluate("srMeta.stopped"))
        self.assertEqual(page.eval_on_selector_all("#sr-table tr td:last-child", "els => els.map(e => e.textContent)"), ["\u2715"] * 3)
        # stop by the user (slow answers are not simulated: stop right after the first run)
        self.ollama.status = 200
        page.click("#sr-start")
        page.wait_for_function("srRuns.length >= 1")
        page.click("#sr-stop")
        page.wait_for_function("document.getElementById('sr-status').textContent.startsWith('Stopped.')", timeout=30000)
        self.assertEqual(page.evaluate("srMeta.stopped"), "by user")
        self.assertIn('"aborted":true', page.evaluate("srExportParts().join('\\n')"), "an interrupted run is marked, not shown as ok")
        self.assertEqual(page.eval_on_selector_all("#sr-table tr td:last-child", "els => els.map(e => e.textContent)")[-1], "\u2013")
        self.assertLess(page.evaluate("srRuns.length"), 9)

    def test_series_native_google_sends_thinking_levels_greys_out_top_k_and_asks_before_cloud_requests(self):
        page, g = self.gemini_page()
        self.series_open(page)
        self.assertTrue(page.is_disabled("#sr-topk"), "top_k is measured without effect on gemini-3.8-flash: locked")
        self.assertFalse(page.is_hidden("#sr-think-box"))
        self.assertTrue(page.is_hidden("#sr-thr-box"), "threads are an Ollama setting")
        self.series_fill(page, temp="1, 2", max="40")
        page.evaluate("document.getElementById('sr-topk').value = '5'")   # typed before the lock: must still not be sent
        page.click("#sr-think label:has(input[value=fast])"); page.click("#sr-think label:has(input[value=deep])")
        self.assertIn("Runs: 4", page.inner_text("#sr-plan"))
        n0 = len(g.requests)
        page.click("#sr-start")
        self.assertEqual(len(g.requests), n0, "the first tap only asks")
        self.assertIn("4 requests", page.inner_text("#sr-status"))
        page.click("#sr-start")
        page.wait_for_function("document.getElementById('sr-status').textContent.startsWith('Done')", timeout=30000)
        gcs = [r[2]["generationConfig"] for r in g.requests[n0:]]
        self.assertEqual(len(gcs), 4)
        self.assertEqual(sorted((c["thinkingConfig"]["thinkingLevel"], c["temperature"]) for c in gcs), [("high", 1), ("high", 2), ("low", 1), ("low", 2)])
        for c in gcs:
            self.assertNotIn("topK", c, "locked parameter is never sent, even when typed")
            self.assertEqual(c["maxOutputTokens"], 40)
        for r in g.requests[n0:]:
            self.assertEqual(len(r[2]["contents"]), 1)
        self.assertNotIn("top_k", page.evaluate("srMeta.axes"), "a locked parameter is not part of the matrix")
        txt = page.evaluate("srExportParts().join('\\n')")
        self.assertNotIn("AIza", txt)
        self.assertIn("thinkingLevel", txt)
        # online off: no request
        n1 = len(g.requests)
        page.evaluate("var c=document.getElementById('online-on'); c.checked=false; c.dispatchEvent(new Event('change'))")
        self.assertEqual(len(g.requests), n1)

    def test_native_google_length_cut_and_error_are_reported_and_online_off_sends_nothing(self):
        page, g = self.gemini_page(chunks=("Ye",), finish="MAX_TOKENS")
        page.fill("#query", "Hi"); page.click("#send-btn")
        page.wait_for_function("document.querySelector('.msg-assistant') && document.querySelector('.msg-assistant').innerText.includes('cut off')")
        self.assertIn("finish length", self.proto(page))
        g.status = 400
        self.send(page, "again")
        self.assertIn("HTTP 400", page.inner_text(".msg-assistant:last-of-type"))
        self.assertNotIn("AIza", self.proto(page))
        # online off: nothing is requested any more
        n = len(g.requests)
        page.evaluate("var c=document.getElementById('online-on'); c.checked=false; c.dispatchEvent(new Event('change'))")
        self.assertEqual(page.evaluate("settings.provider"), "ollama")
        code = page.evaluate("""async () => { try { await HeinzProviders.chat('google', {model:'x', messages:[{role:'user',content:'hi'}]}); return 'sent'; } catch (e) { return e.code; } }""")
        self.assertEqual(code, "ONLINE_BLOCKED")
        self.assertEqual(len(g.requests), n)

    def test_native_google_cells_differ_from_compatible_route_and_penalties_stay_blocked_on_gemini_3(self):
        page, g = self.gemini_page()
        self.assertEqual(page.evaluate("HeinzCaps.engineFor('google', 'https://generativelanguage.googleapis.com/v1beta')"), "google")
        self.assertEqual(page.evaluate("HeinzCaps.engineFor('custom', 'https://generativelanguage.googleapis.com/v1beta/openai')"), "gemini-compat", "compatible route unchanged")
        self.assertEqual(page.evaluate("HeinzCaps.cell('google', 'https://generativelanguage.googleapis.com/v1beta', 'models/gemini-3.8-flash', 'frequency_penalty').state"), "error", "model rules are shared")
        self.assertEqual(page.evaluate("HeinzCaps.cell('google', 'https://generativelanguage.googleapis.com/v1beta', 'models/gemini-2.5-flash', 'frequency_penalty').state"), "unknown")
        self.assertEqual(page.evaluate("HeinzCaps.cell('google', 'https://generativelanguage.googleapis.com/v1beta', 'models/gemini-3.8-flash', 'top_k').state"), "off", "measured 11.11.2026")
        self.assertEqual(page.evaluate("document.getElementById('sc-topk').dataset.capState"), "off")
        self.assertTrue(page.evaluate("document.getElementById('sc-topk').classList.contains('cap-blocked')"))
        self.assertEqual(page.evaluate("document.getElementById('sc-ctx').dataset.capState"), "fixed")
        txt = None
        self.send(page, "Hi")
        txt = self.proto(page)
        self.assertIn("Last request (google, HTTP 200)", txt)
        self.assertIn('"generationConfig"', txt)
        self.assertIn("[1 contents]", txt)
        self.assertIn("[system]", txt)
        self.assertNotIn("Hi", txt.split("Last request")[1].split("Last response")[0])

    def test_model_list_only_newest_request_counts_and_shows_progress(self):
        # Handytest 10.11.2026: Modellliste mal 5, mal 15 Einträge – ein älterer, langsamerer Abruf überschrieb den neueren.
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("""() => {
            window.__res = [];
            HeinzProviders.models = () => new Promise(r => window.__res.push(r));
            settings.provider = 'litert';
            window.__a = loadModels();
            window.__b = loadModels();
        }""")
        self.assertIn("Loading", page.text_content("#eng-status"))
        page.evaluate("window.__res[1](['n1','n2','n3'])")      # newer request answers first
        page.evaluate("window.__res[0](['old'])")               # older, slower request answers last
        page.evaluate("Promise.all([window.__a, window.__b])")
        self.assertEqual(page.evaluate("MODELS"), ["n1", "n2", "n3"])
        self.assertIn("3", page.text_content("#eng-status"))

    def test_copy_whole_chat_labels_follow_language(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Hi")
        page.evaluate("window.copyText = function (t) { window.__copied = t; return Promise.resolve(); }")
        page.click("button[onclick^='copyWholeChat']")
        self.assertTrue(page.evaluate("window.__copied").startswith("You:\nHi"))
        page.click("#lang-btn")
        page.click("button[onclick^='copyWholeChat']")
        self.assertTrue(page.evaluate("window.__copied").startswith("Du:\nHi"))

    def test_tap_outside_closes_menu_values_stay_and_reload_keeps_chat(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Hi")
        page.click(".burger-btn")
        self.assertTrue(page.evaluate("document.getElementById('menu-sheet').classList.contains('open')"))
        page.evaluate("var e=document.getElementById('param-threads'); e.value=3; e.dispatchEvent(new Event('input'))")
        # tap on the dimmed area above the sheet: the menu closes, the setting is already applied
        page.mouse.click(200, 40)
        page.wait_for_function("!document.getElementById('menu-sheet').classList.contains('open')")
        self.send(page, "Again")
        self.assertEqual(self.ollama.requests[-1]["options"]["num_thread"], 3)
        # taps inside the sheet do not close it
        page.click(".burger-btn")
        page.click("#menu-sheet .caps.grp >> nth=0")
        self.assertTrue(page.evaluate("document.getElementById('menu-sheet').classList.contains('open')"))
        # reload entry: chat and thread setting survive
        page.click("#q-reload")
        page.wait_for_selector(".msg-assistant")
        self.assertEqual(page.locator(".msg-user").count(), 2)
        self.assertEqual(page.input_value("#param-threads"), "3")
        self.assertEqual(self.errors, [])

    def test_new_chat_button_and_copy_button_sit_in_the_chat_bar(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Hi")
        self.assertEqual(page.locator("button[onclick='newChat(true)'] svg").count(), 1, "line icon, not an emoji")
        bar = page.locator(".bar").bounding_box()
        box = page.locator("#chat-container").bounding_box()
        for sel in (".chat-copy", ".new-btn", "#chats-open"):
            b = page.locator(sel).bounding_box()
            self.assertLessEqual(b["y"] + b["height"], box["y"] + 1, sel + " sits above the chat window")
            self.assertGreaterEqual(b["y"], bar["y"] - 1)
        self.assertEqual(page.inner_text("#chat-title"), "Hi", "chat bar shows the title of the chat")
        self.assertEqual(page.locator("button[onclick^='copyWholeChat']").count(), 1)
        page.click("button[onclick='newChat(true)']")
        self.assertEqual(page.locator(".msg-user").count(), 0)
        self.assertEqual(len(json.loads(page.evaluate("localStorage.getItem('heinz_chats')"))), 1, "old chat is saved in the list")
        self.assertEqual(page.inner_text("#dash-start"), "0.0")
        self.assertEqual(page.inner_text("#chats-count"), "1", "counter on the chats button")

    def test_model_chip_is_a_pixel_display_with_token_pulse(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.assertGreater(page.evaluate("document.querySelector('#chip-led').width"), 150)
        self.assertGreater(page.evaluate("chipPx.buf.filter(Boolean).length"), 80, "mode, engine and model are drawn")
        self.assertEqual(page.inner_text("#chip-model"), "gemma2:2b")
        self.send(page, "Hi there")
        self.assertGreater(page.evaluate("pulse.e"), -1)
        self.assertEqual(self.errors, [])

    def test_speed_test_runs_threads_cold_and_warm_and_copies_table(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        self.menu(page, "speed")
        page.evaluate("var e=document.getElementById('param-threads'); e.value=3; e.dispatchEvent(new Event('input'))")
        page.evaluate("document.querySelectorAll('#st-threads input').forEach(i => i.checked = ['2','4'].includes(i.value))")
        page.uncheck("#st-termux")
        page.click("#st-start")
        self.assertEqual(page.locator("#st-bars .st-card").count(), 2, "cards for all planned thread counts exist from the start")
        self.assertEqual(page.locator("#st-bars .st-bar").count(), 4)
        page.wait_for_selector("#st-bars .st-bar.act, #st-bars .st-bar.done", timeout=10000)
        page.wait_for_function("document.getElementById('st-status').textContent.startsWith('Done')", timeout=20000)
        self.assertEqual(page.locator("#st-bars .st-bar.done").count(), 4)
        self.assertEqual(page.evaluate("document.getElementById('st-prog-i').style.width"), "100%")
        rows = page.eval_on_selector_all("#st-table tr:not(:first-child)", "trs => trs.map(t => Array.from(t.cells).map(c => c.textContent))")
        self.assertEqual([r[:2] for r in rows], [["2", "1"], ["2", "2"], ["4", "1"], ["4", "2"]])
        self.assertEqual(rows[0][2], "5.0", "run 1 after unload shows the load time")
        self.assertEqual(rows[1][2], "0.1", "run 2 is warm")
        self.assertEqual(rows[0][4:6], ["0.5", "50.0"], "run 1: prompt seconds and prompt speed")
        self.assertEqual(rows[1][4:6], ["0.5", "–"], "run 2: prompt speed is not shown (cached prefix would inflate it)")
        self.assertEqual(rows[1][6], "5.0", "2 threads = 5 tokens/s in the simulation")
        self.assertEqual(rows[3][6], "10.0")
        self.assertEqual(page.inner_text("#st-best"), "Best: 4 threads (10.0 tokens/s)")
        self.assertEqual(len(self.ollama.unloads), 2, "model unloaded before each thread value")
        self.assertTrue(all(u["keep_alive"] == 0 for u in self.ollama.unloads))
        reqs = [r for r in self.ollama.requests if r.get("stream") is False]
        self.assertEqual([r["options"]["num_thread"] for r in reqs], [2, 2, 4, 4])
        for r in reqs:
            self.assertEqual((r["options"]["temperature"], r["options"]["num_predict"], r["options"]["seed"]), (0, 32, 1))
            self.assertEqual([m["role"] for m in r["messages"]], ["user"])
        self.assertNotEqual(reqs[0]["messages"][0]["content"], reqs[1]["messages"][0]["content"], "random tag defeats the prompt cache")
        page.evaluate("window.copyText = function (t) { window.__copied = t; return Promise.resolve(); }")
        page.click("#st-copy")
        text = page.evaluate("window.__copied")
        self.assertTrue(text.startswith("Heinz UI speed test |"))
        self.assertIn("Termux hidden", text)
        self.assertIn("4 | 2 | 0.1 | 25 | 0.5 | - | 10.0", text)
        self.assertIn("Best: 4 threads (10.0 tokens/s)", text)
        # take over the best value for the tested model
        self.assertEqual(page.input_value("#param-threads"), "3")
        page.click("#st-apply")
        self.assertEqual(page.input_value("#param-threads"), "4")
        self.assertEqual(json.loads(page.evaluate("localStorage.getItem('heinz_settings')"))["threads"]["gemma2:2b"], 4)
        # last result is restored after a reload
        page.reload()
        self.assertEqual(page.locator("#st-table tr").count(), 5)
        self.assertGreaterEqual(page.locator("#st-bars .st-card").count(), 1)
        self.assertGreaterEqual(page.locator("#st-bars .st-bar").count(), 2)
        self.assertEqual(self.errors, [])

    def test_speed_test_needs_a_thread_value_and_can_be_stopped(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.menu(page, "speed")
        page.evaluate("document.querySelectorAll('#st-threads input').forEach(i => i.checked = false)")
        page.click("#st-start")
        self.assertIn("at least one", page.inner_text("#st-status"))
        self.assertEqual(len(self.ollama.requests), 0)

    def test_update_button_reports_states_and_reloads_after_update(self):
        page = self.new_page()
        calls = []
        answers = [
            (200, {"ok": True, "changed": False, "files": [], "restarting": False, "from": "abc1234", "to": "abc1234"}),
            (409, {"ok": False, "error": "git pull failed", "output": "Could not resolve host"}),
            (200, {"ok": True, "changed": True, "files": ["chat.html"], "restarting": False, "from": "abc1234", "to": "def5678"}),
        ]
        def handle(route):
            calls.append((route.request.method, route.request.headers.get("x-heinz")))
            code, body = answers[len(calls) - 1]
            route.fulfill(status=code, content_type="application/json", body=json.dumps(body))
        page.route("**/api/update", handle)
        page.route("**/api/ping", lambda route: route.fulfill(status=200, content_type="application/json",
                   body=json.dumps({"ok": True, "version": "1", "app": {"version": "1.0", "commit": "abc1234", "date": "2026-11-09"}})))
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Hi")
        self.menu(page, "update")
        page.wait_for_function("document.getElementById('upd-ver').textContent.includes('abc1234')")
        self.assertEqual(page.inner_text("#upd-ver"), "v1.0 · abc1234 · 2026-11-09", "pill shows version, commit and date")
        self.assertIn("abc1234", page.text_content("#menu-ver"), "version is also the subtitle of the menu entry")
        page.click("#upd-btn")
        page.wait_for_function("document.getElementById('upd-status').textContent.includes('up to date')")
        self.assertIn("(abc1234)", page.inner_text("#upd-status"))
        page.click("#upd-btn")
        page.wait_for_function("document.getElementById('upd-status').textContent.includes('Could not resolve host')")
        self.assertFalse(page.is_disabled("#upd-btn"), "button usable again after an error")
        with page.expect_navigation():
            page.click("#upd-btn")
        self.assertEqual(calls, [("POST", "1")] * 3)
        self.assertEqual(page.locator(".msg-user").count(), 1, "chat survives the reload")
        self.assertEqual(self.errors, [])

    def test_pull_to_refresh_is_disabled(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.assertEqual(page.evaluate("getComputedStyle(document.body).overscrollBehaviorY"), "none")
        self.assertEqual(page.evaluate("getComputedStyle(document.documentElement).overscrollBehaviorY"), "none")

    # ---- Design-Strang: neues Layout, Themes, Bausteine ----
    def test_header_has_ring_model_chip_language_toggle_and_burger_in_one_row(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        boxes = {k: page.locator(sel).bounding_box() for k, sel in
                 (("ring", "#status-dot"), ("chip", "#model-chip"), ("lang", "#lang-btn"), ("burger", ".burger-btn"))}
        ys = [b["y"] + b["height"] / 2 for b in boxes.values()]
        self.assertLess(max(ys) - min(ys), 12, "one row")
        self.assertGreaterEqual(boxes["ring"]["width"], 50, "big round status ring")
        for b in boxes.values():
            self.assertLessEqual(b["x"] + b["width"], VIEWPORT["width"], "nothing is cut off at the right edge")
        self.assertIn("OLLAMA", page.inner_text("#chip-engine").upper())
        self.assertEqual(page.inner_text("#chip-model"), "gemma2:2b")
        self.assertEqual(page.get_attribute("#ring-logo", "aria-label"), "Heinz UI")
        self.assertEqual(self.errors, [])

    def test_model_picker_lists_models_without_emoji_and_selects(self):
        page = self.new_page(tags=("qwen2.5:3b", "heinz-fakt:latest", "gemma2:2b"))
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        page.click("#model-chip")
        self.assertTrue(page.is_visible("#model-sheet"))
        rows = page.eval_on_selector_all("#model-list .mrow", "els => els.map(e => e.dataset.model)")
        self.assertEqual(sorted(rows), ["gemma2:2b", "heinz-fakt:latest", "qwen2.5:3b"])
        self.assertNotIn("🧠", page.inner_text("#model-sheet"))
        self.assertNotIn("🧠", page.eval_on_selector_all("#model-select option", "els => els.map(e => e.textContent).join()"))
        self.assertEqual(page.locator("#model-list .mrow.on").count(), 1, "the current model is marked")
        self.assertEqual(page.inner_text("#model-sheet .mrow.on b"), "gemma2")
        page.click('#model-list [data-model="qwen2.5:3b"]')
        self.assertFalse(page.evaluate("document.getElementById('model-sheet').classList.contains('open')"), "sheet closes after the choice")
        self.assertEqual(page.inner_text("#chip-model"), "qwen2.5:3b")
        self.assertEqual(page.evaluate("settings.model"), "qwen2.5:3b")

    def test_metric_chips_stay_on_one_line_and_prompt_grows(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Hi")
        tops = page.eval_on_selector_all("#dashboard .m:not([hidden])", "els => els.map(e => Math.round(e.getBoundingClientRect().top))")
        self.assertEqual(len(tops), 4)
        self.assertEqual(len(set(tops)), 1, "four chips on one line")
        ws = page.eval_on_selector_all("#dashboard .m:not([hidden])", "els => els.map(e => e.scrollWidth <= e.clientWidth)")
        self.assertTrue(all(ws), "no text overflows its chip")
        h1 = page.locator("#query").bounding_box()["height"]
        page.fill("#query", "\n".join(["line %d" % i for i in range(30)]))
        h2 = page.locator("#query").bounding_box()["height"]
        self.assertGreater(h2, h1 + 40, "the prompt field grows while typing")
        self.assertLessEqual(h2, VIEWPORT["height"] * 0.4 + 2, "... up to 40 percent of the screen")
        self.assertGreater(page.evaluate("document.getElementById('query').scrollHeight"), h2 - 1, "then it scrolls inside")
        page.click("#prompt-wrap .xp")
        self.assertTrue(page.evaluate("document.getElementById('prompt-wrap').classList.contains('full')"))
        self.assertGreater(page.locator("#query").bounding_box()["height"], VIEWPORT["height"] * 0.6, "full screen editor")
        page.click("#prompt-wrap .xp")
        self.assertFalse(page.evaluate("document.getElementById('prompt-wrap').classList.contains('full')"))

    def test_context_card_sits_below_the_prompt_and_only_exists_in_modes_with_context(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.assertFalse(page.is_visible("#context-wrapper"), "Wilson has no context")
        page.click("#mode-bar [data-mode=audit]")
        self.assertTrue(page.is_visible("#context-wrapper"))
        q, c = page.locator("#query").bounding_box(), page.locator("#context").bounding_box()
        self.assertGreater(c["y"], q["y"] + q["height"], "context below the prompt, never above")
        self.assertIn("REQUIRED", page.inner_text("#ctx-label").upper())
        page.fill("#context", "abc")
        self.assertIn("3", page.inner_text("#ctx-count"))
        page.click("#context-wrapper .ctx-h button")
        self.assertTrue(page.evaluate("document.getElementById('context-wrapper').classList.contains('full')"))
        page.click("#context-wrapper .ctx-h button")
        page.click("#mode-bar [data-mode=code]")
        self.assertIn("OPTIONAL", page.inner_text("#ctx-label").upper())
        # empty required context: warning instead of sending
        page.click("#mode-bar [data-mode=audit]")
        page.fill("#context", ""); page.fill("#query", "Check")
        page.click("#send-btn")
        self.assertEqual(len(self.ollama.requests), 0)
        self.assertTrue(page.evaluate("document.getElementById('context').classList.contains('req-warn')"))

    def test_mode_colour_is_the_one_accent_of_the_page(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        acc = lambda: page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--acc').trim()")
        self.assertEqual(acc(), "#00acc1")
        page.click("#mode-bar [data-mode=creative]")
        self.assertEqual(acc(), "#b184ec")
        self.assertEqual(page.evaluate("getComputedStyle(document.getElementById('send-btn')).backgroundColor"), "rgb(177, 132, 236)")
        page.click("#mode-bar [data-mode=audit]")
        self.assertEqual(page.evaluate("getComputedStyle(document.getElementById('send-btn')).color"), "rgb(28, 26, 20)", "dark arrow on the sand-gold audit button")

    def test_theme_light_dark_auto_persists_and_menu_shows_it(self):
        ctx = self.browser.new_context(viewport=VIEWPORT, color_scheme="dark")
        page = ctx.new_page()
        self.addCleanup(ctx.close)
        self.errors = []
        page.on("pageerror", lambda e: self.errors.append(str(e)))
        FakeOllama(page)
        page.route("**/127.0.0.1:9379/**", lambda route: route.abort())
        page.goto(self.srv.base + "/chat.html")
        bg = lambda: page.evaluate("getComputedStyle(document.body).backgroundColor")
        self.assertEqual(page.evaluate("document.documentElement.dataset.theme"), "auto")
        self.assertEqual(bg(), "rgb(0, 0, 0)", "auto follows the system: dark here")
        self.menu(page, "look")
        page.click("#th-lt")
        self.assertEqual(page.evaluate("document.documentElement.dataset.theme"), "lt")
        self.assertEqual(bg(), "rgb(244, 246, 248)")
        self.assertEqual(json.loads(page.evaluate("localStorage.getItem('heinz_settings')"))["theme"], "lt")
        self.assertTrue(page.evaluate("document.getElementById('th-lt').classList.contains('sel-on')"))
        page.reload()
        self.assertEqual(bg(), "rgb(244, 246, 248)", "theme survives a reload")
        page.goto(self.srv.base + "/")
        page.wait_for_selector("a.row[data-tool]")
        self.assertEqual(page.evaluate("document.documentElement.dataset.theme"), "lt", "the hub uses the same theme")
        page.evaluate("Heinz.setTheme('dk')")
        self.assertEqual(bg(), "rgb(0, 0, 0)")
        page.evaluate("Heinz.setTheme('auto')")
        self.assertEqual(self.errors, [])

    def test_auto_theme_follows_system_light(self):
        ctx = self.browser.new_context(viewport=VIEWPORT, color_scheme="light")
        page = ctx.new_page()
        self.addCleanup(ctx.close)
        FakeOllama(page)
        page.goto(self.srv.base + "/chat.html")
        self.assertEqual(page.evaluate("getComputedStyle(document.body).backgroundColor"), "rgb(244, 246, 248)")
        self.assertEqual(page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--ol').trim()"), "transparent", "light: no outlines on controls")

    def test_menu_pages_back_arrow_and_groups(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.click(".burger-btn")
        self.assertEqual(page.inner_text("#sh-title"), "Settings")
        self.assertFalse(page.is_visible("#sh-back"))
        for sw in ("online-on", "modes-only", "fast-mode", "preload-on"):
            self.assertTrue(page.locator("#%s" % sw).count() == 1, sw)
        page.click("#menu-sheet [data-go=look]")
        self.assertFalse(page.is_visible("#online-on"), "sub page replaces the content of the sheet")
        page.click("#sh-back")
        self.assertEqual(page.inner_text("#sh-title"), "Settings")
        self.assertTrue(page.locator("#param-temp").count() == 1)
        page.keyboard.press("Escape")
        page.click("#lang-btn")
        page.click(".burger-btn")
        self.assertEqual(page.inner_text("#sh-title"), "Einstellungen", "menu follows the language")

    def test_language_switch_stays_in_the_chat_header_and_retries_in_the_other_language(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Hallo")
        page.click("#lang-btn")
        self.assertTrue(page.is_visible("#lang-btn"))
        self.send(page, "Hallo")
        self.assertIn("Antworte auf Deutsch.", self.ollama.requests[-1]["messages"][0]["content"])
        page.click("#lang-btn")
        self.send(page, "Hallo")
        self.assertIn("Respond in English.", self.ollama.requests[-1]["messages"][0]["content"])

    def test_chat_drawer_opens_from_the_left_filters_and_deletes(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Alpha question")
        page.click("button[onclick='newChat(true)']")
        self.send(page, "Beta question")
        page.click("button[onclick='newChat(true)']")
        page.click("#chats-open")
        self.assertLess(page.locator("#drawer").bounding_box()["x"], 1, "drawer comes in from the left edge")
        self.assertEqual(page.locator("#saved-list .saved-item").count(), 2)
        page.fill("#chat-search", "beta")
        self.assertEqual(page.locator("#saved-list .saved-item").count(), 1)
        page.fill("#chat-search", "")
        page.click("#saved-list .saved-item >> nth=0 >> .more")
        page.click("#saved-list .saved-item >> nth=0 >> .del")
        self.assertEqual(page.locator("#saved-list .saved-item").count(), 1)
        self.assertEqual(len(json.loads(page.evaluate("localStorage.getItem('heinz_chats')"))), 1)
        page.mouse.click(400, 300)   # scrim
        self.assertFalse(page.evaluate("document.getElementById('drawer').classList.contains('open')"))

    def test_read_aloud_button_turns_into_stop_reading(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Hi")
        self.assertIn("i-volume", page.get_attribute(".msg-read use", "href"))
        page.evaluate("updateReadBtn(true)")
        self.assertIn("i-stop", page.get_attribute(".msg-read use", "href"))
        page.evaluate("updateReadBtn(false)")
        self.assertIn("i-volume", page.get_attribute(".msg-read use", "href"))
        page.evaluate("setGenerating(true)")
        self.assertFalse(page.is_visible(".msg-assistant:last-child .msg-acts"), "actions appear only when the output is finished")
        self.assertIn("i-stop", page.get_attribute("#send-btn use", "href"), "stop replaces send while answering")
        page.evaluate("setGenerating(false)")
        self.assertIn("i-send", page.get_attribute("#send-btn use", "href"))

    def test_every_symbol_used_exists_in_the_sprite_and_no_emoji_icons_remain(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Hi")
        page.click("#chats-open"); page.keyboard.press("Escape")
        page.click("#model-chip"); page.keyboard.press("Escape")
        sprite = page.evaluate("fetch('lib/icons.svg').then(r => r.text())")
        import re
        have = set(re.findall(r'<symbol id="(i-[a-z0-9-]+)"', sprite))
        self.assertGreaterEqual(len(have), 40)
        used = set(h.split("#")[1] for h in page.eval_on_selector_all("use", "els => els.map(e => e.getAttribute('href'))"))
        self.assertTrue(used, "page uses symbols")
        self.assertEqual(used - have, set(), "every used symbol is drawn in lib/icons.svg")
        text = page.evaluate("document.body.innerText")
        for e in "🧠🏕🕵📄👨🎨⚙🔊🛑📋✅🎤💬💾🗑⏱":
            self.assertNotIn(e, text)

    def test_short_viewport_with_keyboard_gives_the_space_to_the_chat(self):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 400})
        page = ctx.new_page()
        self.addCleanup(ctx.close)
        FakeOllama(page)
        page.goto(self.srv.base + "/chat.html")
        page.click("#mode-bar [data-mode=audit]")
        page.focus("#query")
        page.wait_for_function("document.body.classList.contains('kbd')")
        self.assertFalse(page.is_visible("#mode-bar"))
        self.assertFalse(page.is_visible("#context-wrapper"))
        self.assertTrue(page.is_visible("#query"))
        page.wait_for_timeout(400)
        self.assertEqual(page.evaluate("document.querySelector('.top').getBoundingClientRect().height"), 0, "header slides away while typing")
        page.evaluate("document.activeElement.blur()")
        page.wait_for_function("!document.body.classList.contains('kbd')")
        self.assertTrue(page.is_visible("#mode-bar"))
        page.wait_for_timeout(400)
        self.assertGreater(page.evaluate("document.querySelector('.top').getBoundingClientRect().height"), 50, "header returns")

    def test_context_field_is_one_line_until_focused_and_telemetry_labels(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.click("#mode-bar [data-mode=audit]")
        h0 = page.evaluate("document.getElementById('context').getBoundingClientRect().height")
        self.assertLessEqual(h0, 28)
        page.focus("#context")
        page.wait_for_timeout(300)
        self.assertGreater(page.evaluate("document.getElementById('context').getBoundingClientRect().height"), 40)
        self.assertEqual(page.inner_text("#dashboard .m1 i"), "In")
        self.assertEqual(page.inner_text("#dashboard .m2 i"), "Out")

    def test_telemetry_colours_follow_performance_thresholds(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("document.getElementById('dash-speed').textContent='22.0'; document.getElementById('dash-start').textContent='12.0'; perfColors()")
        self.assertEqual(page.evaluate("document.getElementById('dash-speed').style.color"), "var(--green)")
        self.assertEqual(page.evaluate("document.getElementById('dash-start').style.color"), "var(--orange)")
        page.evaluate("document.getElementById('dash-speed').textContent='3.0'; perfColors()")
        self.assertEqual(page.evaluate("document.getElementById('dash-speed').style.color"), "var(--orange)")

    def test_hub_areas_switch_and_persist(self):
        page = self.new_page()
        page.goto(self.srv.base + "/")
        page.wait_for_selector("#main a[data-tool]")
        self.assertEqual(page.locator("#ring svg").count(), 1)
        self.assertIn("AIUI", page.inner_text(".top .ttl b"))
        ids = page.eval_on_selector_all("#main a[data-tool]", "els => els.map(e => e.dataset.tool)")
        self.assertEqual(ids, ["heinz", "chat", "lab", "vitals"])
        page.click("[data-area=tools]")
        ids = page.eval_on_selector_all("#main a.app[data-tool]", "els => els.map(e => e.dataset.tool)")
        self.assertEqual(set(ids), {"sheet", "filter", "scan", "studio"})
        page.click("[data-area=setup]")
        ids = page.eval_on_selector_all("#main a.row[data-tool]", "els => els.map(e => e.dataset.tool)")
        self.assertEqual(ids[:2], ["setup", "models"])
        page.click("[data-area=tools]")
        page.reload()
        page.wait_for_selector("a.app[data-tool]")
        self.assertEqual(page.get_attribute("[data-area=tools]", "class"), "on")
        self.assertEqual(page.locator("#main a.app[data-tool=sheet]").count(), 1)
        self.assertEqual(self.errors, [])

    def test_hub_theme_button_cycles(self):
        page = self.new_page()
        page.goto(self.srv.base + "/")
        page.click("#theme")
        self.assertEqual(page.get_attribute("html", "data-theme"), "dk")
        page.click("#theme")
        self.assertEqual(page.get_attribute("html", "data-theme"), "lt")

    def test_language_toggle_switches_hub_and_persists(self):
        page = self.new_page()
        page.goto(self.srv.base + "/")
        page.wait_for_selector("#main a[data-tool]")
        page.click("#lang-btn")
        self.assertIn("Einrichten", page.inner_text("#areas"))
        self.assertEqual(json.loads(page.evaluate("localStorage.getItem('heinz_settings')"))["lang"], "de")
        page.goto(self.srv.base + "/tools/filter/index.html")
        self.assertIn("Platzhalter", page.inner_text(".panel"))

    def test_models_placeholder_lists_ollama_models(self):
        page = self.new_page()
        page.goto(self.srv.base + "/tools/models/index.html")
        page.wait_for_function("document.querySelector('#ollama').textContent.includes('gemma2:2b')")
        self.assertIn("LiteRT", page.text_content("#h-litert"))
        self.assertEqual(self.errors, [])

    def test_design_page_blocks_symbols_theme_and_language(self):
        page = self.new_page()
        page.goto(self.srv.base + "/tools/design/index.html")
        self.assertGreater(page.locator(".icons .ic").count(), 40)
        self.assertGreater(page.evaluate("document.querySelector('#pd2').width"), 300)
        page.click("[data-th=dk]")
        self.assertEqual(page.get_attribute("html", "data-theme"), "dk")
        page.click("[data-th=lt]")
        self.assertEqual(page.get_attribute("html", "data-theme"), "lt")
        page.click("#lang")
        self.assertIn("Bausteine", page.inner_text("h1"))
        page.click("#open-sheet")
        self.assertTrue(page.locator("#sheet.open").count() == 1)
        page.click("#close-sheet")
        self.assertEqual(page.locator("#sheet.open").count(), 0)
        self.assertEqual(self.errors, [])
        self.assertEqual(self.external, [])

    # ---- DR2 phase A: new hub, Heinz Chat, setup, mode slider ----
    def test_new_hub_groups_names_and_footer(self):
        page = self.new_page()
        page.goto(self.srv.base + "/")
        page.wait_for_selector("#main a, #main .row, #main button", timeout=5000)
        txt = page.inner_text("body")
        self.assertIn("Heinz Chat", txt)
        page.click("[data-area=tools]")
        self.assertIn("Filter", page.inner_text("#main"))
        self.assertNotIn("privacy", page.inner_text("body").lower().replace("private", ""))
        self.assertEqual(self.errors, [])
        self.assertEqual(self.external, [])

    def test_start_page_is_the_new_hub_and_old_hub_url_forwards_to_it(self):
        page = self.new_page()
        page.goto(self.srv.base + "/")
        page.wait_for_selector("#areas [data-area]")
        self.assertEqual(page.locator("#areas [data-area]").count(), 3, "new hub: Chat, Tools, Setup")
        self.assertEqual(page.locator(".tile, .hero").first.count(), 1)
        self.assertNotIn("Hub (Ollama", page.content())
        page.goto(self.srv.base + "/hub.html")
        page.wait_for_url(self.srv.base + "/")
        page.wait_for_selector("#areas [data-area]")
        self.assertEqual(self.errors, [])

    def test_start_page_shows_app_version_from_ping(self):
        page = self.new_page()
        page.route("**/api/ping", lambda r: r.fulfill(json={"ok": True, "version": "x", "app": {"version": "1.0", "commit": "abc1234", "date": "2026-11-11 12:30:00"}}))
        page.goto(self.srv.base + "/")
        page.wait_for_function("document.getElementById('ver').textContent.indexOf('abc1234') >= 0")
        self.assertIn("v1.0", page.inner_text("#ver"))

    def test_slim_chat_sends_streams_and_picks_model_in_bottom_sheet(self):
        page = self.new_page()
        fake = FakeOllama(page)
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("document.getElementById('mod-t').textContent.indexOf('gemma2:2b') >= 0")
        page.click("#mod")
        page.wait_for_selector("#sh-model.open")
        page.click("[data-model='qwen2.5:3b']")
        self.assertEqual(page.locator("#sh-model.open").count(), 0)
        self.assertIn("qwen2.5:3b", page.inner_text("#mod-t"))
        page.fill("#q", "Hi there")
        page.click("#send")
        page.wait_for_function("document.querySelector('#log .msg.a') && document.querySelector('#log .msg.a').textContent.indexOf('Hello world') >= 0")
        self.assertEqual(fake.requests[-1]["model"], "qwen2.5:3b")
        self.assertEqual(fake.requests[-1]["messages"][-1]["content"], "Hi there")
        page.click("#new")
        self.assertEqual(page.locator("#log .msg").count(), 0)
        page.click("#hist")
        page.wait_for_selector("#sh-hist.open")
        self.assertEqual(page.locator("#chats [data-open]").count(), 1)
        self.assertEqual(self.errors, [])
        self.assertEqual(self.external, [])

    def _slim_send_options(self, settings_js):
        page = self.new_page()
        fake = FakeOllama(page)
        page.add_init_script(settings_js)
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("document.getElementById('mod-t').textContent.indexOf('gemma2:2b') >= 0")
        page.click("#mod")
        page.wait_for_selector("#sh-model.open")
        page.click("[data-model='qwen2.5:3b']")
        page.fill("#q", "Hi")
        page.click("#send")
        page.wait_for_function("document.querySelector('#log .msg.a') && document.querySelector('#log .msg.a').textContent.indexOf('Hello world') >= 0")
        return fake.requests[-1], page

    def test_slim_chat_sends_num_thread_like_the_test_bench(self):
        req, _ = self._slim_send_options("localStorage.setItem('heinz_settings', JSON.stringify({threads: {'qwen2.5:3b': 2}}))")
        self.assertEqual(req.get("options", {}).get("num_thread"), 2)

    def test_slim_chat_uses_default_threads_when_none_saved_and_none_for_zero(self):
        req, _ = self._slim_send_options("localStorage.setItem('heinz_settings', JSON.stringify({}))")
        self.assertEqual(req.get("options", {}).get("num_thread"), 4)
        req, _ = self._slim_send_options("localStorage.setItem('heinz_settings', JSON.stringify({threads: {'qwen2.5:3b': 0}}))")
        self.assertNotIn("num_thread", req.get("options", {}))

    def test_slim_chat_sends_no_threads_for_other_engines(self):
        page = self.new_page()
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.evaluate("localStorage.setItem('heinz_settings', JSON.stringify({threads: {'m': 3}}))")
        self.assertEqual(page.evaluate("HeinzProviders.runtime('ollama','m').options"), {"num_thread": 3, "num_ctx": 8192})
        for prov in ("litert", "google-native", "openai", "custom"):
            self.assertEqual(page.evaluate("p => HeinzProviders.runtime(p, 'm').options", prov), {})

    def test_slim_chat_sends_context_and_keep_alive_and_releases_other_models_like_the_test_bench(self):
        req, page = self._slim_send_options("localStorage.setItem('heinz_settings', JSON.stringify({threads: {'qwen2.5:3b': 2}, params: {ctx: 4096}}))")
        self.assertEqual(req["options"].get("num_ctx"), 4096)
        self.assertEqual(req["options"].get("num_thread"), 2)
        self.assertEqual(req.get("keep_alive"), "30m")
        # model defaults chosen on the test bench (useDefault): no context sent, threads still sent
        req, _ = self._slim_send_options("localStorage.setItem('heinz_settings', JSON.stringify({useDefault: true, threads: {'qwen2.5:3b': 2}}))")
        self.assertNotIn("num_ctx", req["options"])
        self.assertEqual(req["options"].get("num_thread"), 2)

    def test_slim_chat_unloads_other_models_before_sending(self):
        page = self.new_page()
        fake = FakeOllama(page)   # the fake /api/ps always reports gemma2:2b as loaded
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("document.getElementById('mod-t').textContent.indexOf('gemma2:2b') >= 0")
        page.click("#mod")
        page.wait_for_selector("#sh-model.open")
        page.click("[data-model='qwen2.5:3b']")
        page.fill("#q", "Hi")
        page.click("#send")
        page.wait_for_function("document.querySelector('#log .msg.a') && document.querySelector('#log .msg.a').textContent.indexOf('Hello world') >= 0")
        self.assertIn({"model": "gemma2:2b", "keep_alive": 0}, fake.unloads)
        self.assertNotIn({"model": "qwen2.5:3b", "keep_alive": 0}, fake.unloads, "the chosen model stays")

    def test_test_bench_and_slim_chat_send_the_same_load_options_for_the_same_model(self):
        page = self.new_page()
        fake = FakeOllama(page)
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        # values as the developer sets them on the test bench: sliders for context and threads, model qwen2.5:3b
        page.evaluate("""() => { const m = document.getElementById('model-select'); m.value = 'qwen2.5:3b'; m.dispatchEvent(new Event('change')); }""")
        page.wait_for_timeout(800)   # the model switch re-applies its parameter source asynchronously
        page.evaluate("setParamSrc('own')")   # own values: the sliders are the developer's, not the mode preset's
        page.evaluate("""() => { const c = document.getElementById('param-ctx'); c.value = 6144; onSlider(); const t = document.getElementById('param-threads'); t.value = 3; onThreads(); }""")
        self.send(page, "Hi")
        bench = fake.requests[-1]
        self.assertEqual((bench["options"]["num_thread"], bench["options"]["num_ctx"]), (3, 6144))
        self.assertEqual(bench["model"], "qwen2.5:3b")
        # the chat page (same browser storage) must send exactly the same load options for the same model
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("document.getElementById('mod-t').textContent.indexOf('qwen2.5:3b') >= 0")   # the bench's model is taken over
        page.fill("#q", "Hi")
        page.click("#send")
        page.wait_for_function("document.querySelector('#log .msg.a') && document.querySelector('#log .msg.a').textContent.indexOf('Hello world') >= 0")
        slim = fake.requests[-1]
        self.assertIsNot(slim, bench)
        for k in ("num_thread", "num_ctx"):
            self.assertEqual(slim["options"].get(k), bench["options"].get(k), k)
        self.assertEqual(slim.get("keep_alive"), bench.get("keep_alive"))

    def test_shared_status_codes_and_colours_for_every_kind_of_engine(self):
        page = self.new_page()
        FakeOllama(page)   # /api/ps reports gemma2:2b as loaded
        page.goto(self.srv.base + "/tools/heinz/index.html")
        st = lambda js: page.evaluate("(async () => { const r = await " + js + "; return [r.code, r.color, r.key]; })()")
        self.assertEqual(st("HeinzProviders.status('ollama', 'gemma2:2b')"), ["loaded", "blue", "stDefault"])
        self.assertEqual(st("HeinzProviders.status('ollama', 'qwen2.5:3b')"), ["asleep", "orange", "stOnline"], "reachable but this model is not in memory")
        # online engine: never asked, only the switch and the key decide
        self.assertEqual(st("HeinzProviders.status('google', 'm')"), ["cloudOff", "red", "stCloudOff"])
        page.evaluate("HeinzProviders.setOnlineAllowed(true)")
        self.assertEqual(st("HeinzProviders.status('google', 'm')"), ["cloudNoKey", "red", "stCloudNoKey"])
        page.evaluate("HeinzProviders.setKey('google', 'k')")
        self.assertEqual(st("HeinzProviders.status('google', 'm')"), ["cloudReady", "blue", "stCloudReady"])
        self.assertEqual(st("HeinzProviders.status('google', 'm', { handshake: false })"), ["handshake", "yellow", "stHandshake"])
        # counter case: local engine not reachable
        page.unroute("**/localhost:11434/**")
        page.route("**/localhost:11434/**", lambda r: r.abort())
        self.assertEqual(st("HeinzProviders.status('ollama', 'gemma2:2b')"), ["offline", "red", "stOffline"])

    def test_slim_chat_ring_shows_the_connection_state_and_what_the_model_does(self):
        page = self.new_page()
        fake = FakeOllama(page)
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("document.getElementById('mod-t').textContent.indexOf('gemma2:2b') >= 0")
        ring = lambda: page.evaluate("document.getElementById('ring').className")
        page.wait_for_function("document.getElementById('ring').classList.contains('s-blue')")   # gemma2:2b is in memory
        self.assertIn("Model is loaded in RAM", page.evaluate("document.getElementById('ring').title"))
        self.assertEqual(page.evaluate("document.getElementById('ring').getAttribute('href')"), "/", "the ring leads back to the hub")
        # another model: reachable, but asleep -> orange
        page.click("#mod")
        page.wait_for_selector("#sh-model.open")
        page.click("[data-model='qwen2.5:3b']")
        page.wait_for_function("document.getElementById('ring').classList.contains('s-orange')")
        # while the model works the ring says so (answer is held back by the fake engine)
        page.unroute("**/localhost:11434/**")
        def slow(route):
            if route.request.url.endswith("/api/chat"):
                import time; time.sleep(1.5)
            fake.handle(route)
        page.route("**/localhost:11434/**", slow)
        page.fill("#q", "Hi")
        page.click("#send")
        page.wait_for_function("document.getElementById('ring').classList.contains('s-blue') && document.getElementById('ring').title.indexOf('Thinking') >= 0")
        page.wait_for_function("document.querySelector('#log .msg.a') && document.querySelector('#log .msg.a').textContent.indexOf('Hello world') >= 0")
        # engine gone: red
        page.unroute("**/localhost:11434/**")
        page.route("**/localhost:11434/**", lambda r: r.abort())
        page.wait_for_function("document.getElementById('ring').classList.contains('s-red')", timeout=15000)
        self.assertEqual(page.evaluate("document.getElementById('mod-dot')"), None, "the old dot is gone")

    def test_slim_chat_model_sheet_shows_what_it_sends_to_ollama(self):
        page = self.new_page()
        FakeOllama(page)
        page.add_init_script("localStorage.setItem('heinz_settings', JSON.stringify({threads: {'gemma2:2b': 2}, params: {ctx: 6144}}))")
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("document.getElementById('mod-t').textContent.indexOf('gemma2:2b') >= 0")
        page.click("#mod")
        page.wait_for_selector("#sh-model.open")
        txt = page.inner_text("#rt-h")
        self.assertIn("threads 2", txt)
        self.assertIn("context 6144", txt)
        self.assertIn("30m", txt)
        # another model has its own thread value: the default 4
        page.click("[data-model='qwen2.5:3b']")
        page.click("#mod")
        page.wait_for_selector("#sh-model.open")
        self.assertIn("threads 4", page.inner_text("#rt-h"))

    def test_slim_chat_preloads_the_chosen_model_with_the_shared_runtime_and_shows_it_in_the_ring(self):
        page = self.new_page()
        fake = FakeOllama(page)
        page.add_init_script("localStorage.setItem('heinz_settings', JSON.stringify({threads: {'qwen2.5:3b': 2}, params: {ctx: 6144}}))")
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("document.getElementById('mod-t').textContent.indexOf('gemma2:2b') >= 0")
        page.wait_for_function("document.getElementById('ring').title.indexOf('Preparing model') < 0", timeout=15000)
        # pick another model; the preload is slow so the ring has to say "preparing"
        page.unroute("**/localhost:11434/**")
        def slow(route):
            if route.request.url.endswith("/api/chat"):
                import time; time.sleep(1.5)
            fake.handle(route)
        page.route("**/localhost:11434/**", slow)
        n = len(fake.preloads)
        page.click("#mod")
        page.wait_for_selector("#sh-model.open")
        page.click("[data-model='qwen2.5:3b']")
        page.wait_for_function("document.getElementById('ring').title.indexOf('Preparing model') >= 0 && document.getElementById('ring').classList.contains('s-orange')")
        page.wait_for_function("document.getElementById('ring').title.indexOf('Preparing model') < 0", timeout=15000)
        self.assertGreater(len(fake.preloads), n)
        pre = fake.preloads[-1]
        self.assertEqual(pre["model"], "qwen2.5:3b")
        self.assertEqual((pre["options"].get("num_thread"), pre["options"].get("num_ctx"), pre["options"].get("num_predict")), (2, 6144, 1))
        self.assertEqual(pre.get("keep_alive"), "30m")
        self.assertIn({"model": "gemma2:2b", "keep_alive": 0}, fake.unloads, "other models are released before the preload")

    def test_model_choice_is_shared_between_chat_and_test_bench(self):
        # chat picks qwen -> the test bench opens with qwen (and does not load another model); and the other way round
        page = self.new_page()
        fake = FakeOllama(page)
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("document.getElementById('mod-t').textContent.indexOf('gemma2:2b') >= 0")
        page.click("#mod")
        page.wait_for_selector("#sh-model.open")
        page.click("[data-model='qwen2.5:3b']")
        page.wait_for_timeout(500)
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.getElementById('model-select').value === 'qwen2.5:3b'", timeout=15000)
        page.wait_for_timeout(1500)
        self.assertTrue(all(p_["model"] == "qwen2.5:3b" for p_ in fake.preloads[-1:]), "the bench preloads the shared model")
        # bench changes the model -> the chat takes it over
        page.evaluate("() => { const s = document.getElementById('model-select'); s.value = 'gemma2:2b'; s.dispatchEvent(new Event('change')); }")
        page.wait_for_timeout(500)
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("document.getElementById('mod-t').textContent.indexOf('gemma2:2b') >= 0", timeout=15000)

    def test_model_sheet_shows_what_bench_and_chat_last_sent_to_ollama(self):
        page = self.new_page()
        FakeOllama(page)
        page.add_init_script("if (!localStorage.getItem('heinz_settings')) localStorage.setItem('heinz_settings', JSON.stringify({threads: {'gemma2:2b': 2}}))")
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        page.wait_for_timeout(2500)   # the bench preloads on its own
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("document.getElementById('mod-t').textContent.indexOf('gemma2:2b') >= 0")
        page.fill("#q", "Hi")   # the chat has no preload of its own here (the bench just loaded the model): it sends a real message
        page.click("#send")
        page.wait_for_function("document.querySelector('#log .msg.a') && document.querySelector('#log .msg.a').textContent.indexOf('Hello world') >= 0")
        page.click("#mod")
        page.wait_for_selector("#sh-model.open")
        txt = page.inner_text("#rt-h")
        import re
        b = re.search(r"Test bench gemma2:2b: threads 2, context (\d+)", txt)
        c = re.search(r"Chat gemma2:2b: threads 2, context (\d+)", txt)
        self.assertTrue(b and c, txt)
        self.assertEqual(b.group(1), c.group(1), "bench and chat send the same context")

    def test_slim_chat_skips_the_preload_when_the_model_is_loaded_with_the_same_options(self):
        page = self.new_page()
        fake = FakeOllama(page)
        page.add_init_script("if (!localStorage.getItem('heinz_settings')) { localStorage.setItem('heinz_settings', JSON.stringify({threads: {'gemma2:2b': 2}})); localStorage.setItem('heinz_lastreq', JSON.stringify({bench: {model: 'gemma2:2b', threads: 2, ctx: 8192, keep: '30m', preload: false, ts: Date.now()}})); }")
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("document.getElementById('mod-t').textContent.indexOf('gemma2:2b') >= 0")
        page.wait_for_timeout(1500)
        self.assertEqual(fake.preloads, [], "loaded with the same options: the chat must not overwrite Ollama's cache with a preload")
        self.assertIn("s-blue", page.get_attribute("#ring", "class"))
        # other threads would reload the model: preload as before
        page.evaluate("() => { const s = JSON.parse(localStorage.getItem('heinz_settings')); s.threads['gemma2:2b'] = 3; localStorage.setItem('heinz_settings', JSON.stringify(s)); }")
        page.click("#mod"); page.wait_for_selector("#sh-model.open"); page.click("[data-model='qwen2.5:3b']")
        page.wait_for_timeout(1200)
        self.assertGreater(len(fake.preloads), 0, "a model that is not loaded is still preloaded")

    def test_leaving_the_page_cancels_the_running_request(self):
        page = self.new_page()
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("typeof HeinzProviders !== 'undefined'")
        page.unroute("**/localhost:11434/**")
        page.route("**/localhost:11434/**", lambda route: None)   # never answers: the request stays open
        res = page.evaluate("""async () => {
            const t0 = Date.now();
            const p = HeinzProviders.chat('ollama', { model: 'gemma2:2b', messages: [{ role: 'user', content: 'Hi' }], stream: true, onDelta: () => {} });
            setTimeout(() => window.dispatchEvent(new Event('pagehide')), 300);
            try { await p; return 'finished'; } catch (e) { return e.name + ':' + (Date.now() - t0 < 3000); }
        }""")
        self.assertEqual(res, "AbortError:true", "pagehide aborts the open request at once")

    def test_bench_takes_over_a_chat_model_that_only_the_real_model_list_knows(self):
        # heinz-fakt:latest is not in the bench's fallback list; the first fill happens with that list and must not discard the chat's choice
        page = self.new_page()
        FakeOllama(page, tags=("gemma2:2b", "qwen2.5:3b", "heinz-fakt:latest"))
        page.add_init_script("if (!localStorage.getItem('heinz_active')) localStorage.setItem('heinz_active', JSON.stringify({provider: 'ollama', model: 'heinz-fakt:latest'}))")
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.getElementById('model-select').value === 'heinz-fakt:latest'", timeout=15000)
        page.wait_for_timeout(800)
        self.assertEqual(page.evaluate("HeinzProviders.activeModel().model"), "heinz-fakt:latest", "the shared choice is not overwritten")
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("document.getElementById('mod-t').textContent.indexOf('heinz-fakt:latest') >= 0", timeout=15000)

    def test_slim_chat_does_not_preload_when_the_test_bench_switch_is_off(self):
        page = self.new_page()
        fake = FakeOllama(page)
        page.add_init_script("localStorage.setItem('heinz_settings', JSON.stringify({preload: false}))")
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("document.getElementById('mod-t').textContent.indexOf('gemma2:2b') >= 0")
        page.click("#mod")
        page.wait_for_selector("#sh-model.open")
        page.click("[data-model='qwen2.5:3b']")
        page.wait_for_timeout(800)
        self.assertEqual(fake.preloads, [], "switch off: the ring stays as it is, nothing is loaded")

    def test_slim_chat_error_keeps_text_and_shows_notice(self):
        page = self.new_page()
        FakeOllama(page, status=500)
        page.goto(self.srv.base + "/tools/heinz/index.html")
        page.wait_for_function("document.getElementById('mod-t').textContent.indexOf('gemma2:2b') >= 0")
        page.fill("#q", "Hello?")
        page.click("#send")
        page.wait_for_selector("#note.err:not([hidden])")
        self.assertEqual(page.input_value("#q"), "Hello?")

    def test_setup_page_has_steps_and_copy_command(self):
        page = self.new_page()
        FakeOllama(page)
        page.goto(self.srv.base + "/tools/setup/index.html")
        self.assertGreaterEqual(page.locator(".step").count(), 6)
        self.assertGreaterEqual(page.locator(".cmd").count(), 2)
        self.assertEqual(self.errors, [])

    def test_mode_slider_mockup_changes_accent(self):
        page = self.new_page()
        page.goto(self.srv.base + "/tools/design/modus.html")
        before = page.evaluate("getComputedStyle(document.body).getPropertyValue('--macc').trim()")
        page.click("#collar")
        page.wait_for_selector("#vbar.open")
        page.click(".mo[data-i='4']")
        after = page.evaluate("getComputedStyle(document.body).getPropertyValue('--macc').trim()")
        self.assertNotEqual(before, after)
        self.assertEqual(after.lower(), "#b184ec")
        self.assertEqual(self.errors, [])

    def test_manifest_and_service_worker_installable(self):
        page = self.new_page()
        page.goto(self.srv.base + "/")
        href = page.get_attribute("link[rel=manifest]", "href")
        m = page.evaluate("h => fetch(h).then(r => r.json())", href)
        self.assertEqual(m["display"], "standalone")
        for icon in m["icons"]:
            r = page.request.get(self.srv.base + icon["src"])
            self.assertEqual(r.status, 200, icon["src"])
        self.assertEqual(page.request.get(self.srv.base + "/sw.js").status, 200)


if __name__ == "__main__":
    unittest.main(verbosity=2)
