/**
 * SillyTavern World Info (lorebook) service — faithful port of ST's format
 * and core activation engine.
 *
 * Files are `worlds/<name>.json` containing `{ name, entries: { [uid]: entry },
 * extensions }`. Entry fields, defaults, and the selective-logic enum mirror
 * ST's `newWorldInfoEntryDefinition` (public/scripts/world-info.js). The
 * activation scan ports ST's checkWorldInfo core path: constant entries,
 * primary/secondary key logic (AND_ANY / NOT_ALL / NOT_ANY / AND_ALL),
 * recursive scanning, timed effects (sticky/cooldown/delay), probability,
 * and token-budget insertion ordering.
 *
 * @module @deepseek-ai/dsh-st-lorebook
 */
import { Service, type Context } from '@deepseek-ai/cordis'
import { readFile, writeFile, readdir, mkdir, unlink } from 'node:fs/promises'
import { join, resolve, parse as parsePath } from 'node:path'
import { existsSync } from 'node:fs'
import { sanitizeFilename, type CharacterBook } from '@deepseek-ai/dsh-st-character'

// ── ST enums (world-info.js) ───────────────────────────────────────────────

/** Secondary-key logic enum; ST's world_info_logic. */
export const world_info_logic = {
  AND_ANY: 0,
  NOT_ALL: 1,
  NOT_ANY: 2,
  AND_ALL: 3,
} as const
export type WorldInfoLogic = 0 | 1 | 2 | 3

/** Entry insertion position enum; ST's world_info_position. */
export const world_info_position = {
  before: 0,
  after: 1,
  ANTop: 2,
  ANBottom: 3,
  atDepth: 4,
  EMTop: 5,
  EMBottom: 6,
  outlet: 7,
  sysTop: 800,
  sysBottom: 801,
  beforeChar: 1000,
  afterChar: 1001,
  EMTopKmp: 1002,
  EMBottomKmp: 1003,
} as const

/** ST's DEFAULT_DEPTH for entries. */
export const DEFAULT_DEPTH = 4
/** ST's DEFAULT_WEIGHT for grouped entries. */
export const DEFAULT_WEIGHT = 100

// ── Vocabulary types ───────────────────────────────────────────────────────

/** A World Info entry — exact serialization shape of ST's WIEntry. */
export interface WorldInfoEntry {
  uid: number
  key: string[]
  keysecondary: string[]
  comment: string
  content: string
  constant: boolean
  vectorized: boolean
  selective: boolean
  selectiveLogic: WorldInfoLogic
  addMemo: boolean
  order: number
  position: number
  disable: boolean
  ignoreBudget: boolean
  excludeRecursion: boolean
  preventRecursion: boolean
  matchPersonaDescription: boolean
  matchCharacterDescription: boolean
  matchCharacterPersonality: boolean
  matchCharacterDepthPrompt: boolean
  matchScenario: boolean
  matchCreatorNotes: boolean
  delayUntilRecursion: number
  probability: number
  useProbability: boolean
  depth: number
  outletName: string
  group: string
  groupOverride: boolean
  groupWeight: number
  scanDepth: number | null
  caseSensitive: boolean | null
  matchWholeWords: boolean | null
  useGroupScoring: boolean | null
  automationId: string
  role: number
  sticky: number | null
  cooldown: number | null
  delay: number | null
  displayIndex: number
  [key: string]: unknown
}

/** A World Info book — the on-disk `worlds/<name>.json` shape. */
export interface WorldInfoFile {
  name?: string
  entries: Record<string, WorldInfoEntry>
  extensions?: Record<string, unknown>
}

/** Listing row for the book picker. */
export interface WorldInfoListItem {
  file_id: string
  name: string
  extensions: Record<string, unknown>
}

/** Create an entry with ST's template defaults. */
export function newWorldInfoEntry(): WorldInfoEntry {
  return {
    uid: 0,
    key: [],
    keysecondary: [],
    comment: '',
    content: '',
    constant: false,
    vectorized: false,
    selective: true,
    selectiveLogic: world_info_logic.AND_ANY,
    addMemo: false,
    order: 100,
    position: world_info_position.before,
    disable: false,
    ignoreBudget: false,
    excludeRecursion: false,
    preventRecursion: false,
    matchPersonaDescription: false,
    matchCharacterDescription: false,
    matchCharacterPersonality: false,
    matchCharacterDepthPrompt: false,
    matchScenario: false,
    matchCreatorNotes: false,
    delayUntilRecursion: 0,
    probability: 100,
    useProbability: true,
    depth: DEFAULT_DEPTH,
    outletName: '',
    group: '',
    groupOverride: false,
    groupWeight: DEFAULT_WEIGHT,
    scanDepth: null,
    caseSensitive: null,
    matchWholeWords: null,
    useGroupScoring: null,
    automationId: '',
    role: 0,
    sticky: null,
    cooldown: null,
    delay: null,
    displayIndex: 0,
  }
}

// ── Activation engine (core path of ST checkWorldInfo) ────────────────────

/** Texts scanned for key matches. */
export interface WorldInfoScanTexts {
  chatHistory: string[]
  /** Total messages in the chat; gates entries whose `delay` (delay-until-message count) has not elapsed. */
  messageCount?: number
  personaDescription?: string
  characterDescription?: string
  characterPersonality?: string
  characterDepthPrompt?: string
  scenario?: string
  creatorNotes?: string
}

/** Cross-request sticky/cooldown tracking for one entry: the last activation
 * or deactivation timestamp plus whether the entry was active at that mark
 * (ST counts cooldown from deactivation, not from the last activation). */
export interface TimedStateRecord {
  at: number
  active: boolean
}

/** Options for a scan. */
export interface WorldInfoScanOptions {
  /** Max messages scanned back; ST's world_info_depth (default 2 messages, capped). */
  scanDepthMessages?: number
  /** Global case sensitivity override. */
  caseSensitive?: boolean
  /** Whole-word matching; ST default true for latin content. */
  matchWholeWords?: boolean
  /** Token budget cap for activated entries; ST default 25% of context. */
  tokenBudget?: number
  /** Recursive scan iterations; ST's maxRecursionSteps. */
  maxRecursionSteps?: number
  /** Cross-request timed tracking keyed `<world>#<uid>`; sticky keeps entries active past their match, cooldown (from deactivation) blocks re-activation. The scan writes activation and deactivation marks. */
  timedState?: Map<string, TimedStateRecord>
  /** Vector-similarity hits keyed `<world>#<uid>` (from the st-vector service); vectorized entries activate through these scores instead of keyword matching. */
  vectorHits?: Map<string, number>
  /** Wall clock for sticky/cooldown windows; defaults to Date.now(). */
  nowMs?: number
  /** RNG source for probability rolls (injectable for tests). */
  random?: () => number
}

/** An activated entry with its resolved content. */
export interface ActivatedEntry {
  entry: WorldInfoEntry
  /** Which book the entry came from. */
  world: string
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Word-boundary matcher, port of ST's matchKeys join for whole words. */
function containsKey(haystack: string, key: string, wholeWords: boolean, caseSensitive: boolean): boolean {
  const needle = caseSensitive ? key : key.toLowerCase()
  const target = caseSensitive ? haystack : haystack.toLowerCase()
  if (!needle) return false
  if (!wholeWords) return target.includes(needle)
  // ST builds a regex of all keys joined with |; per-key equivalent:
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(needle)}(?:[^\\p{L}\\p{N}]|$)`, 'u')
  return re.test(target)
}

/**
 * Pick one entry from a same-group clash (ST's in-group priority):
 * a groupOverride entry claims the group; otherwise vector-scored members
 * compete on their shared best similarity (ST's useGroupScoring: the group
 * aggregates scores from vectorized hits), and only unscored clashes fall
 * to the groupWeight-weighted roll. Weights below 1 are treated as 1 so
 * every entry can win.
 */
function pickGroupWinner(
  list: Array<{ world: string; entry: WorldInfoEntry }>,
  random: () => number,
  scores: Map<string, number> | undefined,
): { world: string; entry: WorldInfoEntry } {
  const overrides = list.filter((i) => i.entry.groupOverride)
  if (overrides.length > 0) return overrides[0]!
  const scored = list
    .map((item) => ({ item, score: scores?.get(`${item.world}#${item.entry.uid}`) }))
    .filter((s): s is { item: { world: string; entry: WorldInfoEntry }; score: number } => s.score !== undefined)
  if (scored.length > 0) {
    const best = Math.max(...scored.map((s) => s.score))
    const top = scored.filter((s) => s.score === best)
    return top[Math.floor(random() * top.length)]!.item
  }
  const total = list.reduce((sum, i) => sum + Math.max(1, i.entry.groupWeight), 0)
  let roll = random() * total
  for (const item of list) {
    roll -= Math.max(1, item.entry.groupWeight)
    if (roll <= 0) return item
  }
  return list[list.length - 1]!
}

/**
 * Scan books against the chat context and return activated entries.
 * Ports ST's primary path: constants first, key matching per message slice,
 * secondary-key logic, recursion over activated content, probability roll,
 * then sort by order for prompt assembly.
 */
export function scanWorldInfo(
  books: Array<{ name: string; file: WorldInfoFile }>,
  texts: WorldInfoScanTexts,
  options: WorldInfoScanOptions = {},
): ActivatedEntry[] {
  const random = options.random ?? Math.random
  const scanDepthMessages = options.scanDepthMessages ?? 2
  const caseSensitive = options.caseSensitive ?? false
  const wholeWordsDefault = options.matchWholeWords ?? true
  const maxRecursionSteps = options.maxRecursionSteps ?? 3
  const nowMs = options.nowMs ?? Date.now()
  const timedState = options.timedState
  const vectorHits = options.vectorHits
  const tokenBudget = options.tokenBudget

  const allEntries: Array<{ world: string; entry: WorldInfoEntry }> = []
  for (const { name, file } of books) {
    for (const entry of Object.values(file.entries)) {
      allEntries.push({ world: name, entry })
    }
  }
  const enabled = allEntries.filter(({ entry }) => !entry.disable)
  const activated = new Map<string, { world: string; entry: WorldInfoEntry }>()
  // Composite key: uids repeat across books, so a bare uid would drop entries
  const activationOrder: string[] = []

  const matchesFor = (entry: WorldInfoEntry, text: string): boolean => {
    const cs = entry.caseSensitive ?? caseSensitive
    const ww = entry.matchWholeWords ?? wholeWordsDefault
    const primaries = entry.key.filter((k) => k.trim().length > 0)
    const primaryHit =
      entry.constant || primaries.length === 0
        ? true
        : primaries.some((k) => containsKey(text, k, ww, cs))

    if (!primaryHit) {
      // Secondary keys alone can trigger when primary list is empty (ST: blue-light entries)
      const secondaries = entry.keysecondary.filter((k) => k.trim().length > 0)
      if (primaries.length === 0 && secondaries.length > 0) {
        return secondaries.some((k) => containsKey(text, k, ww, cs))
      }
      return false
    }

    // Primary hit (or constant): apply secondary-key logic
    const secondaries = entry.keysecondary.filter((k) => k.trim().length > 0)
    if (secondaries.length === 0 || !entry.selective) return true

    switch (entry.selectiveLogic) {
      case world_info_logic.AND_ANY:
        return secondaries.some((k) => containsKey(text, k, ww, cs))
      case world_info_logic.AND_ALL:
        return secondaries.every((k) => containsKey(text, k, ww, cs))
      case world_info_logic.NOT_ANY:
        return !secondaries.some((k) => containsKey(text, k, ww, cs))
      case world_info_logic.NOT_ALL:
        return !secondaries.every((k) => containsKey(text, k, ww, cs))
      default:
        return true
    }
  }

  // Also scan the auxiliary texts the entry opted into
  const auxiliaryText = (entry: WorldInfoEntry): string => {
    const parts: string[] = []
    if (entry.matchPersonaDescription && texts.personaDescription) parts.push(texts.personaDescription)
    if (entry.matchCharacterDescription && texts.characterDescription) parts.push(texts.characterDescription)
    if (entry.matchCharacterPersonality && texts.characterPersonality) parts.push(texts.characterPersonality)
    if (entry.matchCharacterDepthPrompt && texts.characterDepthPrompt) parts.push(texts.characterDepthPrompt)
    if (entry.matchScenario && texts.scenario) parts.push(texts.scenario)
    if (entry.matchCreatorNotes && texts.creatorNotes) parts.push(texts.creatorNotes)
    return parts.join('\n')
  }

  const tryActivate = (recursionStep: number, recursiveText: string): void => {
    for (const item of enabled) {
      const { entry } = item
      const key = `${item.world}#${entry.uid}`
      if (activated.has(key)) continue
      if (entry.delayUntilRecursion > recursionStep) continue
      // Non-recursable entries may only be activated by the chat text itself
      if (recursionStep > 0 && entry.excludeRecursion) continue
      if (texts.messageCount !== undefined && entry.delay !== null && texts.messageCount < entry.delay) continue
      // Vectorized entries skip keyword matching entirely: they activate via
      // their vector-similarity hit (constants stay always-on, as in ST)
      if (entry.vectorized && !entry.constant) {
        if (vectorHits?.get(key) !== undefined) {
          activated.set(key, item)
          activationOrder.push(key)
          timedState?.set(key, { at: nowMs, active: true })
        }
        continue
      }
      const aux = auxiliaryText(entry)
      // Per-entry scan depth overrides the global window on the chat portion
      // (ST's scanDepth); recursion steps rescan only via the activated content
      const chatWindow = texts.chatHistory.slice(-(entry.scanDepth ?? scanDepthMessages)).join('\n')
      const scanText = recursionStep === 0 ? chatWindow : `${chatWindow}\n${recursiveText}`
      const matched = matchesFor(entry, scanText) || (aux.length > 0 && matchesFor(entry, `${scanText}\n${aux}`))
      if (!matched) continue
      if (entry.useProbability && entry.probability < 100 && random() * 100 > entry.probability) continue
      const last = timedState?.get(key)
      if (last !== undefined && !last.active && entry.cooldown !== null && nowMs - last.at < entry.cooldown) continue
      activated.set(key, item)
      activationOrder.push(key)
      timedState?.set(key, { at: nowMs, active: true })
    }
  }
  // Sticky window: entries activated within their sticky span stay active without matching
  if (timedState !== undefined) {
    for (const item of enabled) {
      const { entry } = item
      if (entry.sticky === null) continue
      const key = `${item.world}#${entry.uid}`
      const last = timedState.get(key)
      if (last === undefined || !last.active || nowMs - last.at >= entry.sticky) continue
      activated.set(key, item)
      activationOrder.push(key)
      timedState.set(key, { at: nowMs, active: true })
    }
  }
  
  // Initial scan over the chat text
  tryActivate(0, '')
  // Recursive scans: activated content becomes scannable text, except from
  // entries that prevent further recursion
  for (let step = 1; step <= maxRecursionSteps; step++) {
    const prevCount = activated.size
    const recursiveText = activationOrder
      .map((key) => activated.get(key)!.entry)
      .filter((e) => !e.preventRecursion)
      .map((e) => e.content)
      .join('\n')
    tryActivate(step, recursiveText)
    if (activated.size === prevCount) break
  }
  // Deactivation marks: an entry active in a previous scan that no longer
  // activates starts its cooldown window from this scan (ST counts cooldown
  // from deactivation). Group-coordinated suppression is not a deactivation,
  // so marks are taken before the group pass.
  if (timedState !== undefined) {
    for (const [key, record] of timedState) {
      if (record.active && !activated.has(key)) timedState.set(key, { at: nowMs, active: false })
    }
  }
  // Group coordination (ST's in-group priority): same-group entries compete
  // — a groupOverride winner claims the group, otherwise one entry is picked
  // by a groupWeight-weighted roll; once any override winner is active, it
  // suppresses activated entries from other groups unless they override too.
  {
    const byGroup = new Map<string, Array<{ world: string; entry: WorldInfoEntry }>>()
    for (const item of activated.values()) {
      const group = item.entry.group
      if (group === '') continue
      const list = byGroup.get(group) ?? []
      list.push(item)
      byGroup.set(group, list)
    }
    let hasOverrideWinner = false
    for (const [, list] of byGroup) {
      const winner = pickGroupWinner(list, random, vectorHits)
      if (winner.entry.groupOverride) hasOverrideWinner = true
      for (const item of list) {
        if (item !== winner) activated.delete(`${item.world}#${item.entry.uid}`)
      }
    }
    if (hasOverrideWinner) {
      for (const [key, item] of activated) {
        if (!item.entry.groupOverride) activated.delete(key)
      }
    }
  }
  // Order for prompt insertion: ST sorts by order, then position, then depth
  let result = [...activated.values()].sort((a, b) => {
    if (a.entry.order !== b.entry.order) return a.entry.order - b.entry.order
    if (a.entry.position !== b.entry.position) return a.entry.position - b.entry.position
    return a.entry.depth - b.entry.depth
  })
  // Token budget: keep entries in insertion order until the budget is spent;
  // ignoreBudget entries always ride along. Tokens are estimated at 4 chars
  // per token (ST counts with its tokenizer; the estimate preserves ordering)
  if (tokenBudget !== undefined) {
    let used = 0
    result = result.filter(({ entry }) => {
      if (entry.ignoreBudget) return true
      const cost = Math.ceil(entry.content.length / 4)
      if (used + cost > tokenBudget) return false
      used += cost
      return true
    })
  }
  return result.map(({ world, entry }) => ({ world, entry }))
}

// ── Service definition ─────────────────────────────────────────────────────

/**
 * Convert a chara_card_v2 embedded `character_book` to the standalone
 * `worlds/*.json` scan format; ST's conversion in `convertCharacterBook`.
 * @param book - the card's embedded book.
 * @returns a book with the standalone entry shape, keyed by entry id.
 */
export function bookFromCharacterBook(book: CharacterBook): WorldInfoFile {
  const entries: Record<string, WorldInfoEntry> = {}
  book.entries.forEach((e, index) => {
    const base = newWorldInfoEntry()
    entries[String(e.id ?? index)] = {
      ...base,
      uid: e.id ?? index,
      key: [...e.keys],
      keysecondary: e.secondary_keys === undefined ? [] : [...e.secondary_keys],
      comment: e.comment,
      content: e.content,
      constant: e.constant,
      selective: e.selective,
      order: e.insertion_order,
      disable: !(e.enabled ?? true),
      caseSensitive: e.case_sensitive ?? null,
      position: e.position === 'after_char' ? world_info_position.afterChar : world_info_position.beforeChar,
    }
  })
  return { name: book.name, entries }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    stLorebook: StLorebookService
  }
}

/**
 * SillyTavern World Info file service. CRUD over `worlds/*.json` in the
 * ST-compatible layout, plus the activation scan for prompt assembly.
 */
export abstract class StLorebookService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'stLorebook')
  }

  /** List all books. */
  abstract list(): Promise<WorldInfoListItem[]>

  /** Read one book; `undefined` when missing (ST's readWorldInfoFile without dummy). */
  abstract get(name: string): Promise<WorldInfoFile | undefined>

  /** Read one book, creating `{entries:{}}` when missing (ST's allowDummy). */
  abstract getOrDummy(name: string): Promise<WorldInfoFile>

  /** Create/replace a book. */
  abstract save(name: string, file: WorldInfoFile): Promise<void>

  /** Delete a book. */
  abstract delete(name: string): Promise<void>

  /** Import raw JSON as a book; returns the stored name. */
  abstract import(name: string, json: string): Promise<string>

  /** Worlds root directory (ST layout: `<dataRoot>/worlds`). */
  abstract readonly worldsDir: string
}

// ── File provider ──────────────────────────────────────────────────────────

export interface Config {
  /** SillyTavern data root (directory containing `worlds/`). */
  dataRoot: string
}

class StLorebookFileProvider extends StLorebookService {
  readonly worldsDir: string

  constructor(ctx: Context, config: Config) {
    super(ctx)
    this.worldsDir = resolve(config.dataRoot, 'worlds')
  }

  private path(name: string): string {
    return join(this.worldsDir, `${sanitizeFilename(name)}.json`)
  }

  private async ensureDir(): Promise<void> {
    if (!existsSync(this.worldsDir)) await mkdir(this.worldsDir, { recursive: true })
  }

  async list(): Promise<WorldInfoListItem[]> {
    if (!existsSync(this.worldsDir)) return []
    const files = (await readdir(this.worldsDir))
      .filter((f) => f.toLowerCase().endsWith('.json'))
      .sort((a, b) => a.localeCompare(b))
    const rows: WorldInfoListItem[] = []
    for (const file of files) {
      try {
        const parsed = JSON.parse(await readFile(join(this.worldsDir, file), 'utf8')) as WorldInfoFile
        const id = parsePath(file).name
        rows.push({
          file_id: id,
          name: parsed.name || id,
          extensions:
            parsed.extensions && typeof parsed.extensions === 'object'
              ? (parsed.extensions as Record<string, unknown>)
              : {},
        })
      } catch { /* skip unreadable books, same as ST's list */ }
    }
    return rows
  }

  async get(name: string): Promise<WorldInfoFile | undefined> {
    if (!name) return undefined
    const path = this.path(name)
    if (!existsSync(path)) return undefined
    return JSON.parse(await readFile(path, 'utf8')) as WorldInfoFile
  }

  async getOrDummy(name: string): Promise<WorldInfoFile> {
    return (await this.get(name)) ?? { entries: {} }
  }

  async save(name: string, file: WorldInfoFile): Promise<void> {
    await this.ensureDir()
    await writeFile(this.path(name), JSON.stringify(file, null, 4), 'utf8')
  }

  async delete(name: string): Promise<void> {
    const path = this.path(name)
    if (existsSync(path)) await unlink(path)
  }

  async import(name: string, json: string): Promise<string> {
    const parsed = JSON.parse(json) as WorldInfoFile
    const stored = parsed.name || name
    await this.save(stored, parsed)
    return stored
  }
}

// ── Plugin entry ───────────────────────────────────────────────────────────

export const name = 'st-lorebook-file'

export default StLorebookFileProvider
