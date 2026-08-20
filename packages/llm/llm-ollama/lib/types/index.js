import { LlmAdapter, LlmError } from '@deepseek-ai/dsh-llm';
/** Provider id registered with the DSH LLM runtime. */
export const PROVIDER = 'ollama';
/** Plugin name. */
export const name = 'llm-ollama';
/** Services required before this plugin can mount. */
export const inject = ['llm'];
/**
 * Stub adapter for Ollama's `/api/chat` JSONL endpoint. Real streaming is
 * planned; the current implementation reports `NOT_IMPLEMENTED` so a model
 * call through this provider fails loudly rather than silently.
 */
class OllamaAdapter extends LlmAdapter {
    providerInfo() {
        return { id: PROVIDER, name: 'Ollama' };
    }
    listModels(_provider) {
        return Promise.resolve([]);
    }
    async *stream(_options) {
        throw new LlmError('llm-ollama: real Ollama JSONL streaming is not yet implemented.', 'NOT_IMPLEMENTED');
    }
}
/**
 * Register the Ollama adapter with the DSH LLM runtime.
 * @param ctx - Cordis context carrying the LLM service.
 */
export function apply(ctx) {
    ctx.llm.registerAdapter([PROVIDER], new OllamaAdapter());
}
//# sourceMappingURL=index.js.map