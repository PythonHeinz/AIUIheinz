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
PAGES = ["/", "/chat.html", "/lab.html", "/sheet.html", "/vitals.html", "/tools/models/index.html", "/tools/filter/index.html"]


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

    def send(self, page, text):
        page.fill("#query", text)
        page.click("#send-btn")
        page.wait_for_function("document.querySelectorAll('.msg-assistant').length > 0 && !document.querySelector('#stop-btn').offsetParent")

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
        page.select_option("#mode-select", "audit")
        page.fill("#context", "Some context text")
        self.send(page, "Check it")
        body = self.ollama.requests[0]
        self.assertEqual(body["model"], "qwen2.5:3b")
        self.assertAlmostEqual(body["options"]["temperature"], 0.15)
        self.assertNotIn("Some context text", body["messages"][0]["content"], "context is not part of the system prompt")
        self.assertEqual(body["messages"][0]["role"], "system")
        self.assertTrue(body["messages"][-1]["content"].startswith("Context / source text:\nSome context text"))

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
        page.select_option("#model-select", "gemma:2b")
        self.assertEqual(page.input_value("#param-threads"), "4")
        page.select_option("#model-select", "gemma2:2b")
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
        page.select_option("#mode-select", "heinz")
        self.assertEqual(page.input_value("#model-select"), "heinz-fakt:latest")
        self.assertFalse(page.is_disabled("#model-select"), "model stays selectable in every mode")
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
        page.select_option("#mode-select", "heinz")
        self.assertEqual(page.input_value("#model-select"), "qwen2.5:3b")

    def test_own_system_prompt_sends_no_system_message(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.evaluate("var c=document.getElementById('own-system'); c.checked=true; c.dispatchEvent(new Event('change'))")
        page.select_option("#mode-select", "heinz")
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

    def test_preload_follows_mode_threads_and_can_be_switched_off(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.wait_preloads(page, 1)
        page.select_option("#mode-select", "audit")
        self.wait_preloads(page, 2)
        self.assertEqual(self.ollama.preloads[1]["model"], "qwen2.5:3b")
        page.evaluate("var e=document.getElementById('param-threads'); e.value=2; e.dispatchEvent(new Event('input'))")
        self.wait_preloads(page, 3)
        self.assertEqual(self.ollama.preloads[2]["options"]["num_thread"], 2)
        page.evaluate("var c=document.getElementById('preload-on'); c.checked=false; c.dispatchEvent(new Event('change'))")
        page.select_option("#mode-select", "creative")
        page.wait_for_timeout(2000)
        self.assertEqual(len(self.ollama.preloads), 3, "switched off: no further preload")
        self.assertFalse(page.evaluate("JSON.parse(localStorage.getItem('heinz_settings')).preload"))

    def test_context_changes_do_not_change_system_prompt(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.select_option("#mode-select", "code")
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

    def test_tap_outside_closes_sidebar_values_stay_and_reload_keeps_chat(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Hi")
        page.click(".burger-btn")
        self.assertTrue(page.evaluate("document.getElementById('sidebar').classList.contains('open')"))
        page.evaluate("var e=document.getElementById('param-threads'); e.value=3; e.dispatchEvent(new Event('input'))")
        # tap into the chat area on the left: sidebar closes, the setting is already applied
        page.mouse.click(60, 400)
        page.wait_for_function("!document.getElementById('sidebar').classList.contains('open')")
        self.send(page, "Again")
        self.assertEqual(self.ollama.requests[-1]["options"]["num_thread"], 3)
        # taps inside the sidebar do not close it
        page.click(".burger-btn")
        page.click("#sidebar .side-title")
        self.assertTrue(page.evaluate("document.getElementById('sidebar').classList.contains('open')"))
        # reload button: chat and thread setting survive
        page.click("#sidebar .close-btn:has-text('↻')")
        page.wait_for_selector(".msg-assistant")
        self.assertEqual(page.locator(".msg-user").count(), 2)
        self.assertEqual(page.input_value("#param-threads"), "3")
        self.assertEqual(self.errors, [])

    def test_new_chat_button_and_copy_button_position(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        self.send(page, "Hi")
        self.assertEqual(page.locator("button[onclick='newChat(true)'] svg").count(), 1, "line icon, not an emoji")
        box = page.locator("#chat-container").bounding_box()
        cb = page.locator(".chat-copy").bounding_box()
        self.assertLess(cb["x"] - box["x"], 20, "copy button sits at the left edge of the chat window")
        self.assertLess(cb["y"] - box["y"], 20, "... and at its top")
        self.assertEqual(page.locator("button[onclick^='copyWholeChat']").count(), 1)
        page.click("button[onclick='newChat(true)']")
        self.assertEqual(page.locator(".msg-user").count(), 0)
        self.assertEqual(len(json.loads(page.evaluate("localStorage.getItem('heinz_chats')"))), 1, "old chat is saved in the list")
        self.assertEqual(page.inner_text("#dash-start"), "0.0")

    def test_speed_test_runs_threads_cold_and_warm_and_copies_table(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_function("document.querySelectorAll('#model-select option').length == 3")
        page.click(".burger-btn")
        page.evaluate("var e=document.getElementById('param-threads'); e.value=3; e.dispatchEvent(new Event('input'))")
        page.evaluate("document.querySelectorAll('#st-threads input').forEach(i => i.checked = ['2','4'].includes(i.value))")
        page.select_option("#st-termux", "hidden")
        page.click("#st-start")
        page.wait_for_function("document.getElementById('st-status').textContent.startsWith('Done')", timeout=20000)
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
        self.assertEqual(self.errors, [])

    def test_speed_test_needs_a_thread_value_and_can_be_stopped(self):
        page = self.new_page()
        page.goto(self.srv.base + "/chat.html")
        page.click(".burger-btn")
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
        page.click(".burger-btn")
        page.wait_for_function("document.getElementById('upd-ver').textContent.includes('abc1234')")
        self.assertEqual(page.inner_text("#upd-ver"), "⬇ v1.0 · abc1234 · 2026-11-09", "pill shows version, commit and date")
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

    def test_hub_shows_header_tools_and_status(self):
        page = self.new_page()
        page.goto(self.srv.base + "/")
        page.wait_for_selector("a.card[data-tool]")
        self.assertEqual(page.locator("header .ring svg").count(), 1)
        self.assertIn("AIUI", page.inner_text("header b"))
        ids = page.eval_on_selector_all("a.card[data-tool]", "els => els.map(e => e.dataset.tool)")
        self.assertEqual(ids[:4], ["chat", "models", "filter", "sheet"])
        self.assertIn("lab", ids)
        self.assertEqual(page.locator("#legacy a.card").count(), 2)
        page.wait_for_function("document.querySelector('#t-ollama').textContent.includes('gemma2:2b')")
        self.assertEqual(self.errors, [])

    def test_language_toggle_switches_hub_and_persists(self):
        page = self.new_page()
        page.goto(self.srv.base + "/")
        page.wait_for_selector("a.card[data-tool]")
        page.click("#lang-btn")
        self.assertIn("Modelle", page.inner_text("#tools"))
        self.assertEqual(json.loads(page.evaluate("localStorage.getItem('heinz_settings')"))["lang"], "de")
        page.goto(self.srv.base + "/tools/filter/index.html")
        self.assertIn("Platzhalter", page.inner_text(".panel"))

    def test_models_placeholder_lists_ollama_models(self):
        page = self.new_page()
        page.goto(self.srv.base + "/tools/models/index.html")
        page.wait_for_function("document.querySelector('#ollama').textContent.includes('gemma2:2b')")
        self.assertIn("LiteRT", page.text_content("#h-litert"))
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
