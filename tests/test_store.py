"""Storage tests (lib/store.js) with Playwright and a real IndexedDB in Chromium (strand AIUIheinz-Speicher).

Setup (once):  pip install playwright && playwright install chromium
Run:           python3 tests/test_store.py
What is checked here is the browser storage of Chromium on the test machine, not the phone: persistence, quota and eviction on the Pixel are
open (docs/HANDYTEST.md).
"""
import json, os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import Server
from playwright.sync_api import sync_playwright

VIEWPORT = {"width": 426, "height": 803}  # Pixel 9 Pro

IDB_DUMP = """() => new Promise((res, rej) => {
  const r = indexedDB.open('heinz');
  r.onerror = () => rej(r.error);
  r.onsuccess = () => {
    const db = r.result, names = [...db.objectStoreNames], out = {}, t = db.transaction(names, 'readonly');
    names.forEach(n => { out[n] = {}; const c = t.objectStore(n).openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out[n][cur.key] = cur.value; cur.continue(); } }; });
    t.oncomplete = () => { db.close(); res(out); };
  };
})"""

CHATS = [{"id": 1, "title": "first", "mode": "wilson", "messages": [{"role": "user", "content": "Hi"}], "ts": "", "model": "m"},
         {"id": 2, "title": "second", "mode": "heinz", "messages": [], "ts": "", "model": "m"}]
SERIES = {"unfinished": False, "meta": {"planned": 3, "model": "m", "provider": "ollama", "spec": {}, "prompts": ["a"], "fixed": {}},
          "runs": [{"n": i, "prompt": "a", "params": {}, "answer": "x", "stats": {}, "totalMs": 1000, "checks": []} for i in (1, 2, 3)]}


class StoreTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = Server().start()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.srv.stop()

    def new_page(self):
        ctx = self.browser.new_context(viewport=VIEWPORT)
        page = ctx.new_page()
        self.errors = []
        page.on("pageerror", lambda e: self.errors.append(str(e)))
        page.route("**/localhost:11434/**", lambda r: r.fulfill(status=200, content_type="application/json", body='{"models":[]}'))
        page.route("**/127.0.0.1:9379/**", lambda r: r.abort())
        self.addCleanup(ctx.close)
        return page

    def dash(self, page):
        page.goto(self.srv.base + "/dashboard.html")
        page.wait_for_function("window.HeinzDashboard && HeinzDashboard.ready === true", timeout=15000)

    def reload_dash(self, page):
        page.reload()
        page.wait_for_function("window.HeinzDashboard && HeinzDashboard.ready === true", timeout=15000)

    def ls(self, page, key):
        return page.evaluate("k => localStorage.getItem(k)", key)

    # ---- write, reload ----
    def test_conversations_and_results_live_in_indexeddb_small_switches_stay_in_localstorage(self):
        page = self.new_page()
        self.dash(page)
        page.evaluate("([c, s]) => Promise.all([HeinzStore.set('heinz_chats', c), HeinzStore.set('heinz_series', s), HeinzStore.set('heinz_lab', {x: 1})])", [CHATS, SERIES])
        self.reload_dash(page)
        self.assertEqual(page.evaluate("HeinzStore.get('heinz_chats', null)"), CHATS)
        self.assertEqual(page.evaluate("HeinzStore.get('heinz_series', null)"), SERIES)
        dump = page.evaluate(IDB_DUMP)
        self.assertEqual(json.loads(dump["conversations"]["heinz_chats"]), CHATS)
        self.assertEqual(json.loads(dump["results"]["heinz_series"]), SERIES)
        self.assertEqual(dump["media"], {}, "media store is prepared and empty")
        self.assertIsNone(self.ls(page, "heinz_chats"), "no copy of the conversations in localStorage")
        self.assertIsNone(self.ls(page, "heinz_series"))
        self.assertEqual(json.loads(self.ls(page, "heinz_lab")), {"x": 1})
        self.assertNotIn("heinz_lab", dump["conversations"])
        self.assertEqual(page.evaluate("HeinzStore.info().backend"), "indexeddb")
        self.assertEqual(self.errors, [])

    def test_remove_deletes_from_indexeddb(self):
        page = self.new_page()
        self.dash(page)
        page.evaluate("c => HeinzStore.set('heinz_chats', c)", CHATS)
        page.evaluate("HeinzStore.remove('heinz_chats')")
        self.reload_dash(page)
        self.assertEqual(page.evaluate("HeinzStore.get('heinz_chats', [])"), [])
        self.assertNotIn("heinz_chats", page.evaluate(IDB_DUMP)["conversations"])

    # ---- migration ----
    def seed_old(self, page):
        page.evaluate("""([c, s]) => {
            localStorage.setItem('heinz_chats', JSON.stringify(c)); localStorage.setItem('heinz_series', JSON.stringify(s));
            localStorage.setItem('heinz_current', JSON.stringify({messages: [{role: 'user', content: 'x'}], model: 'm'}));
        }""", [CHATS, SERIES])

    def test_migration_copies_the_old_localstorage_data_and_leaves_the_old_entries_in_place(self):
        page = self.new_page()
        self.dash(page)
        self.seed_old(page)
        old_chats = self.ls(page, "heinz_chats")
        self.reload_dash(page)
        self.assertEqual(page.evaluate("HeinzStore.get('heinz_chats', null)"), CHATS)
        self.assertEqual(page.evaluate("HeinzStore.get('heinz_series', null)"), SERIES)
        self.assertEqual(page.evaluate("HeinzStore.get('heinz_current', null)")["model"], "m")
        dump = page.evaluate(IDB_DUMP)
        self.assertEqual(dump["conversations"]["heinz_chats"], old_chats, "exact copy")
        self.assertIn("heinz_series", dump["results"])
        self.assertEqual(self.ls(page, "heinz_chats"), old_chats, "old entry stays (way back stays open)")
        flag = json.loads(self.ls(page, "heinz_idb_migration"))["done"]
        self.assertEqual(sorted(flag), ["heinz_chats", "heinz_current", "heinz_series"])
        self.assertEqual(flag["heinz_chats"]["n"], 2, "count recorded")
        self.assertEqual(flag["heinz_series"]["n"], 1, "one object, counted as 1")
        self.assertEqual(page.evaluate("HeinzStore.info().problems"), [])

    def test_a_list_emptied_after_the_migration_does_not_come_back_from_the_old_copy(self):
        page = self.new_page()
        self.dash(page)
        self.seed_old(page)
        self.reload_dash(page)
        page.evaluate("HeinzStore.remove('heinz_chats')")
        self.reload_dash(page)
        self.assertIsNotNone(self.ls(page, "heinz_chats"), "old copy still there")
        self.assertEqual(page.evaluate("HeinzStore.get('heinz_chats', [])"), [], "but it is not read again")

    def test_a_copy_that_differs_is_detected_and_the_old_data_stays_in_use(self):
        """Mutation: the copy is written with one extra character. The check must catch it, keep working from localStorage and say so."""
        page = self.new_page()
        self.dash(page)
        self.seed_old(page)
        page.add_init_script("(() => { const p = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (v, k) { return p.call(this, typeof v === 'string' ? v + ' ' : v, k); }; })()")
        self.reload_dash(page)
        self.assertEqual(page.evaluate("HeinzStore.get('heinz_chats', null)"), CHATS, "nothing lost")
        info = page.evaluate("HeinzStore.info()")
        self.assertEqual(info["backend"], "localstorage")
        self.assertIn("migrate", [p["code"] for p in info["problems"]])
        self.assertIsNone(self.ls(page, "heinz_idb_migration"), "not marked as moved")
        self.assertEqual(page.evaluate(IDB_DUMP)["conversations"], {}, "no half copy stays behind")
        self.assertTrue(page.is_visible("#store-note"))
        self.assertIn("old data stays in use", page.inner_text("#store-note"))
        # writes go to localStorage and are not lost
        page.evaluate("HeinzStore.set('heinz_chats', [])")
        self.assertEqual(self.ls(page, "heinz_chats"), "[]")

    # ---- fallback ----
    def test_without_indexeddb_everything_works_from_localstorage_with_a_visible_note_on_both_pages(self):
        page = self.new_page()
        page.add_init_script("Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true })")
        self.dash(page)
        info = page.evaluate("HeinzStore.info()")
        self.assertEqual(info["backend"], "localstorage")
        self.assertEqual([p["code"] for p in info["problems"]], ["fallback"])
        self.assertTrue(page.is_visible("#store-note"))
        self.assertIn("not available", page.inner_text("#store-note"))
        page.evaluate("c => HeinzStore.set('heinz_chats', c)", CHATS)
        self.assertEqual(json.loads(self.ls(page, "heinz_chats")), CHATS)
        self.reload_dash(page)
        self.assertEqual(page.evaluate("HeinzStore.get('heinz_chats', null)"), CHATS)
        page.click("button.burger-btn")
        page.evaluate("HeinzDashboard.showPage('update')")
        page.wait_for_function("document.getElementById('store-status').textContent.indexOf('fallback') > -1")
        # language switch re-renders the note
        page.evaluate("HeinzDashboard.toggleLang()")
        page.wait_for_function("document.getElementById('store-note').textContent.indexOf('nicht verfügbar') > -1")
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_selector("html[data-heinz-chat=ready]", state="attached")
        self.assertTrue(page.is_visible("#store-note"))
        self.assertEqual(self.errors, [])

    # ---- quota ----
    def test_a_full_storage_stops_the_write_keeps_the_old_value_and_says_so(self):
        page = self.new_page()
        self.dash(page)
        page.evaluate("c => HeinzStore.set('heinz_chats', c)", CHATS)
        page.evaluate("(() => { IDBObjectStore.prototype.put = function () { throw new DOMException('full', 'QuotaExceededError'); }; })()")
        page.evaluate("HeinzStore.set('heinz_chats', [])")
        self.assertEqual(page.evaluate("HeinzStore.get('heinz_chats', null)"), CHATS, "old value is back")
        self.assertIn("quota", [p["code"] for p in page.evaluate("HeinzStore.info().problems")])
        self.assertTrue(page.is_visible("#store-note"))
        self.assertIn("Storage is full", page.inner_text("#store-note"))

    # ---- backup ----
    def test_backup_export_has_the_moved_keys_but_no_keys_and_no_marker_and_old_backups_import(self):
        page = self.new_page()
        self.dash(page)
        self.seed_old(page)
        self.reload_dash(page)
        page.evaluate("HeinzStore.set('heinz_keys', {custom: 'SECRET'})")
        data = page.evaluate("HeinzStore.exportAll(false)")
        self.assertIn("heinz_chats", data)
        self.assertEqual(json.loads(data["heinz_chats"]), CHATS)
        self.assertNotIn("heinz_keys", data)
        self.assertNotIn("heinz_idb_migration", data)
        self.assertIn("heinz_keys", page.evaluate("HeinzStore.exportAll(true)"))
        # a backup file of the old version: plain strings per key, including the marker key of a foreign device (ignored)
        old = {"heinz_chats": json.dumps([CHATS[1]]), "heinz_settings": json.dumps({"lang": "de"}), "heinz_idb_migration": "{}", "other": "x"}
        page.evaluate("d => HeinzStore.importAll(d)", old)
        self.assertEqual(page.evaluate("HeinzStore.get('heinz_chats', null)"), [CHATS[1]])
        self.reload_dash(page)
        self.assertEqual(page.evaluate("HeinzStore.get('heinz_chats', null)"), [CHATS[1]], "imported into IndexedDB, survives reload")
        self.assertEqual(json.loads(self.ls(page, "heinz_settings"))["lang"], "de")
        self.assertNotEqual(self.ls(page, "heinz_idb_migration"), "{}")
        self.assertIsNone(self.ls(page, "other"))

    def test_menu_backup_import_reports_a_failed_write(self):
        page = self.new_page()
        self.dash(page)
        page.evaluate("(() => { IDBObjectStore.prototype.put = function () { throw new DOMException('full', 'QuotaExceededError'); }; })()")
        page.evaluate("""() => {
            window.confirm = () => true;
            const f = new File([JSON.stringify({app: 'heinz-ui', data: {heinz_chats: '[]'}})], 'b.json', {type: 'application/json'});
            const dt = new DataTransfer(); dt.items.add(f); const i = document.getElementById('bk-file'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true }));
        }""")
        page.wait_for_function("document.getElementById('bk-status').textContent.indexOf('could not be written') > -1")

    # ---- status ----
    def test_status_reports_backend_persistence_and_quota(self):
        page = self.new_page()
        self.dash(page)
        st = page.evaluate("HeinzStore.status()")
        self.assertEqual(st["backend"], "indexeddb")
        self.assertIn(st["persisted"], (True, False, None))
        self.assertTrue(st["quota"] is None or st["quota"] > 0)
        page.evaluate("HeinzDashboard.showPage('update')")
        page.wait_for_function("document.getElementById('store-status').textContent.indexOf('IndexedDB') > -1")

    # ---- Heinz Chat ----
    def test_heinz_chat_reads_old_conversations_moves_them_and_writes_changes_to_indexeddb(self):
        page = self.new_page()
        page.goto(self.srv.base + "/manifest.webmanifest")     # same origin, no store.js: seeds the old version's data before the first start
        chat = {"id": 111, "title": "Old talk", "ts": 1700000000000, "provider": "ollama", "model": "gemma2:2b",
                "messages": [{"role": "user", "content": "Hello old"}, {"role": "assistant", "content": "Hi again"}]}
        page.evaluate("c => { localStorage.setItem('heinz_slim_chats', JSON.stringify([c])); localStorage.setItem('heinz_slim', JSON.stringify({provider: 'ollama', model: 'gemma2:2b', chat: c.id})); }", chat)
        page.goto(self.srv.base + "/chat.html")
        page.wait_for_selector("html[data-heinz-chat=ready]", state="attached")
        self.assertIn("Hello old", page.inner_text("#log"))
        self.assertEqual(json.loads(page.evaluate(IDB_DUMP)["conversations"]["heinz_slim_chats"])[0]["id"], 111)
        page.click("#hist")
        page.click("[data-more='111']")
        page.click("[data-act=del][data-id='111']")
        page.wait_for_function("document.querySelectorAll('#chats [data-open]').length === 0")
        for _ in range(50):   # the deletion is written asynchronously: reload only after it is stored (the test was flaky on a busy machine, 12.11.2026)
            if json.loads(page.evaluate(IDB_DUMP)["conversations"]["heinz_slim_chats"]) == []:
                break
            page.wait_for_timeout(100)
        page.reload()
        page.wait_for_selector("html[data-heinz-chat=ready]", state="attached")
        self.assertNotIn("Hello old", page.inner_text("#log"))
        self.assertEqual(json.loads(page.evaluate(IDB_DUMP)["conversations"]["heinz_slim_chats"]), [])
        self.assertEqual(self.errors, [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
