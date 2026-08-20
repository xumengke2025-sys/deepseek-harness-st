/**
 * OpenAI API adapter for the DSH LLM runtime. Registers provider id `openai`
 * with a stub stream; a full implementation of `/v1/chat/completions` SSE
 * parsing is planned as follow-up work.
 *
 * @module @deepseek-ai/dsh-llm-openai
 */
import type { Context } from '@deepseek-ai/cordis';
/** Provider id registered with the DSH LLM runtime. */
export declare const PROVIDER = "openai";
/** Plugin name. */
export declare const name = "llm-openai";
/** Services required before this plugin can mount. */
export declare const inject: readonly ["llm"];
/**
 * Register the OpenAI adapter with the DSH LLM runtime.
 * @param ctx - Cordis context carrying the LLM service.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map