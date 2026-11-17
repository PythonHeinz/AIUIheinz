"""Tests für die Module von Convert2 (tools/convert2/mod/). Node-Skripte (node:test) laufen über diese Datei;
Zip wird zusätzlich gegen Python zipfile gegengeprüft. Braucht: node (>= 20)."""
import json
import os
import shutil
import subprocess
import tempfile
import unittest
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE = shutil.which("node")


def node(*args):
    return subprocess.run([NODE, *args], cwd=ROOT, capture_output=True, text=True, timeout=120)


@unittest.skipUnless(NODE, "node fehlt")
class Convert2ModuleTests(unittest.TestCase):
    def test_node_tests_of_all_modules_pass(self):
        files = sorted(f for f in os.listdir(os.path.join(ROOT, "tests", "convert2")) if f.endswith(".test.mjs"))
        r = node("--test", *[os.path.join("tests", "convert2", f) for f in files])
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_zip_written_by_the_module_opens_with_python_zipfile(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "t.zip")
            r = node("tests/convert2/zip_helper.mjs", "write", p)
            self.assertEqual(r.returncode, 0, r.stderr)
            with zipfile.ZipFile(p) as z:
                self.assertIsNone(z.testzip())
                self.assertEqual(z.namelist()[0], "mimetype")
                self.assertEqual(z.getinfo("mimetype").compress_type, zipfile.ZIP_STORED)
                self.assertEqual(z.read("ordner/text.txt").decode(), "Grüße " * 300)
                self.assertEqual(z.read("bin.dat"), bytes(i & 255 for i in range(3000)))

    def test_zip_written_by_python_is_read_by_the_module(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "p.zip")
            with zipfile.ZipFile(p, "w") as z:
                z.writestr("a.txt", "Eins " * 200, compress_type=zipfile.ZIP_DEFLATED)
                z.writestr("b/c.txt", "Zwei", compress_type=zipfile.ZIP_STORED)
            r = node("tests/convert2/zip_helper.mjs", "read", p)
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertEqual(json.loads(r.stdout), {"a.txt": "Eins " * 200, "b/c.txt": "Zwei"})


if __name__ == "__main__":
    unittest.main()
