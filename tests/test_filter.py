"""Filter (tools/filter/): Browser tests with a simulated Ollama (no real model, no request leaves the device).
Node tests of the modules live in tests/filter/ and run through this file."""
import json, os, shutil, subprocess, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import Server
from playwright.sync_api import sync_playwright
from test_pages import FakeOllama

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE = shutil.which("node")


@unittest.skipUnless(NODE, "node fehlt")
class FilterModuleTests(unittest.TestCase):
    def test_node_tests_of_all_modules_pass(self):
        d = os.path.join(ROOT, "tests", "filter")
        files = sorted(os.path.join("tests", "filter", f) for f in os.listdir(d) if f.endswith(".test.mjs"))
        r = subprocess.run([NODE, "--test", *files], cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)


class FilterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = Server().start()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.stop()

    def page(self):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803})
        return ctx, ctx.new_page()

    def test_provider_passes_format_schema_to_ollama(self):
        ctx, page = self.page()
        try:
            fake = FakeOllama(page, chunks=('{"label":"a"}',))
            page.goto(self.server.base + "/chat.html")
            schema = {"type": "object", "properties": {"label": {"type": "string", "enum": ["a", "b"]}}, "required": ["label"]}
            r = page.evaluate("async (schema) => { const r = await HeinzProviders.chat('ollama', { model: 'qwen2.5:3b', messages: [{role:'user', content:'x'}], format: schema }); return r.text; }", schema)
            self.assertEqual(json.loads(r), {"label": "a"})
            self.assertEqual(fake.requests[-1].get("format"), schema)
            page.evaluate("async () => { await HeinzProviders.chat('ollama', { model: 'qwen2.5:3b', messages: [{role:'user', content:'y'}] }); }")
            page.wait_for_timeout(300)
            self.assertNotIn("format", fake.requests[-1], "without req.format nothing is added")
        finally:
            ctx.close()


URL = "/tools/filter/index.html"
CSV = "Titel,Kat\nGreat stuff,positive\nAwful day,negative\nJust a table,neutral\nWonderful news,positive\n"


def label_for(user):
    u = user.lower()
    return "positive" if ("great" in u or "wonderful" in u or "thanks" in u or "dank" in u or "birthday" in u) else "negative" if ("awful" in u or "overdue" in u or "disappoint" in u or "storn" in u) else "neutral"


class Backend:
    """Simulated Ollama for Filter: answers every /api/chat with a JSON label chosen by keywords; records the bodies."""
    def __init__(self, page, delay_ms=0, fail_at=None, bad_at=None):
        self.bodies = []
        self.fail_at, self.bad_at = fail_at, bad_at
        self.fake = FakeOllama(page)
        page.route("**/localhost:11434/api/chat", self.chat)

    def chat(self, route):
        body = json.loads(route.request.post_data)
        if (body.get("options") or {}).get("num_predict") == 1:
            return route.fallback()
        self.bodies.append(body)
        n = len(self.bodies)
        if self.fail_at and n == self.fail_at:
            return route.fulfill(status=500, body="boom")
        user = [m for m in body["messages"] if m["role"] == "user"][-1]["content"]
        text = "I think so" if self.bad_at and n == self.bad_at else json.dumps({"label": label_for(user), "why": "kw"})
        lines = [json.dumps({"message": {"role": "assistant", "content": text}, "done": False}), json.dumps({"done": True, "eval_count": 5})]
        return route.fulfill(status=200, content_type="application/x-ndjson", body="\n".join(lines) + "\n")


class FilterPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = Server().start()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.pw.stop(); cls.server.stop()

    def open(self, **kw):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803}, accept_downloads=True)
        page = ctx.new_page()
        self.errors = []
        page.on("pageerror", lambda e: self.errors.append(str(e)))
        self.external = []
        page.on("request", lambda r: self.external.append(r.url) if not (r.url.startswith(self.server.base) or "localhost:11434" in r.url or r.url.startswith("data:") or r.url.startswith("blob:")) else None)
        be = Backend(page, **kw)
        page.goto(self.server.base + URL)
        page.wait_for_function("window.__filterReady === true")
        return ctx, page, be

    def paste_csv(self, page, text=CSV):
        page.fill("#in", text)
        page.wait_for_selector("#colbox:not([hidden])")

    def test_sample_run_counts_and_request_shape(self):
        ctx, page, be = self.open()
        try:
            page.click("#b-sample")
            self.assertIn("12", page.inner_text("#info"))
            page.click("#params summary")
            page.fill("#limit", "6")
            page.click("#b-run")
            page.wait_for_function("document.querySelector('#status').textContent.startsWith('6 of 6') || document.querySelector('#status').textContent.startsWith('6 von 6')")
            self.assertEqual(len(be.bodies), 6, "one entry per request, limit respected")
            b = be.bodies[0]
            self.assertEqual(b["format"]["properties"]["label"]["enum"], ["positive", "neutral", "negative"])
            self.assertEqual(b["options"]["temperature"], 0)
            self.assertEqual(b["model"], "qwen2.5:3b")
            self.assertEqual([m["role"] for m in b["messages"]], ["system", "user"])
            self.assertEqual(b["messages"][1]["content"], "Invoice 2024-118 is overdue – please pay by Friday")
            self.assertGreaterEqual(page.locator("#tiles .fl-tile").count(), 2)
            self.assertEqual(page.locator("#tbl tr").count(), 7)
            self.assertEqual(self.errors, [])
            self.assertEqual(self.external, [], "no request leaves the device")
        finally:
            ctx.close()

    def test_control_column_quote_only_filter_and_exports(self):
        ctx, page, be = self.open()
        try:
            self.paste_csv(page)
            page.select_option("#cmp", "1")
            page.click("#params summary")
            page.check("#why")
            page.click("#b-run")
            page.wait_for_selector("#tiles .fl-tile")
            page.wait_for_function("document.querySelector('#status').textContent.match(/4/)")
            page.wait_for_function("!document.querySelector('#b-cancel').offsetParent")
            self.assertIn("100 %", page.inner_text("#tiles"))
            self.assertEqual(page.locator("#cf tr").count(), 4)
            page.locator("#tiles .fl-tile", has_text="negative").click()
            page.check("#only")
            self.assertEqual(page.locator("#tbl tr").count(), 2, "header plus the single negative entry")
            with page.expect_download() as d:
                page.click("[data-exp=csv]")
            path = d.value.path()
            with open(path, encoding="utf-8") as f: txt = f.read()
            self.assertIn('"Titel","Kat","label","reason","control","match"', txt)
            self.assertIn('"Awful day","negative","negative","kw","negative","yes"', txt)
            self.assertNotIn("Great stuff", txt, "export follows the shown selection")
            page.uncheck("#only")
            with page.expect_download() as d2:
                page.click("[data-exp=json]")
            with open(d2.value.path(), encoding="utf-8") as f: data = json.load(f)
            self.assertEqual(len(data), 4)
            self.assertEqual(data[0]["row"], {"Titel": "Great stuff", "Kat": "positive"})
        finally:
            ctx.close()

    def test_unclear_answer_error_and_resume_after_reload(self):
        ctx, page, be = self.open(fail_at=3, bad_at=2)
        try:
            self.paste_csv(page)
            page.click("#b-run")
            page.wait_for_function("!document.querySelector('#b-cancel').offsetParent")
            self.assertEqual(len(be.bodies), 4, "a single HTTP 500 does not stop the run")
            self.assertEqual(page.locator("#tiles .fl-tile", has_text="unclear").count() + page.locator("#tiles .fl-tile", has_text="unklar").count(), 1)
            self.assertIn("1", page.inner_text("#status"))
        finally:
            ctx.close()

    def test_cancel_then_resume_sends_only_the_rest(self):
        ctx, page, be = self.open()
        try:
            self.paste_csv(page)
            page.evaluate("""() => { const f = HeinzProviders.chat; let n = 0;
                HeinzProviders.chat = async function (id, req) { n++; if (n === 2) setTimeout(() => document.getElementById('b-cancel').click(), 0); return f.call(this, id, req); }; }""")
            page.click("#b-run")
            page.wait_for_selector("#b-resume:not([hidden])")
            first = len(be.bodies)
            self.assertLess(first, 4)
            self.assertIn("of 4", page.inner_text("#b-resume"))
            page.click("#b-resume")
            page.wait_for_function("document.querySelector('#status').textContent.startsWith('4 of 4') && !document.querySelector('#b-run').hidden")
            sent = [[m for m in b["messages"] if m["role"] == "user"][0]["content"] for b in be.bodies]
            self.assertEqual(len(set(sent)), 4, str(sent))
            self.assertLessEqual(len(sent), 5, "only the request that was cancelled is sent again: " + str(sent))
            self.assertEqual(page.locator("#tbl tr").count(), 5)
        finally:
            ctx.close()

    def test_reload_restores_input_and_results(self):
        ctx, page, be = self.open()
        try:
            self.paste_csv(page)
            page.click("#b-run")
            page.wait_for_function("!document.querySelector('#b-cancel').offsetParent")
            page.wait_for_timeout(900)   # debounced save
            page.reload()
            page.wait_for_function("window.__filterReady === true")
            self.assertEqual(page.input_value("#in"), CSV)
            self.assertEqual(page.locator("#tbl tr").count(), 5)
            self.assertFalse(page.locator("#b-resume").is_visible(), "a finished run offers no resume")
        finally:
            ctx.close()

    def test_online_engine_is_blocked_without_global_switch(self):
        ctx, page, be = self.open()
        try:
            page.click("#params summary")
            self.assertEqual([o for o in page.eval_on_selector_all("#provider option", "els => els.map(e => e.value)") if o not in ("ollama", "litert")], [], "only local engines are offered while online is off")
            page.evaluate("HeinzProviders.setOnlineAllowed(true)")
            page.reload(); page.wait_for_function("window.__filterReady === true")
            ids = page.eval_on_selector_all("#provider option", "els => els.map(e => e.value)")
            self.assertIn("openrouter", ids)
        finally:
            ctx.close()


if __name__ == "__main__":
    unittest.main()
