import { LlmAdapter, LlmError } from '@deepseek-ai/dsh-llm';
/** Provider id registered with the DSH LLM runtime. */
export const PROVIDER = 'openrouter';
/** Plugin name. */
export const name = 'llm-openrouter';
/** Services required before this plugin can mount. */
export const inject = ['llm'];
/**
 * Stub adapter for OpenRouter's chat-completions endpoint. Real SSE
 * streaming is planned; the current implementation reports `NOT_IMPLEMENTED`
 * so a model call through this provider fails loudly rather than silently.
 */
class OpenRouterAdapter extends LlmAdapter {
    providerInfo() {
        return { id: PROVIDER, name: 'OpenRouter' };
    }
    listModels(_provider) {
        return Promise.resolve([]);
    }
    async *stream(_options) {
        throw new LlmError(`llm-openrouter: real OpenRouter SSE streaming is not yet implemented; `
            + `use the 'custom' source (which routes through llm-deepseek's OpenAI-compatible adapter) for OpenRouter endpoints.`, 'NOT_IMPLEMENTED');
    }
}
/**
 * Register the OpenRouter adapter with the DSH LLM runtime.
 * @param ctx - Cordis context carrying the LLM service.
 */
export function apply(ctx) {
    ctx.llm.registerAdapter([PROVIDER], new OpenRouterAdapter());
}
//# sourceMappingURL=index.js.map