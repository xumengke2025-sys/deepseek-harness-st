/**
 * OpenRouter API adapter for the DSH LLM runtime. Registers provider id
 * `openrouter` with a stub stream; OpenRouter uses the OpenAI-compatible
 * `/v1/chat/completions` SSE protocol. Real streaming is planned.
 *
 * @module @deepseek-ai/dsh-llm-openrouter
 */
import type { Context } from '@deepseek-ai/cordis'
import { LlmAdapter, type LlmModelInfo, LlmError, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'

// Type-only: pulls `ctx.llm` into scope via dsh-llm's declaration merging.
import type {} from '@deepseek-ai/dsh-llm'

/** Provider id registered with the DSH LLM runtime. */
export const PROVIDER = 'openrouter'

/** Plugin name. */
export const name = 'llm-openrouter'

/** Services required before this plugin can mount. */
export const inject = ['llm'] as const

/**
 * Stub adapter for OpenRouter's chat-completions endpoint. Real SSE
 * streaming is planned; the current implementation reports `NOT_IMPLEMENTED`
 * so a model call through this provider fails loudly rather than silently.
 */
class OpenRouterAdapter extends LlmAdapter {
  override providerInfo(): { id: string; name: string } {
    return { id: PROVIDER, name: 'OpenRouter' }
  }

  override listModels(_provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve([])
  }

  async *stream(_options: GenerateOptions): AsyncIterable<StreamChunk> {
    throw new LlmError(
      `llm-openrouter: real OpenRouter SSE streaming is not yet implemented; `
      + `use the 'custom' source (which routes through llm-deepseek's OpenAI-compatible adapter) for OpenRouter endpoints.`,
      'NOT_IMPLEMENTED',
    )
  }
}

/**
 * Register the OpenRouter adapter with the DSH LLM runtime.
 * @param ctx - Cordis context carrying the LLM service.
 */
export function apply(ctx: Context): void {
  ctx.llm.registerAdapter([PROVIDER], new OpenRouterAdapter())
}
