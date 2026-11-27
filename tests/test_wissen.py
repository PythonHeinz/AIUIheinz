"""HeinzWissen (lib/wissen/): Node tests of the building block, structure rules (the foundation never depends on a tool) and a browser test with real IndexedDB and simulated Ollama."""
import time
import json, os, re, shutil, subprocess, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import Server
from playwright.sync_api import sync_playwright
from test_wikiheinz import Modell

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE = shutil.which("node")
LIB = os.path.join(ROOT, "lib", "wissen")


@unittest.skipUnless(NODE, "node fehlt")


def leiste_auf(page):
    if not page.evaluate("document.querySelector('.sl-leiste').classList.contains('open')"):
        page.click(".sl-kragen")
    page.wait_for_selector(".sl-leiste.open .wsw-an")


def leiste_zu(page):
    if page.evaluate("document.querySelector('.sl-leiste').classList.contains('open')"):
        page.click(".sl-scrim", position={"x": 400, "y": 120})
    page.wait_for_function("!document.querySelector('.sl-leiste').classList.contains('open')")


def an_aus(page):
    leiste_auf(page); page.click(".wsw-an"); leiste_zu(page)


class WissenNodeTests(unittest.TestCase):
    def test_node_tests_of_the_building_block_pass(self):
        d = os.path.join(ROOT, "tests", "wissen")
        files = sorted(os.path.join("tests", "wissen", f) for f in os.listdir(d) if f.endswith(".test.mjs"))
        r = subprocess.run([NODE, "--test", *files], cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)


class WissenStructureTests(unittest.TestCase):
    def test_lib_wissen_imports_only_its_own_files(self):
        # the foundation must not depend on a tool (decision 26.11.2026): every import is a sibling file of lib/wissen/
        problems = []
        for name in sorted(os.listdir(LIB)):
            if not name.endswith(".js"):
                continue
            with open(os.path.join(LIB, name), encoding="utf-8") as f:
                src = f.read()
            for spec in re.findall(r"""(?:^|\n)\s*(?:import|export)\b[^;\n]*?\bfrom\s+['"]([^'"]+)['"]""", src):
                if not re.fullmatch(r"\./[a-z]+\.js", spec):
                    problems.append("%s imports %s" % (name, spec))
            if re.search(r"\bimport\s*\(", src):
                problems.append("%s uses a dynamic import" % name)
        self.assertEqual(problems, [], "lib/wissen/ imports only ./*.js")

    def test_no_file_of_a_tool_is_left_in_the_old_module_folder(self):
        d = os.path.join(ROOT, "tools", "wikiheinz", "mod")
        self.assertEqual([f for f in (os.listdir(d) if os.path.isdir(d) else []) if f.endswith(".js")], [], "the modules moved to lib/wissen/")

    def test_the_building_block_never_calls_a_model_or_a_foreign_host(self):
        for name in sorted(os.listdir(LIB)):
            if name.endswith(".js"):
                with open(os.path.join(LIB, name), encoding="utf-8") as f:
                    src = re.sub(r"/\*.*?\*/|(?<![:'\"])//[^\n]*", "", f.read(), flags=re.S)      # comments may name HeinzProviders
                self.assertNotRegex(src, r"HeinzProviders|localhost:11434|127\.0\.0\.1:9379", name + " talks to a model")


BROWSER_JS = """async () => {
  const { oeffne } = await import('/lib/wissen/db.js');
  const { neueQuelle } = await import('/lib/wissen/quelle.js');
  const { keyOf } = await import('/lib/wissen/schluessel.js');
  const sp = await oeffne(), e = (t, x) => ({ k: keyOf(t), t, x, v: '' });
  await sp.quelleSetzen(neueQuelle({ id: 'wikipedia-de', name: 'Wikipedia (de, offline)', wikipedia: true, lizenz: 'CC BY-SA 4.0', stand: '2026-10', anzahl: 3 }));
  await sp.add('wikipedia-de', [e('Sokrates', 'Sokrates war ein antiker Philosoph aus Athen.'), e('Köln', 'Köln ist eine Stadt am Rhein.'), e('Grünten', 'Der Grünten ist ein Berg im Allgäu.')]);
  const { HeinzWissen } = await import('/lib/wissen/index.js');
  const PV = (await import('/lib/providers.js')).HeinzProviders;
  const senden = async (a, signal) => (await PV.chat('ollama', { model: 'qwen2.5:3b', system: a.system, messages: [{ role: 'user', content: a.user }], format: a.format, signal, options: { temperature: 0 } })).text;
  const out = {};
  out.dbs = (await indexedDB.databases()).map(d => d.name);
  out.zustand = await HeinzWissen.zustand();
  out.suche = await HeinzWissen.suche('Grünten');
  out.app = await HeinzWissen.kontext('Wer war Sokrates?', { senden });
  window.__vorher = 0;
  out.rueck = await HeinzWissen.kontext('What is Cologne like?', { senden });
  out.antwort = await HeinzWissen.beantworte('Wer war Sokrates?', { senden, sprache: 'de' });
  out.wert = await HeinzWissen.wert('Grünten', 'Höhe');
  out.merke = await HeinzWissen.merke({ titel: 'T', text: 'x' });
  return out;
}"""


class WissenBrowserTests(unittest.TestCase):
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

    def test_building_block_on_the_real_database_with_simulated_ollama(self):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803})
        try:
            page = ctx.new_page()
            fremd = []
            page.on("request", lambda r: fremd.append(r.url) if not re.match(r"^(http://(127\.0\.0\.1|localhost)[:/]|data:|blob:)", r.url) else None)
            modell = Modell(page, begriffe='{"begriffe":["Köln"]}', antwort="Sokrates war ein Philosoph aus Athen [1].")
            page.goto(self.server.base + "/chat.html")
            page.wait_for_function("document.documentElement.dataset.heinzChat === 'ready'")
            modell.bodies.clear()
            o = page.evaluate(BROWSER_JS)
            self.assertIn("heinz_wikiheinz", o["dbs"], "the database keeps its name: no new import of 4.6 million entries")
            self.assertEqual(o["zustand"]["weg"], "auszug", "no ZIM on the test server: stored introductions only")
            self.assertEqual([q["bereit"] for q in o["zustand"]["quellen"]], [True])
            self.assertEqual(o["suche"]["zustand"], "ok")
            self.assertEqual(o["suche"]["treffer"][0]["titel"], "Grünten")
            self.assertEqual(o["suche"]["treffer"][0]["lizenz"], "CC BY-SA 4.0")
            self.assertEqual((o["app"]["zustand"], o["app"]["von"], o["app"]["rueckfall"]), ("ok", "code", False), "terms from the app: no model call for a hit")
            self.assertEqual((o["rueck"]["zustand"], o["rueck"]["von"], o["rueck"]["rueckfall"]), ("ok", "modell", True), "no hit by the app: the model translates the terms")
            self.assertEqual(o["rueck"]["verwendet"][0]["titel"], "Köln")
            self.assertEqual(o["antwort"]["zustand"], "ok")
            self.assertTrue(o["antwort"]["quellen"][0]["zitiert"])
            self.assertEqual(o["wert"]["zustand"], "keine-zim")
            self.assertEqual(o["merke"]["zustand"], "kein-postfach")
            arten = ["suche" if "search terms" in ([m for m in b["messages"] if m["role"] == "system"] or [{"content": ""}])[0]["content"] else "antwort" for b in modell.bodies]
            self.assertEqual(arten, ["suche", "antwort"], "model calls: one fallback for the term search, one for the answer; none for the hit by the app")
            self.assertEqual(fremd, [], "no request leaves the device")
        finally:
            ctx.close()


SEED_JS = """async () => {
  const { oeffne } = await import('/lib/wissen/db.js');
  const { neueQuelle } = await import('/lib/wissen/quelle.js');
  const { keyOf } = await import('/lib/wissen/schluessel.js');
  const sp = await oeffne(), e = (t, x) => ({ k: keyOf(t), t, x, v: '' });
  await sp.quelleSetzen(neueQuelle({ id: 'wikipedia-de', name: 'Wikipedia (de, offline)', wikipedia: true, lizenz: 'CC BY-SA 4.0', stand: '2026-10', anzahl: 2 }));
  await sp.add('wikipedia-de', [e('Sokrates', 'Sokrates war ein antiker Philosoph aus Athen.'), e('Köln', 'Köln ist eine Stadt am Rhein.'), e('Köln-Deutz', 'Deutz ist ein Stadtteil von Köln.'), e('Köln 75', 'Ein Album.')]);
  return true;
}"""

CONFIG_JS = """(w) => {
  const PV = HeinzProviders;
  const c = PV.saveConfig(Object.assign({ name: 'Wissen', provider: 'ollama', model: 'qwen2.5:3b', person: 'heinz', prompt: 'Be brief.' }, w ? { wissen: w } : {}));
  PV.setChatConfig(c.id);
  return c.id;
}"""


class WissenChatTests(unittest.TestCase):
    """Stufe 3: the optional field `wissen` of a configuration and the Heinz Chat that uses it (simulated Ollama, real IndexedDB)."""
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

    def chat(self, wissen, frage, begriffe='{"begriffe":["Nirgendwo"]}', antwort="Sokrates war ein Philosoph aus Athen [1]."):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803})
        page = ctx.new_page()
        fremd = []
        page.on("request", lambda r: fremd.append(r.url) if not re.match(r"^(http://(127\.0\.0\.1|localhost)[:/]|data:|blob:)", r.url) else None)
        modell = Modell(page, begriffe=begriffe, antwort=antwort)
        page.goto(self.server.base + "/chat.html")
        page.wait_for_function("document.documentElement.dataset.heinzChat === 'ready'")
        page.evaluate(SEED_JS)
        page.evaluate(CONFIG_JS, wissen)
        page.reload()
        page.wait_for_function("document.documentElement.dataset.heinzChat === 'ready'")
        modell.bodies.clear()
        page.fill("#q", frage); page.click("#send")
        page.wait_for_function("document.querySelector('#log .msg.a') && document.querySelector('#log .msg.a').textContent.indexOf('Philosoph') >= 0 && !document.querySelector('#log .msg.a .cur')")
        return ctx, page, modell, fremd

    def sysmsg(self, body):
        return ([m for m in body["messages"] if m["role"] == "system"] or [{"content": ""}])[0]["content"]

    def test_the_field_is_validated_exported_imported_and_ignored_by_the_modelfile(self):
        ctx = self.browser.new_context()
        try:
            page = ctx.new_page(); page.goto(self.server.base + "/chat.html")
            o = page.evaluate("""() => {
              const PV = HeinzProviders, out = {};
              const a = PV.saveConfig({ name: 'A', provider: 'ollama', model: 'm', person: 'heinz', prompt: 'p', wissen: { an: true, quellen: ['wikipedia-de', 5], begriffe: 'x', fremd: 1 } });
              const b = PV.saveConfig({ name: 'B', provider: 'ollama', model: 'm', person: 'heinz', prompt: 'p' });
              out.a = a.wissen; out.b = 'wissen' in b;
              const ex = PV.exportConfig(a); out.exWissen = ex.wissen; out.exFormat = ex.format;
              out.exB = 'wissen' in JSON.parse(JSON.stringify(PV.exportConfig(b)));
              out.imp = PV.importConfig(JSON.parse(JSON.stringify(ex))).wissen;
              out.alt = PV.importConfig({ format: 1, kind: 'heinz-configuration', name: 'Alt', provider: 'ollama', model: 'm', person: 'heinz', prompt: '' }).name;
              out.mf = PV.exportModelfile(a);
              return out;
            }""")
            self.assertEqual(o["a"], {"an": True, "quellen": ["wikipedia-de", "5"], "begriffe": "app"})
            self.assertFalse(o["b"], "a configuration without the field stays without it")
            self.assertEqual(o["exWissen"], o["a"]); self.assertEqual(o["exFormat"], 1, "format version unchanged: older files stay valid")
            self.assertFalse(o["exB"]); self.assertEqual(o["imp"], o["a"]); self.assertEqual(o["alt"], "Alt")
            self.assertNotIn("wissen", o["mf"].lower().replace("# heinz configuration: a", "")); self.assertIn("FROM m", o["mf"])
        finally:
            ctx.close()

    def test_chat_with_knowledge_adds_numbered_excerpts_shows_source_chips_and_stores_them(self):
        ctx, page, modell, fremd = self.chat({"an": True, "quellen": [], "begriffe": "app"}, "Wer war Sokrates?")
        try:
            self.assertEqual(len(modell.bodies), 1, "terms from the app: one model call only, the answer")
            sysm = self.sysmsg(modell.bodies[0])
            self.assertTrue(sysm.startswith("Be brief."))
            self.assertIn("numbered", sysm); self.assertIn("[1]", sysm); self.assertIn("antiker Philosoph", sysm)
            chip = page.text_content("#log .msg.a .src .chip")
            self.assertIn("[1] Sokrates", chip); self.assertIn("CC BY-SA 4.0", chip)
            self.assertTrue(page.get_attribute("#log .msg.a .src .chip", "href").startswith("http"))
            saved = page.evaluate("HeinzStore.get('heinz_slim_chats', [])[0].messages.filter(m => m.role === 'assistant')[0].quellen")
            self.assertEqual(saved[0]["titel"], "Sokrates")
            page.fill("#q", "Und weiter?"); page.click("#send")
            page.wait_for_function("document.querySelectorAll('#log .msg.a').length === 2 && !document.querySelector('#log .cur')")
            second = [m for m in modell.bodies[-1]["messages"] if m["role"] != "system"]
            self.assertEqual(set(k for m in second for k in m), {"role", "content"}, "history carries no source fields to the model")
            self.assertEqual(fremd, [], "no request leaves the device")
        finally:
            ctx.close()

    def test_without_a_hit_the_model_is_told_so_and_no_chip_appears(self):
        ctx, page, modell, fremd = self.chat({"an": True, "quellen": [], "begriffe": "app"}, "Zxqvw Qwertzuiop?")
        try:
            sysm = self.sysmsg(modell.bodies[-1])
            self.assertIn("No knowledge excerpt was found", sysm); self.assertIn("own assessment", sysm)
            self.assertEqual(page.locator("#log .msg.a .src").count(), 0)
            self.assertEqual(fremd, [])
        finally:
            ctx.close()

    def test_a_configuration_without_the_field_behaves_exactly_as_before(self):
        ctx, page, modell, fremd = self.chat(None, "Wer war Sokrates?")
        try:
            self.assertEqual(len(modell.bodies), 1)
            self.assertEqual(self.sysmsg(modell.bodies[0]), "Be brief.")
            self.assertEqual(page.locator("#log .msg.a .src").count(), 0)
        finally:
            ctx.close()

    def test_chips_show_only_the_cited_excerpts_else_all_of_them_labelled(self):
        w = {"an": True, "quellen": [], "begriffe": "app"}
        ctx, page, modell, fremd = self.chat(w, "Was ist Köln?", antwort="Philosoph? Nein, Köln ist eine Stadt [2].")
        try:
            chips = page.locator("#log .msg.a .src .chip")
            self.assertEqual(chips.count(), 1); self.assertIn("[2]", chips.first.text_content())
            self.assertEqual(page.locator("#log .msg.a .src .srcl").count(), 0)
            ts = page.evaluate("[...document.querySelectorAll('#log .msg.a .chip')].map(c => c.textContent)")
            self.assertNotIn("Köln 75", " ".join(ts))
        finally:
            ctx.close()
        ctx, page, modell, fremd = self.chat(w, "Was ist Köln?", antwort="Philosoph? Nein, Köln ist eine Stadt.")
        try:
            self.assertEqual(page.locator("#log .msg.a .src .chip").count(), 3)
            self.assertEqual(page.text_content("#log .msg.a .src .srcl"), "Excerpts:")
            titles = page.evaluate("[...document.querySelectorAll('#log .msg.a .chip')].map(c => c.textContent)")
            self.assertTrue(titles[0].startswith("[1] Köln ·") and titles[-1].startswith("[3] Köln 75"), titles)
        finally:
            ctx.close()

    def test_a_short_follow_up_searches_with_the_previous_question(self):
        w = {"an": True, "quellen": [], "begriffe": "app"}
        ctx, page, modell, fremd = self.chat(w, "Wer war Sokrates?")
        try:
            modell.bodies.clear()
            page.fill("#q", "Das ist falsch"); page.click("#send")
            page.wait_for_function("document.querySelectorAll('#log .msg.a').length === 2 && !document.querySelector('#log .cur')")
            sysm = self.sysmsg(modell.bodies[-1])
            self.assertIn("antiker Philosoph", sysm, "the excerpts of the topic are given again")
            self.assertEqual(len(modell.bodies), 1, "no model call for search terms")
            self.assertEqual(page.locator("#log .msg.a").nth(1).locator(".src .chip").first.text_content().split(" ·")[0], "[1] Sokrates")
        finally:
            ctx.close()

    def test_the_hub_tile_shows_the_field_read_only(self):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803})
        try:
            page = ctx.new_page(); page.goto(self.server.base + "/chat.html")
            page.evaluate(CONFIG_JS, {"an": True, "quellen": ["wikipedia-de"], "begriffe": "modell"})
            page.goto(self.server.base + "/tools/configs/")
            page.wait_for_selector(".cfg[data-id] .meta")
            txt = page.text_content("#list")
            self.assertIn("knowledge: wikipedia-de", txt); self.assertIn("terms: model", txt)
            self.assertEqual(page.locator("#list [data-act=wissen], #list input[type=checkbox]").count(), 0, "no control for the field on the hub")
        finally:
            ctx.close()

    def test_the_switch_works_without_any_configuration_and_beats_the_preset(self):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803})
        try:
            page = ctx.new_page()
            modell = Modell(page, antwort="Sokrates war ein Philosoph aus Athen [1].")
            page.goto(self.server.base + "/chat.html")
            page.wait_for_function("document.documentElement.dataset.heinzChat === 'ready'")
            page.evaluate(SEED_JS)
            self.assertFalse(page.evaluate("document.querySelector('.wsw-an').classList.contains('on')"), "off by default")
            an_aus(page)
            self.assertTrue(page.evaluate("JSON.parse(localStorage.getItem('heinz_wissen')).an"))
            modell.bodies.clear()
            page.fill("#q", "Wer war Sokrates?"); page.click("#send")
            page.wait_for_function("document.querySelector('#log .msg.a .src .chip')")
            self.assertIn("antiker Philosoph", self.sysmsg(modell.bodies[-1]))
            page.reload(); page.wait_for_function("document.documentElement.dataset.heinzChat === 'ready'")
            self.assertTrue(page.evaluate("document.querySelector('.wsw-an').classList.contains('on')"), "the state survives a restart")
            an_aus(page)
            modell.bodies.clear()
            page.fill("#q", "Wer war Sokrates?"); page.click("#send")
            page.wait_for_function("document.querySelectorAll('#log .msg.a').length === 2 && !document.querySelector('#log .cur')")
            self.assertNotIn("excerpt", self.sysmsg(modell.bodies[-1]).lower(), "switched off: no excerpts")
            # a configuration preset is only the starting point: the switch, once used, wins
            page.evaluate(CONFIG_JS, {"an": True, "quellen": [], "begriffe": "app"})
            page.reload(); page.wait_for_function("document.documentElement.dataset.heinzChat === 'ready'")
            self.assertFalse(page.evaluate("document.querySelector('.wsw-an').classList.contains('on')"))
            page.evaluate("localStorage.removeItem('heinz_wissen')"); page.reload(); page.wait_for_function("document.documentElement.dataset.heinzChat === 'ready'")
            self.assertTrue(page.evaluate("document.querySelector('.wsw-an').classList.contains('on')"), "never used: the preset of the configuration applies")
        finally:
            ctx.close()

    def test_the_dashboard_has_the_same_switch_adds_excerpts_and_stores_the_chips(self):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803})
        try:
            page = ctx.new_page()
            modell = Modell(page, antwort="Sokrates war ein Philosoph aus Athen [1].")
            page.goto(self.server.base + "/dashboard.html")
            page.wait_for_function("document.querySelectorAll('#model-select option').length >= 1")
            page.evaluate(SEED_JS)
            self.assertEqual(page.locator(".wsw .wsw-an").count(), 1)
            an_aus(page); leiste_auf(page); page.click(".wsw-mehr")
            page.wait_for_function("document.querySelectorAll('.wsw select')[0].options.length >= 2")
            page.keyboard.press("Escape"); self.assertFalse(page.is_visible(".wsw .wsw-panel")); leiste_zu(page)
            modell.bodies.clear()
            page.fill("#query", "Wer war Sokrates?"); page.click("#send-btn")
            page.wait_for_selector(".msg-assistant .src .schip")
            self.assertIn("[1] Sokrates", page.text_content(".msg-assistant .src .schip"))
            sysm = self.sysmsg(modell.bodies[-1])
            self.assertIn("antiker Philosoph", sysm); self.assertIn("numbered", sysm)
            self.assertEqual(len(modell.bodies), 1, "terms from the app: no extra model call")
            # a short follow-up searches with the previous question
            page.wait_for_function("!document.body.classList.contains('gen')")
            modell.bodies.clear()
            page.fill("#query", "Das ist falsch"); page.click("#send-btn")
            page.wait_for_function("document.querySelectorAll('.msg-assistant .src').length === 2")
            self.assertIn("antiker Philosoph", self.sysmsg(modell.bodies[-1]))
            hist = page.evaluate("HeinzDashboard.chatHistory.filter(m => m.role === 'assistant').map(m => (m.quellen || []).length)")
            self.assertEqual(hist, [1, 1], "the chips are part of the stored conversation")
            # with the switch off the request carries no excerpts
            page.wait_for_function("!document.body.classList.contains('gen')")
            an_aus(page); modell.bodies.clear()
            page.fill("#query", "Noch eine Frage"); page.click("#send-btn")
            page.wait_for_function("document.querySelectorAll('.msg-assistant').length === 3 && !document.body.classList.contains('gen')")
            self.assertNotIn("excerpt", self.sysmsg(modell.bodies[-1]).lower())
        finally:
            ctx.close()

    def test_the_side_bar_holds_the_switch_and_the_menu_and_keeps_the_input_row_free(self):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803})
        try:
            page = ctx.new_page()
            Modell(page)
            page.goto(self.server.base + "/dashboard.html")
            page.wait_for_function("document.querySelectorAll('#model-select option').length >= 1")
            self.assertEqual(page.locator(".pbtns .wsw, .pbtns .wsw-an").count(), 0, "no knowledge button in the input row")
            box = page.locator(".sl-kragen").bounding_box()
            self.assertLessEqual(box["x"], 1); self.assertLess(box["width"], 30)
            self.assertFalse(page.is_visible(".sl-leiste"))
            page.click(".sl-kragen"); page.wait_for_selector(".sl-leiste.open")
            names = page.evaluate("[...document.querySelectorAll('.sl-leiste .sl-punkt')].map(e => e.dataset.id)")
            self.assertEqual(names, ["wissen", "menu"])
            page.wait_for_function("document.querySelector('.sl-leiste').getBoundingClientRect().left >= 0")
            lb = page.locator(".sl-leiste").bounding_box()
            self.assertGreaterEqual(lb["x"], 0); self.assertLessEqual(lb["x"] + lb["width"], 426)
            page.click(".sl-leiste .sl-punkt[data-id=menu] .sl-zeile")
            page.wait_for_selector("#menu-sheet.open")
            self.assertFalse(page.evaluate("document.querySelector('.sl-leiste').classList.contains('open')"), "the bar closes when the menu opens")
            page.goto(self.server.base + "/chat.html")
            page.wait_for_function("document.documentElement.dataset.heinzChat === 'ready'")
            self.assertEqual(page.evaluate("[...document.querySelectorAll('.sl-leiste .sl-punkt')].map(e => e.dataset.id)"), ["wissen"])
            self.assertEqual(page.locator(".comp .wsw").count(), 0)
            an_aus(page)
            self.assertTrue(page.evaluate("document.querySelector('.sl-kragen').classList.contains('on')"), "the collar shows that knowledge is on")
        finally:
            ctx.close()

    def test_a_slow_start_does_not_break_when_the_status_timer_fires_before_the_data_is_loaded(self):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803})
        try:
            page = ctx.new_page(); errs = []
            page.on("pageerror", lambda e: errs.append(str(e)))
            Modell(page)
            page.add_init_script("""const f = window.fetch; window.fetch = (u, o) => String(u).includes('modes.json') ? new Promise(r => setTimeout(r, 3600)).then(() => f(u, o)) : f(u, o);""")
            page.goto(self.server.base + "/dashboard.html")
            page.wait_for_timeout(7000)   # the 3 s timer of the status ring fires while modes.json is still on its way
            self.assertEqual(errs, [])
            self.assertNotIn("Start failed", page.content())
        finally:
            ctx.close()

    def test_a_configuration_saves_the_switch_state_and_switches_it_on_again_when_loaded(self):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803})
        try:
            page = ctx.new_page()
            Modell(page)
            page.goto(self.server.base + "/dashboard.html")
            page.wait_for_function("document.querySelectorAll('#model-select option').length >= 1")
            page.evaluate(SEED_JS)
            self.assertEqual(page.locator("#cfg-wissen, #cfg-wissen-box").count(), 0, "the configuration menu has no switch of its own any more")
            leiste_auf(page); page.click(".wsw-an"); page.click(".wsw-mehr")
            page.wait_for_function("document.querySelectorAll('.wsw select')[0].options.length >= 2")
            page.select_option(".wsw select >> nth=0", "wikipedia-de"); page.select_option(".wsw select >> nth=1", "modell"); leiste_zu(page)
            page.click(".burger-btn"); page.click("#menu-sheet [data-go=cfgs]")
            page.fill("#cfg-name", "Mit Wissen"); page.click("#cfg-save")
            self.assertEqual(page.evaluate("HeinzProviders.configs()[0].wissen"), {"an": True, "quellen": ["wikipedia-de"], "begriffe": "modell"})
            page.evaluate("localStorage.removeItem('heinz_wissen'); window.dispatchEvent(new CustomEvent('heinz-wissen'))")
            page.click(".cfg-do-load")
            self.assertTrue(page.evaluate("document.querySelector('.wsw-an').classList.contains('on')"))
            self.assertEqual(page.evaluate("JSON.parse(localStorage.getItem('heinz_wissen')).begriffe"), "modell")
        finally:
            ctx.close()



POSTFACH_JS = """async () => {
  const { HeinzStore } = await import('/lib/store.js');
  const { HeinzPostfach, GRENZEN } = await import('/lib/shared/postfach.js');
  await HeinzStore.open();
  const out = {}, jetzt = Date.now(), TAG = 24 * 3600 * 1000;
  out.grenzen = GRENZEN;
  out.ungueltig = [await HeinzPostfach.legen('', 'merke', { text: 'x' }), await HeinzPostfach.legen('wikiheinz', 'mail', { text: 'x' }), await HeinzPostfach.legen('wikiheinz', 'merke', 'text')].map(r => r.zustand);
  out.zuLang = (await HeinzPostfach.legen('wikiheinz', 'merke', { text: 'x'.repeat(20000) })).zustand;
  out.genau = (await HeinzPostfach.legen('wikiheinz', 'merke', { text: 'x'.repeat(19970) }, { von: 'docHeinz', jetzt: jetzt - 31 * TAG })).zustand;     // 19 970 + JSON-Rahmen <= 20 000, aber schon verfallen
  out.offenVerfallen = HeinzPostfach.offen('wikiheinz').length;
  const a = await HeinzPostfach.legen('wikiheinz', 'merke', { titel: 'A', text: 'eins' }, { von: 'docHeinz', jetzt: jetzt - 1000 });
  const b = await HeinzPostfach.legen('wikiheinz', 'zitat', { titel: 'B', zitat: 'zwei' }, { von: 'docHeinz' });
  await HeinzPostfach.legen('anderes', 'merke', { text: 'fuer ein anderes Werkzeug' });
  out.offen = HeinzPostfach.offen('wikiheinz').map(e => [e.daten.titel, e.von, e.art]);
  out.fremd = HeinzPostfach.offen('anderes').length;
  out.entfernt = [await HeinzPostfach.entfernen(a.id), await HeinzPostfach.entfernen(a.id)];
  out.nachEntfernen = HeinzPostfach.offen('wikiheinz').map(e => e.daten.titel);
  // volles Postfach: nichts wird stillschweigend verworfen
  for (let i = 0; i < 60; i++) await HeinzPostfach.legen('voll', 'merke', { text: 'n' + i });
  out.voll = [HeinzStore.get('heinz_postfach', []).length, (await HeinzPostfach.legen('voll', 'merke', { text: 'zuviel' })).zustand];     // 2 Einträge von oben + 48 = 50
  // verfallene Einträge fallen beim nächsten Schreiben weg und machen Platz
  const raw = HeinzStore.get('heinz_postfach', []); raw.forEach(e => { if (e.an === 'voll') e.zeit = jetzt - 40 * TAG; }); await HeinzStore.set('heinz_postfach', raw);
  out.nachVerfall = [HeinzPostfach.offen('voll').length, (await HeinzPostfach.legen('voll', 'merke', { text: 'wieder Platz' })).zustand];
  out.imSpeicher = HeinzStore.get('heinz_postfach', []).length;
  return out;
}"""


class WissenPostfachTests(unittest.TestCase):
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

    def test_limits_expiry_order_and_removal(self):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803})
        try:
            page = ctx.new_page()
            page.goto(self.server.base + "/chat.html")
            page.wait_for_function("document.documentElement.dataset.heinzChat === 'ready'")
            o = page.evaluate(POSTFACH_JS)
            self.assertEqual(o["grenzen"], {"eintraege": 50, "zeichen": 20000, "tage": 30})
            self.assertEqual(o["ungueltig"], ["ungueltig", "ungueltig", "ungueltig"])
            self.assertEqual(o["zuLang"], "zu-lang", "nothing is cut off silently")
            self.assertEqual(o["offenVerfallen"], 0, "an entry older than 30 days is not shown")
            self.assertEqual(o["offen"], [["A", "docHeinz", "merke"], ["B", "docHeinz", "zitat"]], "oldest first, only the entries for this tool")
            self.assertEqual(o["fremd"], 1)
            self.assertEqual(o["entfernt"], [True, False])
            self.assertEqual(o["nachEntfernen"], ["B"])
            self.assertEqual(o["voll"], [50, "voll"], "a full mailbox refuses, it does not drop old notes")
            self.assertEqual(o["nachVerfall"], [0, "abgelegt"], "expired entries make room")
        finally:
            ctx.close()

    def test_a_note_laid_down_in_one_page_reaches_the_listener_of_another(self):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803})
        try:
            a, b = ctx.new_page(), ctx.new_page()
            for p in (a, b):
                p.goto(self.server.base + "/chat.html")
                p.wait_for_function("document.documentElement.dataset.heinzChat === 'ready'")
            a.evaluate("""async () => {
                const { HeinzStore } = await import('/lib/store.js'); const { HeinzPostfach } = await import('/lib/shared/postfach.js');
                await HeinzStore.open(); window.__neu = []; HeinzPostfach.beiNeu('wikiheinz', (l) => window.__neu.push(l.map(e => e.daten.titel)));
            }""")
            b.evaluate("""async () => {
                const { HeinzStore } = await import('/lib/store.js'); const { HeinzPostfach } = await import('/lib/shared/postfach.js');
                await HeinzStore.open(); await HeinzPostfach.legen('wikiheinz', 'merke', { titel: 'vom Buch', text: 'x' }, { von: 'docHeinz' });
            }""")
            a.wait_for_function("window.__neu.length === 1")
            self.assertEqual(a.evaluate("window.__neu"), [["vom Buch"]])
            self.assertEqual(a.evaluate("""async () => (await import('/lib/shared/postfach.js')).HeinzPostfach.offen('wikiheinz').length"""), 1)
        finally:
            ctx.close()

    def test_merke_puts_a_note_into_the_mailbox_when_it_is_wired(self):
        ctx = self.browser.new_context(viewport={"width": 426, "height": 803})
        try:
            page = ctx.new_page()
            page.goto(self.server.base + "/chat.html")
            page.wait_for_function("document.documentElement.dataset.heinzChat === 'ready'")
            o = page.evaluate("""async () => {
                const { HeinzStore } = await import('/lib/store.js'); const { HeinzPostfach } = await import('/lib/shared/postfach.js'); const { HeinzWissen } = await import('/lib/wissen/index.js');
                await HeinzStore.open(); const vorher = (await HeinzWissen.merke({ titel: 'T', text: 'x' })).zustand;
                HeinzWissen.konfiguriere({ postfach: HeinzPostfach });
                const r = await HeinzWissen.merke({ titel: 'T', text: 'x', herkunft: { buch: 'B' }, tags: ['a'], von: 'docHeinz' });
                const zu = await HeinzWissen.merke({ titel: 'T', text: 'x'.repeat(20000) });
                return { vorher, r: r.zustand, zu: zu.zustand, offen: HeinzPostfach.offen('wikiheinz').map(e => [e.von, e.art, e.daten.titel, e.daten.herkunft.buch]) };
            }""")
            self.assertEqual((o["vorher"], o["r"], o["zu"]), ("kein-postfach", "abgelegt", "zu-lang"))
            self.assertEqual(o["offen"], [["docHeinz", "merke", "T", "B"]])
        finally:
            ctx.close()


if __name__ == "__main__":
    unittest.main()
