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


if __name__ == "__main__":
    unittest.main()
