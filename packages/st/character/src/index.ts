/**
 * SillyTavern character card service — faithful port of ST's character model.
 *
 * Characters are stored exactly as SillyTavern stores them: one PNG file per
 * character in `characters/`, where the avatar image IS the card. Card JSON
 * lives in PNG `tEXt` chunks (`chara` = V2 spec, `ccv3` = V3 spec, V3 wins),
 * base64-encoded. Top-level V1 fields and `data.*` V2 fields are both kept
 * and synchronized, mirroring `charaFormatData` / `readFromV2` in
 * ST's src/endpoints/characters.js.
 *
 * @module @deepseek-ai/dsh-st-character
 */
import { Service, type Context } from '@deepseek-ai/cordis'
import { readFile, writeFile, readdir, mkdir, unlink, rename } from 'node:fs/promises'
import { join, resolve, parse as parsePath } from 'node:path'
import { existsSync } from 'node:fs'

// ── ST constants (src/constants.js) ────────────────────────────────────────

/** Avatar render width; ST's AVATAR_WIDTH. */
export const AVATAR_WIDTH = 512
/** Avatar render height; ST's AVATAR_HEIGHT. */
export const AVATAR_HEIGHT = 768

// ── Vocabulary types (ST character card spec) ──────────────────────────────

/** V2 card `data.extensions.depth_prompt`. */
export interface DepthPrompt {
  prompt: string
  depth: number
  role: 'system' | 'user' | 'assistant'
}

/** V2 character book entry (ST world-info-in-card). */
export interface CharacterBookEntry {
  keys: string[]
  secondary_keys?: string[]
  comment: string
  content: string
  constant: boolean
  selective: boolean
  insertion_order: number
  enabled: boolean
  position?: 'before_char' | 'after_char'
  extensions?: Record<string, unknown>
  id?: number
  case_sensitive?: boolean
  priority?: number
}

/** V2 character book. */
export interface CharacterBook {
  name: string
  description?: string
  scan_depth?: number
  token_budget?: number
  recursive_scanning?: boolean
  extensions: Record<string, unknown>
  entries: CharacterBookEntry[]
}

/**
 * A SillyTavern character card object as stored inside the PNG.
 * Carries BOTH the V1 top-level fields and the V2 `data` block (ST keeps
 * them synchronized; `readFromV2` reconciles mismatches).
 */
export interface StCharacterCard {
  // V1 fields (top level)
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
  // ST extension fields (legacy top-level, mirrored from data.extensions)
  creatorcomment: string
  avatar: string
  chat: string
  talkativeness: string | number
  fav: boolean
  tags: string[]
  // V2 envelope
  spec: 'chara_card_v2' | 'chara_card_v3'
  spec_version: string
  data: {
    name: string
    description: string
    personality: string
    scenario: string
    first_mes: string
    mes_example: string
    creator_notes: string
    system_prompt: string
    post_history_instructions: string
    alternate_greetings: string[]
    tags: string[]
    creator: string
    character_version: string
    extensions: {
      talkativeness: number
      fav: boolean
      world: string
      depth_prompt: DepthPrompt
      [key: string]: unknown
    }
    character_book?: CharacterBook
  }
  create_date?: string
  // Foreign keys ST preserves untouched
  [key: string]: unknown
}

/** Shallow listing row for the character grid. */
export interface StCharacterListItem {
  avatar: string
  name: string
  tags: string[]
  fav: boolean
  create_date?: string
  /** Chat title derived by ST convention: `${name} - ${humanizedDateTime()}`. */
  chat: string
  talkativeness: number
  mes_example?: string
}

/** Result row for full-card reads. */
export interface StCharacterFull extends StCharacterListItem {
  card: StCharacterCard
}

// ── ST utility ports (src/util.js) ─────────────────────────────────────────

/**
 * ST's humanizedDateTime: `YYYY-MM-DD@HHhMMmSSsmmmms`.
 * @param timestamp - epoch millis; defaults to now.
 * @returns the ST-format timestamp used in chat filenames.
 */
export function humanizedDateTime(timestamp = Date.now()): string {
  const date = new Date(timestamp)
  const dt: Record<string, string> = {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1),
    day: String(date.getDate()),
    hour: String(date.getHours()),
    minute: String(date.getMinutes()),
    second: String(date.getSeconds()),
    millisecond: String(date.getMilliseconds()),
  }
  for (const key in dt) {
    const padLength = key === 'millisecond' ? 3 : 2
    dt[key] = (dt[key] ?? '').padStart(padLength, '0')
  }
  return `${dt.year}-${dt.month}-${dt.day}@${dt.hour}h${dt.minute}m${dt.second}s${dt.millisecond}ms`
}

/**
 * Port of sanitize-filename's observable behavior for the characters surface:
 * ST passes card names through it before using them as filenames.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\\/:\*\?"<>|\x00-\x1f]/g, '')
    .replace(/con|prn|aux|nul/i, '')
    .replace(/[. ]+$/, '')
    .replace(/^(?:[a-zA-Z]:)?$/, '')
    || 'unnamed'
}

/** Get a unique filename (base, ext) when `base.ext` already exists. ST's getUniqueName. */
export function getUniqueName(
  baseName: string,
  exists: (name: string) => boolean,
  startIndex = 1,
  maxTries = 1000,
): string {
  if (!exists(baseName)) return baseName
  for (let i = startIndex; i < startIndex + maxTries; i++) {
    const candidate = `${baseName} (${i})`
    if (!exists(candidate)) return candidate
  }
  throw new Error(`Could not find a unique name for ${baseName}`)
}

// ── PNG tEXt chunk codec (port of png-chunks-extract + png-chunk-text) ─────

interface PngChunk { name: string; data: Uint8Array }

/** Extract all chunks from a PNG buffer; throws on bad signature. */
function extractChunks(png: Buffer): PngChunk[] {
  const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  for (let i = 0; i < 8; i++) {
    if (png[i] !== PNG_SIG[i]) throw new Error('Invalid PNG signature')
  }
  const chunks: PngChunk[] = []
  let offset = 8
  while (offset < png.length) {
    if (offset + 8 > png.length) break
    const length = png.readUInt32BE(offset)
    const name = png.toString('ascii', offset + 4, offset + 8)
    const data = new Uint8Array(png.subarray(offset + 8, offset + 8 + length))
    chunks.push({ name, data })
    offset += 12 + length
    if (name === 'IEND') break
  }
  return chunks
}

/** CRC-32 over a chunk (type + data), per PNG spec. */
function chunkCrc(type: Buffer, data: Buffer): number {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    table[n] = c >>> 0
  }
  let crc = 0xFFFFFFFF
  const input = Buffer.concat([type, data])
  for (let i = 0; i < input.length; i++) {
    const byte = input[i] ?? 0
    crc = (table[(crc ^ byte) >>> 0] ?? 0) ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

/** Re-encode chunks back into a PNG buffer. */
function encodeChunks(chunks: PngChunk[]): Buffer {
  const parts: Buffer[] = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]
  for (const chunk of chunks) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(chunk.data.length, 0)
    const type = Buffer.from(chunk.name, 'ascii')
    const data = Buffer.from(chunk.data)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(chunkCrc(type, data), 0)
    parts.push(len, type, data, crc)
  }
  return Buffer.concat(parts)
}

/** Decode a tEXt chunk payload into {keyword, text} (latin1 text, ST-compatible). */
function decodeTextChunk(data: Uint8Array): { keyword: string; text: string } {
  const buf = Buffer.from(data)
  const nullIdx = buf.indexOf(0)
  if (nullIdx === -1) return { keyword: '', text: '' }
  return {
    keyword: buf.toString('latin1', 0, nullIdx),
    text: buf.toString('latin1', nullIdx + 1),
  }
}

/** Encode keyword+text into a tEXt chunk payload. */
function encodeTextChunk(keyword: string, text: string): Uint8Array {
  return new Uint8Array(Buffer.concat([
    Buffer.from(keyword, 'latin1'),
    Buffer.from([0]),
    Buffer.from(text, 'latin1'),
  ]))
}

/**
 * Read card JSON from a PNG buffer. V3 (`ccv3`) wins over V2 (`chara`),
 * mirroring ST's character-card-parser read().
 * @throws when the PNG carries no card metadata.
 */
export function readCardFromPng(png: Buffer): string {
  const chunks = extractChunks(png)
  const textChunks = chunks
    .filter((c) => c.name === 'tEXt')
    .map((c) => decodeTextChunk(c.data))

  const ccv3 = textChunks.find((t) => t.keyword.toLowerCase() === 'ccv3')
  if (ccv3) return Buffer.from(ccv3.text, 'base64').toString('utf8')

  const chara = textChunks.find((t) => t.keyword.toLowerCase() === 'chara')
  if (chara) return Buffer.from(chara.text, 'base64').toString('utf8')

  throw new Error('Selected character has no embedded metadata: not a valid SillyTavern card')
}

/**
 * Write card JSON into a PNG buffer as `chara` (V2) + `ccv3` (V3) tEXt
 * chunks inserted before IEND, removing any prior card chunks — the exact
 * behavior of ST's character-card-parser write().
 */
export function writeCardToPng(png: Buffer, cardJson: string): Buffer {
  const chunks = extractChunks(png).filter((c) => {
    if (c.name !== 'tEXt') return true
    const { keyword } = decodeTextChunk(c.data)
    const k = keyword.toLowerCase()
    return k !== 'chara' && k !== 'ccv3'
  })

  const base64V2 = Buffer.from(cardJson, 'utf8').toString('base64')
  chunks.splice(-1, 0, { name: 'tEXt', data: encodeTextChunk('chara', base64V2) })

  try {
    const v3 = JSON.parse(cardJson) as Record<string, unknown>
    v3.spec = 'chara_card_v3'
    v3.spec_version = '3.0'
    const base64V3 = Buffer.from(JSON.stringify(v3), 'utf8').toString('base64')
    chunks.splice(-1, 0, { name: 'tEXt', data: encodeTextChunk('ccv3', base64V3) })
  } catch { /* v3 chunk is best-effort, same as ST */ }

  return encodeChunks(chunks)
}

// ── Card normalization (faithful port of characters.js logic) ─────────────

/**
 * Build a blank V2 card, mirroring charaFormatData's defaults for a
 * newly-created character.
 */
export function createBlankCard(name: string): StCharacterCard {
  const now = humanizedDateTime()
  return {
    name,
    description: '',
    personality: '',
    scenario: '',
    first_mes: '',
    mes_example: '',
    creatorcomment: '',
    avatar: 'none',
    chat: `${name} - ${now}`,
    talkativeness: 0.5,
    fav: false,
    tags: [],
    spec: 'chara_card_v2',
    spec_version: '2.0',
    create_date: new Date().toISOString(),
    data: {
      name,
      description: '',
      personality: '',
      scenario: '',
      first_mes: '',
      mes_example: '',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      tags: [],
      creator: '',
      character_version: '',
      extensions: {
        talkativeness: 0.5,
        fav: false,
        world: '',
        depth_prompt: { prompt: '', depth: 4, role: 'system' },
      },
    },
  }
}

/**
 * Normalize any incoming card object to the synchronized V1+V2 shape.
 * Port of getCharaCardV2: cards without a `spec` go through convertToV2;
 * cards with a spec go through readFromV2 field reconciliation.
 */
export function normalizeCard(raw: Record<string, unknown>): StCharacterCard {
  if (raw.spec === undefined) return convertV1ToV2(raw)
  return readFromV2(raw as unknown as StCharacterCard)
}

/** Port of readFromV2: pull V1 top-level fields from data.*, with ST defaults. */
function readFromV2(char: StCharacterCard): StCharacterCard {
  if (char.data === undefined) return char
  delete (char as Record<string, unknown>).json_data

  char.name = char.data.name ?? char.name
  char.description = char.data.description ?? ''
  char.personality = char.data.personality ?? ''
  char.scenario = char.data.scenario ?? ''
  char.first_mes = char.data.first_mes ?? ''
  char.mes_example = char.data.mes_example ?? ''
  char.talkativeness = char.data.extensions?.talkativeness ?? 0.5
  char.fav = char.data.extensions?.fav ?? false
  char.tags = char.data.tags ?? []

  // ST's charaFormatData normalizes missing extension fields on read; a
  // third-party V2 card without them (extensions is optional in the spec)
  // would otherwise leave every consumer of card.data.extensions reading
  // undefined — the generate handler's depth_prompt prompt read crashes.
  const ext = char.data.extensions as Record<string, unknown> | undefined
  char.data.extensions = {
    ...ext,
    talkativeness: typeof ext?.talkativeness === 'number' ? ext.talkativeness : 0.5,
    fav: ext?.fav === true,
    world: typeof ext?.world === 'string' ? ext.world : '',
    depth_prompt: isDepthPrompt(ext?.depth_prompt)
      ? ext.depth_prompt
      : { prompt: '', depth: 4, role: 'system' },
  }

  if (typeof char.chat !== 'string' || char.chat.length === 0) {
    char.chat = `${char.name} - ${humanizedDateTime()}`
  }
  return char
}

/** Whether a value is a usable depth_prompt block (ST's shape check on read). */
function isDepthPrompt(value: unknown): value is StCharacterCard['data']['extensions']['depth_prompt'] {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.prompt === 'string' && typeof v.depth === 'number'
    && (v.role === 'system' || v.role === 'user' || v.role === 'assistant')
}

/** Port of convertToV2: lift V1 fields into the V2 envelope. */
function convertV1ToV2(raw: Record<string, unknown>): StCharacterCard {
  const name = String(raw.name ?? 'Unnamed')
  const card = createBlankCard(name)
  card.description = String(raw.description ?? '')
  card.personality = String(raw.personality ?? '')
  card.scenario = String(raw.scenario ?? '')
  card.first_mes = String(raw.first_mes ?? '')
  card.mes_example = String(raw.mes_example ?? '')
  card.creatorcomment = String(raw.creatorcomment ?? raw.creator_notes ?? '')
  card.chat = typeof raw.chat === 'string' ? raw.chat : `${name} - ${humanizedDateTime()}`
  card.create_date = typeof raw.create_date === 'string' ? raw.create_date : new Date().toISOString()

  card.data.description = card.description
  card.data.personality = card.personality
  card.data.scenario = card.scenario
  card.data.first_mes = card.first_mes
  card.data.mes_example = card.mes_example
  card.data.creator_notes = card.creatorcomment

  // Preserve foreign keys ST does not own (charaFormatData keeps the parsed
  // json_data object as the base and only overwrites known fields).
  for (const [k, v] of Object.entries(raw)) {
    if (!(k in card)) (card as Record<string, unknown>)[k] = v
  }
  return card
}

// ── Service definition ─────────────────────────────────────────────────────

declare module '@deepseek-ai/cordis' {
  interface Context {
    stCharacter: StCharacterService
  }
}

/**
 * SillyTavern character management service.
 *
 * A character is a PNG file: the image is the avatar, and the card JSON rides
 * in the PNG metadata. All operations keep the on-disk format byte-compatible
 * with SillyTavern, so a `characters/` directory is interchangeable between
 * the two applications.
 */
export abstract class StCharacterService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'stCharacter')
  }

  /** List all characters (shallow rows for the grid). */
  abstract list(): Promise<StCharacterListItem[]>

  /** Read one character's full card by avatar filename (e.g. `Seraphina.png`). */
  abstract get(avatar: string): Promise<StCharacterFull | undefined>

  /** Create a character from form fields; returns the avatar filename. */
  abstract create(data: CharacterFormData): Promise<string>

  /** Import a card from a base64 PNG data URL; returns the avatar filename. */
  abstract importPng(dataUrl: string): Promise<string>

  /** Import a card from raw JSON (V1 or V2); returns the avatar filename. */
  abstract importJson(json: string): Promise<string>

  /** Replace a character's card fields. */
  abstract edit(avatar: string, data: CharacterFormData): Promise<void>

  /** Replace a character's avatar image, preserving the card. */
  abstract editAvatar(avatar: string, dataUrl: string): Promise<void>

  /** Rename a character (renames the PNG; chats directory follows). */
  abstract rename(avatar: string, newName: string): Promise<string>

  /** Delete a character and its chats directory. */
  abstract delete(avatar: string): Promise<void>

  /** Export a character as a PNG data URL with embedded card. */
  abstract exportPng(avatar: string): Promise<string>

  /** Toggle favourite flag. */
  abstract setFavourite(avatar: string, fav: boolean): Promise<void>

  /** Serve the raw avatar PNG bytes. */
  abstract avatarBytes(avatar: string): Promise<Buffer | undefined>

  /** List a character's expression-sprite names (files under `characters/sprites/<base>/`). */
  abstract listSprites(avatar: string): Promise<string[]>

  /** Serve one expression sprite's raw PNG bytes. */
  abstract spriteBytes(avatar: string, expression: string): Promise<Buffer | undefined>

  /** Characters root directory (ST layout: `<dataRoot>/characters`). */
  abstract readonly charactersDir: string
}

/** Form fields for create/edit — mirrors ST's /api/characters/create body. */
export interface CharacterFormData {
  ch_name: string
  description?: string
  personality?: string
  scenario?: string
  first_mes?: string
  mes_example?: string
  creator_notes?: string
  system_prompt?: string
  post_history_instructions?: string
  tags?: string | string[]
  creator?: string
  character_version?: string
  alternate_greetings?: string[] | string
  talkativeness?: string | number
  fav?: string | boolean
  world?: string
  depth_prompt_prompt?: string
  depth_prompt_depth?: number | string
  depth_prompt_role?: string
}

// ── File provider (ST-compatible layout) ──────────────────────────────────

export interface Config {
  /** SillyTavern data root (the directory containing `characters/`, `chats/`, ...). */
  dataRoot: string
}

class StCharacterFileProvider extends StCharacterService {
  readonly charactersDir: string

  constructor(ctx: Context, config: Config) {
    super(ctx)
    this.charactersDir = resolve(config.dataRoot, 'characters')
  }

  private avatarPath(avatar: string): string {
    // Path safety: only a basename is accepted, mirroring validateFileName
    const base = sanitizeFilename(parsePath(avatar).name)
    return join(this.charactersDir, `${base}.png`)
  }

  private async ensureDir(): Promise<void> {
    if (!existsSync(this.charactersDir)) await mkdir(this.charactersDir, { recursive: true })
  }

  private async readCard(avatar: string): Promise<StCharacterFull | undefined> {
    const path = this.avatarPath(avatar)
    if (!existsSync(path)) return undefined
    const png = await readFile(path)
    const cardJson = readCardFromPng(png)
    const card = normalizeCard(JSON.parse(cardJson) as Record<string, unknown>)
    const avatarName = parsePath(path).base
    return {
      avatar: avatarName,
      name: card.name,
      tags: card.tags ?? [],
      fav: card.fav ?? false,
      ...(card.create_date === undefined ? {} : { create_date: card.create_date }),
      chat: card.chat,
      talkativeness: Number(card.talkativeness) || 0.5,
      card,
    }
  }

  private async writeCard(card: StCharacterCard, avatar: string): Promise<void> {
    await this.ensureDir()
    const path = this.avatarPath(avatar)
    const base = parsePath(path).name
    let png: Buffer
    if (existsSync(path)) {
      png = await readFile(path)
    } else {
      png = await readFile(resolve(this.charactersDir, '../default-user/User Avatars/user-default.png')).catch(() => blankPng())
    }
    const out = writeCardToPng(png, JSON.stringify(card))
    await writeFile(join(this.charactersDir, `${base}.png`), out)
  }

  async list(): Promise<StCharacterListItem[]> {
    await this.ensureDir()
    const files = (await readdir(this.charactersDir))
      .filter((f) => f.toLowerCase().endsWith('.png'))
      .sort((a, b) => a.localeCompare(b))
    const rows: StCharacterListItem[] = []
    for (const file of files) {
      try {
        const png = await readFile(join(this.charactersDir, file))
        const card = normalizeCard(JSON.parse(readCardFromPng(png)) as Record<string, unknown>)
        rows.push({
          avatar: file,
          name: card.name,
          tags: card.tags ?? [],
          fav: card.fav ?? false,
          ...(card.create_date === undefined ? {} : { create_date: card.create_date }),
          chat: card.chat,
          talkativeness: Number(card.talkativeness) || 0.5,
        })
      } catch { /* skip cards without metadata, same as ST skipping non-characters */ }
    }
    return rows
  }

  async get(avatar: string): Promise<StCharacterFull | undefined> {
    return this.readCard(avatar)
  }

  private applyForm(card: StCharacterCard, data: CharacterFormData): void {
    // Port of charaFormatData: write both V1 top-level and V2 data.* fields
    card.name = data.ch_name
    card.description = data.description ?? ''
    card.personality = data.personality ?? ''
    card.scenario = data.scenario ?? ''
    card.first_mes = data.first_mes ?? ''
    card.mes_example = data.mes_example ?? ''
    card.creatorcomment = data.creator_notes ?? ''
    card.talkativeness = data.talkativeness ?? 0.5
    card.fav = data.fav === 'true' || data.fav === true

    const tags = typeof data.tags === 'string'
      ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : data.tags ?? []
    card.tags = tags

    const greetings = Array.isArray(data.alternate_greetings)
      ? data.alternate_greetings
      : typeof data.alternate_greetings === 'string' ? [data.alternate_greetings] : []

    card.data.name = card.name
    card.data.description = card.description
    card.data.personality = card.personality
    card.data.scenario = card.scenario
    card.data.first_mes = card.first_mes
    card.data.mes_example = card.mes_example
    card.data.creator_notes = card.creatorcomment
    card.data.system_prompt = data.system_prompt ?? ''
    card.data.post_history_instructions = data.post_history_instructions ?? ''
    card.data.tags = tags
    card.data.creator = data.creator ?? ''
    card.data.character_version = data.character_version ?? ''
    card.data.alternate_greetings = greetings
    card.data.extensions.talkativeness = Number(card.talkativeness) || 0.5
    card.data.extensions.fav = card.fav
    card.data.extensions.world = data.world ?? ''

    const depth = Number(data.depth_prompt_depth)
    card.data.extensions.depth_prompt = {
      prompt: data.depth_prompt_prompt ?? '',
      depth: Number.isNaN(depth) ? 4 : depth,
      role: (data.depth_prompt_role as DepthPrompt['role']) ?? 'system',
    }
  }

  async create(data: CharacterFormData): Promise<string> {
    await this.ensureDir()
    const name = getUniqueName(
      sanitizeFilename(data.ch_name),
      (n) => existsSync(join(this.charactersDir, `${n}.png`)),
    )
    const card = createBlankCard(name)
    this.applyForm(card, { ...data, ch_name: name })
    card.chat = `${name} - ${humanizedDateTime()}`
    await this.writeCard(card, name)
    return `${name}.png`
  }

  async importPng(dataUrl: string): Promise<string> {
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
    const png = Buffer.from(base64, 'base64')
    const cardJson = readCardFromPng(png)
    const parsed = JSON.parse(cardJson) as Record<string, unknown>
    const card = normalizeCard(parsed)
    const name = getUniqueName(
      sanitizeFilename(card.name),
      (n) => existsSync(join(this.charactersDir, `${n}.png`)),
    )
    card.name = name
    card.data.name = name
    await this.ensureDir()
    await writeFile(join(this.charactersDir, `${name}.png`), writeCardToPng(png, JSON.stringify(card)))
    return `${name}.png`
  }

  async importJson(json: string): Promise<string> {
    const card = normalizeCard(JSON.parse(json) as Record<string, unknown>)
    const name = getUniqueName(
      sanitizeFilename(card.name),
      (n) => existsSync(join(this.charactersDir, `${n}.png`)),
    )
    card.name = name
    card.data.name = name
    await this.writeCard(card, name)
    return `${name}.png`
  }

  async edit(avatar: string, data: CharacterFormData): Promise<void> {
    const full = await this.readCard(avatar)
    if (!full) throw new Error(`Character ${avatar} not found`)
    this.applyForm(full.card, data)
    await this.writeCard(full.card, parsePath(avatar).name)
  }

  async editAvatar(avatar: string, dataUrl: string): Promise<void> {
    const full = await this.readCard(avatar)
    if (!full) throw new Error(`Character ${avatar} not found`)
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
    const png = Buffer.from(base64, 'base64')
    await this.ensureDir()
    await writeFile(this.avatarPath(avatar), writeCardToPng(png, JSON.stringify(full.card)))
  }

  async rename(avatar: string, newName: string): Promise<string> {
    const full = await this.readCard(avatar)
    if (!full) throw new Error(`Character ${avatar} not found`)
    const name = getUniqueName(
      sanitizeFilename(newName),
      (n) => existsSync(join(this.charactersDir, `${n}.png`)),
    )
    full.card.name = name
    full.card.data.name = name
    full.card.avatar = 'none'
    const oldPath = this.avatarPath(avatar)
    const newPath = join(this.charactersDir, `${name}.png`)
    await writeFile(newPath, writeCardToPng(await readFile(oldPath), JSON.stringify(full.card)))
    await unlink(oldPath)
    // Rename the chats directory alongside, mirroring ST's /rename
    const chatsOld = resolve(this.charactersDir, '../chats', parsePath(avatar).name)
    const chatsNew = resolve(this.charactersDir, '../chats', name)
    if (existsSync(chatsOld) && !existsSync(chatsNew)) await rename(chatsOld, chatsNew)
    return `${name}.png`
  }

  async delete(avatar: string): Promise<void> {
    const path = this.avatarPath(avatar)
    if (existsSync(path)) await unlink(path)
    // ST also removes the character's chats
    const chatsDir = resolve(this.charactersDir, '../chats', parsePath(avatar).name)
    if (existsSync(chatsDir)) {
      const { rm } = await import('node:fs/promises')
      await rm(chatsDir, { recursive: true, force: true })
    }
  }

  async exportPng(avatar: string): Promise<string> {
    const png = await readFile(this.avatarPath(avatar))
    return `data:image/png;base64,${png.toString('base64')}`
  }

  async setFavourite(avatar: string, fav: boolean): Promise<void> {
    const full = await this.readCard(avatar)
    if (!full) throw new Error(`Character ${avatar} not found`)
    full.card.fav = fav
    full.card.data.extensions.fav = fav
    await this.writeCard(full.card, parsePath(avatar).name)
  }

  async avatarBytes(avatar: string): Promise<Buffer | undefined> {
    const path = this.avatarPath(avatar)
    return existsSync(path) ? readFile(path) : undefined
  }

  async listSprites(avatar: string): Promise<string[]> {
    const dir = this.spriteDir(avatar)
    if (!existsSync(dir)) return []
    const files = await readdir(dir)
    return files
      .filter((f) => f.toLowerCase().endsWith('.png'))
      .map((f) => f.slice(0, -'.png'.length))
      .sort((a, b) => a.localeCompare(b))
  }

  async spriteBytes(avatar: string, expression: string): Promise<Buffer | undefined> {
    const path = join(this.spriteDir(avatar), `${sanitizeFilename(parsePath(expression).name)}.png`)
    return existsSync(path) ? readFile(path) : undefined
  }

  private spriteDir(avatar: string): string {
    return join(this.charactersDir, 'sprites', sanitizeFilename(parsePath(avatar).name))
  }
}

/** Minimal 1×1 transparent PNG used when no default avatar exists. */
function blankPng(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNl7BcQAAAABJRU5ErkJggg==',
    'base64',
  )
}

// ── Plugin entry ───────────────────────────────────────────────────────────

export const name = 'st-character-file'

export default StCharacterFileProvider
