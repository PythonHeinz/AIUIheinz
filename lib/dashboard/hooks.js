/* lib/dashboard/hooks.js – Rückrufe nach oben (docs/MODULE.md, Abschnitt „Hooks“).
 * ES module. Leaf: imports nothing. A lower file must not import a higher one (no cycles); where it still has to say "draw again" or
 * "plan again", it calls a hook by name: hooks.call('renderQuick'). init.js registers the implementation for every name below
 * with hooks.on(name, fn) before anything can call it. One implementation per name; the return value is passed on.
 * Only for "redraw" and "state changed" callbacks, never for business logic (a test checks that every name is listed here,
 * registered in init.js and used). */

export const HOOKS = {
    // name: [implemented in, who calls it from below and why]
    applyUIFromSettings: ['init.js', 'conversations.js: a saved conversation was loaded, put its settings on the page'],
    applyModelConfig: ['configs.js', 'config.js, preload.js, engine.js: a model was loaded or chosen, its assigned configuration loads with it'],
    askGemma: ['send.js', 'caps.js: Enter in the question field sends'],
    onModelChange: ['preload.js', 'caps.js: a model was chosen in the list'],
    pickPerson: ['preload.js', 'configs.js: a loaded configuration selects its person'],
    pickEngine: ['quick.js', 'caps.js: an engine button was tapped'],
    renderConfigs: ['configs.js', 'caps.js: the quick area is drawn again, so the list of saved configurations is too'],
    renderMarks: ['preload.js', 'caps.js: the person bar shows its change LED again after a value changed'],
    renderModelSheet: ['caps.js', 'menu.js: open the model sheet (list drawn first)'],
    renderPrompts: ['settings.js', 'caps.js: the system prompt area is drawn again after the engine changed'],
    renderQuick: ['caps.js', 'params.js, settings.js: tone, prompt or remembered stand changed, redraw the quick area'],
    renderSavedList: ['conversations.js', 'menu.js: drawer opens or selection ends, redraw the list'],
    repaintLang: ['init.js', 'i18n.js: the language changed, redraw everything that script drew'],
    schedulePreload: ['preload.js', 'config, engine, params, settings: a value changed that the preloaded model depends on'],
    srGate: ['series.js', 'caps.js: sliders of the test series follow the capabilities'],
    srPlan: ['series.js', 'menu.js: the series page opens, plan is shown'],
    updateChatBar: ['caps.js', 'persist.js: the conversation was saved, redraw the bar']
};

const table = {};
export const hooks = {
    on: function (name, fn) {
        if (!HOOKS[name]) throw new Error('unknown hook: ' + name);
        table[name] = fn;
    },
    call: function (name) {
        const fn = table[name];
        if (!fn) throw new Error('hook not registered: ' + name);
        return fn.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};
