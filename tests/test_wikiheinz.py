"""WikiHeinz (tools/wikiheinz/): Node tests of the modules (tests/wikiheinz/) and browser tests of the IndexedDB layer (no request leaves the device)."""
import gzip, json, os, shutil, subprocess, sys, tempfile, unittest, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import Server
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE = shutil.which("node")


@unittest.skipUnless(NODE, "node fehlt")
class WikiModuleTests(unittest.TestCase):
    def test_node_tests_of_all_modules_pass(self):
        d = os.path.join(ROOT, "tests", "wikiheinz")
        files = sorted(os.path.join("tests", "wikiheinz", f) for f in os.listdir(d) if f.endswith(".test.mjs"))
        r = subprocess.run([NODE, "--test", *files], cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)


DB_JS = """async () => {
  const { oeffne } = await import('/tools/wikiheinz/mod/db.js');
  const { suche } = await import('/tools/wikiheinz/mod/suche.js');
  const { importiere } = await import('/tools/wikiheinz/mod/import.js');
  const { neueQuelle } = await import('/tools/wikiheinz/mod/quelle.js');
  const { speichere, seiten } = await import('/tools/wikiheinz/mod/eigene.js');
  const sp = await oeffne(); const out = { art: sp.info().art };
  const art = (t, x) => JSON.stringify({ word: t, senses: [{ glosses: [x] }] });
  const weg = (t, z) => JSON.stringify({ word: t, senses: [{ form_of: [{ word: z }] }] });
  const text = [art('Sokrates', 'Philosoph.'), weg('Socrates', 'Sokrates'), art('Äpfel', 'Mehrzahl.'), art('Apfel', 'Frucht.')].join('\\n') + '\\n';
  // gz im Browser: wie in der Oberfläche über CompressionStream/DecompressionStream
  const gz = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const chunks = gz.pipeThrough(new DecompressionStream('gzip'));
  const q = neueQuelle({ id: 'wikipedia-de', wikipedia: true });
  const r = await importiere({ chunks, speicher: sp, quelle: q, stapel: 2 });
  out.gespeichert = r.gespeichert;
  out.treffer = (await suche(sp, 'socr')).map(x => x.titel + '<' + x.via);
  out.apf = (await suche(sp, 'ap')).map(x => x.titel);
  await speichere(sp, 'mein-wiki', { titel: 'Notiz', text: 'x [[Apfel]]' }, '2026-11-25');
  out.seiten = (await seiten(sp, 'mein-wiki')).length;
  await sp.quelleSetzen(neueQuelle({ id: 'mein-wiki', art: 'eigen' }));
  let p = 0; await sp.quelleLoeschen('wikipedia-de', (n) => { p = n; });
  out.nachLoeschen = (await sp.alle('wikipedia-de')).length; out.quellen = (await sp.quellen()).map(x => x.id); out.eigeneBleibt = (await sp.alle('mein-wiki')).length; out.fortschritt = p;
  return out;
}"""


class WikiDbTests(unittest.TestCase):
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

    def test_indexeddb_import_search_delete_in_chunks(self):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803})
        try:
            page = ctx.new_page()
            page.goto(self.server.base + "/chat.html")
            o = page.evaluate(DB_JS)
            self.assertEqual(o["art"], "indexeddb")
            self.assertEqual(o["gespeichert"], 4)
            self.assertEqual(o["treffer"], ["Sokrates<Socrates"])
            self.assertCountEqual(o["apf"], ["Apfel", "Äpfel"], "Umlaute sind im Schlüssel gefaltet: 'ap' findet beide")
            self.assertEqual(o["seiten"], 1)
            self.assertEqual(o["nachLoeschen"], 0)
            self.assertEqual(o["quellen"], ["mein-wiki"])
            self.assertEqual(o["eigeneBleibt"], 1, "Löschen der Wikipedia lässt Mein Wiki unberührt")
            self.assertEqual(o["fortschritt"], 4)
        except AssertionError:
            raise
        finally:
            ctx.close()


URL = "/tools/wikiheinz/index.html"


def art(t, x):
    return json.dumps({"word": t, "senses": [{"glosses": [x]}], "lang_code": "de"}, ensure_ascii=False)


def weg(t, z):
    return json.dumps({"word": t, "senses": [{"form_of": [{"word": z}]}]}, ensure_ascii=False)


LINES = [art("Sokrates", "Sokrates war ein antiker Philosoph aus Athen."), weg("Socrates", "Sokrates"), art("Köln", "Köln ist eine Stadt am Rhein."), art("Platon", "Platon war ein Schüler des Sokrates.")]


class WikiUiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = Server().start()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()
        cls.tmp = tempfile.mkdtemp()
        cls.gz = os.path.join(cls.tmp, "wikipedia-de_2026-10.jsonl.gz")
        with gzip.open(cls.gz, "wt", encoding="utf-8") as f:
            f.write("\n".join(LINES) + "\n")
        cls.bad = os.path.join(cls.tmp, "wikipedia-xx.jsonl")
        with open(cls.bad, "w") as f:
            f.write("das ist kein Auszug\n")

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.stop()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def open(self, lang="en", w=426, h=803):
        ctx = self.browser.new_context(viewport={"width": w, "height": h}, accept_downloads=True)
        page = ctx.new_page()
        self.outside = []
        page.on("request", lambda r: self.outside.append(r.url) if not r.url.startswith(self.server.base) and not r.url.startswith("blob:") and not r.url.startswith("data:") else None)
        page.add_init_script("localStorage.setItem('heinz_settings', JSON.stringify({lang: '%s'}))" % lang)
        page.goto(self.server.base + URL)
        page.wait_for_function("window.__wikiReady === true")
        return ctx, page

    def importieren(self, page):
        page.click("#tabs [data-tab=quellen]")
        page.set_input_files("#f-import", self.gz)
        page.wait_for_function("document.querySelector('#quellen').textContent.includes('4 entries') && document.querySelector('#quellen').textContent.includes('complete')", timeout=15000)

    def test_import_search_article_and_source_line_without_any_outside_request(self):
        ctx, page = self.open()
        try:
            self.assertIn("No sources yet", page.inner_text("#suchinfo"))
            self.importieren(page)
            self.assertIn("Wikipedia (de, offline)", page.inner_text("#quellen"))
            self.assertIn("2026-10", page.inner_text("#quellen"))
            page.click("#tabs [data-tab=stoebern]")
            page.fill("#q", "socr")
            page.wait_for_selector(".wh-hit")
            self.assertEqual(page.locator(".wh-hit b").first.inner_text(), "Sokrates")
            self.assertIn("Redirect from", page.locator(".wh-hit").first.inner_text())
            page.fill("#q", "koln")
            page.wait_for_selector(".wh-hit b:text-is('Köln')")
            page.click(".wh-hit")
            page.wait_for_selector("#v-art:not([hidden])")
            self.assertEqual(page.inner_text("#a-titel"), "Köln")
            self.assertIn("am Rhein", page.inner_text("#a-text"))
            q = page.inner_text("#a-quelle")
            self.assertIn("CC BY-SA 4.0", q); self.assertIn("Stand 2026-10", q)
            self.assertEqual(page.get_attribute("#a-quelle a", "href"), "https://de.wikipedia.org/wiki/K%C3%B6ln")
            page.click("#b-back")
            self.assertTrue(page.is_visible("#v-suche"))
            page.fill("#q", "zzzz")
            page.wait_for_function("document.querySelector('#suchinfo').textContent.includes('Nothing found')")
            self.assertEqual(self.outside, [], "no request leaves the device")
        finally:
            ctx.close()

    def test_wrong_file_is_refused_and_existing_source_is_not_overwritten(self):
        ctx, page = self.open()
        try:
            page.click("#tabs [data-tab=quellen]")
            page.set_input_files("#f-import", self.bad)
            page.wait_for_function("document.querySelector('#msg').textContent.includes('does not look like')")
            self.assertEqual(page.locator(".wh-src").count(), 0)
            self.importieren(page)
            page.set_input_files("#f-import", self.gz)
            page.wait_for_function("document.querySelector('#msg').textContent.includes('already imported')")
        finally:
            ctx.close()

    def test_delete_source_needs_second_tap_and_keeps_my_wiki(self):
        ctx, page = self.open()
        try:
            self.importieren(page)
            page.click("#tabs [data-tab=wiki]"); page.click("#b-neu"); page.fill("#e-titel", "Notiz"); page.fill("#e-text", "Hallo"); page.click("#b-save")
            page.wait_for_function("document.querySelectorAll('#seiten .wh-hit').length === 1")
            page.click("#tabs [data-tab=quellen]")
            page.click("[data-del]")
            self.assertIn("Tap again", page.inner_text("#msg"))
            self.assertEqual(page.locator(".wh-src").count(), 2)
            page.click("[data-del]")
            page.wait_for_function("document.querySelectorAll('.wh-src').length === 1")
            page.click("#tabs [data-tab=wiki]")
            self.assertIn("Notiz", page.inner_text("#seiten"))
        finally:
            ctx.close()

    def test_my_wiki_pages_links_backlinks_search_edit_delete_export_restore(self):
        ctx, page = self.open(lang="de")
        try:
            page.click("#tabs [data-tab=wiki]")
            self.assertIn("Noch keine Seiten", page.inner_text("#wikiinfo"))
            page.click("#b-neu"); page.click("#b-save")
            self.assertIn("Titel eintragen", page.inner_text("#msg"))
            page.fill("#e-titel", "Sokrates"); page.fill("#e-text", "Lehrer von [[Platon]]. #antike"); page.click("#b-save")
            page.wait_for_function("document.querySelectorAll('#seiten .wh-hit').length === 1")
            self.assertIn("nur auf diesem Gerät", page.inner_text("#wikiwarn"))
            page.click("#b-neu"); page.fill("#e-titel", "Platon"); page.fill("#e-text", "Schüler. **Wichtig**"); page.click("#b-save")
            page.wait_for_function("document.querySelectorAll('#seiten .wh-hit').length === 2")
            page.click(".wh-hit:has-text('Sokrates')")
            page.wait_for_selector("#v-art:not([hidden])")
            self.assertEqual(page.locator("#a-text a[data-wh]").inner_text(), "Platon")
            self.assertIn("#antike", page.inner_text("#a-quelle"))
            page.click("#a-text a[data-wh]")
            page.wait_for_function("document.querySelector('#a-titel').textContent === 'Platon'")
            self.assertIn("Sokrates", page.inner_text("#a-rueck"))
            self.assertEqual(page.locator("#a-text strong").inner_text(), "Wichtig")
            page.click("#b-edit")
            self.assertEqual(page.input_value("#e-titel"), "Platon")
            page.fill("#e-text", "Neuer Text"); page.click("#b-save")
            page.click("#tabs [data-tab=wiki]")
            page.fill("#wq", "neuer")
            page.wait_for_function("document.querySelectorAll('#seiten .wh-hit').length === 1")
            with page.expect_download() as dl:
                page.click("#b-exp-zip")
            z = os.path.join(self.tmp, "w.zip"); dl.value.save_as(z)
            names = zipfile.ZipFile(z).namelist(); self.assertIn("Platon.md", names); self.assertIn("_wikiheinz.json", names)
            self.assertTrue(page.is_hidden("#wikiwarn"), "nach dem Export keine Warnung")
            with page.expect_download() as dl2:
                page.click("#b-exp-json")
            js = os.path.join(self.tmp, "w.json"); dl2.value.save_as(js)
            self.assertEqual(sorted(s["titel"] for s in json.load(open(js))["seiten"]), ["Platon", "Sokrates"])
            page.fill("#wq", "")
            page.click(".wh-hit:has-text('Platon')"); page.click("#b-edit"); page.click("#b-del")
            self.assertIn("?", page.inner_text("#msg"))
            page.click("#b-del")
            page.click("#tabs [data-tab=wiki]")
            page.wait_for_function("document.querySelectorAll('#seiten .wh-hit').length === 1")
            page.set_input_files("#f-rest", js)
            page.wait_for_function("document.querySelectorAll('#seiten .wh-hit').length === 2")
            self.assertEqual(self.outside, [])
        finally:
            ctx.close()

    def test_new_link_target_opens_the_editor_with_that_title(self):
        ctx, page = self.open()
        try:
            page.click("#tabs [data-tab=wiki]"); page.click("#b-neu"); page.fill("#e-titel", "Start"); page.fill("#e-text", "Siehe [[Fehlt|das Fehlende]]"); page.click("#b-save")
            page.click(".wh-hit"); page.wait_for_selector("#a-text a.neu")
            page.click("#a-text a.neu")
            page.wait_for_selector("#v-edit:not([hidden])")
            self.assertEqual(page.input_value("#e-titel"), "Fehlt")
        finally:
            ctx.close()

    def test_layout_small_screen_and_dark_theme_have_no_horizontal_overflow(self):
        for w, h in ((426, 803), (426, 400)):
            ctx, page = self.open(w=w, h=h)
            try:
                self.importieren(page)
                page.click("#tabs [data-tab=stoebern]"); page.fill("#q", "so"); page.wait_for_selector(".wh-hit")
                self.assertLessEqual(page.evaluate("document.documentElement.scrollWidth"), w)
                bad = page.evaluate("Array.from(document.querySelectorAll('[hidden]')).filter(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0).map(e => e.id || e.className)")
                self.assertEqual(bad, [])
            finally:
                ctx.close()

    def test_zip_file_is_valid_for_python(self):
        script = "import {zip} from './tools/wikiheinz/mod/zip.js'; import {writeFileSync} from 'node:fs'; writeFileSync(process.argv[1], zip([{name:'Äpfel.md', text:'Größe'}]));"
        out = os.path.join(tempfile.mkdtemp(), "t.zip")
        r = subprocess.run([NODE, "--input-type=module", "-e", script, out], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        z = zipfile.ZipFile(out); self.assertIsNone(z.testzip()); self.assertEqual(z.read("Äpfel.md").decode(), "Größe")


if __name__ == "__main__":
    unittest.main()
