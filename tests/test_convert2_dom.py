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

    # ---- EPUB: Rundlauf Schreiben -> Lesen und fremde Datei (EPUB 2 mit NCX) ----
    PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

    def test_epub_round_trip(self):
        md = "# Buch\n\nText mit **fett**.\n\n## Teil\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n![Bild](data:image/png;base64,%s)\n\n# Zwei\n\n- x\n- y" % self.PNG
        r = self.page.evaluate("""async (md) => {
            const w = await import('/tools/convert2/mod/epub-schreiben.js'), l = await import('/tools/convert2/mod/epub-lesen.js');
            const book = await l.readEpub(await w.markdownToEpub(md, { language: 'de', author: 'Ich' }));
            return { meta: book.metadata, toc: book.toc, chapters: book.chapters.map(c => c.title), md: await l.epubToMarkdown(book), body: await book.chapterBody(0) };
        }""", md)
        self.assertEqual(r["meta"]["title"], "Buch")
        self.assertEqual(r["meta"]["creator"], "Ich")
        self.assertEqual(r["meta"]["language"], "de")
        self.assertEqual([(t["title"], t["level"]) for t in r["toc"]], [("Buch", 1), ("Teil", 2), ("Zwei", 1)])
        self.assertEqual(r["chapters"], ["Buch", "Zwei"])
        self.assertIn("# Buch", r["md"])
        self.assertIn("Text mit **fett**.", r["md"])
        self.assertIn("| A | B |\n| --- | --- |\n| 1 | 2 |", r["md"])
        self.assertIn("![Bild](data:image/png;base64,%s)" % self.PNG, r["md"])
        self.assertIn("- x\n- y", r["md"])
        self.assertIn("data:image/png;base64,", r["body"])

    def test_epub_reader_reads_an_epub2_file_with_ncx_and_blocks_scripts(self):
        import io, zipfile
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
            z.writestr("META-INF/container.xml", '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="content/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
            z.writestr("content/book.opf", '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Altes Buch</dc:title><dc:creator>Autor</dc:creator><dc:language>en</dc:language><dc:identifier id="id">x</dc:identifier></metadata><manifest><item id="n" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="a" href="text/a%20b.html" media-type="application/xhtml+xml"/><item id="b" href="text/b.html" media-type="application/xhtml+xml"/></manifest><spine toc="n"><itemref idref="a"/><itemref idref="b"/></spine></package>')
            z.writestr("content/toc.ncx", '<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><navMap><navPoint id="1" playOrder="1"><navLabel><text>Eins</text></navLabel><content src="text/a%20b.html"/><navPoint id="2" playOrder="2"><navLabel><text>Eins A</text></navLabel><content src="text/a%20b.html#x"/></navPoint></navPoint><navPoint id="3" playOrder="3"><navLabel><text>Zwei</text></navLabel><content src="text/b.html"/></navPoint></navMap></ncx>')
            z.writestr("content/text/a b.html", '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Eins</h1><p onclick="window.__x=1">Hallo <a href="javascript:alert(1)">w</a></p><script>window.__x=1</script></body></html>')
            z.writestr("content/text/b.html", '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Zwei</h1><p>Ende</p></body></html>')
        data = list(buf.getvalue())
        r = self.page.evaluate("""async (d) => {
            const l = await import('/tools/convert2/mod/epub-lesen.js');
            const book = await l.readEpub(new Uint8Array(d));
            return { meta: book.metadata, toc: book.toc.map(t => [t.title, t.level, t.href]), ch: book.chapters.map(c => [c.href, c.title]), md: await l.epubToMarkdown(book, { title: true }), body: await book.chapterBody(0), x: window.__x === 1 };
        }""", data)
        self.assertEqual(r["meta"]["title"], "Altes Buch")
        self.assertEqual(r["toc"], [["Eins", 1, "content/text/a b.html"], ["Eins A", 2, "content/text/a b.html#x"], ["Zwei", 1, "content/text/b.html"]])
        self.assertEqual(r["ch"], [["content/text/a b.html", "Eins"], ["content/text/b.html", "Zwei"]])
        self.assertEqual(r["md"], "# Altes Buch\n\n# Eins\n\nHallo w\n\n# Zwei\n\nEnde")
        self.assertNotIn("onclick", r["body"])
        self.assertNotIn("script", r["body"])
        self.assertFalse(r["x"])

    def test_epub_reader_rejects_files_that_are_not_epubs(self):
        r = self.page.evaluate("""async () => {
            const l = await import('/tools/convert2/mod/epub-lesen.js'), z = await import('/tools/convert2/mod/zip.js');
            const out = [];
            for (const f of [async () => l.readEpub(new Uint8Array([1,2,3])), async () => l.readEpub(await z.writeZip([{ name: 'a.txt', data: 'x' }]))]) {
                try { await f(); out.push('no error'); } catch (e) { out.push(String(e.message)); }
            }
            return out;
        }""")
        self.assertIn("kein Zip", r[0])
        self.assertIn("kein EPUB", r[1])


if __name__ == "__main__":
    unittest.main()
