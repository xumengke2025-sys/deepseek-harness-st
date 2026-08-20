/**
 * Browser-native text-to-speech for chat messages (ST's "message voice"
 * affordance without external TTS providers).
 */
/** Remove `[[expression]]` sprite marks the renderer hides from message text. */
export function stripExpressionMarks(text) {
    return text.replace(/\[\[[^\]]+\]\]/g, '');
}
/** Strip expression marks, emphasis asterisks, and line breaks to plain speech text. */
export function speechText(raw) {
    return stripExpressionMarks(raw)
        .replace(/\*[^*]*\*/g, ' ')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Speak one message aloud, replacing any utterance already queued.
 * @param raw - the stored message text.
 */
export function speak(raw) {
    if (typeof speechSynthesis === 'undefined')
        return;
    speechSynthesis.cancel();
    const text = speechText(raw);
    if (text === '')
        return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    speechSynthesis.speak(utter);
}
//# sourceMappingURL=tts.js.map