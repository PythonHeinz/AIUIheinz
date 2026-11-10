#!/usr/bin/env python3
"""Checks lib/capabilities.json: valid JSON, every cell has a known state and status, model rules compile and resolve.
Reference resolver (the page code in the Chat strand must behave the same way)."""
import json
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, "lib", "capabilities.json"), encoding="utf-8") as fh:
    CAP = json.load(fh)

STATES = set(CAP["rules"]["states"])
STATUS = set(CAP["rules"]["status"])
PARAMS = set(CAP["parameters"])


def engine_for(provider_id, base_url):
    for rule in CAP["endpointRules"]:
        if rule["hostContains"] in (base_url or ""):
            return rule["engine"]
    return provider_id if provider_id in CAP["engines"] else "openai"


def cell(engine, model_id, key):
    base = dict(CAP["engines"][engine]["params"].get(key, {}))
    mid = re.sub(r"^models/", "", model_id or "")
    for m in CAP["models"]:
        if m["engine"] == engine and re.search(m["match"], mid, re.I):
            base.update(m.get("params", {}).get(key, {}))
            break
    return base


def thinking_rule(engine, model_id):
    mid = re.sub(r"^models/", "", model_id or "")
    for m in CAP["models"]:
        if m["engine"] == engine and re.search(m["match"], mid, re.I):
            return m.get("thinking")
    return None


class CapabilitiesTest(unittest.TestCase):
    def test_cells_use_known_states_and_status(self):
        for eid, eng in CAP["engines"].items():
            for key in PARAMS:
                self.assertIn(key, eng["params"], f"{eid} lacks {key}")
            for key, c in eng["params"].items():
                self.assertIn(key, PARAMS, f"{eid}.{key} is not a defined parameter")
                self.assertIn(c["state"], STATES, f"{eid}.{key}")
                self.assertIn(c["status"], STATUS, f"{eid}.{key}")
        for m in CAP["models"]:
            re.compile(m["match"])
            self.assertIn(m["engine"], CAP["engines"])
            for key, c in m.get("params", {}).items():
                self.assertIn(key, PARAMS, f"{m['id']}.{key}")
                self.assertIn(c["state"], STATES)
                self.assertIn(c["status"], STATUS)

    def test_hints_have_both_languages(self):
        def walk(node, path):
            if isinstance(node, dict):
                if "hint" in node:
                    self.assertEqual(sorted(node["hint"]), ["de", "en"], path)
                for k, v in node.items():
                    walk(v, path + "." + k)
            elif isinstance(node, list):
                for i, v in enumerate(node):
                    walk(v, f"{path}[{i}]")
        walk(CAP, "caps")

    def test_endpoint_rule_finds_google(self):
        self.assertEqual(engine_for("custom", "https://generativelanguage.googleapis.com/v1beta/openai"), "gemini-compat")
        self.assertEqual(engine_for("custom", "http://192.168.1.5:8080/v1"), "openai")
        self.assertEqual(engine_for("ollama", "http://localhost:11434"), "ollama")
        self.assertEqual(engine_for("litert", "http://127.0.0.1:9379/v1"), "litert")
        self.assertEqual(engine_for("groq", "https://api.groq.com/openai/v1"), "openai")

    def test_gemini3_rules(self):
        for mid in ("gemini-3.8-flash", "models/gemini-3.8-flash", "gemini-3-pro-preview", "gemini-3.1-flash-lite"):
            self.assertEqual(cell("gemini-compat", mid, "frequency_penalty")["state"], "error", mid)
            self.assertEqual(cell("gemini-compat", mid, "presence_penalty")["state"], "error", mid)
            self.assertEqual(cell("gemini-compat", mid, "temperature")["recommended"], 1.0, mid)
        # Gemini 2.5 keeps the engine defaults (penalties unverified, not an error)
        self.assertEqual(cell("gemini-compat", "gemini-2.5-flash", "frequency_penalty")["state"], "unknown")
        self.assertNotIn("recommended", cell("gemini-compat", "gemini-2.5-flash", "temperature"))

    def test_thinking_rule_order(self):
        # flash-lite must win over flash, pro must have no "minimal"
        self.assertEqual(thinking_rule("gemini-compat", "models/gemini-3.1-flash-lite-preview")["default"], "minimal")
        self.assertEqual(thinking_rule("gemini-compat", "gemini-3.8-flash")["default"], "high")
        self.assertNotIn("minimal", thinking_rule("gemini-compat", "gemini-3.1-pro-preview")["levels"])
        self.assertTrue(thinking_rule("gemini-compat", "gemini-2.5-flash")["canDisable"])
        self.assertFalse(thinking_rule("gemini-compat", "gemini-2.5-pro")["canDisable"])
        self.assertIsNone(thinking_rule("gemini-compat", "gemma-3-27b-it"))

    def test_thinking_rules_are_consistent(self):
        for m in CAP["models"]:
            t = m.get("thinking")
            if not t:
                continue
            if t["kind"] == "level":
                self.assertIn(t["default"], t["levels"])
                self.assertIn(t["fast"], t["levels"])
                self.assertIn(t["deep"], t["levels"])
                for v in t["effortMap"].values():
                    self.assertIn(v, t["levels"], m["id"])
            else:
                self.assertIn(t["kind"], ("budget",))
                self.assertIn("effortMap", t)


if __name__ == "__main__":
    unittest.main(verbosity=2)
