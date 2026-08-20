import { LlmAdapter, LlmError } from "@deepseek-ai/dsh-llm";
//#region lib/types/index.js
/** Provider id registered with the DSH LLM runtime. */
const PROVIDER = "openai";
/** Plugin name. */
const name = "llm-openai";
/** Services required before this plugin can mount. */
const inject = ["llm"];
/**
* Stub adapter for OpenAI's chat-completions endpoint. Real SSE streaming is
* planned; the current implementation reports `NOT_IMPLEMENTED` so a model
* call through this provider fails loudly rather than silently.
*/
var OpenAIAdapter = class extends LlmAdapter {
	providerInfo() {
		return {
			id: PROVIDER,
			name: "OpenAI"
		};
	}
	listModels(_provider) {
		return Promise.resolve([]);
	}
	async *stream(_options) {
		throw new LlmError("llm-openai: real OpenAI SSE streaming is not yet implemented; use the 'custom' source (which routes through llm-deepseek's OpenAI-compatible adapter) for OpenAI-compatible endpoints.", "NOT_IMPLEMENTED");
	}
};
/**
* Register the OpenAI adapter with the DSH LLM runtime.
* @param ctx - Cordis context carrying the LLM service.
*/
function apply(ctx) {
	ctx.llm.registerAdapter([PROVIDER], new OpenAIAdapter());
}
//#endregion
export { PROVIDER, apply, inject, name };
