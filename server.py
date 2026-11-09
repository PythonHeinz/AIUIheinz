#!/usr/bin/env python3
"""Heinz UI server: serves the pages and stores tables as real files.

Start (in Termux, inside the ollama_ui folder):   python server.py
Options:                                          python server.py --port 3000 --data data

Uses only the Python standard library (nothing to install).
POST /api/update runs `git pull --ff-only` in this folder (needs X-Heinz header); if server.py changed, the server restarts itself.
Listens on 127.0.0.1 only, so other devices in the Wi-Fi cannot reach it.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

VERSION = "1"
MAX_BYTES = 5 * 1024 * 1024
NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 _.\-]{0,63}\.(csv|json|txt)$")
BLOCKED_STATIC = ("/data", "/server.py", "/start.sh")

VITALS_COLS = ["ts", "batt", "status", "plugged", "batt_temp", "cpu_temp", "mem_avail_mb", "mem_total_mb", "load1", "pressure"]
VITALS_INTERVAL = 60
VITALS_MAX_BYTES = 2 * 1024 * 1024
_vitals_lock = threading.Lock()
_vitals_latest = {}

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(APP_DIR, "data")


_update_lock = threading.Lock()
_app_version = None


def app_version(refresh=False):
    """Short commit and date of the checked-out version ({'commit','date'}), or None without git. Cached."""
    global _app_version
    if _app_version is None or refresh:
        _app_version = {}
        if os.path.isdir(os.path.join(APP_DIR, ".git")):
            try:
                c = _git(["rev-parse", "--short", "HEAD"], timeout=10).stdout.strip()
                d = _git(["log", "-1", "--format=%cs"], timeout=10).stdout.strip()
                if c:
                    _app_version = {"commit": c, "date": d}
            except Exception:
                pass
    return _app_version or None


def _git(args, timeout=90):
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0", LC_ALL="C")   # never wait for a password
    return subprocess.run(["git", "-C", APP_DIR] + args, capture_output=True, text=True, timeout=timeout, env=env)


def update_from_git():
    """git pull --ff-only in the app folder (fixed command, no user input).
    Returns (http status, result dict). 'restarting' is true when server.py itself changed."""
    if not os.path.isdir(os.path.join(APP_DIR, ".git")):
        return 409, {"ok": False, "error": "not a git checkout"}
    if not _update_lock.acquire(blocking=False):
        return 409, {"ok": False, "error": "update already running"}
    try:
        old = _git(["rev-parse", "HEAD"]).stdout.strip()
        pull = _git(["pull", "--ff-only"])
        out = (pull.stdout + pull.stderr).strip()[-500:]
        if pull.returncode != 0:
            return 409, {"ok": False, "error": "git pull failed", "output": out}
        new = _git(["rev-parse", "HEAD"]).stdout.strip()
        files = []
        if new != old:
            files = [f for f in _git(["diff", "--name-only", old, new]).stdout.split("\n") if f]
        ver = app_version(refresh=True) or {}
        old_short = _git(["rev-parse", "--short", old]).stdout.strip() if old else ""
        return 200, {"ok": True, "changed": new != old, "files": files, "restarting": "server.py" in files, "output": out,
                     "from": old_short, "to": ver.get("commit", ""), "date": ver.get("date", "")}
    except FileNotFoundError:
        return 500, {"ok": False, "error": "git is not installed"}
    except subprocess.TimeoutExpired:
        return 504, {"ok": False, "error": "git pull timed out (no internet?)"}
    finally:
        _update_lock.release()


def _restart_self():
    """Start the (possibly updated) server.py with the same options in this process."""
    print("server.py changed: restarting ...")
    sys.stdout.flush()
    os.execv(sys.executable, [sys.executable, os.path.join(APP_DIR, "server.py")] + sys.argv[1:])


TOOL_ID_RE = re.compile(r"^[a-z][a-z0-9\-]{0,31}$")
TOOL_KEYS = ("id", "name", "desc", "icon", "entry", "color", "status", "order", "legacy")


def load_tools():
    """Tool registry: every tools/<id>/tool.json describes one tool of the hub.

    Optional data/apps.json {"enabled": ["chat", ...]} limits the list.
    Broken or unknown entries are skipped, never fatal.
    """
    tools = []
    base = os.path.join(APP_DIR, "tools")
    if os.path.isdir(base):
        for d in sorted(os.listdir(base)):
            f = os.path.join(base, d, "tool.json")
            if not (TOOL_ID_RE.match(d) and os.path.isfile(f)):
                continue
            try:
                with open(f, encoding="utf-8") as fh:
                    raw = json.load(fh)
            except (OSError, ValueError):
                continue
            if not isinstance(raw, dict) or raw.get("id") != d or not isinstance(raw.get("entry"), str):
                continue
            entry = raw["entry"]
            if "://" in entry or entry.startswith("//") or ".." in entry:
                continue
            tools.append({k: raw[k] for k in TOOL_KEYS if k in raw})
    enabled = None
    try:
        with open(os.path.join(DATA_DIR, "apps.json"), encoding="utf-8") as fh:
            e = json.load(fh).get("enabled")
            if isinstance(e, list):
                enabled = [str(x) for x in e]
    except (OSError, ValueError, AttributeError):
        pass
    if enabled is not None:
        tools = [t for t in tools if t["id"] in enabled]
    tools.sort(key=lambda t: (t.get("order", 100) if isinstance(t.get("order", 100), (int, float)) else 100, t["id"]))
    return tools


def _run_json(cmd, timeout=6):
    """Run a Termux:API command and parse its JSON output. None on any problem."""
    if not shutil.which(cmd[0]):
        return None
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout).stdout
        return json.loads(out)
    except Exception:
        return None


def _read_meminfo():
    try:
        d = {}
        with open("/proc/meminfo") as f:
            for line in f:
                k, v = line.split(":", 1)
                d[k] = int(v.split()[0])
        return round(d.get("MemAvailable", 0) / 1024), round(d.get("MemTotal", 0) / 1024)
    except Exception:
        return None, None


def _read_cpu_temp():
    best = None
    try:
        base = "/sys/class/thermal"
        for z in os.listdir(base):
            if not z.startswith("thermal_zone"):
                continue
            try:
                with open(os.path.join(base, z, "temp")) as f:
                    v = int(f.read().strip())
                v = v / 1000.0 if abs(v) > 200 else float(v)
                if 5 < v < 120 and (best is None or v > best):
                    best = v
            except Exception:
                pass
    except Exception:
        pass
    return None if best is None else round(best, 1)


def _read_pressure():
    j = _run_json(["termux-sensor", "-s", "pressure", "-n", "1"], timeout=3)
    try:
        for _, v in j.items():
            return round(float(v["values"][0]), 1)
    except Exception:
        return None
    return None


def sample_vitals():
    """One reading. Every field may be None when the phone does not expose it."""
    b = _run_json(["termux-battery-status"]) or {}
    avail, total = _read_meminfo()
    try:
        load1 = round(os.getloadavg()[0], 2)
    except Exception:
        load1 = None
    row = {
        "ts": int(time.time()),
        "batt": b.get("percentage"),
        "status": b.get("status"),
        "plugged": b.get("plugged"),
        "batt_temp": b.get("temperature"),
        "cpu_temp": _read_cpu_temp(),
        "mem_avail_mb": avail,
        "mem_total_mb": total,
        "load1": load1,
        "pressure": _read_pressure(),
    }
    with _vitals_lock:
        _vitals_latest.clear()
        _vitals_latest.update(row)
    return row


def _vitals_path():
    d = os.path.join(DATA_DIR, "vitals")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, "vitals.csv")


def _log_vitals(row):
    p = _vitals_path()
    new = not os.path.exists(p)
    if not new and os.path.getsize(p) > VITALS_MAX_BYTES:
        os.replace(p, p.replace("vitals.csv", "vitals.old.csv"))
        new = True
    with open(p, "a", encoding="utf-8") as f:
        if new:
            f.write(",".join(VITALS_COLS) + "\n")
        f.write(",".join("" if row[c] is None else str(row[c]) for c in VITALS_COLS) + "\n")


def vitals_loop(interval):
    while True:
        try:
            _log_vitals(sample_vitals())
        except Exception as e:
            sys.stderr.write("vitals error: %s\n" % e)
        time.sleep(interval)


def vitals_history(hours, max_points=500):
    p = _vitals_path()
    if not os.path.exists(p):
        return []
    since = time.time() - hours * 3600
    rows = []
    with open(p, encoding="utf-8") as f:
        next(f, None)
        for line in f:
            parts = line.rstrip("\n").split(",")
            if len(parts) != len(VITALS_COLS):
                continue
            try:
                if int(parts[0]) < since:
                    continue
            except ValueError:
                continue
            row = []
            for c, v in zip(VITALS_COLS, parts):
                if v == "":
                    row.append(None)
                elif c in ("status", "plugged"):
                    row.append(v)
                else:
                    try:
                        row.append(float(v))
                    except ValueError:
                        row.append(None)
            rows.append(row)
    if len(rows) > max_points:
        step = len(rows) / float(max_points)
        rows = [rows[int(i * step)] for i in range(max_points)]
    return rows


class Handler(SimpleHTTPRequestHandler):
    server_version = "HeinzServer/" + VERSION
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".webmanifest": "application/manifest+json", ".js": "text/javascript"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    # ---------- helpers ----------
    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _guard_write(self):
        """Writes must carry a custom header. A foreign web page cannot send it
        without a CORS preflight, which this server never allows."""
        if self.headers.get("X-Heinz") != "1":
            self._json(403, {"error": "missing X-Heinz header"})
            return False
        origin = self.headers.get("Origin")
        if origin:
            host = self.headers.get("Host", "")
            if urlparse(origin).netloc != host:
                self._json(403, {"error": "foreign origin"})
                return False
        return True

    def _file_path(self, raw_name):
        name = unquote(raw_name)
        if not NAME_RE.match(name):
            return None, name
        return os.path.join(DATA_DIR, name), name

    # ---------- GET ----------
    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/ping":
            return self._json(200, {"ok": True, "version": VERSION, "data": DATA_DIR, "app": app_version()})
        if path == "/api/tools":
            return self._json(200, {"tools": load_tools()})
        if path == "/api/vitals":
            with _vitals_lock:
                cur = dict(_vitals_latest)
            if not cur or time.time() - cur.get("ts", 0) > 150:
                cur = sample_vitals()   # only when the logger is off or stalled
            return self._json(200, cur)
        if path == "/api/vitals/history":
            q = parse_qs(urlparse(self.path).query)
            try:
                hours = max(0.1, min(float(q.get("hours", ["6"])[0]), 24 * 14))
            except ValueError:
                hours = 6
            return self._json(200, {"cols": VITALS_COLS, "rows": vitals_history(hours)})
        if path == "/api/files":
            items = []
            for n in sorted(os.listdir(DATA_DIR)):
                p = os.path.join(DATA_DIR, n)
                if NAME_RE.match(n) and os.path.isfile(p):
                    st = os.stat(p)
                    items.append({"name": n, "size": st.st_size, "mtime": int(st.st_mtime)})
            return self._json(200, {"files": items})
        if path.startswith("/api/files/"):
            p, name = self._file_path(path[len("/api/files/"):])
            if not p:
                return self._json(400, {"error": "invalid file name"})
            if not os.path.isfile(p):
                return self._json(404, {"error": "not found"})
            with open(p, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        if path.startswith("/api/"):
            return self._json(404, {"error": "unknown endpoint"})
        low = path.lower().rstrip("/")
        if any(low == b or low.startswith(b + "/") for b in BLOCKED_STATIC):
            self.send_error(404)
            return
        return super().do_GET()

    # ---------- PUT / DELETE ----------
    def do_PUT(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/files/"):
            return self._json(404, {"error": "unknown endpoint"})
        if not self._guard_write():
            return
        p, name = self._file_path(path[len("/api/files/"):])
        if not p:
            return self._json(400, {"error": "invalid file name"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self._json(400, {"error": "bad length"})
        if length > MAX_BYTES:
            return self._json(413, {"error": "file too large"})
        data = self.rfile.read(length)
        tmp = p + ".tmp"
        with open(tmp, "wb") as f:
            f.write(data)
        os.replace(tmp, p)  # atomic: never a half-written file
        return self._json(200, {"ok": True, "name": name, "size": len(data)})

    def do_DELETE(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/files/"):
            return self._json(404, {"error": "unknown endpoint"})
        if not self._guard_write():
            return
        p, name = self._file_path(path[len("/api/files/"):])
        if not p:
            return self._json(400, {"error": "invalid file name"})
        if not os.path.isfile(p):
            return self._json(404, {"error": "not found"})
        trash = os.path.join(DATA_DIR, "_trash")
        os.makedirs(trash, exist_ok=True)
        os.replace(p, os.path.join(trash, "%d_%s" % (int(time.time()), name)))
        return self._json(200, {"ok": True})

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/update":
            if not self._guard_write():
                return
            code, res = update_from_git()
            self._json(code, res)
            if res.get("restarting"):
                threading.Timer(0.7, _restart_self).start()   # after the answer is sent
            return
        self._json(405, {"error": "method not allowed"})

    def handle_one_request(self):
        # a browser that reloads mid-response is normal, not an error
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionResetError):
            self.close_connection = True

    # no cache for pages, so a reload always shows the newest version
    def end_headers(self):
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        # keep the terminal readable: hide the 3-second status polling
        line = fmt % args
        if "/api/ping" in line or "/api/vitals" in line:
            return
        sys.stderr.write("%s  %s\n" % (time.strftime("%H:%M:%S"), line))


def main():
    global DATA_DIR
    ap = argparse.ArgumentParser(description="Heinz UI server")
    ap.add_argument("--port", type=int, default=3000)
    ap.add_argument("--data", default=DATA_DIR, help="folder for saved tables")
    ap.add_argument("--vitals-interval", type=int, default=VITALS_INTERVAL, help="seconds between phone readings, 0 = off")
    args = ap.parse_args()
    DATA_DIR = os.path.abspath(args.data)
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        httpd = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    except OSError as e:
        print("Cannot start on port %d: %s" % (args.port, e))
        print("Probably an old server is still running. Stop it with:")
        print("    pkill -f http.server ; pkill -f server.py")
        sys.exit(1)
    if args.vitals_interval > 0:
        threading.Thread(target=vitals_loop, args=(args.vitals_interval,), daemon=True).start()
        print("Phone vitals logged every %d s" % args.vitals_interval)
    print("Heinz server running:  http://localhost:%d/" % args.port)
    print("Pages from:            %s" % APP_DIR)
    print("Tables saved in:       %s" % DATA_DIR)
    print("Stop with Ctrl+C")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
