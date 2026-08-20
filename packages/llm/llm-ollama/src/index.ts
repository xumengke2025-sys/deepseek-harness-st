/**
 * Ollama local API adapter for the DSH LLM runtime. Registers provider id
 * `ollama` with a stub stream; Ollama uses `/api/chat` JSONL streaming,
 * which differs from the OpenAI SSE protocol. Real streaming is planned.
 *
 * @module @deepseek-ai/dsh-llm-ollama
 */
import type { Context } from '@deepseek-ai/cordis'
import { LlmAdapter, type LlmModelInfo, LlmError, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'

// Type-only: pulls `ctx.llm` into scope via dsh-llm's declaration merging.
import type {} from '@deepseek-ai/dsh-llm'

/** Provider id registered with the DSH LLM runtime. */
export const PROVIDER = 'ollama'

/** Plugin name. */
export const name = 'llm-ollama'

/** Services required before this plugin can mount. */
export const inject = ['llm'] as const

/**
 * Stub adapter for Ollama's `/api/chat` JSONL endpoint. Real streaming is
 * planned; the current implementation reports `NOT_IMPLEMENTED` so a model
 * call through this provider fails loudly rather than silently.
 */
class OllamaAdapter extends LlmAdapter {
  override providerInfo(): { id: string; name: string } {
    return { id: PROVIDER, name: 'Ollama' }
  }

  override listModels(_provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve([])
  }

  async *stream(_options: GenerateOptions): AsyncIterable<StreamChunk> {
    throw new LlmError(
      'llm-ollama: real Ollama JSONL streaming is not yet implemented.',
      'NOT_IMPLEMENTED',
    )
  }
}

/**
 * Register the Ollama adapter with the DSH LLM runtime.
 * @param ctx - Cordis context carrying the LLM service.
 */
export function apply(ctx: Context): void {
  ctx.llm.registerAdapter([PROVIDER], new OllamaAdapter())
}
