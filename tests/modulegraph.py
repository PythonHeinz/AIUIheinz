"""Import graph of the module folders as a Markdown table (docs/MODULE.md, block between the graph markers).
Run `python3 tests/modulegraph.py` to print it; `--write` puts it into docs/MODULE.md. tests/test_rules.py checks that the document is current."""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOLDERS = (("lib/dashboard", "Dashboard"), ("lib/chat", "Heinz Chat"))
BEGIN, END = "<!-- graph:begin -->", "<!-- graph:end -->"


def graph(folder):
    g = {}
    for f in glob.glob(os.path.join(ROOT, folder, "*.js")):
        with open(f, encoding="utf-8") as fh:
            text = fh.read()
        g[os.path.basename(f)[:-3]] = sorted(set(re.findall(r"""(?:from|import)\s*['"]\./(\w+)\.js['"]""", text)))
    return g


def levels(g):
    memo = {}

    def lv(v):
        if v not in memo:
            memo[v] = 0 if not g[v] else 1 + max(lv(w) for w in g[v])
        return memo[v]
    return {v: lv(v) for v in g}


def markdown():
    out = [BEGIN, "Von einem Skript erzeugt (`python3 tests/modulegraph.py --write`), nicht von Hand ändern. Ebene 0 importiert keine Datei des Ordners; jede Datei liegt eine Ebene über ihrer höchsten Abhängigkeit, Importe gehen nur nach unten.", ""]
    for folder, title in FOLDERS:
        g = graph(folder)
        lv = levels(g)
        out += ["**%s** (`%s/`, %d Dateien)" % (title, folder, len(g)), "", "| Ebene | Datei | importiert |", "|---|---|---|"]
        for v in sorted(g, key=lambda x: (lv[x], x)):
            out.append("| %d | `%s.js` | %s |" % (lv[v], v, ", ".join("`%s`" % w for w in g[v]) or "–"))
        out.append("")
    out.append(END)
    return "\n".join(out)


if __name__ == "__main__":
    md = markdown()
    if "--write" in sys.argv:
        p = os.path.join(ROOT, "docs", "MODULE.md")
        with open(p, encoding="utf-8") as fh:
            s = fh.read()
        a, b = s.index(BEGIN), s.index(END) + len(END)
        with open(p, "w", encoding="utf-8") as fh:
            fh.write(s[:a] + md + s[b:])
    else:
        print(md)
