/* lib/dashboarddata.js – loads the data files of the dashboard (texts, modes, test definitions) before the page starts.
 * Plain script, no build. Global: HeinzDashboardData.
 *   HeinzDashboardData.load()   -> Promise of { i18n, modes, bench }; the files live in lib/data/*.json (relative paths, served by server.py, cached by sw.js)
 * Definitions are data, not code (docs/KONZEPT.md 22): a new text, mode or test definition is an edit in lib/data, not in dashboard.html. */
(function () {
    'use strict';
    function get(name) {
        return fetch('lib/data/' + name, { cache: 'no-cache' }).then(function (r) {
            if (!r.ok) throw new Error('lib/data/' + name + ': HTTP ' + r.status);
            return r.json();
        });
    }
    var cached = null;
    window.HeinzDashboardData = {
        load: function () {
            if (!cached) cached = Promise.all([get('dashboard.i18n.json'), get('modes.json'), get('dashboard.json')]).then(function (a) {
                return { i18n: a[0], modes: a[1], bench: a[2] };
            });
            return cached;
        }
    };
})();
