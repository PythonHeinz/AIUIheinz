"""HeinzWissen (lib/wissen/): Node tests of the building block, structure rules (the foundation never depends on a tool) and a browser test with real IndexedDB and simulated Ollama."""
import json, os, re, shutil, subprocess, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import Server
from playwright.sync_api import sync_playwright
from test_wikiheinz import Modell

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE = shutil.which("node")
LIB = os.path.join(ROOT, "lib", "wissen")


@unittest.skipUnless(NODE, "node fehlt")
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


if __name__ == "__main__":
    unittest.main()
