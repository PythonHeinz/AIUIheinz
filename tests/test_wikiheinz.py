"""WikiHeinz (tools/wikiheinz/): Node tests of the modules (tests/wikiheinz/) and browser tests of the IndexedDB layer (no request leaves the device)."""
import gzip, importlib.util, io, contextlib, json, os, struct, shutil, subprocess, sys, tempfile, unittest, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from zimbau import baue_zim
from helpers import Server
from playwright.sync_api import sync_playwright
from test_pages import FakeOllama

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


class Modell:
    """Simulated Ollama: /api/chat answers the search-term call with JSON and the answer call with text; records every body."""
    def __init__(self, page, begriffe='{"begriffe":["Sokrates"]}', antwort="Sokrates war ein Philosoph aus Athen [1].", fail_answer=False):
        self.bodies, self.begriffe, self.antwort, self.fail_answer = [], begriffe, antwort, fail_answer
        self.fake = FakeOllama(page)
        page.route("**/localhost:11434/api/chat", self.chat)

    def chat(self, route):
        body = json.loads(route.request.post_data)
        if (body.get("options") or {}).get("num_predict") == 1:
            return route.fallback()
        self.bodies.append(body)
        sysm = [m for m in body["messages"] if m["role"] == "system"]
        suche = bool(sysm) and "search terms" in sysm[0]["content"]
        if not suche and self.fail_answer:
            return route.fulfill(status=500, body="boom")
        text = self.begriffe if suche else self.antwort
        lines = [json.dumps({"message": {"role": "assistant", "content": text}, "done": False}), json.dumps({"done": True, "eval_count": 5})]
        return route.fulfill(status=200, content_type="application/x-ndjson", body="\n".join(lines) + "\n")


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

    def open_asking(self, **kw):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803})
        page = ctx.new_page()
        self.outside = []
        page.on("request", lambda r: self.outside.append(r.url) if not (r.url.startswith(self.server.base) or "localhost:11434" in r.url or r.url.startswith("blob:") or r.url.startswith("data:")) else None)
        be = Modell(page, **kw)
        page.add_init_script("localStorage.setItem('heinz_settings', JSON.stringify({lang: 'en'}))")
        page.goto(self.server.base + URL)
        page.wait_for_function("window.__wikiReady === true")
        return ctx, page, be

    def test_model_status_line_and_configuration_from_the_dashboard_with_reset(self):
        ctx, page, be = self.open_asking()
        try:
            cfgs = json.dumps([{"id": "c1", "name": "Schnell", "provider": "ollama", "model": "gemma2:2b", "person": "heinz", "prompt": "", "tone": {"temperature": 0.7, "top_k": 20}, "stop": [], "runtime": {"ctx": 2048, "threads": 2}}])
            page.evaluate("c => localStorage.setItem('heinz_configs', c)", cfgs)
            page.reload(); page.wait_for_function("window.__wikiReady === true")
            self.importieren(page)
            page.click("#tabs [data-tab=fragen]")
            page.wait_for_function("document.querySelector('#mstat .ring-btn') !== null")
            self.assertRegex(page.get_attribute("#mstat .ring-btn", "class"), r"s-(red|orange|blue|green|yellow)")
            self.assertNotEqual(page.inner_text("#mstat").strip(), "")
            self.assertEqual(page.locator("#cfgsel option").count(), 2)
            page.select_option("#cfgsel", "c1")
            page.wait_for_function("document.querySelector('#model').value === 'gemma2:2b'")
            self.assertEqual(page.input_value("#temp"), "0.7")
            page.fill("#f-frage", "Wer war Sokrates?"); page.click("#b-ask")
            page.wait_for_selector("#antwort:not([hidden])")
            opts = be.bodies[-1]["options"]
            self.assertEqual(be.bodies[-1]["model"], "gemma2:2b"); self.assertEqual(opts["top_k"], 20); self.assertEqual(opts["num_ctx"], 2048)
            page.select_option("#cfgsel", "")
            page.wait_for_function("document.querySelector('#model').value === 'qwen2.5:3b'")
            self.assertEqual(page.input_value("#model"), "qwen2.5:3b"); self.assertEqual(page.input_value("#temp"), "0.2")
            self.assertEqual(self.outside, [])
        finally:
            ctx.close()

    def test_full_articles_from_the_zim_file_in_the_article_view_and_in_the_answer(self):
        html = ("<html><body><table class='infobox'><tr><th>Geboren</th><td>469 v. Chr.</td></tr></table><p>Sokrates war ein antiker Philosoph aus Athen.</p>"
                "<h2>Tod</h2><p>Er wurde 399 v. Chr. verurteilt und trank den Schierlingsbecher.</p></body></html>")
        srv = Server()
        os.makedirs(os.path.join(srv.data, "wiki")); baue_zim(os.path.join(srv.data, "wiki", "w.zim"), [("Sokrates", "Sokrates", html)])
        srv.start()
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803}); page = ctx.new_page()
        be = Modell(page, begriffe='{"begriffe":["Sokrates","Tod"]}', antwort="Durch den Schierlingsbecher [1].")
        page.add_init_script("localStorage.setItem('heinz_settings', JSON.stringify({lang: 'en'}))")
        try:
            page.goto(srv.base + URL); page.wait_for_function("window.__wikiReady === true")
            self.importieren(page)
            page.wait_for_function("document.querySelector('#zimstat').textContent.includes('w.zim')", timeout=15000)
            page.click("#tabs [data-tab=stoebern]"); page.fill("#q", "sokrates"); page.wait_for_selector(".wh-hit"); page.click(".wh-hit")
            page.wait_for_selector("#a-voll:not([hidden])")
            self.assertIn("Schierlingsbecher", page.inner_text("#a-voll")); self.assertIn("469 v. Chr.", page.inner_text("#a-voll"))
            page.click("#b-back"); page.click("#tabs [data-tab=fragen]")
            page.fill("#f-frage", "Wie starb Sokrates?"); page.click("#b-ask"); page.wait_for_selector("#antwort:not([hidden])")
            self.assertIn("Schierlingsbecher", be.bodies[-1]["messages"][1]["content"])
            self.assertIn("full articles", page.inner_text("#ant-fact"))
        finally:
            ctx.close(); srv.stop()

    def test_question_answers_from_excerpts_with_sources_and_nothing_leaves_the_device(self):
        ctx, page, be = self.open_asking()
        try:
            self.importieren(page)
            page.click("#tabs [data-tab=fragen]")
            page.fill("#f-frage", "Wer war Sokrates?"); page.click("#b-ask")
            page.wait_for_selector("#antwort:not([hidden])")
            self.assertIn("Philosoph aus Athen", page.inner_text("#ant-text"))
            self.assertEqual(page.locator("#ant-quellen .wh-ex").count(), 1)
            self.assertIn("CC BY-SA 4.0", page.text_content("#ant-quellen"))
            self.assertIn("search terms from the model", page.inner_text("#ant-fact"))
            self.assertEqual(len(be.bodies), 2)
            ants = be.bodies[1]
            self.assertIn("ONLY the numbered excerpts", ants["messages"][0]["content"])
            self.assertIn("[1] Sokrates\nSokrates war ein antiker Philosoph aus Athen.", ants["messages"][1]["content"])
            self.assertEqual(be.bodies[0]["format"]["properties"]["begriffe"]["maxItems"], 4)
            self.assertEqual(be.bodies[0]["options"]["temperature"], 0)
            self.assertEqual(ants["options"]["num_predict"], 300)
            self.assertEqual(self.outside, [])
        finally:
            ctx.close()

    def test_nothing_found_means_not_found_without_asking_the_model_for_an_answer(self):
        ctx, page, be = self.open_asking(begriffe='{"begriffe":["Zaphod Beeblebrox"]}')
        try:
            self.importieren(page)
            page.click("#tabs [data-tab=fragen]")
            page.fill("#f-frage", "Wer ist Zaphod Beeblebrox?"); page.click("#b-ask")
            page.wait_for_selector("#antwort:not([hidden])")
            self.assertIn("Not found in your sources", page.inner_text("#ant-text"))
            self.assertEqual(len(be.bodies), 1, "only the search-term call, no answer call")
            self.assertEqual(page.locator("#ant-quellen .wh-ex").count(), 0)
        finally:
            ctx.close()

    def test_model_says_not_found_and_bad_search_terms_fall_back_to_the_words_of_the_question(self):
        ctx, page, be = self.open_asking(begriffe="keine Ahnung", antwort="NOT_FOUND")
        try:
            self.importieren(page)
            page.click("#tabs [data-tab=fragen]")
            page.fill("#f-frage", "Wie alt wurde Sokrates?"); page.click("#b-ask")
            page.wait_for_selector("#antwort:not([hidden])")
            self.assertIn("Not found in your sources", page.inner_text("#ant-text"))
            self.assertIn("sokrates", page.inner_text("#ant-text"), "the fallback words appear in the note")
        finally:
            ctx.close()

    def test_answer_without_numbers_is_flagged_and_my_wiki_is_searched_too(self):
        ctx, page, be = self.open_asking(begriffe='{"begriffe":["Notiz"]}', antwort="Das steht in der Notiz.")
        try:
            page.click("#tabs [data-tab=wiki]"); page.click("#b-neu"); page.fill("#e-titel", "Notiz"); page.fill("#e-text", "Mein Gedanke."); page.click("#b-save")
            page.wait_for_function("document.querySelectorAll('#seiten .wh-hit').length === 1")
            page.click("#tabs [data-tab=fragen]")
            page.fill("#f-frage", "Was steht in der Notiz?"); page.click("#b-ask")
            page.wait_for_selector("#antwort:not([hidden])")
            self.assertIn("no excerpt numbers", page.inner_text("#ant-hinweis"))
            self.assertIn("Mein Wiki", page.text_content("#ant-quellen"))
            self.assertEqual(page.locator("#ant-quellen a[href^='https']").count(), 0, "no outside link for my own pages")
            page.click("#ant-quellen summary"); page.click("#ant-quellen a[data-q]")
            page.wait_for_function("document.querySelector('#v-art') && !document.querySelector('#v-art').hidden && document.querySelector('#a-titel').textContent === 'Notiz'")
        finally:
            ctx.close()

    def test_engine_error_is_shown_and_online_engines_are_blocked_without_the_switch(self):
        ctx, page, be = self.open_asking(fail_answer=True)
        try:
            self.importieren(page)
            page.click("#tabs [data-tab=fragen]")
            page.fill("#f-frage", "Wer war Sokrates?"); page.click("#b-ask")
            page.wait_for_function("document.querySelector('#msg').textContent.includes('Stopped')")
            self.assertTrue(page.is_visible("#b-ask"))
            page.fill("#f-frage", ""); page.click("#b-ask")
            self.assertIn("Type a question", page.inner_text("#msg"))
            page.click("#params summary")
            opts = page.eval_on_selector_all("#provider option", "els => els.map(e => e.value)")
            self.assertEqual(opts, ["ollama", "litertlm"] if "litertlm" in opts else opts)
            self.assertNotIn("openrouter", opts, "online engines are hidden while 'Allow online' is off")
        finally:
            ctx.close()

    def test_zip_file_is_valid_for_python(self):
        script = "import {zip} from './tools/wikiheinz/mod/zip.js'; import {writeFileSync} from 'node:fs'; writeFileSync(process.argv[1], zip([{name:'Äpfel.md', text:'Größe'}]));"
        out = os.path.join(tempfile.mkdtemp(), "t.zip")
        r = subprocess.run([NODE, "--input-type=module", "-e", script, out], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        z = zipfile.ZipFile(out); self.assertIsNone(z.testzip()); self.assertEqual(z.read("Äpfel.md").decode(), "Größe")


class ZimRohTests(unittest.TestCase):
    def test_roh_script_finds_articles_follows_redirects_and_reports_infobox(self):
        spec = importlib.util.spec_from_file_location("zim_roh", os.path.join(ROOT, "tools", "wikiheinz", "skripte", "zim_roh.py"))
        z = importlib.util.module_from_spec(spec); spec.loader.exec_module(z)
        mit = "<html><body><table class='infobox'><tr><td>Geboren 470 v. Chr.</td></tr></table><p>Sokrates war Philosoph.</p></body></html>"
        ohne = "<html><body><p>Koeln ist eine Stadt.</p></body></html>"
        with tempfile.TemporaryDirectory() as d:
            pfad = os.path.join(d, "t.zim")
            baue_zim(pfad, [("Sokrates", "Sokrates", mit), ("Socrates", "Socrates", ("->", "Sokrates")), ("Koeln", "Köln", ohne), ("Zebra", "Zebra", ohne)])
            leser = z.ZimLeser(pfad)
            titel, html = z.finde(leser, "Socrates")
            self.assertEqual(titel, "Sokrates"); self.assertIn(b"Geboren 470", html)
            self.assertEqual(z.finde(leser, "Zebra")[0], "Zebra"); self.assertEqual(z.finde(leser, "Nichts"), (None, None))
            self.assertEqual(z.untersuche(html)["tabellen"], 1); self.assertGreaterEqual(z.untersuche(html)["infobox"], 1)
            self.assertEqual(z.untersuche(ohne.encode())["infobox"], 0)
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                z.main([pfad, "Sokrates", "Koeln", "Fehlt", "--aus", os.path.join(d, "roh")])
            text = out.getvalue()
            self.assertIn("1 Tabellen", text); self.assertIn("nicht gefunden", text)
            self.assertTrue(os.path.exists(os.path.join(d, "roh", "Sokrates.html")))


if __name__ == "__main__":
    unittest.main()
