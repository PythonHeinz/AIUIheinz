"""Tests der Convert2-Module, die den Browser brauchen (DOMParser): tools/convert2/mod/html.js. Playwright, Chromium."""
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import Server
from playwright.sync_api import sync_playwright


class Convert2DomTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = Server()
        cls.srv.start()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()
        cls.page = cls.browser.new_page()
        cls.page.goto(cls.srv.base + "/manifest.webmanifest")

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.srv.stop()

    def md(self, html):
        return self.page.evaluate("async (h) => (await import('/tools/convert2/mod/html.js')).htmlToMarkdown(h)", html)

    def test_headings_lists_links_emphasis(self):
        out = self.md('<h1>T</h1><p>Ein <b>fetter</b> und <i>schiefer</i> <a href="https://a.de/x">Link</a>.</p><ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>')
        self.assertEqual(out, "# T\n\nEin **fetter** und *schiefer* [Link](https://a.de/x).\n\n- a\n  - b\n- c")

    def test_table_and_pipe_escape(self):
        out = self.md('<table><tr><th>A</th><th>B</th></tr><tr><td>1|2</td><td>x</td></tr></table>')
        self.assertEqual(out, "| A | B |\n| --- | --- |\n| 1\\|2 | x |")

    def test_scripts_styles_and_unsafe_links_are_dropped(self):
        out = self.md('<style>p{}</style><script>alert(1)</script><p onclick="x()">Text <a href="javascript:alert(1)">weg</a></p>')
        self.assertEqual(out, "Text weg")
        self.assertFalse(self.page.evaluate("() => window.__x === 1"))

    def test_unclosed_style_does_not_swallow_the_rest(self):
        self.assertEqual(self.md("<style>p{color:red}<body><p>Rest</p>"), "Rest")

    def test_images_and_code_language(self):
        out = self.md('<p><img src="data:image/png;base64,AAAA" alt="Bild"></p><p><img src="file:///c/x.png"></p><pre><code class="language-js">a < b</code></pre>')
        self.assertEqual(out, "![Bild](data:image/png;base64,AAAA)\n\n```js\na < b\n```")

    def test_looks_like_html(self):
        f = lambda s: self.page.evaluate("async (s) => (await import('/tools/convert2/mod/html.js')).looksLikeHtml(s)", s)
        self.assertTrue(f("<!DOCTYPE html><html><body>x</body></html>"))
        self.assertTrue(f("<p>Hallo</p>"))
        self.assertFalse(f("# Titel\n\nText mit a < b"))
        self.assertFalse(f("| a | b |\n|---|---|"))


if __name__ == "__main__":
    unittest.main()
