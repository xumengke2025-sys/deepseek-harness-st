/**
 * SillyTavern prompt preset management service.
 *
 * Presets bundle generation parameters, prompt ordering, instruct format
 * templates, and system prompt configuration. They map directly to
 * SillyTavern's preset types: generation settings, instruct mode,
 * context template, and AI persona.
 *
 * @module @deepseek-ai/dsh-st-preset
 */
import { Service, type Context } from '@deepseek-ai/cordis'
import { readFile, writeFile, readdir, mkdir, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'

// ── Vocabulary types ───────────────────────────────────────────────────────

export type PresetId = string & { readonly __brand: 'PresetId' }

/** Generation sampling parameters (matching SillyTavern's generation settings). */
export interface GenerationParams {
  temp: number
  top_p: number
  top_k: number
  top_a: number
  min_p: number
  repetition_penalty: number
  repetition_penalty_range: number
  max_tokens: number
  min_tokens: number
  seed: number
  /** Penalty for presence (OpenAI-style). */
  presence_penalty: number
  /** Penalty for frequency (OpenAI-style). */
  frequency_penalty: number
  /** Stop sequences. */
  stop_sequences: string[]
  /** Whether to stream responses. */
  stream: boolean
}

/** Instruct mode formatting template. */
export interface InstructTemplate {
  enabled: boolean
  /** System prompt wrapper: {{content}} is replaced with the system prompt. */
  systemPrompt: string
  /** Instruct mode sequences. */
  inputSequence: string
  outputSequence: string
  /** Last output sequence (before generation). */
  lastOutputSequence: string
  /** First output sequence (for the first assistant turn). */
  firstOutputSequence: string
  /** First assistant prefix. */
  firstInputSequence: string
  /** Separator between messages. */
  separator: string
  /** Wrap system prompt in its own block. */
  wrap: boolean
  /** Macro overrides: {{user}}, {{char}}, etc. */
  macros: Record<string, string>
}

/** Prompt order: the sequence of context blocks injected before the chat. */
export interface PromptOrder {
  /** Each entry is a named prompt block. */
  entries: PromptEntry[]
}

/** A single prompt block in the ordering. */
export interface PromptEntry {
  name: string
  enabled: boolean
  /** Role for this prompt block. */
  role: 'system' | 'user' | 'assistant'
  /** Content or macro reference. */
  content: string
  /** Depth (for at-depth insertion). */
  depth?: number
  /** Whether this is a constant (always injected). */
  constant?: boolean
}

/** A complete SillyTavern preset. */
export interface Preset {
  id: PresetId
  name: string
  description: string
  /** Which API source this preset targets. */
  apiSource: string
  generation: GenerationParams
  instruct: InstructTemplate
  promptOrder: PromptOrder
  /** System prompt content (character-agnostic). */
  mainPrompt: string
  /** NSFW toggle for prompt filtering. */
  nsfw: boolean
  /** Jailbreak prompt (optional post-system instruction). */
  jailbreakPrompt: string
  createDate: string
  modifyDate: string
  extensions: Record<string, unknown>
}

/** Input for creating/updating a preset. */
export interface PresetInput {
  name: string
  description?: string
  apiSource?: string
  generation?: Partial<GenerationParams>
  instruct?: Partial<InstructTemplate>
  promptOrder?: Partial<PromptOrder>
  mainPrompt?: string
  nsfw?: boolean
  jailbreakPrompt?: string
  extensions?: Record<string, unknown>
}

// ── Default generation parameters ──────────────────────────────────────────

export const DEFAULT_GENERATION: GenerationParams = {
  temp: 0.9,
  top_p: 0.95,
  top_k: 40,
  top_a: 0,
  min_p: 0.05,
  repetition_penalty: 1.1,
  repetition_penalty_range: 1024,
  max_tokens: 2048,
  min_tokens: 1,
  seed: -1,
  presence_penalty: 0,
  frequency_penalty: 0,
  stop_sequences: [],
  stream: true,
}

export const DEFAULT_INSTRUCT: InstructTemplate = {
  enabled: false,
  systemPrompt: '{{content}}',
  inputSequence: '',
  outputSequence: '',
  lastOutputSequence: '',
  firstOutputSequence: '',
  firstInputSequence: '',
  separator: '\n',
  wrap: false,
  macros: {},
}

// ── Service definition ─────────────────────────────────────────────────────

declare module '@deepseek-ai/cordis' {
  interface Context {
    stPreset: StPresetService
  }
}

/**
 * Prompt preset management service.
 *
 * Provides CRUD for generation settings, instruct templates, prompt
 * ordering, and system prompt configuration. Supports import/export
 * compatible with SillyTavern's preset JSON format.
 */
export abstract class StPresetService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'stPreset')
  }

  abstract list(): Promise<Preset[]>
  abstract get(id: PresetId): Promise<Preset | undefined>
  abstract create(input: PresetInput): Promise<PresetId>
  abstract update(id: PresetId, input: Partial<PresetInput>): Promise<void>
  abstract delete(id: PresetId): Promise<void>
  abstract duplicate(id: PresetId): Promise<PresetId>
  abstract importJson(json: string): Promise<PresetId>
  abstract exportJson(id: PresetId): Promise<string>
  /** Build the complete system prompt from a preset + character data. */
  abstract buildPrompt(presetId: PresetId, characterData: Record<string, string>): Promise<string>
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generatePresetId(): PresetId {
  return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` as PresetId
}

function createBlankPreset(input: PresetInput): Preset {
  const now = new Date().toISOString()
  return {
    id: generatePresetId(),
    name: input.name,
    description: input.description ?? '',
    apiSource: input.apiSource ?? 'openai',
    generation: { ...DEFAULT_GENERATION, ...input.generation },
    instruct: { ...DEFAULT_INSTRUCT, ...input.instruct },
    promptOrder: { entries: input.promptOrder?.entries ?? [] },
    mainPrompt: input.mainPrompt ?? '',
    nsfw: input.nsfw ?? false,
    jailbreakPrompt: input.jailbreakPrompt ?? '',
    createDate: now,
    modifyDate: now,
    extensions: input.extensions ?? {},
  }
}

/** Expand macros in a template string. */
function expandMacros(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value)
  }
  return result
}

// ── Legacy SillyTavern preset normalization ─────────────────────────────────

/**
 * One row of SillyTavern's `prompt_order`: an identifier plus its enabled bit.
 * @module internal
 */
interface StPromptOrderRow { identifier: string, enabled: boolean }

/** One prompt block of SillyTavern's `prompts` array. */
interface StPrompt {
  name?: string
  identifier?: string
  role?: 'system' | 'user' | 'assistant'
  content?: string
  marker?: boolean
  system_prompt?: boolean
}

/** SillyTavern's on-disk chat-completion preset: a flat settings object. */
interface StLegacyPreset {
  chat_completion_source?: string
  temperature?: number
  top_p?: number
  top_k?: number
  top_a?: number
  min_p?: number
  repetition_penalty?: number
  openai_max_tokens?: number
  openai_max_context?: number
  frequency_penalty?: number
  presence_penalty?: number
  seed?: number
  stream_openai?: boolean
  prompts?: StPrompt[]
  prompt_order?: Array<{ character_id: number, order: StPromptOrderRow[] }>
  [key: string]: unknown
}

/** Recognize SillyTavern's legacy flat preset shape (a `prompts` list keyed by identifiers). */
function isStLegacyPreset(raw: unknown): raw is StLegacyPreset {
  return typeof raw === 'object' && raw !== null && Array.isArray((raw as StLegacyPreset).prompts)
}

/** Map one legacy preset into this service's `Preset` shape; the raw object survives in `extensions.st`. */
function normalizeStLegacyPreset(raw: StLegacyPreset, id: PresetId, name: string): Preset {
  const byIdentifier = new Map<string, StPrompt>()
  for (const prompt of raw.prompts ?? []) {
    if (prompt.identifier !== undefined) byIdentifier.set(prompt.identifier, prompt)
  }
  // SillyTavern keys the current character's order under character_id 100001
  // (100000 is the shared default); fall back to the first row present.
  const orderRow = raw.prompt_order?.find(row => row.character_id === 100001)
    ?? raw.prompt_order?.[0]
  const entries: PromptEntry[] = (orderRow?.order ?? []).flatMap(({ identifier, enabled }) => {
    const prompt = byIdentifier.get(identifier)
    if (prompt === undefined) return []
    return [{
      name: prompt.name ?? identifier,
      enabled,
      role: prompt.role ?? 'system',
      content: prompt.content ?? '',
      ...(prompt.marker === true ? { constant: true } : {}),
    }]
  })

  const now = new Date().toISOString()
  return {
    id,
    name,
    description: `Imported SillyTavern preset (${raw.chat_completion_source ?? 'unknown'} source)`,
    apiSource: raw.chat_completion_source ?? 'openai',
    generation: {
      ...DEFAULT_GENERATION,
      temp: raw.temperature ?? DEFAULT_GENERATION.temp,
      top_p: raw.top_p ?? DEFAULT_GENERATION.top_p,
      top_k: raw.top_k ?? DEFAULT_GENERATION.top_k,
      top_a: raw.top_a ?? DEFAULT_GENERATION.top_a,
      min_p: raw.min_p ?? DEFAULT_GENERATION.min_p,
      repetition_penalty: raw.repetition_penalty ?? DEFAULT_GENERATION.repetition_penalty,
      max_tokens: raw.openai_max_tokens ?? DEFAULT_GENERATION.max_tokens,
      seed: raw.seed ?? DEFAULT_GENERATION.seed,
      presence_penalty: raw.presence_penalty ?? DEFAULT_GENERATION.presence_penalty,
      frequency_penalty: raw.frequency_penalty ?? DEFAULT_GENERATION.frequency_penalty,
      stream: raw.stream_openai ?? DEFAULT_GENERATION.stream,
    },
    instruct: { ...DEFAULT_INSTRUCT },
    promptOrder: { entries },
    mainPrompt: byIdentifier.get('main')?.content ?? '',
    nsfw: (byIdentifier.get('nsfw')?.content ?? '').length > 0,
    jailbreakPrompt: byIdentifier.get('jailbreak')?.content ?? '',
    createDate: now,
    modifyDate: now,
    // The full legacy payload travels along so export and later writes keep
    // every SillyTavern field instead of dropping the ones this shape lacks.
    extensions: { st: raw },
  }
}

/**
 * Read one preset file into the service shape: native `Preset` files pass
 * through, legacy SillyTavern flat presets are normalized with `id`/`name`
 * from the file name.
 */
function parsePresetFile(text: string, id: PresetId): Preset {
  const raw: unknown = JSON.parse(text)
  if (isStLegacyPreset(raw)) return normalizeStLegacyPreset(raw, id, id)
  const preset = raw as Preset
  return { ...preset, id, ...(preset.name === undefined ? { name: id } : {}) }
}

// ── File-based provider ────────────────────────────────────────────────────

export interface FilePresetConfig { root: string }

class FilePresetProvider extends StPresetService {
  private readonly root: string
  constructor(ctx: Context, config: FilePresetConfig) {
    super(ctx)
    this.root = resolve(config.root)
  }

  private async ensureRoot(): Promise<void> {
    if (!existsSync(this.root)) await mkdir(this.root, { recursive: true })
  }

  private presetPath(id: PresetId): string {
    return join(this.root, `${id}.json`)
  }

  async list(): Promise<Preset[]> {
    await this.ensureRoot()
    const files = await readdir(this.root)
    const presets: Preset[] = []
    for (const f of files) {
      if (!f.endsWith('.json')) continue
      try {
        presets.push(parsePresetFile(await readFile(join(this.root, f), 'utf-8'), f.slice(0, -'.json'.length) as PresetId))
      } catch { /* skip */ }
    }
    return presets.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  }

  async get(id: PresetId): Promise<Preset | undefined> {
    const path = this.presetPath(id)
    if (!existsSync(path)) return undefined
    try {
      return parsePresetFile(await readFile(path, 'utf-8'), id)
    } catch {
      return undefined
    }
  }

  async create(input: PresetInput): Promise<PresetId> {
    await this.ensureRoot()
    const preset = createBlankPreset(input)
    await writeFile(this.presetPath(preset.id), JSON.stringify(preset, null, 2), 'utf-8')
    return preset.id
  }

  async update(id: PresetId, input: Partial<PresetInput>): Promise<void> {
    const path = this.presetPath(id)
    const preset = await this.get(id)
    if (preset === undefined) throw new Error(`Preset ${id} not found`)
    if (input.name !== undefined) preset.name = input.name
    if (input.description !== undefined) preset.description = input.description
    if (input.apiSource !== undefined) preset.apiSource = input.apiSource
    if (input.generation) Object.assign(preset.generation, input.generation)
    if (input.instruct) Object.assign(preset.instruct, input.instruct)
    if (input.promptOrder) Object.assign(preset.promptOrder, input.promptOrder)
    if (input.mainPrompt !== undefined) preset.mainPrompt = input.mainPrompt
    if (input.nsfw !== undefined) preset.nsfw = input.nsfw
    if (input.jailbreakPrompt !== undefined) preset.jailbreakPrompt = input.jailbreakPrompt
    if (input.extensions) Object.assign(preset.extensions, input.extensions)
    preset.modifyDate = new Date().toISOString()
    await writeFile(path, JSON.stringify(preset, null, 2), 'utf-8')
  }

  async delete(id: PresetId): Promise<void> {
    const path = this.presetPath(id)
    if (existsSync(path)) await unlink(path)
  }

  async duplicate(id: PresetId): Promise<PresetId> {
    const preset = await this.get(id)
    if (!preset) throw new Error(`Preset ${id} not found`)
    return this.create({ ...preset, name: `${preset.name} (copy)` })
  }

  async importJson(json: string): Promise<PresetId> {
    const parsed: unknown = JSON.parse(json)
    if (isStLegacyPreset(parsed)) {
      const name = typeof parsed.preset_name === 'string' && parsed.preset_name.length > 0
        ? parsed.preset_name
        : 'Imported Preset'
      const preset = normalizeStLegacyPreset(parsed, generatePresetId(), name)
      await this.ensureRoot()
      await writeFile(this.presetPath(preset.id), JSON.stringify(preset, null, 2), 'utf-8')
      return preset.id
    }
    const record = parsed as Record<string, unknown>
    const description = record.description as string | undefined
    const apiSource = record.api_source as string | undefined ?? record.apiSource as string | undefined
    const generation = record.genamt as Partial<GenerationParams> | undefined ?? record.generation as Partial<GenerationParams> | undefined
    const instruct = record.instruct as Partial<InstructTemplate> | undefined
    const promptOrder = record.prompt_order as Partial<PromptOrder> | undefined ?? record.promptOrder as Partial<PromptOrder> | undefined
    const mainPrompt = record.main_prompt as string | undefined ?? record.mainPrompt as string | undefined
    const nsfw = record.nsfw as boolean | undefined
    const jailbreakPrompt = record.jailbreak_prompt as string | undefined ?? record.jailbreakPrompt as string | undefined
    return this.create({
      name: record.name as string ?? record.preset_name as string ?? 'Imported Preset',
      ...description !== undefined ? { description } : {},
      ...apiSource !== undefined ? { apiSource } : {},
      ...generation !== undefined ? { generation } : {},
      ...instruct !== undefined ? { instruct } : {},
      ...promptOrder !== undefined ? { promptOrder } : {},
      ...mainPrompt !== undefined ? { mainPrompt } : {},
      ...nsfw !== undefined ? { nsfw } : {},
      ...jailbreakPrompt !== undefined ? { jailbreakPrompt } : {},
    })
  }

  async exportJson(id: PresetId): Promise<string> {
    const preset = await this.get(id)
    if (!preset) throw new Error(`Preset ${id} not found`)
    return JSON.stringify(preset, null, 2)
  }

  async buildPrompt(presetId: PresetId, characterData: Record<string, string>): Promise<string> {
    const preset = await this.get(presetId)
    if (!preset) throw new Error(`Preset ${presetId} not found`)

    const vars: Record<string, string> = {
      ...preset.instruct.macros,
      ...characterData,
      char: characterData.name ?? '',
      user: characterData.userName ?? 'User',
    }

    // Build prompt from the ordered entries
    const parts: string[] = []

    // Main prompt first
    if (preset.mainPrompt) {
      parts.push(expandMacros(preset.mainPrompt, vars))
    }

    // Then ordered entries
    for (const entry of preset.promptOrder.entries) {
      if (!entry.enabled) continue
      parts.push(expandMacros(entry.content, vars))
    }

    // Apply instruct wrapper if enabled
    if (preset.instruct.enabled) {
      const systemContent = parts.join(preset.instruct.separator)
      return expandMacros(preset.instruct.systemPrompt, { ...vars, content: systemContent })
    }

    return parts.join('\n\n')
  }
}

// ── Plugin entry ───────────────────────────────────────────────────────────

export const name = 'st-preset-file'

export interface Config extends FilePresetConfig {}

export default FilePresetProvider
