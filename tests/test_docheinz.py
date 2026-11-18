"""docHeinz (tools/docheinz/): Node-Tests der Module, Browsertests der Module mit DOM und IndexedDB, Oberfläche (Playwright, Pixel-Viewport, keine Anfragen nach außen).
Echte Dateiauswahl des Handys, Hintergrund und Rückkehr, Speicherdruck gibt es nur am Gerät."""
import io, json, os, shutil, subprocess, sys, unittest, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import Server
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE = shutil.which("node")
URL = "/tools/docheinz/index.html"
PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="


def tiny_png(w=40, h=60, noisy=False):
    import struct, zlib
    raw = b"".join(b"\x00" + (os.urandom(3 * w) if noisy else bytes([200, 60, 60]) * w) for _ in range(h))
    def ch(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    return b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw)) + ch(b"IEND", b"")


def make_epub(title="Testbuch", author="Frau Test", chapters=2, drm=False, long=False, cover=None):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        z.writestr("META-INF/container.xml", '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/c.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
        if drm:
            z.writestr("META-INF/encryption.xml", '<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><EncryptedData xmlns="http://www.w3.org/2001/04/xmlenc#"><CipherData/></EncryptedData></encryption>')
        items = "".join('<item id="k%d" href="text/k%d.xhtml" media-type="application/xhtml+xml"/>' % (i, i) for i in range(1, chapters + 1))
        spine = "".join('<itemref idref="k%d"/>' % i for i in range(1, chapters + 1))
        opf = ('<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>%s</dc:title><dc:creator>%s</dc:creator><dc:language>de</dc:language><dc:identifier id="id">x</dc:identifier></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>%s</manifest><spine>%s</spine></package>' % (title, author, items, spine))
        if cover:
            items_extra = '<item id="cv" href="img/c.png" media-type="image/png"%s/>' % (' properties="cover-image"' if cover == "prop" else '')
            opf = opf.replace('</manifest>', items_extra + '</manifest>')
            if cover == "meta": opf = opf.replace('</metadata>', '<meta name="cover" content="cv"/></metadata>')
            z.writestr("OEBPS/img/c.png", tiny_png(120, 120, True) if cover == "page" else tiny_png())
        z.writestr("OEBPS/c.opf", opf)
        lis = "".join('<li><a href="text/k%d.xhtml">Kapitel %d</a></li>' % (i, i) for i in range(1, chapters + 1))
        z.writestr("OEBPS/nav.xhtml", '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol>%s</ol></nav></body></html>' % lis)
        for i in range(1, chapters + 1):
            nxt = '<p><a href="k%d.xhtml#ziel">weiter zu Kapitel %d</a></p>' % (i + 1, i + 1) if i < chapters else ""
            filler = "".join("<p>Absatz %d dieses langen Kapitels mit etwas Text, damit die Seite scrollt.</p>" % n for n in range(60)) if long else ""
            html = ('<html xmlns="http://www.w3.org/1999/xhtml"><head><style>body{background:red}</style></head><body><h1 id="ziel">Kapitel %d</h1><p class="x" style="position:fixed;background:url(http://evil.example/a.png)" onclick="window.__x=1">Text von Kapitel %d. <a href="https://evil.example/">extern</a></p>%s<script>window.__x=1</script><img src="http://evil.example/b.png" alt="Fremdbild"/>%s</body></html>' % (i, i, nxt, filler))
            if cover == "page" and i == 1:
                html = html.replace("<head>", "<head><title>Titelseite</title>").replace("<h1", '<img src="../img/c.png" alt=""/><h1')
            z.writestr("OEBPS/text/k%d.xhtml" % i, html)
    return buf.getvalue()


@unittest.skipUnless(NODE, "node fehlt")
class DocHeinzModuleTests(unittest.TestCase):
    def test_node_tests_of_all_modules_pass(self):
        files = sorted(f for f in os.listdir(os.path.join(ROOT, "tests", "docheinz")) if f.endswith(".test.mjs"))
        r = subprocess.run([NODE, "--test", *[os.path.join("tests", "docheinz", f) for f in files]], cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_copied_modules_match_convert2_apart_from_the_header_line(self):
        for f in ("zip", "text", "markdown", "html", "epub-lesen"):
            with open(os.path.join(ROOT, "tools", "convert2", "mod", f + ".js"), encoding="utf-8") as fa:
                a = fa.read()
            with open(os.path.join(ROOT, "tools", "docheinz", "mod", f + ".js"), encoding="utf-8") as fb:
                b = fb.read().split("\n", 1)[1]
            self.assertEqual(a.replace("tools/convert2/mod", "X"), b.replace("tools/convert2/mod", "X"), f)


class DocHeinzBase(unittest.TestCase):
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


class DocHeinzDomTests(DocHeinzBase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.page = cls.browser.new_page()
        cls.page.add_init_script("window.__x = 0")
        cls.page.goto(cls.srv.base + "/manifest.webmanifest")

    def ev(self, js, arg=None):
        return self.page.evaluate("async (a) => { const S = await import('/tools/docheinz/mod/sauber.js'), B = await import('/tools/docheinz/mod/buch.js'), Db = await import('/tools/docheinz/mod/db.js'); " + js + " }", arg)

    def test_sauber_keeps_text_structure_and_removes_everything_active(self):
        out = self.ev("""return S.sauber('<h1 id="t" class="c" style="color:red">Titel</h1><p onclick="window.__x=1">A <b>fett</b> <script>window.__x=1</script><a href="https://evil.example/">extern</a> <a href="javascript:window.__x=1">js</a> <a href="mailto:a@b.de">mail</a></p><svg><circle/></svg><iframe src="x"></iframe><form><input></form><img src="http://evil.example/a.png" alt="Fremd"><img src="data:image/png;base64,%s" alt="ok"><img src="data:image/svg+xml;base64,AAAA">', { base: 'OEBPS/text/k1.xhtml' });""" % PNG)
        self.assertIn('<h1 id="t">Titel</h1>', out)
        self.assertIn("<b>fett</b>", out)
        for bad in ("onclick", "script", "style=", "class=", "evil.example", "javascript", "mailto", "<svg", "<iframe", "<form", "<input", "svg+xml"):
            self.assertNotIn(bad, out, bad)
        self.assertIn("extern", out)            # Text bleibt
        self.assertIn("Fremd", out)             # Alternativtext statt Bild
        self.assertIn('src="data:image/png;base64,', out)
        self.assertFalse(self.ev("return window.__x === 1"))

    def test_sauber_turns_internal_links_into_data_go(self):
        out = self.ev("""return S.sauber('<p><a href="k2.xhtml#a">zwei</a> <a href="../img/../k3.xhtml">drei</a> <a href="#hier" epub:type="noteref">fn</a></p>', { base: 'OEBPS/text/k1.xhtml' });""")
        self.assertIn('data-go="OEBPS/text/k2.xhtml#a"', out)
        self.assertIn('data-go="OEBPS/k3.xhtml"', out)
        self.assertIn('data-go="OEBPS/text/k1.xhtml#hier"', out)
        self.assertIn('data-etype="noteref"', out)
        self.assertNotIn("href=", out)

    def test_plain_text(self):
        self.assertEqual(self.ev("return S.plain('<style>x{}</style><p>Ein  <b>Satz</b></p><script>1</script>');"), "Ein Satz")

    def test_formats(self):
        r = self.ev("return ['a.EPUB','b.md','c.markdown','d.txt','e.html','f.pdf','g.mobi','h.azw3','i.fb2','j.cbz'].map(n => B.formatOf(n, '')).concat([B.formatOf('x', 'application/epub+zip'), B.formatOf('x', 'text/plain'), B.formatOf('x', '')]);")
        self.assertEqual(r, ["epub", "md", "md", "txt", "html", "pdf", "other", "other", "other", "other", "epub", "txt", "other"])

    def test_text_books(self):
        r = self.ev("""
            const enc = new TextEncoder(), out = {};
            const t = await B.openSource(enc.encode('Erster Absatz\\nzweite Zeile.\\n\\nZweiter <b>Absatz</b>.'), 'txt', 'mein_buch.txt');
            out.txt = [t.metadata.title, t.chapters.length, await t.html(0)];
            const m = await B.openSource(enc.encode('# Haupttitel\\n\\nText.\\n\\n## Unter\\n\\nmehr'), 'md', 'x.md');
            out.md1 = [m.metadata.title, m.chapters.length, m.toc.length];
            const m2 = await B.openSource(enc.encode('# Eins\\n\\na\\n\\n# Zwei\\n\\nb'), 'md', 'zwei.md');
            out.md2 = [m2.metadata.title, m2.chapters.map(c => c.title), (await m2.html(1)).includes('Zwei'), m2.resolve('k2#x')];
            const h = await B.openSource(enc.encode('<html lang="de"><head><title>Seite</title><script>window.__x=1</script></head><body><h1>Kopf</h1><p>Inhalt</p></body></html>'), 'html', 'q.html');
            out.html = [h.metadata.title, h.metadata.language, await h.html(0)];
            const w = await B.openSource(new Uint8Array([0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72]), 'txt', 'w.txt');
            out.w1252 = await w.html(0);
            const bom = await B.openSource(new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x69]), 'txt', 'b.txt');
            out.bom = await bom.html(0);
            return out;""")
        self.assertEqual(r["txt"], ["mein buch", 1, "<p>Erster Absatz zweite Zeile.</p>\n<p>Zweiter &lt;b&gt;Absatz&lt;/b&gt;.</p>"])
        self.assertEqual(r["md1"], ["Haupttitel", 1, 1])
        self.assertEqual(r["md2"], ["zwei", ["Eins", "Zwei"], True, {"index": 1, "anchor": "x"}])
        self.assertEqual(r["html"][:2], ["Seite", "de"])
        self.assertIn("<h1>Kopf</h1>", r["html"][2])
        self.assertNotIn("script", r["html"][2])
        self.assertEqual(r["w1252"], "<p>Müller</p>")
        self.assertEqual(r["bom"], "<p>Hi</p>")
        self.assertFalse(self.ev("return window.__x === 1"))

    def test_errors_have_clear_codes(self):
        r = self.ev("""
            const out = {}, enc = new TextEncoder();
            for (const [k, bytes, fmt, name] of [['pdf', new Uint8Array([1]), 'pdf', 'a.pdf'], ['mobi', new Uint8Array([1]), 'other', 'a.mobi'], ['empty', enc.encode('  \\n '), 'txt', 'e.txt'], ['bad', new Uint8Array([1, 2, 3]), 'epub', 'b.epub'], ['emptyhtml', enc.encode('<script>1</script>'), 'html', 'h.html']]) {
                try { await B.openSource(bytes, fmt, name); out[k] = 'no error'; } catch (e) { out[k] = [e instanceof B.BuchFehler, e.code, e.detail]; }
            }
            return out;""")
        self.assertEqual(r["pdf"], [True, "pdf", ""])
        self.assertEqual(r["mobi"], [True, "unsupported", "mobi"])
        self.assertEqual(r["empty"][1], "empty")
        self.assertEqual(r["bad"][1], "unreadable")
        self.assertEqual(r["emptyhtml"][1], "empty")

    def read_epub(self, data, extra=""):
        return self.ev("""const src = await B.openSource(new Uint8Array(a), 'epub', 'b.epub'); const d = await B.describe(src); %s""" % (extra or "return { m: src.metadata, toc: src.toc, ch: src.chapters, lens: d.lens, h0: await src.html(0), r: src.resolve('OEBPS/text/k2.xhtml#ziel') };"), list(data))

    def test_epub_source_is_clean_and_resolvable(self):
        r = self.read_epub(make_epub(chapters=2))
        self.assertEqual((r["m"]["title"], r["m"]["creator"], r["m"]["language"]), ("Testbuch", "Frau Test", "de"))
        self.assertEqual([t["title"] for t in r["toc"]], ["Kapitel 1", "Kapitel 2"])
        self.assertEqual(len(r["ch"]), 2)
        self.assertEqual(len(r["lens"]), 2)
        self.assertTrue(all(n > 20 for n in r["lens"]))
        self.assertEqual(r["r"], {"index": 1, "anchor": "ziel"})
        for bad in ("onclick", "script", "style", "evil.example", "class="):
            self.assertNotIn(bad, r["h0"], bad)
        self.assertIn("Text von Kapitel 1", r["h0"])
        self.assertIn('data-go="OEBPS/text/k2.xhtml#ziel"', r["h0"])
        self.assertNotIn("Fremdbild", r["h0"])      # fremdes Bild: das EPUB-Lesen entfernt es ganz
        self.assertFalse(self.ev("return window.__x === 1"))

    def test_epub_with_drm_is_refused(self):
        r = self.ev("try { await B.openSource(new Uint8Array(a), 'epub', 'd.epub'); return 'no error'; } catch (e) { return e.code; }", list(make_epub(drm=True)))
        self.assertEqual(r, "drm")

    def test_database_round_trip(self):
        r = self.ev("""
            const db = await Db.openDb('docheinz_test_' + Date.now()), out = {};
            await db.put({ id: 'a', title: 'A', added: 1 }, new Blob(['hallo']));
            await db.put({ id: 'b', title: 'B', added: 2 }, new Blob(['welt']));
            out.list = (await db.list()).map(r => r.id).sort();
            out.file = await (await db.file('a')).text();
            out.upd = (await db.update('a', { frac: 0.5 })).frac;
            out.got = (await db.get('a')).title + (await db.get('a')).frac;
            out.none = [await db.get('zz'), await db.file('zz'), await db.update('zz', {})];
            await db.remove('a');
            out.after = [(await db.list()).length, await db.file('a')];
            await db.clear();
            out.cleared = (await db.list()).length;
            const s = await Db.storage();
            out.storage = ['usage' in s, 'quota' in s, 'persisted' in s];
            db.close();
            return out;""")
        self.assertEqual(r["list"], ["a", "b"])
        self.assertEqual(r["file"], "hallo")
        self.assertEqual(r["upd"], 0.5)
        self.assertEqual(r["got"], "A0.5")
        self.assertEqual(r["none"], [None, None, None])
        self.assertEqual(r["after"], [1, None])
        self.assertEqual(r["cleared"], 0)
        self.assertEqual(r["storage"], [True, True, True])


LONG_MD = "# Langes Buch\n\n" + "\n\n".join("Absatz %d mit genug Text, damit die Leseansicht scrollen muss und der Fortschritt messbar wird." % i for i in range(120))


class DocHeinzUiTests(DocHeinzBase):
    def open(self, lang="en", theme="dk", height=803):
        ctx = self.browser.new_context(viewport={"width": 426, "height": height})
        page = ctx.new_page()
        page.errors, page.external = [], []
        page.on("pageerror", lambda e: page.errors.append(str(e)))
        page.on("console", lambda m: page.errors.append(m.text) if m.type == "error" else None)
        page.on("request", lambda r: page.external.append(r.url) if not r.url.startswith(self.srv.base) and not r.url.startswith("data:") and not r.url.startswith("blob:") else None)
        page.add_init_script("window.__x = 0; if(!localStorage.getItem('heinz_settings'))localStorage.setItem('heinz_settings', JSON.stringify({lang:'%s', theme:'%s'}));" % (lang, theme))
        page.goto(self.srv.base + URL)
        page.wait_for_selector("html[data-dh=ready]")
        self.addCleanup(ctx.close)
        return page

    def add(self, page, *files):
        page.set_input_files("#file", files=[{"name": n, "mimeType": m, "buffer": b} for n, m, b in files])

    def epub(self, **kw):
        return make_epub(**kw)

    def rows(self, p):
        return p.locator("#list .dh-book").count()

    def test_loads_without_errors_or_outside_requests_in_both_languages(self):
        for lang, add, empty in (("en", "Add books", "Your library is empty"), ("de", "Bücher hinzufügen", "Deine Bibliothek ist leer")):
            p = self.open(lang=lang)
            self.assertEqual(p.errors, [])
            self.assertEqual(p.external, [])
            self.assertEqual(p.locator("#b-add span").inner_text().strip(), add)
            self.assertIn(empty, p.locator("#empty").inner_text())
            self.assertEqual(p.evaluate("() => document.documentElement.scrollWidth <= innerWidth"), True)

    def test_tool_json_is_valid(self):
        with open(os.path.join(ROOT, "tools", "docheinz", "tool.json"), encoding="utf-8") as fh:
            d = json.load(fh)
        self.assertEqual((d["id"], d["entry"], d["status"], d["area"]), ("docheinz", "tools/docheinz/index.html", "beta", "tools"))
        for k in ("name", "desc"):
            self.assertTrue(d[k]["en"] and d[k]["de"])
        self.assertTrue(os.path.isfile(os.path.join(ROOT, d["entry"])))

    def test_add_books_list_search_sort_and_reload(self):
        p = self.open()
        self.add(p, ("zeta.epub", "application/epub+zip", self.epub(title="Zeta Buch", author="Anna")), ("alpha.md", "text/markdown", b"# Alpha\n\nText."), ("notizen.txt", "text/plain", "Nur ein Absatz.".encode()))
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 3")
        self.assertIn("3 added", p.locator("#msg").inner_text())
        self.assertEqual(p.locator("#count").inner_text(), "3 books")
        p.select_option("#sort", "title")
        titles = lambda: p.locator("#list .dh-tx b").all_inner_texts()
        self.assertEqual(titles(), ["Alpha", "notizen", "Zeta Buch"])
        self.assertIn("Anna", p.locator("#list .dh-book", has_text="Zeta Buch").inner_text())
        p.fill("#q", "anna")
        self.assertEqual(titles(), ["Zeta Buch"])
        p.fill("#q", "gibtsnicht")
        self.assertEqual(self.rows(p), 0)
        self.assertIn("No book matches", p.locator("#empty").inner_text())
        p.fill("#q", "")
        p.reload()
        p.wait_for_selector("html[data-dh=ready]")
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 3")
        self.assertEqual(p.input_value("#sort"), "title")
        self.assertEqual(p.errors, [])
        self.assertEqual(p.external, [])

    def test_duplicate_and_refused_formats_give_clear_messages(self):
        p = self.open()
        self.add(p, ("a.txt", "text/plain", b"Hallo Welt."))
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 1")
        self.add(p, ("a.txt", "text/plain", b"Hallo Welt."), ("x.pdf", "application/pdf", b"%PDF-1.4"), ("y.mobi", "application/x-mobipocket-ebook", b"BOOKMOBI"), ("e.epub", "application/epub+zip", self.epub(drm=True)), ("leer.txt", "text/plain", b"   "), ("kaputt.epub", "application/epub+zip", b"kein zip"))
        p.wait_for_function("() => document.getElementById('msg').textContent.includes('kaputt.epub')")
        m = p.locator("#msg").inner_text()
        for part in ("“a.txt” is already in the library", "PDF is not supported yet", "format .mobi is not supported", "copy-protected", "no readable text", "could not be read"):
            self.assertIn(part, m)
        self.assertEqual(self.rows(p), 1)
        self.assertEqual(p.locator("#msg.err").count(), 1)

    def test_german_messages(self):
        p = self.open(lang="de")
        self.add(p, ("x.pdf", "application/pdf", b"%PDF-1.4"))
        p.wait_for_function("() => document.getElementById('msg').textContent.includes('PDF')")
        self.assertIn("PDF wird noch nicht unterstützt", p.locator("#msg").inner_text())

    def test_delete_asks_first_and_removes_the_book(self):
        p = self.open()
        self.add(p, ("a.txt", "text/plain", b"Hallo."), ("b.txt", "text/plain", b"Welt."))
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 2")
        p.click("#list .dh-book:has(.dh-tx b:text-is('a')) .dh-del")
        self.assertIn("Delete “a” from this device?", p.locator("#list .dh-book.ask").inner_text())
        p.click("#list .dh-book.ask button[data-act=no]")
        self.assertEqual(self.rows(p), 2)
        p.click("#list .dh-book:has(.dh-tx b:text-is('a')) .dh-del")
        p.click("#list .dh-book.ask button[data-act=yes]")
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 1")
        p.reload()
        p.wait_for_selector("html[data-dh=ready]")
        p.wait_for_function("() => document.querySelectorAll('#list .dh-book').length === 1")
        self.assertEqual(p.locator("#list .dh-tx b").inner_text(), "b")

    def start_book(self, p, name, mime, data, cover=False):
        self.add(p, (name, mime, data))
        p.wait_for_selector("#list .dh-open")
        p.click("#list .dh-open")
        p.wait_for_selector("#reader:not([hidden])")
        p.wait_for_function("() => document.getElementById('reader').dataset.pages > 0")
        if not cover:
            self.tap(p, "next")                 # Titelseite überspringen
            p.wait_for_function("() => document.getElementById('reader').dataset.cover === '0'")

    def tap(self, p, where):
        w, h = 426, p.evaluate("() => innerHeight")
        x, y = {"next": (w * 0.9, h * 0.5), "prev": (w * 0.1, h * 0.5), "top": (w * 0.5, h * 0.05), "mid": (w * 0.5, h * 0.5)}[where]
        p.mouse.click(x, y)

    def pg(self, p):
        return p.evaluate("() => [+document.getElementById('reader').dataset.page, +document.getElementById('reader').dataset.pages, +document.getElementById('reader').dataset.ch]")

    def test_reader_opens_epub_cleanly_navigates_and_follows_links(self):
        p = self.open()
        self.start_book(p, "t.epub", "application/epub+zip", self.epub(chapters=3))
        p.wait_for_function("() => document.getElementById('r-body').textContent.includes('Text von Kapitel 1')")
        self.assertIn("Part 1 of 3", p.locator("#r-pos").inner_text())
        self.assertEqual(p.evaluate("() => [document.querySelectorAll('#r-body script, #r-body style, #r-body [onclick], #r-body [style], #r-body a[href]').length, window.__x]"), [0, 0])
        p.click("#r-body a[data-go]")
        p.wait_for_function("() => document.getElementById('r-body').textContent.includes('Text von Kapitel 2')")
        self.tap(p, "next")
        p.wait_for_function("() => document.getElementById('r-body').textContent.includes('Text von Kapitel 3')")
        self.assertTrue(p.locator("#r-next").is_disabled())
        self.tap(p, "top")
        p.click("#r-toc-b")
        self.assertEqual(p.locator("#r-toc button").count(), 3)
        p.click("#r-toc button >> nth=0")
        p.wait_for_function("() => document.getElementById('r-body').textContent.includes('Text von Kapitel 1')")
        self.assertTrue(p.locator("#r-ov").is_hidden())
        self.assertEqual(p.errors, [])
        self.assertEqual(p.external, [])

    def test_pages_without_scrollbar_tap_zones_and_overlay(self):
        p = self.open()
        self.start_book(p, "lang.md", "text/markdown", LONG_MD.encode())
        page, pages, _ = self.pg(p)
        self.assertEqual(page, 1)
        self.assertGreater(pages, 5)
        self.tap(p, "prev")                     # erste Seite: zurück führt zur Titelseite
        self.assertEqual(p.get_attribute("#reader", "data-cover"), "1")
        self.tap(p, "next")
        # keine Kopfzeile, keine Steuerung, keine Knöpfe im Lesemodus
        self.assertTrue(p.locator("#r-ov").is_hidden())
        self.assertTrue(p.locator("#r-next").is_hidden())
        self.assertTrue(p.evaluate("() => { const b = document.getElementById('r-body'); return b.scrollHeight <= b.clientHeight + 1 && getComputedStyle(b).overflow === 'hidden'; }"))
        self.assertTrue(p.evaluate("() => document.querySelector('.dh-header, header') === null || getComputedStyle(document.querySelector('#reader')).position === 'fixed'"))
        self.tap(p, "next"); self.tap(p, "next")
        self.assertEqual(self.pg(p)[0], 3)
        self.tap(p, "mid")
        self.assertEqual(self.pg(p)[0], 3)
        self.tap(p, "prev")
        self.assertEqual(self.pg(p)[0], 2)
        # Steuerung nur bei Tipp oben; Text verschiebt sich dabei nicht
        before = p.evaluate("() => document.getElementById('r-body').getBoundingClientRect().top")
        self.tap(p, "top")
        self.assertTrue(p.locator("#r-ov").is_visible())
        self.assertEqual(p.evaluate("() => document.getElementById('r-body').getBoundingClientRect().top"), before)
        self.tap(p, "next")                       # schließt nur die Steuerung
        self.assertTrue(p.locator("#r-ov").is_hidden())
        self.assertEqual(self.pg(p)[0], 2)
        # Tasten
        p.keyboard.press("ArrowRight")
        self.assertEqual(self.pg(p)[0], 3)
        # Fortschritt gespeichert und wiederhergestellt
        p.wait_for_timeout(700)
        p.click("#r-close") if p.locator("#r-close").is_visible() else (self.tap(p, "top"), p.click("#r-close"))
        p.wait_for_selector("#reader", state="hidden")
        p.click("#list .dh-open")
        p.wait_for_selector("#reader:not([hidden])")
        p.wait_for_function("() => document.getElementById('reader').dataset.page === '3'")

    def test_cover_page_and_library_preview(self):
        for mode in ("prop", "meta", "page"):
            p = self.open()
            self.start_book(p, "c.epub", "application/epub+zip", self.epub(chapters=2, cover=mode), cover=True)
            self.assertEqual(p.get_attribute("#reader", "data-cover"), "1", mode)
            self.assertTrue(p.locator("#r-cimg").is_visible(), mode)
            self.assertTrue(p.evaluate("() => document.getElementById('r-cimg').naturalWidth > 0"))
            self.assertTrue(p.locator("#r-ctitle").is_hidden())
            self.tap(p, "prev")
            self.assertEqual(p.get_attribute("#reader", "data-cover"), "1")
            self.tap(p, "next")
            self.assertEqual(p.get_attribute("#reader", "data-cover"), "0")
            p.wait_for_function("() => document.getElementById('r-body').textContent.includes('Kapitel 1')")
            self.tap(p, "top"); p.click("#r-close")
            p.wait_for_selector("#reader", state="hidden")
            self.assertEqual(p.locator("#list .dh-cover.has img").count(), 1, mode)
            self.assertTrue(p.evaluate("() => document.querySelector('#list .dh-cover img').naturalWidth > 0"))
            self.assertEqual(p.errors, [])

    def test_title_page_without_cover_image(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# Mein Buch\n\nText.", cover=True)
        self.assertEqual(p.get_attribute("#reader", "data-cover"), "1")
        self.assertTrue(p.locator("#r-ctitle").is_visible())
        self.assertEqual(p.locator("#r-ct").inner_text(), "Mein Buch")

    def test_old_books_get_their_cover_afterwards(self):
        p = self.open()
        self.add(p, ("c.epub", "application/epub+zip", self.epub(chapters=1, cover="prop")))
        p.wait_for_selector("#list .dh-cover.has img")
        p.evaluate("async () => { const m = await import('/tools/docheinz/mod/db.js'); const d = await m.openDb(); const [b] = await d.list(); await d.update(b.id, { cover: null, coverTried: false }); d.close(); }")
        p.reload()
        p.wait_for_selector("html[data-dh=ready]")
        p.wait_for_selector("#list .dh-cover.has img")

    # ---------- Phase 2c: Markierungsleiste ----------
    def select_text(self, p, needle):
        p.evaluate("""(needle) => {
            const b = document.getElementById('r-body'), w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
            let n; while ((n = w.nextNode())) { const i = n.nodeValue.indexOf(needle); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + needle.length); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return; } }
            throw new Error('not found');
        }""", needle)

    def fake_ollama(self, p, chunks=("Das ist", " die Erklärung.")):
        calls = []
        def handle(route):
            url = route.request.url
            if url.endswith("/api/chat"):
                calls.append(json.loads(route.request.post_data))
                lines = [json.dumps({"message": {"role": "assistant", "content": c}, "done": False}) for c in chunks] + [json.dumps({"done": True, "eval_count": 5})]
                return route.fulfill(status=200, content_type="application/x-ndjson", body="\n".join(lines) + "\n")
            if url.endswith("/api/ps") or url.endswith("/api/tags"):
                return route.fulfill(status=200, content_type="application/json", body=json.dumps({"models": []}))
            return route.fulfill(status=200, content_type="application/json", body="{}")
        p.route("**/localhost:11434/**", handle)
        return calls

    def set_active(self, p, provider, model):
        p.evaluate("([a, b]) => localStorage.setItem('heinz_active', JSON.stringify({ provider: a, model: b }))", [provider, model])

    def test_selection_bar_appears_and_search_jumps_to_the_hit(self):
        p = self.open()
        self.start_book(p, "t.epub", "application/epub+zip", self.epub(chapters=3))
        self.assertTrue(p.locator("#r-sel").is_hidden())
        self.select_text(p, "Text von Kapitel 1")
        p.wait_for_selector("#r-sel:not([hidden])")
        self.assertEqual(p.locator("#r-sel button:visible").count(), 3)
        p.click("#r-sel [data-sel=search]")
        p.wait_for_selector("#r-sheet:not([hidden]) .dh-hit")
        self.assertTrue(p.locator("#r-sel").is_hidden())
        p.click("#rs-close")
        self.select_text(p, "Kapitel")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=search]")
        p.wait_for_selector("#r-sheet .dh-hit")
        n = p.locator("#rs-body .dh-hit").count()
        self.assertGreaterEqual(n, 3)
        p.locator("#rs-body .dh-hit").nth(n - 1).click()
        self.assertTrue(p.locator("#r-sheet").is_hidden())
        p.wait_for_function("() => +document.getElementById('reader').dataset.ch >= 3")
        self.assertTrue(p.evaluate("() => !window.Highlight || (CSS.highlights && CSS.highlights.has('dh-hit'))"))
        self.assertEqual(p.errors, [])

    def test_search_without_hits_and_tap_closes_the_sheet(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# Titel\n\nEin kurzer Text.")
        self.select_text(p, "kurzer")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=search]")
        p.wait_for_selector("#r-sheet:not([hidden])")
        self.assertEqual(p.locator("#rs-body .dh-hit").count(), 1)
        p.click("#rs-close")
        self.assertTrue(p.locator("#r-sheet").is_hidden())
        self.select_text(p, "Ein")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=search]")
        p.wait_for_selector("#r-sheet:not([hidden])")
        self.tap(p, "mid")                         # Tipp auf den Text schließt nur das Blatt
        self.assertTrue(p.locator("#r-sheet").is_hidden())

    def test_explain_uses_the_active_local_model_and_sends_only_the_passage(self):
        p = self.open(lang="de")
        calls = self.fake_ollama(p)
        self.start_book(p, "a.md", "text/markdown", "# Ein Titel\n\nDer Übermensch ist der Sinn der Erde.".encode(), )
        self.set_active(p, "ollama", "test:1b")
        self.select_text(p, "Übermensch")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=explain]")
        p.wait_for_function("() => document.querySelector('#rs-body .dh-sout') && document.querySelector('#rs-body .dh-sout').textContent.includes('Erklärung')")
        self.assertEqual(len(calls), 1)
        body = calls[0]
        self.assertEqual(body["model"], "test:1b")
        self.assertEqual([m["role"] for m in body["messages"]], ["system", "user"])
        self.assertIn("Übermensch", body["messages"][1]["content"])
        self.assertNotIn("Sinn der Erde", body["messages"][1]["content"])
        self.assertIn("Deutsch", body["messages"][0]["content"])
        self.assertIn("test:1b", p.locator("#rs-sub").inner_text())
        self.assertTrue(p.locator("#rs-copy").is_visible())
        self.assertEqual([u for u in p.external if "localhost:11434" not in u], [])

    def test_ask_more_opens_the_analysis_window_with_history_and_page_context(self):
        p = self.open(lang="de")
        calls = self.fake_ollama(p, chunks=("Antwort", " eins."))
        self.start_book(p, "a.md", "text/markdown", "# Titel\n\nDer Übermensch ist der Sinn der Erde. Seitenumfeld Zebra.".encode())
        self.set_active(p, "ollama", "test:1b")
        self.select_text(p, "Übermensch")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=explain]")
        p.wait_for_selector("#rs-more:not([hidden])")
        p.click("#rs-more")
        p.wait_for_selector("#r-ana:not([hidden])")
        self.assertTrue(p.locator("#r-sheet").is_hidden())
        self.assertEqual(p.locator("#ra-pass").inner_text(), "Übermensch")
        self.assertIn("Antwort eins.", p.locator("#ra-body").inner_text())
        # Nachfrage nur mit der Markierung
        p.fill("#ra-q", "Warum?")
        p.click("#ra-send")
        p.wait_for_function("() => document.querySelectorAll('#ra-body .dh-m.a').length === 2 && !document.getElementById('ra-stop').offsetParent")
        self.assertEqual(len(calls), 2)
        self.assertEqual([m["role"] for m in calls[1]["messages"]], ["system", "user", "assistant", "user"])
        self.assertEqual(calls[1]["messages"][3]["content"], "Warum?")
        self.assertNotIn("Zebra", json.dumps(calls[1]))
        # mit Seitentext
        p.click("#ra-seg [data-ctx='1']")
        p.fill("#ra-q", "Und weiter?")
        p.keyboard.press("Enter")
        p.wait_for_function("() => document.querySelectorAll('#ra-body .dh-m.a').length === 3 && !document.getElementById('ra-stop').offsetParent")
        self.assertEqual(len(calls), 3)
        self.assertIn("Zebra", calls[2]["messages"][1]["content"])
        self.assertEqual([m["role"] for m in calls[2]["messages"]], ["system", "user", "assistant", "user", "assistant", "user"])
        # Zurück-Taste schließt nur das Fenster, nicht den Reader
        p.go_back()
        p.wait_for_selector("#r-ana", state="hidden")
        self.assertTrue(p.locator("#reader").is_visible())
        self.assertEqual(self.pg(p)[2], 1)
        self.assertEqual(p.errors, [])

    def test_analysis_close_button_and_stop(self):
        p = self.open()
        self.fake_ollama(p)
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nEin Satz zum Erklaeren.")
        self.set_active(p, "ollama", "test:1b")
        self.select_text(p, "Satz zum")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=summary]")
        p.wait_for_selector("#rs-more:not([hidden])")
        p.click("#rs-more")
        p.wait_for_selector("#r-ana:not([hidden])")
        p.click("#ra-close")
        p.wait_for_selector("#r-ana", state="hidden")
        self.assertTrue(p.locator("#reader").is_visible())
        self.assertEqual(p.evaluate("() => history.length > 0"), True)

    def test_summary_without_model_gives_a_clear_hint(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nEin Satz zum Zusammenfassen.")
        self.select_text(p, "Ein Satz zum")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=summary]")
        p.wait_for_selector("#r-sheet:not([hidden]) .dh-sline")
        self.assertIn("Dashboard", p.locator("#rs-body").inner_text())

    def test_online_model_is_blocked_without_allow_online_and_sends_nothing(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nEin Satz zum Erklaeren.")
        self.set_active(p, "groq", "llama-x")
        sent = []
        p.on("request", lambda r: sent.append(r.url) if "groq.com" in r.url else None)
        self.select_text(p, "Satz zum")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=explain]")
        p.wait_for_selector("#rs-body .dh-sline.err")
        self.assertIn("Allow online", p.locator("#rs-body").inner_text())
        self.assertEqual(sent, [])

    def test_online_model_shows_what_is_sent_when_online_is_allowed(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nEin Satz zum Erklaeren.")
        p.evaluate("async () => { const m = await import('/lib/providers.js'); m.HeinzProviders.setOnlineAllowed(true); m.HeinzProviders.setKey('groq', 'k'); m.HeinzProviders.setActiveModel('groq', 'llama-x'); }")
        sent = []
        def route(r):
            sent.append(json.loads(r.request.post_data or "{}")) if r.request.method == "POST" else None
            if r.request.method == "OPTIONS":
                return r.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*"})
            lines = ["data: " + json.dumps({"choices": [{"delta": {"content": "Online-Antwort"}}]}), "data: [DONE]"]
            r.fulfill(status=200, content_type="text/event-stream", headers={"access-control-allow-origin": "*"}, body="\n".join(lines) + "\n")
        p.route("**/api.groq.com/**", route)
        self.select_text(p, "Satz zum")
        p.wait_for_selector("#r-sel:not([hidden])")
        p.click("#r-sel [data-sel=explain]")
        p.wait_for_function("() => document.querySelector('#rs-body .dh-sout') && document.querySelector('#rs-body .dh-sout').textContent.includes('Online-Antwort')")
        self.assertIn("Groq", p.locator("#rs-body .dh-sline.warn").inner_text())
        self.assertEqual(len(sent), 1)
        self.assertEqual(sent[0]["model"], "llama-x")
        self.assertNotIn("Zeitgeist", json.dumps(sent[0]))

    def test_sheet_and_bar_fit_the_small_viewport(self):
        p = self.open(height=400)
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nEin Satz zum Suchen.")
        self.select_text(p, "Satz")
        p.wait_for_selector("#r-sel:not([hidden])")
        self.assertTrue(p.evaluate("() => { const r = document.getElementById('r-sel').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }"))
        p.click("#r-sel [data-sel=search]")
        p.wait_for_selector("#r-sheet:not([hidden])")
        self.assertTrue(p.evaluate("() => { const r = document.getElementById('r-sheet').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth; }"))

    def test_page_count_follows_font_size_and_keeps_position(self):
        p = self.open()
        self.start_book(p, "lang.md", "text/markdown", LONG_MD.encode())
        n1 = self.pg(p)[1]
        for _ in range(n1 // 2):
            self.tap(p, "next")
        self.tap(p, "top"); p.click("#r-set-b")
        p.fill("#r-size", "30")
        p.wait_for_function("(n) => +document.getElementById('reader').dataset.pages > n", arg=n1)
        page, pages, _ = self.pg(p)
        self.assertTrue(abs(page / pages - 0.5) < 0.12, (page, pages))

    def test_optional_turn_buttons(self):
        p = self.open()
        self.start_book(p, "lang.md", "text/markdown", LONG_MD.encode())
        self.tap(p, "top"); p.click("#r-set-b")
        p.click("#seg-btns button[data-btns='1']")
        self.assertTrue(p.locator("#r-next").is_visible())
        p.click("#r-next")
        self.assertEqual(self.pg(p)[0], 2)

    def test_fonts_are_served_and_selectable(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nText.")
        self.tap(p, "top"); p.click("#r-set-b")
        self.assertEqual(p.locator("#seg-font button").count(), 7)
        p.click("#seg-font button[data-font=atkinson]")
        self.assertEqual(p.get_attribute("#reader", "data-font"), "atkinson")
        p.wait_for_function("() => document.fonts.check('19px \"Atkinson Hyperlegible\"')")
        self.assertEqual(p.errors, [])

    def test_reader_settings_size_and_theme_persist(self):
        p = self.open()
        self.start_book(p, "a.md", "text/markdown", b"# T\n\nText.")
        self.tap(p, "top")
        p.click("#r-set-b")
        p.fill("#r-size", "27")
        self.assertEqual(p.evaluate("() => getComputedStyle(document.getElementById('r-body')).fontSize"), "27px")
        p.click("#seg-theme button[data-rt=sepia]")
        self.assertEqual(p.get_attribute("#reader", "data-rt"), "sepia")
        self.assertEqual(p.evaluate("() => getComputedStyle(document.getElementById('reader')).backgroundColor"), "rgb(244, 236, 216)")
        p.click("#seg-theme button[data-rt=black]")
        self.assertEqual(p.evaluate("() => getComputedStyle(document.getElementById('reader')).backgroundColor"), "rgb(0, 0, 0)")
        p.click("#seg-font button[data-font=lora]")
        p.reload()
        p.wait_for_selector("html[data-dh=ready]")
        p.click("#list .dh-open")
        p.wait_for_selector("#reader:not([hidden])")
        self.assertEqual(p.get_attribute("#reader", "data-rt"), "black")
        self.assertEqual(p.get_attribute("#reader", "data-font"), "lora")
        self.assertEqual(p.evaluate("() => getComputedStyle(document.getElementById('r-body')).fontSize"), "27px")

    def test_back_button_closes_the_reader(self):
        p = self.open()
        self.add(p, ("a.txt", "text/plain", b"Hallo."))
        p.wait_for_selector("#list .dh-open")
        p.click("#list .dh-open")
        p.wait_for_selector("#reader:not([hidden])")
        p.go_back()
        p.wait_for_selector("#reader", state="hidden")
        self.assertIn("/tools/docheinz/", p.url)

    def test_small_viewport_and_both_themes_have_no_overflow(self):
        for theme in ("lt", "dk"):
            p = self.open(theme=theme, height=400)
            self.add(p, ("a.txt", "text/plain", b"Hallo."))
            p.wait_for_selector("#list .dh-open")
            self.assertTrue(p.evaluate("() => document.documentElement.scrollWidth <= innerWidth"))
            p.click("#list .dh-open")
            p.wait_for_selector("#reader:not([hidden])")
            p.wait_for_function("() => document.getElementById('reader').dataset.pages > 0")
            self.tap(p, "top")
            self.assertTrue(p.evaluate("() => { const r = document.getElementById('r-ovfoot').getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.height > 20; }"))


if __name__ == "__main__":
    unittest.main()
