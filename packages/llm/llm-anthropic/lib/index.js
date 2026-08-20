import { LlmAdapter, LlmError } from "@deepseek-ai/dsh-llm";
//#region lib/types/index.js
/** Provider id registered with the DSH LLM runtime. */
const PROVIDER = "anthropic";
/** Plugin name. */
const name = "llm-anthropic";
/** Services required before this plugin can mount. */
const inject = ["llm"];
/**
* Stub adapter for Anthropic's messages endpoint. Real SSE streaming is
* planned; the current implementation reports `NOT_IMPLEMENTED` so a model
* call through this provider fails loudly rather than silently.
*/
var AnthropicAdapter = class extends LlmAdapter {
	providerInfo() {
		return {
			id: PROVIDER,
			name: "Anthropic"
		};
	}
	listModels(_provider) {
		return Promise.resolve([]);
	}
	async *stream(_options) {
		throw new LlmError("llm-anthropic: real Anthropic SSE streaming is not yet implemented.", "NOT_IMPLEMENTED");
	}
};
/**
* Register the Anthropic adapter with the DSH LLM runtime.
* @param ctx - Cordis context carrying the LLM service.
*/
function apply(ctx) {
	ctx.llm.registerAdapter([PROVIDER], new AnthropicAdapter());
}
//#endregion
export { PROVIDER, apply, inject, name };
