/**
 * Ollama local API adapter for the DSH LLM runtime. Registers provider id
 * `ollama` with a stub stream; Ollama uses `/api/chat` JSONL streaming,
 * which differs from the OpenAI SSE protocol. Real streaming is planned.
 *
 * @module @deepseek-ai/dsh-llm-ollama
 */
import type { Context } from '@deepseek-ai/cordis';
/** Provider id registered with the DSH LLM runtime. */
export declare const PROVIDER = "ollama";
/** Plugin name. */
export declare const name = "llm-ollama";
/** Services required before this plugin can mount. */
export declare const inject: readonly ["llm"];
/**
 * Register the Ollama adapter with the DSH LLM runtime.
 * @param ctx - Cordis context carrying the LLM service.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map