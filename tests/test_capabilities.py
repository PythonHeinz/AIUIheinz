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
        if m["engine"] in (engine, CAP["engines"][engine].get("modelRulesFrom")) and re.search(m["match"], mid, re.I):
            base.update(m.get("params", {}).get(key, {}))
            break
    return base


def thinking_rule(engine, model_id):
    mid = re.sub(r"^models/", "", model_id or "")
    for m in CAP["models"]:
        if m["engine"] in (engine, CAP["engines"][engine].get("modelRulesFrom")) and re.search(m["match"], mid, re.I):
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

    def test_top_k_is_measured_off_on_gemini_3_flash_native_and_open_elsewhere(self):
        self.assertEqual(cell("google", "models/gemini-3.8-flash", "top_k")["state"], "off")
        self.assertEqual(cell("google", "models/gemini-3.8-flash", "top_k")["status"], "belegt")
        # not measured: flash-lite and pro stay open, Gemini 2.5 keeps the engine cell
        self.assertEqual(cell("google", "models/gemini-3.1-flash-lite", "top_k")["state"], "unknown")
        self.assertEqual(cell("google", "models/gemini-3-pro-preview", "top_k")["state"], "unknown")
        self.assertEqual(cell("google", "models/gemini-2.5-flash", "top_k")["state"], "unknown")

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


# ---- media rules and function slots (version 2 of the data file) ----
MEDIA = CAP["media"]


def media_rule(engine, model_id):
    mid = re.sub(r"^models/", "", model_id or "")
    for r in MEDIA["rules"]:
        if r["engine"] == engine and re.search(r["match"], mid, re.I):
            return r
    return None


def version_key(model_id):
    nums = re.findall(r"\d+", re.sub(r"^models/", "", model_id))
    return tuple(int(n) for n in nums)


def stability(model_id):
    if re.search(r"exp", model_id):
        return 0
    if re.search(r"preview", model_id):
        return 1
    return 2


def resolve_slot(assignment, models, engines_up=("google",), online=True):
    """Reference for the function-slot resolution (Chat strand must behave the same).
    models: {engine: [model ids as listed]}. Returns (outcome, engine, model)."""
    fn = MEDIA["functions"][assignment["function"]]
    need = fn["needs"]
    cond = assignment.get("conditions", {})
    if cond.get("online") and not online:
        return ("unavailable", None, None)

    def fits(engine, mid):
        r = media_rule(engine, mid)
        if not r or r.get("excluded") or r["call"] not in need["calls"]:
            return False
        return set(need["in"]) <= set(r["in"] or []) and set(need["out"]) <= set(r["out"] or [])

    for i, entry in enumerate(assignment["ranking"]):
        eng = entry["engine"]
        if cond.get("engineReachable") and eng not in engines_up and eng != "google":
            continue
        if eng not in engines_up:
            continue
        pool = [m for m in models.get(eng, []) if fits(eng, m)]
        if "model" in entry:
            if entry["model"] in pool:
                return ("ok" if i == 0 else "replaced", eng, entry["model"])
            if assignment.get("onMissing") == "stop":
                return ("unavailable", None, None)
            continue
        if "family" in entry:
            pool = [m for m in pool if re.search(entry["family"], m, re.I)]
        if pool:
            if assignment.get("preferStable", True):
                key = lambda m: (stability(m), version_key(m), -len(m))
            else:
                key = lambda m: (version_key(m), stability(m), -len(m))
            best = max(pool, key=key)
            return ("ok" if i == 0 else "replaced", eng, best)
    return ("unavailable", None, None)


class MediaTest(unittest.TestCase):
    def test_rules_are_wellformed(self):
        kinds = set(MEDIA["kinds"])
        for r in MEDIA["rules"]:
            re.compile(r["match"])
            self.assertIn(r["status"], STATUS, r["id"])
            self.assertIn(r["engine"], CAP["engines"])
            if r["call"] is not None:
                self.assertIn(r["call"], MEDIA["calls"], r["id"])
            for side in ("in", "out"):
                if r[side] is not None:
                    self.assertTrue(set(r[side]) <= kinds, r["id"])
        for fid, f in MEDIA["functions"].items():
            if fid == "note":
                continue
            self.assertTrue(set(f["needs"]["calls"]) <= set(MEDIA["calls"]), fid)
            self.assertTrue(set(f["needs"]["in"] + f["needs"]["out"]) <= kinds, fid)
        for eng, d in MEDIA["engineDefaults"].items():
            if eng != "note":
                # provider ids: engines without an own entry fall back to "openai" (rules.resolve)
                self.assertTrue(eng in CAP["engines"] or eng in ("openrouter", "groq", "mistral", "custom"), eng)
                self.assertIn(d["status"], STATUS)

    def test_method_map_points_to_known_calls(self):
        for method, calls in MEDIA["methodMap"]["google"].items():
            for c in calls:
                self.assertIn(c, MEDIA["calls"], method)

    def test_google_model_kinds(self):
        cases = {
            "models/gemini-3.8-flash": ("chat", ["text"]),
            "gemini-3.8-flash-tts": ("tts", ["audio"]),
            "gemini-3.1-flash-tts-preview": ("tts", ["audio"]),
            "gemini-3.1-flash-image": ("generate_media", ["text", "image"]),
            "gemini-3-pro-image": ("generate_media", ["text", "image"]),
            "gemini-3.1-flash-lite-image": ("generate_media", ["text", "image"]),
            "imagen-4.0-generate-001": ("imagen_predict", ["image"]),
            "gemini-embedding-2": ("embed", ["vector"]),
            "gemini-3.1-flash-live-preview": ("live", ["text", "audio"]),
            "gemini-3.8-live": ("live", ["text", "audio"]),
            "gemini-2.5-flash-preview-native-audio-dialog": ("live", ["text", "audio"]),
            "gemini-3.5-transcribe": ("transcribe", ["text"]),
            "veo-3.1-generate-preview": ("video_long", ["video"]),
        }
        for mid, (call, out) in cases.items():
            r = media_rule("google", mid)
            self.assertIsNotNone(r, mid)
            self.assertEqual(r["call"], call, mid)
            self.assertEqual(r["out"], out, mid)
        self.assertIsNone(media_rule("google", "some-unknown-model"))

    def test_only_real_chat_models_are_in_the_chat_list(self):
        for mid in ("gemini-3.8-flash-tts", "gemini-3.1-flash-image", "gemini-embedding-2", "gemini-3.8-live", "imagen-4.0-generate-001"):
            self.assertFalse(media_rule("google", mid)["chatList"], mid)
        self.assertTrue(media_rule("google", "gemini-3.6-flash")["chatList"])

    def test_thinking_rule_would_match_media_models_so_media_comes_first(self):
        # The reason for MEDIA.resolveOrder: name-based thinking rules also fit TTS and image models.
        self.assertIsNotNone(thinking_rule("gemini-compat", "gemini-3.8-flash-tts"))
        self.assertFalse(media_rule("google", "gemini-3.8-flash-tts")["chatList"])

    def test_slot_resolution(self):
        listed = {"google": ["gemini-3.8-flash", "gemini-3.1-flash-image", "gemini-3.1-flash-lite-image-preview",
                             "gemini-2.5-flash-image", "imagen-4.0-generate-001", "veo-3.1-generate-preview",
                             "gemini-3.8-flash-tts"]}
        ex = MEDIA["assignmentFormat"]["example"]
        # preferred model is listed
        self.assertEqual(resolve_slot(ex, listed), ("ok", "google", "gemini-3.1-flash-image"))
        # preferred model gone: stable beats the newer preview, and the UI must get "replaced"
        gone = {"google": [m for m in listed["google"] if m != "gemini-3.1-flash-image"]}
        self.assertEqual(resolve_slot(ex, gone), ("replaced", "google", "gemini-2.5-flash-image"))
        # without the stability preference the newest wins
        newest = dict(ex, preferStable=False)
        self.assertEqual(resolve_slot(newest, gone), ("replaced", "google", "gemini-3.1-flash-lite-image-preview"))
        # online lock
        self.assertEqual(resolve_slot(ex, listed, online=False)[0], "unavailable")
        # nothing with the ability: video models and chat models never fill image.make
        none = {"google": ["gemini-3.8-flash", "veo-3.1-generate-preview", "gemini-3.8-flash-tts"]}
        self.assertEqual(resolve_slot(ex, none)[0], "unavailable")
        # onMissing stop
        stop = dict(ex, onMissing="stop")
        self.assertEqual(resolve_slot(stop, gone)[0], "unavailable")

    def test_speech_slot_needs_tts_not_image(self):
        a = {"function": "speech.say", "ranking": [{"engine": "google", "family": "tts", "pick": "newest"}],
             "preferStable": True, "conditions": {"online": True}, "onMissing": "next", "ifNone": "unavailable"}
        r = resolve_slot(a, {"google": ["gemini-3.1-flash-image", "gemini-3.8-flash-tts", "gemini-3.8-flash"]})
        self.assertEqual(r, ("ok", "google", "gemini-3.8-flash-tts"))

    def test_version_order(self):
        self.assertGreater(version_key("gemini-3.1-flash-image"), version_key("gemini-3-pro-image"))
        self.assertGreater(version_key("gemini-3-pro-image"), version_key("gemini-2.5-flash-image"))

    def test_lifecycle_patterns(self):
        lc = CAP["lifecycle"]["google"]
        by = {p["kind"]: re.compile(p["regex"]) for p in lc["errorPatterns"]}
        msg = "This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash for the latest features."
        self.assertTrue(by["gone"].search(msg))
        self.assertEqual(by["replacement"].search(msg).group(1), "gemini-3.6-flash")
        self.assertTrue(by["unsupported"].search("models/x is not found for API version v1beta, or is not supported for generateContent."))
        self.assertFalse(by["gone"].search("Thinking level MINIMAL is not supported for this model"))
        for e in lc["seed"]["entries"]:
            self.assertIn(e["status"], STATUS)
            self.assertRegex(e["shutdown"], r"^\d{4}-\d{2}-\d{2}$")


class MediaGoogleTest(unittest.TestCase):
    def test_numbers_are_present_and_consistent(self):
        g = CAP["mediaGoogle"]
        self.assertIn("image/png", g["image_in"]["mime"])
        self.assertEqual(g["image_in"]["inlineRequestMaxBytes"], 20 * 1024 * 1024)
        self.assertEqual(g["audio_in"]["inlineRequestMaxBytes"], 20 * 1024 * 1024)
        self.assertNotIn("audio/webm", g["audio_in"]["mime"])  # browser default recording format is not accepted
        self.assertIn("webm", g["audio_in"]["browserRecordingWarning"])
        self.assertEqual(g["image_out_imagen"]["parameters"]["sampleCount"]["max"], 4)
        self.assertIn("16:9", g["image_out_gemini"]["aspectRatio"])
        self.assertIn("pcm", g["speech_out"]["response"].lower())

    def test_calls_exist_and_pricing_status_is_known(self):
        g = CAP["mediaGoogle"]
        for key in ("image_out_gemini", "image_out_imagen", "speech_out", "transcribe", "live"):
            self.assertIn(g[key]["call"], MEDIA["calls"], key)
        for item in g["pricing"]["items"]:
            self.assertIn(item["status"], STATUS, item["id"])

    def test_cost_example_for_speech_is_about_three_cents_per_minute(self):
        g = CAP["mediaGoogle"]["speech_out"]
        usd_per_minute = g["outputTokensPerSecond"]["value"] * 60 * 20.0 / 1_000_000
        self.assertAlmostEqual(usd_per_minute, 0.03, places=3)


if __name__ == "__main__":
    unittest.main(verbosity=2)
