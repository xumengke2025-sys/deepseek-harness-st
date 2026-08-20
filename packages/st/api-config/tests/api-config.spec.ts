/**
 * API configuration service: default values, validation, file persistence,
 * and source → llm provider dispatch.
 */
import { describe, expect, it, afterEach } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import StApiConfigProvider, {
  validateApiConfig,
  DEFAULT_CONFIG,
  API_SOURCES,
  SOURCE_TO_PROVIDER,
  type StApiConfig,
} from '../src/index.ts'

let root = ''

afterEach(async () => {
  if (root !== '') await rm(root, { recursive: true, force: true })
  root = ''
})

/** Build a fresh Context with a stub llm (listModels returns []) and mount the provider. */
async function makeCtx(): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'st-api-config-'))
  const ctx = new Context()
  // Stub llm so `static inject = ['llm', 'invariants']` resolves without the
  // real LlmRuntime; invariants is auto-mounted by test-invariants.ts.
  ctx.reflect.provide('llm', { listModels: async () => [] } as never)
  await ctx.plugin(StApiConfigProvider, { dataRoot: root })
  return ctx
}

describe('validateApiConfig', () => {
  it('accepts the default config', () => {
    expect(validateApiConfig(DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG)
  })

  it('rejects missing or invalid source', () => {
    expect(() => validateApiConfig({})).toThrow(/source/)
    expect(() => validateApiConfig({ source: 'nope' })).toThrow(/source/)
    expect(() => validateApiConfig(null)).toThrow(/object/)
  })

  it('rejects custom source without baseUrl or model', () => {
    expect(() => validateApiConfig({ source: 'custom' })).toThrow(/custom/)
    expect(() => validateApiConfig({ source: 'custom', custom: {} })).toThrow(/baseUrl/)
    expect(() => validateApiConfig({ source: 'custom', custom: { baseUrl: '' } })).toThrow(/baseUrl/)
    expect(() => validateApiConfig({ source: 'custom', custom: { baseUrl: 'https://x', model: '' } })).toThrow(/model/)
  })

  it('accepts a pinned custom provider and rejects a blank one', () => {
    const pinned = { source: 'custom', custom: { baseUrl: 'https://x', model: 'm', provider: 'opencode-go' } }
    expect(validateApiConfig(pinned)).toEqual(pinned)
    expect(() => validateApiConfig({ source: 'custom', custom: { baseUrl: 'https://x', model: 'm', provider: '  ' } }))
      .toThrow(/provider/)
    expect(() => validateApiConfig({ source: 'custom', custom: { baseUrl: 'https://x', model: 'm', provider: 7 } as object }))
      .toThrow(/provider/)
  })

  it('rejects openrouter/ollama without model', () => {
    expect(() => validateApiConfig({ source: 'openrouter', openrouter: {} })).toThrow(/model/)
    expect(() => validateApiConfig({ source: 'ollama', ollama: {} })).toThrow(/model/)
  })

  it('accepts openai and anthropic with optional model', () => {
    expect(validateApiConfig({ source: 'openai' })).toEqual({ source: 'openai' })
    expect(validateApiConfig({ source: 'anthropic', anthropic: { assistantPrefill: 'Sure,' } }))
      .toEqual({ source: 'anthropic', anthropic: { assistantPrefill: 'Sure,' } })
  })

  it('exposes the five Phase A sources', () => {
    expect([...API_SOURCES].sort()).toEqual(['anthropic', 'custom', 'ollama', 'openai', 'openrouter'])
  })

  it('maps each source to an llm provider id', () => {
    expect(SOURCE_TO_PROVIDER.custom).toBe('deepseek-official')
    expect(SOURCE_TO_PROVIDER.openai).toBe('openai')
    expect(SOURCE_TO_PROVIDER.anthropic).toBe('anthropic')
    expect(SOURCE_TO_PROVIDER.openrouter).toBe('openrouter')
    expect(SOURCE_TO_PROVIDER.ollama).toBe('ollama')
  })
})

describe('st-api-config file provider', () => {
  it('returns a fresh clone of the default when no file exists', async () => {
    const ctx = await makeCtx()
    const cfg = await ctx.stApiConfig.get()
    expect(cfg.source).toBe('custom')
    expect(cfg.custom?.baseUrl).toBe('https://opencode.cc/v1')
    expect(cfg.custom?.model).toBe('deepseek-v4-flash')
    // Mutating the returned config must not mutate the module default.
    cfg.source = 'openai'
    expect(DEFAULT_CONFIG.source).toBe('custom')
  })

  it('saves and reloads the configuration across instances', async () => {
    const ctx = await makeCtx()
    await ctx.stApiConfig.save({
      source: 'custom',
      custom: { baseUrl: 'https://example.test/v1', model: 'm1', streaming: true },
    })
    const ctx2 = new Context()
    ctx2.reflect.provide('llm', { listModels: async () => [] } as never)
    await ctx2.plugin(StApiConfigProvider, { dataRoot: root })
    const cfg = await ctx2.stApiConfig.get()
    expect(cfg.source).toBe('custom')
    expect(cfg.custom?.baseUrl).toBe('https://example.test/v1')
    expect(cfg.custom?.model).toBe('m1')
  })

  it('persists to <dataRoot>/api-config.json as pretty-printed JSON', async () => {
    const ctx = await makeCtx()
    await ctx.stApiConfig.save({
      source: 'ollama',
      ollama: { baseUrl: 'http://localhost:11434', model: 'llama3' },
    })
    const raw = JSON.parse(await readFile(join(root, 'api-config.json'), 'utf8')) as StApiConfig
    expect(raw.source).toBe('ollama')
    expect(raw.ollama?.model).toBe('llama3')
  })

  it('rejects invalid input and does not mutate storage', async () => {
    const ctx = await makeCtx()
    await expect(ctx.stApiConfig.save({ source: 'custom' } as StApiConfig)).rejects.toThrow(/custom/)
    // File still empty; get returns the default.
    expect((await ctx.stApiConfig.get()).source).toBe('custom')
    expect((await ctx.stApiConfig.get()).custom?.baseUrl).toBe('https://opencode.cc/v1')
  })

  it('listModels returns [] when the mapped provider is not registered', async () => {
    const ctx = await makeCtx()
    const models = await ctx.stApiConfig.listModels('openai')
    expect(models).toEqual([])
  })
})
