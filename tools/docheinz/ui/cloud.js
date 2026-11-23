/* tools/docheinz/ui/cloud.js – Cloud-Erkennung (Google Gemini) über die Anbieterschicht lib/providers.js (nur lesen).
 *   cloudState()                   -> { online, key }   globaler Schalter „Online erlauben“ und Schlüssel von „google“
 *   cloudModels()                  -> Promise<string[]>  Modelle von Google (nur nach Klick des Nutzers)
 *   transcribe(model, blob, signal) -> Promise<string>   Text einer Seite; wirft bei gesperrtem Online (Code ONLINE_BLOCKED)
 * Ohne „Online erlauben“ verlässt nichts das Gerät: die Anbieterschicht verweigert den Aufruf, hier wird er gar nicht erst angeboten. */
import { HeinzProviders as PV } from '../../../lib/providers.js';
import { SYSTEM, buildMessages, cleanText, pickModel } from '../mod/cloud-ocr.js';

const ID = 'google';
export const cloudState = () => ({ online: PV.onlineAllowed(), key: !!PV.getKey(ID) });
export async function cloudModels() {
    const names = await PV.models(ID);
    const a = PV.activeModel();
    return { names: names.filter(n => /gemini/i.test(n) && !/embed|tts|image|live|aqa/i.test(n)), pick: pickModel(names, a && a.provider === ID ? a.model : '') };
}
const b64 = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => no(r.error); r.readAsDataURL(blob); });
export async function transcribe(model, blob, signal) {
    const res = await PV.chat(ID, { model, system: SYSTEM, messages: buildMessages(await b64(blob)), options: { temperature: 0 }, signal });
    return cleanText(res.text);
}
