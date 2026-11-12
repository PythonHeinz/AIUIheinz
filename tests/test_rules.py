#!/usr/bin/env python3
"""Guards the project rule for local models (docs/LOKALE_MODELLE.md): pages talk to Ollama only through lib/providers.js.
A new page that calls /api/chat or /api/generate directly would bring back the reload and speed problems; it fails here.
The listed pages are older code that still calls Ollama directly and are to be migrated (remove an entry once migrated)."""
import glob
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEGACY = {"lib/dashboard/speedtest.js", "lib/dashboard/series.js", "sheet.html", "lab.html", "vitals.html"}   # speed test and series of the dashboard measure directly on purpose
DIRECT = re.compile(r"/api/(chat|generate|embed|embeddings)\b|num_thread\s*:|keep_alive\s*:")   # reading rt.options.num_thread for display is fine; setting values is not


class RuleTest(unittest.TestCase):
    def test_new_pages_use_the_shared_runtime_only(self):
        files = (glob.glob(os.path.join(ROOT, "*.html")) + glob.glob(os.path.join(ROOT, "tools", "**", "*.html"), recursive=True)
                 + glob.glob(os.path.join(ROOT, "lib", "dashboard", "*.js")))
        bad = []
        for f in files:
            rel = os.path.relpath(f, ROOT).replace(os.sep, "/")
            if rel in LEGACY:
                continue
            with open(f, encoding="utf-8") as fh:
                if DIRECT.search(fh.read()):
                    bad.append(rel)
        self.assertEqual(bad, [], "These pages call Ollama directly. Use HeinzProviders (runtime, prepare, preload, chat), see docs/LOKALE_MODELLE.md")

    def test_no_file_of_the_app_is_hidden_from_git(self):
        # a .gitignore pattern like "data/" also matches lib/data/: the file works here and is missing on the phone (12.11.2026)
        import subprocess
        files = []
        for base in ("lib", "tools", "icons"):
            for dp, _, fn in os.walk(os.path.join(ROOT, base)):
                files += [os.path.relpath(os.path.join(dp, f), ROOT).replace(os.sep, "/") for f in fn]
        files += [f for f in os.listdir(ROOT) if f.endswith((".html", ".js", ".py", ".json", ".webmanifest", ".sh", ".txt"))]
        try:
            r = subprocess.run(["git", "check-ignore"] + files, cwd=ROOT, capture_output=True, text=True)
        except OSError:
            self.skipTest("git not available")
        if r.returncode not in (0, 1):
            self.skipTest("not a git checkout")
        self.assertEqual(r.stdout.split(), [], "These files are ignored by .gitignore and would be missing after git pull")

    def test_every_control_of_the_dashboard_has_an_action_and_no_inline_handler_remains(self):
        # inline handlers (onclick=...) are replaced by data-click/data-input/data-change plus the table in lib/dashboard/actions.js (12.11.2026)
        with open(os.path.join(ROOT, "dashboard.html"), encoding="utf-8") as fh:
            html = fh.read()
        self.assertEqual(re.findall(r"\son(?:click|input|change|submit|keydown)=", html), [], "use data-click / data-input / data-change")
        with open(os.path.join(ROOT, "lib", "dashboard", "actions.js"), encoding="utf-8") as fh:
            js = fh.read()
        table = js[js.index("const ACTIONS = {"):js.index("// One listener per event kind")]
        known = set(re.findall(r"\b(\w+): \(", table))
        used = set(re.findall(r"data-(?:click|input|change)=\"(\w+)\"", html))
        for f in glob.glob(os.path.join(ROOT, "lib", "dashboard", "*.js")):   # names set from script, e.g. the send button
            with open(f, encoding="utf-8") as fh:
                for pair in re.findall(r"data-click', \w+ \? '(\w+)' : '(\w+)'", fh.read()):
                    used |= set(pair)
        self.assertEqual(sorted(used - known), [], "These names have no entry in ACTIONS (lib/dashboard/actions.js)")
        self.assertEqual(sorted(known - used), [], "Unused entries in ACTIONS: remove them")

    # pages built from ES modules: (page, folder of the modules, classic scripts allowed under that folder) - docs/MODULE.md
    MODULE_PAGES = (("dashboard.html", "lib/dashboard", ["lib/dashboard/failsafe.js"]), ("chat.html", "lib/chat", []))

    def test_module_pages_have_one_entry_module_and_every_file_declares_what_it_needs(self):
        # ES modules without build (12.11.2026, docs/MODULE.md): one entry module, imports with relative path and .js ending,
        # the classic libraries are reached only through <folder>/base.js, no exported `let`, no inline script
        for page, folder, allowed_classic in self.MODULE_PAGES:
            with open(os.path.join(ROOT, page), encoding="utf-8") as fh:
                html = fh.read()
            main = "/" + folder + "/main.js" if page == "chat.html" else folder + "/main.js"   # chat.html uses absolute paths
            self.assertEqual(re.findall(r'<script[^>]*type="module"[^>]*src="([^"]+)"', html), [main], page + " loads exactly one module: the entry")
            classic = re.findall(r'<script(?![^>]*type="module")[^>]*src="/?(' + folder + r'/[^"]+)"', html)
            self.assertEqual(classic, allowed_classic, "only the safety net may be a classic script under " + folder)
            self.assertEqual(re.findall(r"<script(?![^>]*\bsrc=)[^>]*>", html), [], "no inline script in " + page + " (the code lives in " + folder + "/main.js)")
            self.assertEqual(re.findall(r"\son(?:click|input|change|submit|keydown)=", html), [], "use data-click and the table ACTIONS in " + page)
            problems = []
            for f in sorted(glob.glob(os.path.join(ROOT, folder, "*.js"))):
                name = os.path.basename(f)
                if folder + "/" + name in allowed_classic:
                    continue
                with open(f, encoding="utf-8") as fh:
                    text = fh.read()
                if not re.search(r"^(import|export)\b", text, re.M) and name != "actions.js":
                    problems.append(name + ": not a module (no import/export)")
                if re.search(r"^export let\b", text, re.M):
                    problems.append(name + ": export let (importers cannot assign; use the state object)")
                if name != "base.js" and re.search(r"window\.Heinz(?!Dashboard\b)\w*", text):
                    problems.append(name + ": reads a window.Heinz* library directly (use " + folder + "/base.js)")
                for spec in re.findall(r"""(?:from|import)\s+['"]([^'"]+)['"]""", text):
                    if not (spec.startswith("./") and spec.endswith(".js")):
                        problems.append("%s: import path %s (relative, with .js)" % (name, spec))
                    elif not os.path.exists(os.path.join(ROOT, folder, spec[2:])):
                        problems.append("%s: imports missing file %s" % (name, spec))
            self.assertEqual(problems, [], page)

    def test_hub_and_tool_pages_use_module_scripts_and_no_inline_handlers(self):
        # step 3 (12.11.2026): small pages keep their script inline, but as type="module"; lib/core.js stays the classic head block
        pages = ["index.html", "hub.html"] + sorted(os.path.relpath(f, ROOT).replace(os.sep, "/") for f in glob.glob(os.path.join(ROOT, "tools", "*", "*.html")))
        problems = []
        for page in pages:
            with open(os.path.join(ROOT, page), encoding="utf-8") as fh:
                html = fh.read()
            for tag in re.findall(r"<script(?![^>]*\bsrc=)([^>]*)>", html):
                if 'type="module"' not in tag:
                    problems.append(page + ": inline script without type=module")
            for src in re.findall(r'<script(?![^>]*type="module")[^>]*src="([^"]+)"', html):
                if not src.endswith("lib/core.js") and not src.endswith("lib/pixel.js"):
                    problems.append(page + ": classic script " + src)
            if re.search(r"\son(?:click|input|change|submit|keydown)=", html):
                problems.append(page + ": inline handler (use a listener in the module)")
        self.assertEqual(problems, [])

    def test_every_control_of_heinz_chat_has_an_action(self):
        with open(os.path.join(ROOT, "chat.html"), encoding="utf-8") as fh:
            html = fh.read()
        with open(os.path.join(ROOT, "lib", "chat", "actions.js"), encoding="utf-8") as fh:
            js = fh.read()
        table = js[js.index("const ACTIONS = {"):js.index("// One listener")]
        known = set(re.findall(r"\b(\w+): function", table))
        used = set(re.findall(r"data-click=\"(\w+)\"", html))
        self.assertEqual(sorted(used - known), [], "These names have no entry in ACTIONS (lib/chat/actions.js)")
        self.assertEqual(sorted(known - used), [], "Unused entries in ACTIONS: remove them")

    def test_the_rule_document_exists_and_is_linked(self):
        self.assertTrue(os.path.exists(os.path.join(ROOT, "docs", "LOKALE_MODELLE.md")))
        with open(os.path.join(ROOT, "docs", "agent", "UEBERGABE.md"), encoding="utf-8") as fh:
            self.assertIn("docs/LOKALE_MODELLE.md", fh.read())


if __name__ == "__main__":
    unittest.main()
