"""Server tests, standard library only: python3 tests/test_server.py"""
import http.client, json, os, shutil, subprocess, sys, tempfile, time, unittest, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import Server

H = {"X-Heinz": "1"}


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = Server().start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()

    def req(self, method, path, body=None, headers=None):
        c = http.client.HTTPConnection("127.0.0.1", self.srv.port, timeout=5)
        c.request(method, path, body=body, headers=headers or {})
        r = c.getresponse()
        data = r.read()
        c.close()
        return r.status, data

    def test_ping(self):
        st, data = self.req("GET", "/api/ping")
        self.assertEqual(st, 200)
        self.assertTrue(json.loads(data)["ok"])

    def test_pages_served(self):
        for p in ("/", "/chat.html", "/lab.html", "/sheet.html", "/vitals.html", "/lib/core.js", "/lib/core.css", "/manifest.webmanifest", "/sw.js", "/icons/icon-192.png", "/tools/models/index.html", "/tools/filter/index.html"):
            st, _ = self.req("GET", p)
            self.assertEqual(st, 200, p)

    def test_blocked_paths(self):
        for p in ("/server.py", "/data", "/data/x.csv", "/start.sh", "/SERVER.PY"):
            st, _ = self.req("GET", p)
            self.assertEqual(st, 404, p)

    def test_tools_listing(self):
        st, data = self.req("GET", "/api/tools")
        self.assertEqual(st, 200)
        ids = [t["id"] for t in json.loads(data)["tools"]]
        self.assertEqual(ids, ["chat", "models", "filter", "sheet", "lab", "vitals"])

    def test_tools_apps_json_and_invalid_entries(self):
        d = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tools", "zz-bad")
        os.makedirs(d, exist_ok=True)
        try:
            with open(os.path.join(d, "tool.json"), "w") as f:
                json.dump({"id": "zz-bad", "name": {"en": "x"}, "entry": "https://evil.example/"}, f)
            ids = [t["id"] for t in json.loads(self.req("GET", "/api/tools")[1])["tools"]]
            self.assertNotIn("zz-bad", ids)
        finally:
            os.remove(os.path.join(d, "tool.json")); os.rmdir(d)
        with open(os.path.join(self.srv.data, "apps.json"), "w") as f:
            json.dump({"enabled": ["chat", "sheet"]}, f)
        try:
            ids = [t["id"] for t in json.loads(self.req("GET", "/api/tools")[1])["tools"]]
            self.assertEqual(ids, ["chat", "sheet"])
        finally:
            os.remove(os.path.join(self.srv.data, "apps.json"))

    def test_unknown_api(self):
        st, _ = self.req("GET", "/api/nope")
        self.assertEqual(st, 404)

    def test_write_needs_header(self):
        st, _ = self.req("PUT", "/api/files/a.csv", b"x", {"Content-Length": "1"})
        self.assertEqual(st, 403)

    def test_foreign_origin(self):
        h = dict(H, Origin="http://evil.example")
        st, _ = self.req("PUT", "/api/files/a.csv", b"x", h)
        self.assertEqual(st, 403)

    def test_same_origin_roundtrip_and_trash(self):
        h = dict(H, Origin=self.srv.base)
        st, _ = self.req("PUT", "/api/files/test_a.csv", b"a,b\n1,2\n", h)
        self.assertEqual(st, 200)
        st, data = self.req("GET", "/api/files/test_a.csv")
        self.assertEqual((st, data), (200, b"a,b\n1,2\n"))
        st, data = self.req("GET", "/api/files")
        self.assertIn("test_a.csv", [f["name"] for f in json.loads(data)["files"]])
        st, _ = self.req("DELETE", "/api/files/test_a.csv", None, h)
        self.assertEqual(st, 200)
        st, _ = self.req("GET", "/api/files/test_a.csv")
        self.assertEqual(st, 404)
        trash = os.listdir(os.path.join(self.srv.data, "_trash"))
        self.assertEqual(len(trash), 1)
        self.assertTrue(trash[0].endswith("_test_a.csv"))

    def test_bad_names(self):
        for name in ("..%2Fserver.py", "a.exe", ".hidden.csv", "a%2Fb.csv", "x" * 80 + ".csv"):
            st, _ = self.req("PUT", "/api/files/" + name, b"x", H)
            self.assertEqual(st, 400, name)

    def test_too_large(self):
        c = http.client.HTTPConnection("127.0.0.1", self.srv.port, timeout=5)
        c.putrequest("PUT", "/api/files/big.csv")
        for k, v in H.items():
            c.putheader(k, v)
        c.putheader("Content-Length", str(50 * 1024 * 1024))
        c.endheaders()
        self.assertEqual(c.getresponse().status, 413)
        c.close()

    def test_post_not_allowed(self):
        st, _ = self.req("POST", "/api/files/a.csv", b"x", H)
        self.assertEqual(st, 405)



GITENV = dict(os.environ, GIT_AUTHOR_NAME="t", GIT_AUTHOR_EMAIL="t@t", GIT_COMMITTER_NAME="t", GIT_COMMITTER_EMAIL="t@t")
SERVER_PY = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "server.py")


def git(*args, cwd):
    return subprocess.run(["git"] + list(args), cwd=cwd, check=True, capture_output=True, text=True, env=GITENV)


class UpdateTest(unittest.TestCase):
    """POST /api/update with a local 'GitHub' (bare repo), a developer clone and the 'phone' clone that runs the server."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="heinz-upd-")
        self.origin = os.path.join(self.tmp, "origin.git")
        self.work = os.path.join(self.tmp, "work")
        self.phone = os.path.join(self.tmp, "phone")
        git("init", "--bare", "-b", "main", self.origin, cwd=self.tmp)
        git("clone", self.origin, self.work, cwd=self.tmp)
        shutil.copy(SERVER_PY, os.path.join(self.work, "server.py"))
        with open(os.path.join(self.work, "index.html"), "w") as f:
            f.write("version one")
        git("add", "-A", cwd=self.work)
        git("commit", "-m", "one", cwd=self.work)
        git("push", "origin", "HEAD:main", cwd=self.work)
        git("clone", self.origin, self.phone, cwd=self.tmp)
        self.srv = Server(root=self.phone).start()
        self.addCleanup(self.srv.stop)
        self.addCleanup(shutil.rmtree, self.tmp, True)

    def push_change(self, name, content):
        with open(os.path.join(self.work, name), "w") as f:
            f.write(content)
        git("add", "-A", cwd=self.work)
        git("commit", "-m", "change " + name, cwd=self.work)
        git("push", "origin", "HEAD:main", cwd=self.work)

    def post(self, headers=None):
        c = http.client.HTTPConnection("127.0.0.1", self.srv.port, timeout=30)
        c.request("POST", "/api/update", headers=headers if headers is not None else dict(H, Origin=self.srv.base))
        r = c.getresponse()
        data = json.loads(r.read())
        c.close()
        return r.status, data

    def get(self, path):
        with urllib.request.urlopen(self.srv.base + path, timeout=5) as r:
            return r.read().decode()

    def test_guard_header_and_origin(self):
        self.push_change("index.html", "version two")
        self.assertEqual(self.post({})[0], 403)
        self.assertEqual(self.post(dict(H, Origin="http://evil.example"))[0], 403)
        self.assertEqual(self.get("/index.html"), "version one", "a refused call must not update anything")

    def test_up_to_date(self):
        st, res = self.post()
        self.assertEqual(st, 200)
        self.assertTrue(res["ok"])
        self.assertFalse(res["changed"])
        self.assertFalse(res["restarting"])

    def test_page_change_is_pulled_without_restart(self):
        self.push_change("index.html", "version two")
        st, res = self.post()
        self.assertEqual((st, res["ok"], res["changed"], res["restarting"]), (200, True, True, False))
        self.assertEqual(res["files"], ["index.html"])
        self.assertEqual(self.get("/index.html"), "version two")
        self.assertEqual(json.loads(self.get("/api/ping"))["version"], "1")

    def test_server_change_restarts_the_server(self):
        with open(os.path.join(self.work, "server.py")) as f:
            src = f.read()
        self.assertIn('VERSION = "1"', src)
        self.push_change("server.py", src.replace('VERSION = "1"', 'VERSION = "2"'))
        st, res = self.post()
        self.assertEqual((st, res["restarting"]), (200, True))
        for _ in range(60):
            time.sleep(0.2)
            try:
                if json.loads(self.get("/api/ping"))["version"] == "2":
                    return
            except Exception:
                pass
        self.fail("server did not come back with the new version")

    def test_diverged_clone_fails_cleanly(self):
        with open(os.path.join(self.phone, "index.html"), "w") as f:
            f.write("local edit")
        git("commit", "-am", "local", cwd=self.phone)
        self.push_change("index.html", "version two")
        st, res = self.post()
        self.assertEqual(st, 409)
        self.assertFalse(res["ok"])
        self.assertTrue(res["output"])
        self.assertEqual(self.get("/index.html"), "local edit")

    def test_not_a_git_checkout(self):
        plain = os.path.join(self.tmp, "plain")
        os.makedirs(plain)
        shutil.copy(SERVER_PY, plain)
        srv = Server(root=plain).start()
        self.addCleanup(srv.stop)
        c = http.client.HTTPConnection("127.0.0.1", srv.port, timeout=5)
        c.request("POST", "/api/update", headers=dict(H, Origin=srv.base))
        r = c.getresponse()
        self.assertEqual(r.status, 409)
        self.assertEqual(json.loads(r.read())["error"], "not a git checkout")

if __name__ == "__main__":
    unittest.main(verbosity=2)
