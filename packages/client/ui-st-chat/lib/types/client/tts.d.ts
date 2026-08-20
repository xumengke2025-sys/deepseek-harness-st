/**
 * Browser-native text-to-speech for chat messages (ST's "message voice"
 * affordance without external TTS providers).
 */
/** Remove `[[expression]]` sprite marks the renderer hides from message text. */
export declare function stripExpressionMarks(text: string): string;
/** Strip expression marks, emphasis asterisks, and line breaks to plain speech text. */
export declare function speechText(raw: string): string;
/**
 * Speak one message aloud, replacing any utterance already queued.
 * @param raw - the stored message text.
 */
export declare function speak(raw: string): void;
//# sourceMappingURL=tts.d.ts.map