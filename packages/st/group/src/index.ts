/**
 * SillyTavern group chat management service.
 *
 * Groups allow multiple characters to participate in a single conversation
 * with configurable activation strategies determining which character
 * responds next.
 *
 * @module @deepseek-ai/dsh-st-group
 */
import { Service, type Context } from '@deepseek-ai/cordis'
import { readFile, writeFile, readdir, mkdir, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'

// ── Vocabulary types ───────────────────────────────────────────────────────

export type GroupId = string & { readonly __brand: 'GroupId' }

/**
 * How the next responding character is selected.
 * Mirror of ST's `activation_strategy` numeric enum (0/1/2/3).
 */
export type ActivationStrategy = 0 | 1 | 2 | 3
// 0 = Natural order (round-robin)
// 1 = List order (sequential by member list)
// 2 = Manual (user picks)
// 3 = Pooled order (random pool)

/**
 * Group generation handling mode.
 * Mirror of ST's `generation_mode` numeric enum (0/1/2).
 */
export type GenerationMode = 0 | 1 | 2
// 0 = Swap character cards
// 1 = Join character cards (exclude muted)
// 2 = Join character cards (include muted)

/** A group member configuration (mirror of ST's member shape). */
export interface GroupMember {
  character_id: string
  enabled: boolean
  /** Weight for weighted activation (0-100). */
  weight: number
}

/** A group chat definition (mirror of ST's group JSON shape). */
export interface Group {
  id: GroupId
  name: string
  members: GroupMember[]
  avatar_url?: string
  allow_self_responses: boolean
  activation_strategy: ActivationStrategy
  generation_mode: GenerationMode
  disabled_members: string[]
  fav: boolean
  chat_id?: string
  chats: string[]
  auto_mode_delay: number
  generation_mode_join_prefix: string
  generation_mode_join_suffix: string
  create_date: string
  modify_date: string
  metadata: Record<string, unknown>
}

/** Input for creating/updating a group. */
export interface GroupInput {
  name: string
  members?: GroupMember[]
  avatar_url?: string
  activation_strategy?: ActivationStrategy
  generation_mode?: GenerationMode
  disabled_members?: string[]
  allow_self_responses?: boolean
  fav?: boolean
  chat_id?: string
  chats?: string[]
  auto_mode_delay?: number
  generation_mode_join_prefix?: string
  generation_mode_join_suffix?: string
  metadata?: Record<string, unknown>
}

// ── Service definition ─────────────────────────────────────────────────────

declare module '@deepseek-ai/cordis' {
  interface Context {
    stGroup: StGroupService
  }
}

/**
 * Group chat management service.
 *
 * Provides CRUD for multi-character groups and the activation strategy
 * engine that determines which character responds next in a group chat.
 */
export abstract class StGroupService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'stGroup')
  }

  abstract list(): Promise<Group[]>
  abstract get(id: GroupId): Promise<Group | undefined>
  abstract create(input: GroupInput): Promise<GroupId>
  abstract update(id: GroupId, input: Partial<GroupInput>): Promise<void>
  abstract delete(id: GroupId): Promise<void>
  /** Determine the next character to respond in a group, given the chat history. */
  abstract selectNextSpeaker(groupId: GroupId, lastSpeakerId?: string, chatMessages?: Array<{ name: string; is_user: boolean }>): Promise<string | undefined>
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateGroupId(): GroupId {
  return `grp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` as GroupId
}

// ── File-based provider ────────────────────────────────────────────────────

export interface FileGroupConfig { root: string }

class FileGroupProvider extends StGroupService {
  private readonly root: string
  constructor(ctx: Context, config: FileGroupConfig) {
    super(ctx)
    this.root = resolve(config.root)
  }

  private async ensureRoot(): Promise<void> {
    if (!existsSync(this.root)) await mkdir(this.root, { recursive: true })
  }

  private groupPath(id: GroupId): string {
    return join(this.root, `${id}.json`)
  }

  async list(): Promise<Group[]> {
    await this.ensureRoot()
    const files = await readdir(this.root)
    const groups: Group[] = []
    for (const f of files) {
      if (!f.endsWith('.json')) continue
      try {
        groups.push(JSON.parse(await readFile(join(this.root, f), 'utf-8')) as Group)
      } catch { /* skip */ }
    }
    return groups.sort((a, b) => {
      if (a.fav !== b.fav) return a.fav ? -1 : 1
      return b.modify_date.localeCompare(a.modify_date)
    })
  }

  async get(id: GroupId): Promise<Group | undefined> {
    const path = this.groupPath(id)
    if (!existsSync(path)) return undefined
    try { return JSON.parse(await readFile(path, 'utf-8')) as Group } catch { return undefined }
  }

  async create(input: GroupInput): Promise<GroupId> {
    await this.ensureRoot()
    const id = generateGroupId()
    const now = new Date().toISOString()
    const group: Group = {
      id,
      name: input.name,
      members: input.members ?? [],
      ...(input.avatar_url !== undefined ? { avatar_url: input.avatar_url } : {}),
      allow_self_responses: input.allow_self_responses ?? false,
      activation_strategy: input.activation_strategy ?? 0,
      generation_mode: input.generation_mode ?? 0,
      disabled_members: input.disabled_members ?? [],
      fav: input.fav ?? false,
      ...(input.chat_id !== undefined ? { chat_id: input.chat_id } : { chat_id: id }),
      chats: input.chats ?? [input.chat_id ?? id],
      auto_mode_delay: input.auto_mode_delay ?? 5,
      generation_mode_join_prefix: input.generation_mode_join_prefix ?? '',
      generation_mode_join_suffix: input.generation_mode_join_suffix ?? '',
      create_date: now,
      modify_date: now,
      metadata: input.metadata ?? {},
    }
    await writeFile(this.groupPath(id), JSON.stringify(group, null, 4), 'utf-8')
    return id
  }

  async update(id: GroupId, input: Partial<GroupInput>): Promise<void> {
    const path = this.groupPath(id)
    const group = JSON.parse(await readFile(path, 'utf-8')) as Group
    Object.assign(group, { ...input, modify_date: new Date().toISOString() })
    await writeFile(path, JSON.stringify(group, null, 4), 'utf-8')
  }

  async delete(id: GroupId): Promise<void> {
    const path = this.groupPath(id)
    if (existsSync(path)) await unlink(path)
  }

  async selectNextSpeaker(groupId: GroupId, lastSpeakerId?: string, chatMessages?: Array<{ name: string; is_user: boolean }>): Promise<string | undefined> {
    const group = await this.get(groupId)
    if (!group) return undefined
    const enabled = group.members.filter((m) => m.enabled && !group.disabled_members.includes(m.character_id))
    if (enabled.length === 0) return undefined

    switch (group.activation_strategy) {
      case 0: {
        // NATURAL: ST's activateNaturalOrder — talkativeness probability +
        // self-response control (name mention requires chat text, which this
        // service boundary does not carry; the API layer supplements).
        if (!group.allow_self_responses && lastSpeakerId !== undefined) {
          const candidates = enabled.filter((m) => m.character_id !== lastSpeakerId)
          if (candidates.length > 0) {
            return this.talkativenessPick(candidates)
          }
        }
        return this.talkativenessPick(enabled)
      }
      case 1: {
        // LIST: ST's activateListOrder returns all members in order; this
        // service returns one at a time, so cycle sequentially.
        const lastIdx = enabled.findIndex((m) => m.character_id === lastSpeakerId)
        const next = enabled[(lastIdx + 1) % enabled.length]!
        return next.character_id
      }
      case 2: {
        // MANUAL: ST randomly selects one member when not user input.
        return enabled[Math.floor(Math.random() * enabled.length)]!.character_id
      }
      case 3: {
        // POOLED: ST's activatePooledOrder — prefer members that haven't
        // spoken since the last user message. Scan chat history backward
        // from the end to find who has spoken, then pick from the rest.
        if (chatMessages !== undefined && chatMessages.length > 0) {
          const spokenSinceUser = new Set<string>()
          for (let i = chatMessages.length - 1; i >= 0; i--) {
            const msg = chatMessages[i]!
            if (msg.is_user) break
            spokenSinceUser.add(msg.name)
          }
          const haveNotSpoken = enabled.filter((m) => !spokenSinceUser.has(m.character_id))
          const pool = haveNotSpoken.length > 0 ? haveNotSpoken
            : (lastSpeakerId !== undefined && enabled.length > 1
              ? enabled.filter((m) => m.character_id !== lastSpeakerId)
              : enabled)
          return pool[Math.floor(Math.random() * pool.length)]!.character_id
        }
        // Fallback without chat history: exclude last speaker
        if (lastSpeakerId !== undefined && enabled.length > 1) {
          const others = enabled.filter((m) => m.character_id !== lastSpeakerId)
          return others[Math.floor(Math.random() * others.length)]!.character_id
        }
        return enabled[Math.floor(Math.random() * enabled.length)]!.character_id
      }
    }
  }

  /** Pick one member weighted by ST's talkativeness (0..1 → probability of activation). */
  private talkativenessPick(members: GroupMember[]): string {
    // ST: each member has a `talkativeness` chance of being activated per
    // natural-order pass; a shuffled order prevents bias toward list position.
    const shuffled = [...members].sort(() => Math.random() - 0.5)
    for (const m of shuffled) {
      // Default talkativeness 0.5 in ST; members without explicit weight get 50% chance.
      const chance = m.weight > 0 ? m.weight / (m.weight + 1) : 0.5
      if (Math.random() < chance) return m.character_id
    }
    // Fallback: if nobody passed the roll, return the first shuffled member.
    return shuffled[0]!.character_id
  }
}

// ── Plugin entry ───────────────────────────────────────────────────────────

export const name = 'st-group-file'

export interface Config extends FileGroupConfig {}

export default FileGroupProvider
