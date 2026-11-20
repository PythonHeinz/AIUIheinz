/* tools/filter/mod/presets.js – Voreinstellungen für Regel und Etiketten (Daten, aus dem Data Lab übernommen).
 * Regeln englisch (kleine Modelle folgen ihnen besser), Namen und Beschreibung EN und DE. "Rohstoffe" (material) gehört zu INCIheinz und fehlt hier. */
export const PRESETS = {
    mood: { name: { en: 'Mood', de: 'Stimmung' }, desc: { en: 'Overall mood of a text', de: 'Gesamtstimmung eines Textes' },
        labels: ['positive', 'neutral', 'negative'], rule: 'Rate the overall mood of the text.' },
    urgency: { name: { en: 'Urgency', de: 'Dringlichkeit' }, desc: { en: 'How urgent a message is', de: 'Wie dringend eine Nachricht ist' },
        labels: ['urgent', 'normal', 'ignore'], rule: 'Rate how urgent this message is for a busy person. "urgent" = needs action today, "ignore" = advertising, newsletter or irrelevant.' },
    spam: { name: { en: 'Message type', de: 'Nachrichtenart' }, desc: { en: 'Promo, personal or work', de: 'Werbung, privat oder Arbeit' },
        labels: ['promo', 'personal', 'work', 'other'], rule: 'Classify what kind of message this is. "promo" = advertising or newsletter, "personal" = private, "work" = job related.' },
    topic: { name: { en: 'News topic', de: 'News-Thema' }, desc: { en: 'Topic of a headline', de: 'Thema einer Schlagzeile' },
        labels: ['politics', 'economy', 'technology', 'science', 'sports', 'culture', 'other'], rule: 'Assign the headline to exactly one topic.' }
};
export const PRESET_IDS = Object.keys(PRESETS);
