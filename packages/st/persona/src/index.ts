/**
 * SillyTavern persona library — a port of ST's `personas/` directory.
 *
 * One persona per `<name>.json` file, byte-compatible with SillyTavern's
 * storage, so a checkout's `personas/` directory works unmodified. The
 * active persona is client state (ST binds it per chat through
 * `chat_metadata`; the port carries it in the settings snapshot), so this
 * service is pure storage: list, upsert, delete.
 *
 * @module @deepseek-ai/dsh-st-persona
 */
import { Service, type Context } from '@deepseek-ai/cordis'
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'

/** One named user persona as SillyTavern persists it in `personas/<name>.json`. */
/** Persona description position (ST's persona_description_position). */
export type PersonaPosition = 0 | 2 | 3 | 4 | 9
// 0 = In Story String / Prompt Manager
// 2 = Top of Author's Note
// 3 = Bottom of Author's Note
// 4 = In-chat @ Depth
// 9 = None (disabled)

/** Persona depth role (ST's persona_depth_role). */
export type PersonaDepthRole = 0 | 1 | 2
// 0 = System
// 1 = User
// 2 = Assistant

export interface StPersona {
  /** File name sans extension; also the persona's id. */
  filename: string
  /** Display name substituted for {{user}} when the persona is active. */
  name: string
  /** Persona description injected as persona_description. */
  description: string
  /** Avatar image path (ST's user_avatar). */
  avatar?: string
  /** Description position (ST's persona_description_position). */
  position?: PersonaPosition
  /** Depth value when position = 4 (In-chat @ Depth). */
  depth?: number
  /** Role when position = 4 (ST's persona_depth_role). */
  depth_role?: PersonaDepthRole
  /** Whether this is the default persona for new chats (ST's default_persona). */
  is_default?: boolean
  /** Locked to character avatar (ST's lock_persona_to_char). */
  lock_to_char?: string
  /** Locked to chat id (ST's lock_user_name). */
  lock_to_chat?: string
}

/** Personas are named by file; strip the extension and path separators. */
function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim()
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    stPersona: StPersonaService
  }
}

/** Persona library storage: one JSON per file under `personas/`. */
export abstract class StPersonaService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'stPersona')
  }

  /** List all personas sorted by file name. */
  abstract list(): Promise<StPersona[]>

  /** Create or overwrite one persona; `filename` decides which file. */
  abstract save(persona: StPersona): Promise<StPersona>

  /** Delete one persona file; missing files are an error. */
  abstract delete(filename: string): Promise<void>
}

// ── File provider ──────────────────────────────────────────────────────────

export interface Config {
  /** SillyTavern data root (the directory containing `personas/`). */
  dataRoot: string
}

class StPersonaFileProvider extends StPersonaService {
  static inject = []

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx)
  }

  private get dir(): string {
    return resolve(this.config.dataRoot, 'personas')
  }

  async list(): Promise<StPersona[]> {
    if (!existsSync(this.dir)) return []
    const files = (await readdir(this.dir)).filter((f) => f.endsWith('.json')).sort()
    const personas: StPersona[] = []
    for (const file of files) {
      try {
        const raw = JSON.parse(await readFile(join(this.dir, file), 'utf8')) as Partial<StPersona>
        personas.push({
          filename: file.slice(0, -'.json'.length),
          name: typeof raw.name === 'string' ? raw.name : file,
          description: typeof raw.description === 'string' ? raw.description : '',
          ...(raw.avatar !== undefined ? { avatar: String(raw.avatar) } : {}),
          ...(raw.position !== undefined ? { position: raw.position } : {}),
          ...(raw.depth !== undefined ? { depth: Number(raw.depth) } : {}),
          ...(raw.depth_role !== undefined ? { depth_role: raw.depth_role } : {}),
          ...(raw.is_default !== undefined ? { is_default: !!raw.is_default } : {}),
          ...(raw.lock_to_char !== undefined ? { lock_to_char: String(raw.lock_to_char) } : {}),
          ...(raw.lock_to_chat !== undefined ? { lock_to_chat: String(raw.lock_to_chat) } : {}),
        })
      } catch {
        // A malformed persona file is one unreadable entry, not a broken
        // library: ST toasts per file and keeps the list alive.
      }
    }
    return personas
  }

  async save(persona: StPersona): Promise<StPersona> {
    const filename = sanitizeFilename(persona.filename)
    if (filename.length === 0) throw new Error('persona filename is empty')
    const disk: Record<string, unknown> = {
      name: persona.name,
      description: persona.description,
    }
    // Persist all optional ST persona fields when present
    if (persona.avatar !== undefined) disk.avatar = persona.avatar
    if (persona.position !== undefined) disk.position = persona.position
    if (persona.depth !== undefined) disk.depth = persona.depth
    if (persona.depth_role !== undefined) disk.depth_role = persona.depth_role
    if (persona.is_default !== undefined) disk.is_default = persona.is_default
    if (persona.lock_to_char !== undefined) disk.lock_to_char = persona.lock_to_char
    if (persona.lock_to_chat !== undefined) disk.lock_to_chat = persona.lock_to_chat
    await mkdir(this.dir, { recursive: true })
    await writeFile(join(this.dir, `${filename}.json`), JSON.stringify(disk, null, 4))
    return { ...persona, filename }
  }

  async delete(filename: string): Promise<void> {
    const path = join(this.dir, `${sanitizeFilename(filename)}.json`)
    if (!existsSync(path)) throw new Error(`persona ${filename} not found`)
    await unlink(path)
  }
}

// ── Plugin entry ───────────────────────────────────────────────────────────

export const name = 'st-persona-file'

export default StPersonaFileProvider
