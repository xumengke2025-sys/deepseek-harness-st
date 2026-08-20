/**
 * Anthropic Claude API adapter for the DSH LLM runtime. Registers provider
 * id `anthropic` with a stub stream; a full implementation of `/v1/messages`
 * SSE parsing is planned as follow-up work.
 *
 * @module @deepseek-ai/dsh-llm-anthropic
 */
import type { Context } from '@deepseek-ai/cordis'
import { LlmAdapter, type LlmModelInfo, LlmError, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'

// Type-only: pulls `ctx.llm` into scope via dsh-llm's declaration merging.
import type {} from '@deepseek-ai/dsh-llm'

/** Provider id registered with the DSH LLM runtime. */
export const PROVIDER = 'anthropic'

/** Plugin name. */
export const name = 'llm-anthropic'

/** Services required before this plugin can mount. */
export const inject = ['llm'] as const

/**
 * Stub adapter for Anthropic's messages endpoint. Real SSE streaming is
 * planned; the current implementation reports `NOT_IMPLEMENTED` so a model
 * call through this provider fails loudly rather than silently.
 */
class AnthropicAdapter extends LlmAdapter {
  override providerInfo(): { id: string; name: string } {
    return { id: PROVIDER, name: 'Anthropic' }
  }

  override listModels(_provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve([])
  }

  async *stream(_options: GenerateOptions): AsyncIterable<StreamChunk> {
    throw new LlmError(
      'llm-anthropic: real Anthropic SSE streaming is not yet implemented.',
      'NOT_IMPLEMENTED',
    )
  }
}

/**
 * Register the Anthropic adapter with the DSH LLM runtime.
 * @param ctx - Cordis context carrying the LLM service.
 */
export function apply(ctx: Context): void {
  ctx.llm.registerAdapter([PROVIDER], new AnthropicAdapter())
}
