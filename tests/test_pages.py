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

    def __init__(self, page, chunks=("Hello", " world"), status=200):
        self.requests = []   # parsed /api/chat bodies
        self.chunks = chunks
        self.status = status
        page.route("**/localhost:11434/**", self.handle)

    def handle(self, route):
        url = route.request.url
        if url.endswith("/api/tags"):
            body = {"models": [{"name": "gemma2:2b"}, {"name": "qwen2.5:3b"}, {"name": "gemma:2b"}]}
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(body))
        if url.endswith("/api/ps"):
            return route.fulfill(status=200, content_type="application/json",
                                 body=json.dumps({"models": [{"name": "gemma2:2b"}]}))
        if url.endswith("/api/chat"):
            self.requests.append(json.loads(route.request.post_data))
            if self.status != 200:
                return route.fulfill(status=self.status, body="nope")
            lines = [json.dumps({"message": {"role": "assistant", "content": c}, "done": False}) for c in self.chunks]
            lines.append(json.dumps({"done": True, "prompt_eval_count": 60, "eval_count": 92, "eval_duration": 4000000000}))
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
        self.assertIn("Some context text", body["messages"][0]["content"])

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
