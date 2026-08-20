/**
 * SillyTavern API configuration service: per-source endpoint, key, and model
 * settings persisted to `<dataRoot>/api-config.json`. Mirrors ST's
 * `public/index.html #api_form` field groups and their storage in
 * `settings.json` / `secrets.json`.
 *
 * This is the *configuration* surface only; generation itself reads the
 * active source via `ctx.stApiConfig.get()` and routes to the matching
 * `ctx.llm` provider (see `st-generate`'s dispatch table).
 *
 * @module @deepseek-ai/dsh-st-api-config
 */
import { Service, type Context } from '@deepseek-ai/cordis'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { existsSync } from 'node:fs'
// Type-only: pulls dsh-llm's `ctx.llm` declaration merging into scope.
import type {} from '@deepseek-ai/dsh-llm'

// ── Source type and per-source field shapes ───────────────────────────────

/** ST's five Phase A API sources. */
export type StApiSource = 'openai' | 'anthropic' | 'custom' | 'openrouter' | 'ollama'

/** All valid sources as an array (for validation errors). */
export const API_SOURCES: readonly StApiSource[] = Object.freeze([
  'openai', 'anthropic', 'custom', 'openrouter', 'ollama',
])

/** OpenAI field group. baseUrl defaults to OpenAI's public endpoint. */
export interface StApiSourceOpenAI {
  baseUrl?: string
  apiKeyEnv?: string
  model?: string
  streaming?: boolean
  contextSize?: number
}

/** Anthropic field group. baseUrl defaults to Anthropic's public endpoint. */
export interface StApiSourceAnthropic {
  baseUrl?: string
  apiKeyEnv?: string
  model?: string
  streaming?: boolean
  contextSize?: number
  /** Claude's `assistant` prefill: text seeded into the assistant's first message. */
  assistantPrefill?: string
}

/** Custom (OpenAI-compatible) field group. baseUrl + model are required. */
export interface StApiSourceCustom {
  baseUrl: string
  /** Registered `ctx.llm` provider id serving this source (any adapter route, e.g. an llm-pi-ai gateway); absent uses the deployment's st-generate provider. */
  provider?: string
  apiKeyEnv?: string
  model: string
  streaming?: boolean
  contextSize?: number
}

/** OpenRouter field group. baseUrl defaults to OpenRouter's public endpoint. */
export interface StApiSourceOpenRouter {
  baseUrl?: string
  apiKeyEnv?: string
  model: string
  streaming?: boolean
  contextSize?: number
}

/** Ollama field group. baseUrl defaults to localhost:11434. No API key. */
export interface StApiSourceOllama {
  baseUrl?: string
  model: string
  streaming?: boolean
  contextSize?: number
}

/**
 * Persisted API configuration. Exactly one per-source group should carry values
 * for the active source; other groups are retained across source switches.
 */
export interface StApiConfig {
  source: StApiSource
  openai?: StApiSourceOpenAI
  anthropic?: StApiSourceAnthropic
  custom?: StApiSourceCustom
  openrouter?: StApiSourceOpenRouter
  ollama?: StApiSourceOllama
}

// ── Default values per source (ST's "factory reset" state) ──────────────

/** Default base URLs per source (ST's defaults). */
export const DEFAULT_BASE_URLS: Record<StApiSource, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  custom: 'https://opencode.cc/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  ollama: 'http://localhost:11434',
}

/** Default configuration applied when no file exists; preserves opencode as the Custom source default. */
export const DEFAULT_CONFIG: StApiConfig = {
  source: 'custom',
  custom: { baseUrl: DEFAULT_BASE_URLS.custom, model: 'deepseek-v4-flash', streaming: true },
  openai: { baseUrl: DEFAULT_BASE_URLS.openai, streaming: true },
  anthropic: { baseUrl: DEFAULT_BASE_URLS.anthropic, streaming: true },
  openrouter: { baseUrl: DEFAULT_BASE_URLS.openrouter, model: 'anthropic/claude-3.5-sonnet', streaming: true },
  ollama: { baseUrl: DEFAULT_BASE_URLS.ollama, model: 'llama3', streaming: true },
}

// ── Dispatch table (source → llm provider id) ──────────────────────────

/**
 * Map each source to the `ctx.llm` provider id that handles its requests.
 * `custom` reuses the DeepSeek adapter (a generic OpenAI-compatible transport
 * llm-deepseek registers as `deepseek-official`); the source-specific providers
 * (OpenAI / Anthropic / OpenRouter / Ollama) register their own ids.
 */
export const SOURCE_TO_PROVIDER: Record<StApiSource, string> = {
  openai: 'openai',
  anthropic: 'anthropic',
  custom: 'deepseek-official',
  openrouter: 'openrouter',
  ollama: 'ollama',
}

// ── Validation ──────────────────────────────────────────────────────────

/**
 * Validate a raw object as {@link StApiConfig}. The active source's required
 * fields are enforced; other sources' groups pass through untouched so a user
 * can switch back without losing configuration.
 */
export function validateApiConfig(raw: unknown): StApiConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new TypeError('api-config: expected object')
  }
  const obj = raw as Record<string, unknown>
  const source = obj.source
  if (typeof source !== 'string' || !API_SOURCES.includes(source as StApiSource)) {
    throw new TypeError(`api-config.source: must be one of ${API_SOURCES.join(', ')}`)
  }
  const src = source as StApiSource

  if (src === 'custom') {
    const c = obj.custom
    if (typeof c !== 'object' || c === null) {
      throw new TypeError('api-config.custom: required when source is custom')
    }
    const cc = c as Record<string, unknown>
    if (typeof cc.baseUrl !== 'string' || cc.baseUrl.trim() === '') {
      throw new TypeError('api-config.custom.baseUrl: required non-empty string')
    }
    if (typeof cc.model !== 'string' || cc.model.trim() === '') {
      throw new TypeError('api-config.custom.model: required non-empty string')
    }
    if (cc.provider !== undefined && (typeof cc.provider !== 'string' || cc.provider.trim() === '')) {
      throw new TypeError('api-config.custom.provider: must be a non-empty provider id when present')
    }
  }
  if (src === 'openrouter') {
    const c = obj.openrouter
    if (typeof c !== 'object' || c === null) {
      throw new TypeError('api-config.openrouter: required when source is openrouter')
    }
    const cc = c as Record<string, unknown>
    if (typeof cc.model !== 'string' || cc.model.trim() === '') {
      throw new TypeError('api-config.openrouter.model: required non-empty string')
    }
  }
  if (src === 'ollama') {
    const c = obj.ollama
    if (typeof c !== 'object' || c === null) {
      throw new TypeError('api-config.ollama: required when source is ollama')
    }
    const cc = c as Record<string, unknown>
    if (typeof cc.model !== 'string' || cc.model.trim() === '') {
      throw new TypeError('api-config.ollama.model: required non-empty string')
    }
  }
  // openai/anthropic: all fields optional; model may be unset and resolved at generation time.

  return raw as StApiConfig
}

// ── Service definition ──────────────────────────────────────────────────

declare module '@deepseek-ai/cordis' {
  interface Context {
    stApiConfig: StApiConfigService
  }
}

/**
 * SillyTavern API configuration service: get/save the current source's
 * configuration and list available models per source through the DSH llm
 * runtime.
 */
export abstract class StApiConfigService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'stApiConfig')
  }

  /** Read the current configuration; returns {@link DEFAULT_CONFIG} when unset. */
  abstract get(): Promise<StApiConfig>

  /** Persist a validated configuration; throws on validation failure. */
  abstract save(config: StApiConfig): Promise<void>

  /** List models available for one source through its mapped llm provider. */
  abstract listModels(source: StApiSource): Promise<Array<{ provider: string; model: string }>>
}

// ── File-backed provider ────────────────────────────────────────────────

/** Plugin configuration for the file provider. */
export interface Config {
  /** SillyTavern data root (config persists at `<dataRoot>/api-config.json`). */
  dataRoot: string
}

/**
 * File-backed API configuration provider: JSON at `<dataRoot>/api-config.json`,
 * one document per user. The llm provider list is queried lazily for
 * `listModels` so a missing provider returns `[]` instead of failing.
 */
class StApiConfigFileProvider extends StApiConfigService {
  static inject = ['llm'] as const

  private readonly path: string
  private cached: StApiConfig | null = null

  constructor(ctx: Context, config: Config) {
    super(ctx)
    this.path = join(resolve(config.dataRoot), 'api-config.json')
  }

  async get(): Promise<StApiConfig> {
    if (this.cached !== null) return this.cached
    if (!existsSync(this.path)) return structuredClone(DEFAULT_CONFIG)
    const parsed = JSON.parse(await readFile(this.path, 'utf8')) as unknown
    const cfg = validateApiConfig(parsed)
    this.cached = cfg
    return cfg
  }

  async save(config: StApiConfig): Promise<void> {
    const validated = validateApiConfig(config)
    await mkdir(dirname(this.path), { recursive: true })
    await writeFile(this.path, JSON.stringify(validated, null, 2), 'utf8')
    this.cached = validated
  }

  async listModels(source: StApiSource): Promise<Array<{ provider: string; model: string }>> {
    // The custom source may pin any registered provider; other sources own
    // their fixed dispatch entries.
    const provider = source === 'custom'
      ? ((await this.get()).custom?.provider ?? SOURCE_TO_PROVIDER.custom)
      : SOURCE_TO_PROVIDER[source]
    try {
      const models = await this.ctx.llm.listModels(provider)
      return models.map((m) => ({ provider: m.provider ?? provider, model: m.id }))
    } catch {
      // Provider not registered or catalog unavailable: an empty list lets the
      // UI fall back to manual model entry (ST's Custom-source behavior).
      return []
    }
  }
}

// ── Plugin entry ────────────────────────────────────────────────────────

export const name = 'st-api-config-file'

export default StApiConfigFileProvider
