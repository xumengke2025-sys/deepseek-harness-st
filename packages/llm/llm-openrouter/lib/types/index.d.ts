/**
 * OpenRouter API adapter for the DSH LLM runtime. Registers provider id
 * `openrouter` with a stub stream; OpenRouter uses the OpenAI-compatible
 * `/v1/chat/completions` SSE protocol. Real streaming is planned.
 *
 * @module @deepseek-ai/dsh-llm-openrouter
 */
import type { Context } from '@deepseek-ai/cordis';
/** Provider id registered with the DSH LLM runtime. */
export declare const PROVIDER = "openrouter";
/** Plugin name. */
export declare const name = "llm-openrouter";
/** Services required before this plugin can mount. */
export declare const inject: readonly ["llm"];
/**
 * Register the OpenRouter adapter with the DSH LLM runtime.
 * @param ctx - Cordis context carrying the LLM service.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map