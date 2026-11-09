"""Server tests, standard library only: python3 tests/test_server.py"""
import http.client, json, os, sys, unittest
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
        for p in ("/", "/chat.html", "/lab.html", "/sheet.html", "/vitals.html"):
            st, _ = self.req("GET", p)
            self.assertEqual(st, 200, p)

    def test_blocked_paths(self):
        for p in ("/server.py", "/data", "/data/x.csv", "/start.sh", "/SERVER.PY"):
            st, _ = self.req("GET", p)
            self.assertEqual(st, 404, p)

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


if __name__ == "__main__":
    unittest.main(verbosity=2)
