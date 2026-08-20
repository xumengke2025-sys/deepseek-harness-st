/**
 * OpenAI API adapter for the DSH LLM runtime. Registers provider id `openai`
 * with a stub stream; a full implementation of `/v1/chat/completions` SSE
 * parsing is planned as follow-up work.
 *
 * @module @deepseek-ai/dsh-llm-openai
 */
import type { Context } from '@deepseek-ai/cordis'
import { LlmAdapter, type LlmModelInfo, LlmError, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'

// Type-only: pulls `ctx.llm` into scope via dsh-llm's declaration merging.
import type {} from '@deepseek-ai/dsh-llm'

/** Provider id registered with the DSH LLM runtime. */
export const PROVIDER = 'openai'

/** Plugin name. */
export const name = 'llm-openai'

/** Services required before this plugin can mount. */
export const inject = ['llm'] as const

/**
 * Stub adapter for OpenAI's chat-completions endpoint. Real SSE streaming is
 * planned; the current implementation reports `NOT_IMPLEMENTED` so a model
 * call through this provider fails loudly rather than silently.
 */
class OpenAIAdapter extends LlmAdapter {
  override providerInfo(): { id: string; name: string } {
    return { id: PROVIDER, name: 'OpenAI' }
  }

  override listModels(_provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve([])
  }

  async *stream(_options: GenerateOptions): AsyncIterable<StreamChunk> {
    throw new LlmError(
      `llm-openai: real OpenAI SSE streaming is not yet implemented; `
      + `use the 'custom' source (which routes through llm-deepseek's OpenAI-compatible adapter) for OpenAI-compatible endpoints.`,
      'NOT_IMPLEMENTED',
    )
  }
}

/**
 * Register the OpenAI adapter with the DSH LLM runtime.
 * @param ctx - Cordis context carrying the LLM service.
 */
export function apply(ctx: Context): void {
  ctx.llm.registerAdapter([PROVIDER], new OpenAIAdapter())
}
