"""Shared helpers: start server.py on a free port with a temp data folder."""
import os, socket, subprocess, sys, tempfile, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


class Server:
    def __init__(self, root=None):
        self.root = root or ROOT
        self.port = free_port()
        self.data = tempfile.mkdtemp(prefix="heinz-test-")
        self.proc = None

    @property
    def base(self):
        return "http://127.0.0.1:%d" % self.port

    def start(self):
        self.proc = subprocess.Popen(
            [sys.executable, os.path.join(self.root, "server.py"),
             "--port", str(self.port), "--data", self.data, "--vitals-interval", "0"],
            cwd=self.root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                urllib.request.urlopen(self.base + "/api/ping", timeout=1).read()
                return self
            except Exception:
                time.sleep(0.1)
        raise RuntimeError("server did not start")

    def stop(self):
        if self.proc:
            self.proc.terminate()
            self.proc.wait(timeout=5)
