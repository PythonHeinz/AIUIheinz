"""Convert2 Oberfläche (tools/convert2/index.html): Playwright, Pixel-Viewport, keine Anfragen nach außen. Echte Zwischenablage, Teilen und Druck gibt es nur am Gerät."""
import io, json, os, sys, unittest, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import Server
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "/tools/convert2/index.html"
MD = "# Einkauf\n\nText **fett**.\n\n| Name | Menge |\n|---|---|\n| Öl | 5 |\n| Salz | 7 |\n"


class Convert2UiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = Server()
        cls.srv.start()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.srv.stop()

    def open(self, lang="en", theme="dk", height=803, init=""):
        ctx = self.browser.new_context(viewport={"width": 426, "height": height}, accept_downloads=True)
        ctx.grant_permissions(["clipboard-read", "clipboard-write"])
        page = ctx.new_page()
        page.errors, page.external = [], []
        page.on("pageerror", lambda e: page.errors.append(str(e)))
        page.on("console", lambda m: page.errors.append(m.text) if m.type == "error" else None)
        page.on("request", lambda r: page.external.append(r.url) if not r.url.startswith(self.srv.base) and not r.url.startswith("data:") and not r.url.startswith("blob:") else None)
        page.add_init_script("if(!localStorage.getItem('heinz_settings'))localStorage.setItem('heinz_settings', JSON.stringify({lang:'%s', theme:'%s'}));%s" % (lang, theme, init))
        page.goto(self.srv.base + URL)
        page.wait_for_selector("html[data-c2=ready]")
        self.addCleanup(ctx.close)
        return page

    def put(self, page, text):
        page.fill("#in", text)
        page.wait_for_function("(t) => document.getElementById('in').value === t", arg=text)
        page.wait_for_timeout(350)

    def test_loads_without_errors_or_outside_requests_in_both_languages(self):
        for lang in ("en", "de"):
            p = self.open(lang=lang)
            self.assertEqual(p.errors, [])
            self.assertEqual(p.external, [])
            self.assertEqual(p.locator("#b-copy").inner_text().strip(), "Copy" if lang == "en" else "Kopieren")
            self.assertEqual(p.locator("#sec-in .caps span").first.inner_text().strip(), "1 · INPUT" if lang == "en" else "1 · EINGABE")

    def test_tool_json_is_valid(self):
        with open(os.path.join(ROOT, "tools", "convert2", "tool.json"), encoding="utf-8") as fh:
            d = json.load(fh)
        self.assertEqual((d["id"], d["entry"], d["status"], d["area"]), ("convert2", "tools/convert2/index.html", "beta", "tools"))
        for k in ("name", "desc"):
            self.assertTrue(d[k]["en"] and d[k]["de"])

    def test_markdown_table_becomes_tsv_csv_and_shows_the_sheet(self):
        p = self.open()
        self.put(p, MD)
        self.assertIn("Markdown table", p.locator("#det").inner_text())
        self.assertEqual(p.locator("#paper table tr").count(), 3)
        self.assertEqual(p.locator("#paper h1").inner_text(), "Einkauf")
        p.click("#seg-view button[data-view=code]")
        self.assertEqual(p.input_value("#out"), "Name\tMenge\nÖl\t5\nSalz\t7")
        p.select_option("#fmt", "csv")
        p.wait_for_function("() => document.getElementById('out').value.startsWith('\"Name\"')")
        self.assertEqual(p.input_value("#out"), '"Name","Menge"\n"Öl","5"\n"Salz","7"')

    def test_detects_other_inputs(self):
        p = self.open()
        for text, word in (("a;b\n1;2", "CSV"), ('[{"a":1}]', "JSON"), ("<h1>T</h1><p>x</p>", "HTML"), ("a\tb\n1\t2", "spreadsheet")):
            self.put(p, text)
            self.assertIn(word, p.locator("#det").inner_text(), text)

    def test_settings_and_draft_survive_a_reload(self):
        p = self.open()
        self.put(p, MD)
        p.select_option("#fmt", "latex")
        p.click("#seg-font button[data-font=serif]")
        p.reload()
        p.wait_for_selector("html[data-c2=ready]")
        self.assertEqual(p.input_value("#in"), MD)
        self.assertEqual(p.input_value("#fmt"), "latex")
        self.assertIn("serif", p.get_attribute("#paper", "class"))

    def test_download_text_and_epub(self):
        p = self.open()
        self.put(p, MD)
        p.select_option("#fmt", "markdown")
        p.wait_for_timeout(300)
        with p.expect_download() as d:
            p.click("#b-download")
        self.assertEqual(d.value.suggested_filename, "Einkauf.md")
        with open(d.value.path(), encoding="utf-8") as fh:
            self.assertEqual(fh.read(), MD.strip())
        p.select_option("#fmt", "epub")
        p.wait_for_selector("#epubopts:not([hidden])")
        p.fill("#eauthor", "Ich")
        p.wait_for_timeout(300)
        with p.expect_download() as d:
            p.click("#b-download")
        self.assertEqual(d.value.suggested_filename, "Einkauf.epub")
        z = zipfile.ZipFile(d.value.path())
        self.assertEqual(z.namelist()[0], "mimetype")
        self.assertIn(b"<dc:creator>Ich</dc:creator>", z.read("OEBPS/content.opf"))
        self.assertTrue(p.locator("#b-copy").is_disabled())

    def test_reader_shows_the_book_and_navigates(self):
        p = self.open()
        self.put(p, "# Eins\n\nerster Text\n\n## Unter\n\nmehr\n\n# Zwei\n\nzweiter Text")
        p.click("#b-reader")
        p.wait_for_selector("#reader:not([hidden])")
        p.wait_for_function("() => document.getElementById('r-body').textContent.includes('erster Text')")
        self.assertIn("1", p.locator("#r-pos").inner_text())
        self.assertTrue(p.locator("#r-prev").is_disabled())
        p.click("#r-next")
        p.wait_for_function("() => document.getElementById('r-body').textContent.includes('zweiter Text')")
        self.assertTrue(p.locator("#r-next").is_disabled())
        p.click("#r-toc")
        self.assertEqual(p.locator("#r-tocbox button").count(), 3)
        p.click("#r-tocbox button >> nth=0")
        p.wait_for_function("() => document.getElementById('r-body').textContent.includes('erster Text')")
        p.click("#r-larger")
        self.assertEqual(p.evaluate("() => document.getElementById('r-body').style.fontSize"), "18px")
        p.click("#r-close")
        self.assertTrue(p.locator("#reader").is_hidden())

    def test_open_an_epub_file_turns_it_into_markdown(self):
        p = self.open()
        self.put(p, "# Buch\n\nKapiteltext mit **fett**.\n\n# Zwei\n\nEnde")
        p.select_option("#fmt", "epub")
        p.wait_for_timeout(300)
        with p.expect_download() as d:
            p.click("#b-download")
        q = self.open()
        q.set_input_files("#file", d.value.path())
        q.wait_for_function("() => document.getElementById('in').value.includes('Kapiteltext')")
        q.wait_for_function("() => document.getElementById('det').textContent.length > 0")
        self.assertIn("EPUB", q.locator("#det").inner_text())
        self.assertIn("# Zwei", q.input_value("#in"))
        self.assertEqual(q.errors, [])

    def test_open_a_csv_file_and_reject_a_broken_epub(self):
        p = self.open()
        p.set_input_files("#file", files=[{"name": "t.csv", "mimeType": "text/csv", "buffer": "a;b\n1;2\n".encode()}])
        p.wait_for_function("() => document.getElementById('in').value.startsWith('a;b')")
        p.wait_for_function("() => document.getElementById('det').textContent.length > 0")
        self.assertIn("CSV", p.locator("#det").inner_text())
        p.set_input_files("#file", files=[{"name": "x.epub", "mimeType": "application/epub+zip", "buffer": b"kein zip"}])
        p.wait_for_selector("#msg:not([hidden])")
        self.assertIn("could not be read", p.locator("#msg").inner_text())

    def test_pasted_formatting_becomes_markdown_unless_switched_off(self):
        p = self.open()
        script = """(on) => {
            document.getElementById('cleanpaste').checked = on;
            const dt = new DataTransfer();
            dt.setData('text/html', '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>');
            dt.setData('text/plain', 'A\\tB\\n1\\t2');
            document.getElementById('in').value = '';
            document.getElementById('in').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
            return document.getElementById('in').value;
        }"""
        self.assertEqual(p.evaluate(script, True), "| A | B |\n| --- | --- |\n| 1 | 2 |")

    def test_no_horizontal_scrolling_light_and_dark_at_both_heights(self):
        for theme in ("dk", "lt"):
            for h in (803, 400):
                p = self.open(lang="de", theme=theme, height=h)
                self.put(p, MD)
                self.assertTrue(p.evaluate("() => document.documentElement.scrollWidth <= document.documentElement.clientWidth"), (theme, h))

    def test_print_shows_only_the_sheet(self):
        p = self.open()
        self.put(p, MD)
        p.emulate_media(media="print")
        self.assertTrue(p.locator("#sec-in").is_hidden())
        self.assertTrue(p.locator("#app-header").is_hidden())
        self.assertTrue(p.locator("#paper").is_visible())
        self.assertTrue(p.locator("#b-copy").is_hidden())

    def test_script_in_html_input_is_never_executed(self):
        p = self.open()
        self.put(p, '<p onclick="window.__x=1">Hallo</p><script>window.__x=1</script><img src=x onerror="window.__x=1">')
        p.wait_for_timeout(300)
        self.assertFalse(p.evaluate("() => window.__x === 1"))
        self.assertEqual(p.locator("#paper p").inner_text(), "Hallo")


if __name__ == "__main__":
    unittest.main()
