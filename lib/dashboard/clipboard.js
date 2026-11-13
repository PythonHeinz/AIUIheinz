/* lib/dashboard/clipboard.js – Zwischenablage: copyText().
 * ES module (docs/MODULE.md): imports what it uses, exports what other files use. */

export function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise(function (resolve, reject) {
        const ta = document.createElement('textarea');
        ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
        ta.remove();
    });
}
