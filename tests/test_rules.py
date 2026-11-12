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
                 + glob.glob(os.path.join(ROOT, "lib", "bench", "*.js")))
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

    def test_the_rule_document_exists_and_is_linked(self):
        self.assertTrue(os.path.exists(os.path.join(ROOT, "docs", "LOKALE_MODELLE.md")))
        with open(os.path.join(ROOT, "docs", "agent", "UEBERGABE.md"), encoding="utf-8") as fh:
            self.assertIn("docs/LOKALE_MODELLE.md", fh.read())


if __name__ == "__main__":
    unittest.main()
