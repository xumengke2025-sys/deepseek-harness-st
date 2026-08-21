/**
 * SillyTavern HTTP API: exposes the st character/chat/lorebook/generate
 * services over the DSH webServer under `/api/st/...`.
 *
 * Route names mirror SillyTavern's own REST surface (`characters/all`,
 * `chats/save`, `worldinfo/get`, ...) so the React client is a straight port
 * of ST's request flow. Reply generation streams over SSE, ST's native
 * streaming transport.
 *
 * @module @deepseek-ai/dsh-st-api
 */
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
// Type-only imports pull each service's Context declaration merging into scope.
import type { StChatMessage } from '@deepseek-ai/dsh-st-chat'
import type { GroupId, GroupInput } from '@deepseek-ai/dsh-st-group'
import type { WorldInfoFile, TimedStateRecord, WorldInfoScanOptions } from '@deepseek-ai/dsh-st-lorebook'
import { scanWorldInfo, bookFromCharacterBook } from '@deepseek-ai/dsh-st-lorebook'
import type { VectorSearchOptions } from '@deepseek-ai/dsh-st-vector'
import { applyRegexScripts, type RegexScript } from '@deepseek-ai/dsh-st-regex'
import type { StPersona } from '@deepseek-ai/dsh-st-persona'
import type { StInstruct } from '@deepseek-ai/dsh-st-instruct'
import { validateApiConfig, API_SOURCES, type StApiSource } from '@deepseek-ai/dsh-st-api-config'
import type {} from '@deepseek-ai/dsh-st-api-config'
import type {} from '@deepseek-ai/dsh-st-character'
import type {} from '@deepseek-ai/dsh-st-lorebook'
import type {} from '@deepseek-ai/dsh-st-vector'
import type { PresetId } from '@deepseek-ai/dsh-st-preset'
import type { ContextTemplate, InstructTemplate, PromptEntry, WorldInfoBlock } from '@deepseek-ai/dsh-st-generate'
import { DEFAULT_IMPERSONATION_PROMPT, DEFAULT_CONTINUE_NUDGE_PROMPT } from '@deepseek-ai/dsh-st-generate'
import type {} from '@deepseek-ai/dsh-st-generate'
import type {} from '@deepseek-ai/dsh-host-webserver'

/** Plugin config. */
export interface Config {
  /** Route prefix; every endpoint lives under `<prefix>/...`. */
  routePrefix: string
  /** Deployment-wide max context tokens for generation; a positive integer or absent for no trimming. Body/preset/api-config values override it. */
  defaultMaxContextTokens?: number
}

export const name = 'st-api'
export const inject = ['webServer', 'llm', 'stCharacter', 'stChat', 'stGroup', 'stInstruct', 'stLorebook', 'stPersona', 'stRegex', 'stPreset', 'stGenerate', 'stVector', 'stApiConfig']

/** Read and parse one JSON request body. */
function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text.length === 0 ? {} : JSON.parse(text) as Record<string, unknown>)
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

/** Send a JSON response. */
function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  })
  res.end(payload)
}

/** Optional vector-search fields: only pass through present numbers. */
function searchOptions(body: Record<string, unknown>): VectorSearchOptions {
  const opts: VectorSearchOptions = {}
  if (typeof body.threshold === 'number') opts.threshold = body.threshold
  if (typeof body.topK === 'number') opts.topK = body.topK
  return opts
}

interface RouteTable {
  [pattern: string]: (ctx: Context, req: IncomingMessage, res: ServerResponse, params: URLSearchParams) => Promise<void>
}

/** Cross-scan WI sticky/cooldown tracking, keyed `<world>#<uid>`; cooldown counts from deactivation. */
const wiTimedState = new Map<string, TimedStateRecord>()

/** Config captured at apply time; the generate route reads deployment defaults from it. */
let activeConfig: Config | undefined

/** Every ST endpoint; keyed `<METHOD> <subpath>` with subpath relative to the prefix. */
const routes: RouteTable = {
  // ── characters ──
  'POST characters/all': async (ctx, _req, res) => {
    sendJson(res, 200, await ctx.stCharacter.list())
  },
  'POST characters/get': async (ctx, req, res) => {
    const body = await readJson(req)
    const avatar = String(body.avatar ?? '')
    const full = await ctx.stCharacter.get(avatar)
    full === undefined ? sendJson(res, 404, { error: 'not found' }) : sendJson(res, 200, full)
  },
  'POST characters/create': async (ctx, req, res) => {
    sendJson(res, 200, { avatar: await ctx.stCharacter.create(await readJson(req) as never) })
  },
  'POST characters/import-png': async (ctx, req, res) => {
    const body = await readJson(req)
    const dataUrl = String(body.dataUrl ?? '')
    try {
      sendJson(res, 200, { avatar: await ctx.stCharacter.importPng(dataUrl) })
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message })
    }
  },
  'POST characters/edit': async (ctx, req, res) => {
    const body = await readJson(req)
    await ctx.stCharacter.edit(String(body.avatar ?? ''), body as never)
    sendJson(res, 200, { ok: true })
  },
  'POST characters/rename': async (ctx, req, res) => {
    const body = await readJson(req)
    sendJson(res, 200, { avatar: await ctx.stCharacter.rename(String(body.avatar ?? ''), String(body.newName ?? '')) })
  },
  'POST characters/delete': async (ctx, req, res) => {
    const body = await readJson(req)
    await ctx.stCharacter.delete(String(body.avatar ?? ''))
    sendJson(res, 200, { ok: true })
  },
  'POST characters/fav': async (ctx, req, res) => {
    const body = await readJson(req)
    await ctx.stCharacter.setFavourite(String(body.avatar ?? ''), body.fav === true)
    sendJson(res, 200, { ok: true })
  },
  'POST characters/export': async (ctx, req, res) => {
    const body = await readJson(req)
    const avatar = String(body.avatar ?? '')
    const full = await ctx.stCharacter.get(avatar)
    full === undefined
      ? sendJson(res, 404, { error: 'not found' })
      : sendJson(res, 200, { png: await ctx.stCharacter.exportPng(avatar) })
  },
  'GET avatar': async (ctx, _req, res, params) => {
    const avatar = params.get('name') ?? ''
    const bytes = await ctx.stCharacter.avatarBytes(avatar)
    bytes === undefined
      ? sendJson(res, 404, { error: 'not found' })
      : (res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' }), void res.end(bytes))
  },
  'POST characters/sprites': async (ctx, req, res) => {
    const body = await readJson(req)
    sendJson(res, 200, await ctx.stCharacter.listSprites(String(body.avatar ?? '')))
  },
  'GET sprite': async (ctx, _req, res, params) => {
    const bytes = await ctx.stCharacter.spriteBytes(params.get('avatar') ?? '', params.get('expr') ?? '')
    bytes === undefined
      ? sendJson(res, 404, { error: 'not found' })
      : (res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' }), void res.end(bytes))
  },

  // ── chats ──
  'POST chats/list': async (ctx, req, res) => {
    const body = await readJson(req)
    sendJson(res, 200, await ctx.stChat.list(String(body.avatar ?? '')))
  },
  'POST chats/get': async (ctx, req, res) => {
    const body = await readJson(req)
    const chat = await ctx.stChat.get(String(body.avatar ?? ''), String(body.chatId ?? ''))
    chat === undefined ? sendJson(res, 404, { error: 'not found' }) : sendJson(res, 200, chat)
  },
  'POST chats/create': async (ctx, req, res) => {
    const body = await readJson(req)
    const chatId = await ctx.stChat.create(
      String(body.avatar ?? ''),
      String(body.userName ?? 'User'),
      String(body.characterName ?? ''),
      typeof body.firstMessage === 'string' ? body.firstMessage : undefined,
    )
    sendJson(res, 200, { chatId })
  },
  'POST chats/search': async (ctx, req, res) => {
    const body = await readJson(req)
    const query = String(body.query ?? '')
    if (query.length === 0) {
      sendJson(res, 400, { error: 'query is required' })
      return
    }
    const hits = await ctx.stChat.search(query)
    sendJson(res, 200, { hits })
  },
  'POST chats/save': async (ctx, req, res) => {
    const body = await readJson(req)
    await ctx.stChat.save(String(body.avatar ?? ''), String(body.chatId ?? ''), body.chat as never)
    sendJson(res, 200, { ok: true })
  },
  'POST chats/delete': async (ctx, req, res) => {
    const body = await readJson(req)
    await ctx.stChat.delete(String(body.avatar ?? ''), String(body.chatId ?? ''))
    sendJson(res, 200, { ok: true })
  },
  'POST chats/export': async (ctx, req, res) => {
    const body = await readJson(req)
    const jsonl = await ctx.stChat.exportChat(String(body.avatar ?? ''), String(body.chatId ?? ''))
    if (jsonl === undefined) {
      sendJson(res, 404, { error: 'not found' })
      return
    }
    // ST's format=text: plain text export as "name: message\n\n",
    // skipping is_system rows. Default format is jsonl (raw passthrough).
    if (body.format === 'text') {
      const lines = jsonl.split('\n').filter((l) => l.trim().length > 0)
      const messages = lines.slice(1) // skip header line
        .map((line) => {
          try { return JSON.parse(line) as Record<string, unknown> } catch { return null }
        })
        .filter((m): m is Record<string, unknown> => m !== null)
        .filter((m) => !m.is_system)
      const text = messages
        .map((m) => `${String(m.name ?? 'Unknown')}: ${String(m.mes ?? '')}`)
        .join('\n\n')
      sendJson(res, 200, { text })
      return
    }
    sendJson(res, 200, { jsonl })
  },
  'POST chats/import': async (ctx, req, res) => {
    const body = await readJson(req)
    sendJson(res, 200, { chatId: await ctx.stChat.importChat(String(body.avatar ?? ''), String(body.jsonl ?? '')) })
  },
  'POST chats/checkpoint': async (ctx, req, res) => {
    const body = await readJson(req)
    // A branch point past the last message is a mis-typed index, not a clamp:
    // the client's rows index the stored chat, so a stale count fails loud.
    const upto = body.upto === undefined ? undefined : typeof body.upto === 'number' && Number.isInteger(body.upto) && body.upto >= 0
      ? body.upto
      : -1
    const chat = await ctx.stChat.get(String(body.avatar ?? ''), String(body.chatId ?? ''))
    if (chat === undefined) {
      sendJson(res, 404, { error: 'chat not found' })
      return
    }
    if (upto === -1 || (upto !== undefined && upto >= chat.messages.length)) {
      sendJson(res, 400, { error: 'upto must be a non-negative integer index into the chat messages' })
      return
    }
    sendJson(res, 200, { chatId: await ctx.stChat.checkpoint(String(body.avatar ?? ''), String(body.chatId ?? ''), upto) })
  },

  // ── groups ──
  'POST groups/list': async (ctx, _req, res) => {
    sendJson(res, 200, await ctx.stGroup.list())
  },
  'POST groups/get': async (ctx, req, res) => {
    const body = await readJson(req)
    const group = await ctx.stGroup.get(String(body.id ?? '') as GroupId)
    group === undefined ? sendJson(res, 404, { error: 'not found' }) : sendJson(res, 200, group)
  },
  'POST groups/create': async (ctx, req, res) => {
    const body = await readJson(req)
    if (typeof body.name !== 'string' || body.name.length === 0) {
      sendJson(res, 400, { error: 'name is required' })
      return
    }
    const members = Array.isArray(body.members) ? body.members as GroupInput['members'] : undefined
    const input: GroupInput = { name: body.name, ...(members === undefined ? {} : { members }) }
    sendJson(res, 200, { id: await ctx.stGroup.create(input) })
  },
  'POST groups/update': async (ctx, req, res) => {
    const body = await readJson(req)
    const input = body.input as Record<string, unknown> | undefined
    if (input === undefined || typeof input !== 'object') {
      sendJson(res, 400, { error: 'input (the group fields object) is required' })
      return
    }
    await ctx.stGroup.update(String(body.id ?? '') as GroupId, input as Partial<GroupInput>)
    sendJson(res, 200, { ok: true })
  },
  'POST groups/delete': async (ctx, req, res) => {
    const body = await readJson(req)
    await ctx.stGroup.delete(String(body.id ?? '') as GroupId)
    sendJson(res, 200, { ok: true })
  },
  'POST groups/next-speaker': async (ctx, req, res) => {
    const body = await readJson(req)
    const lastSpeakerId = typeof body.lastSpeakerId === 'string' ? body.lastSpeakerId : undefined
    // Load chat messages for POOLED strategy's "haven't spoken" tracking
    let chatMessages: Array<{ name: string; is_user: boolean }> | undefined
    if (typeof body.avatar === 'string' && typeof body.chatId === 'string') {
      const chat = await ctx.stChat.get(body.avatar, body.chatId)
      if (chat !== undefined) {
        chatMessages = chat.messages.map((m) => ({ name: m.name, is_user: m.is_user }))
      }
    }
    const character_id = await ctx.stGroup.selectNextSpeaker(String(body.id ?? '') as GroupId, lastSpeakerId, chatMessages)
    sendJson(res, 200, { character_id: character_id ?? null })
  },

  // ── worldinfo ──
  'POST worldinfo/list': async (ctx, _req, res) => {
    sendJson(res, 200, await ctx.stLorebook.list())
  },
  'POST worldinfo/get': async (ctx, req, res) => {
    const body = await readJson(req)
    sendJson(res, 200, await ctx.stLorebook.getOrDummy(String(body.name ?? '')))
  },
  'POST worldinfo/save': async (ctx, req, res) => {
    const body = await readJson(req)
    if (body.file === undefined || body.file === null || typeof body.file !== 'object') {
      sendJson(res, 400, { error: 'file (the World Info book object) is required' })
      return
    }
    await ctx.stLorebook.save(String(body.name ?? ''), body.file as never)
    sendJson(res, 200, { ok: true })
  },
  'POST worldinfo/delete': async (ctx, req, res) => {
    const body = await readJson(req)
    await ctx.stLorebook.delete(String(body.name ?? ''))
    sendJson(res, 200, { ok: true })
  },
  
  // ── vector (Vector Storage / Data Bank) ──
  'POST vector/index-world': async (ctx, req, res) => {
    const body = await readJson(req)
    const name = String(body.name ?? '')
    const file = await ctx.stLorebook.getOrDummy(name)
    sendJson(res, 200, { indexed: await ctx.stVector.indexWorld(name, file) })
  },
  'POST vector/forget-world': async (ctx, req, res) => {
    const body = await readJson(req)
    await ctx.stVector.forgetWorld(String(body.name ?? ''))
    sendJson(res, 200, { ok: true })
  },
  'POST vector/search': async (ctx, req, res) => {
    const body = await readJson(req)
    const query = String(body.query ?? '')
    if (query.length === 0) {
      sendJson(res, 400, { error: 'query is required' })
      return
    }
    sendJson(res, 200, await ctx.stVector.searchWorld(query, searchOptions(body)))
  },
  'POST vector/file/list': async (ctx, _req, res) => {
    sendJson(res, 200, { files: await ctx.stVector.listFiles() })
  },
  'POST vector/file/index': async (ctx, req, res) => {
    const body = await readJson(req)
    const name = String(body.name ?? '')
    const text = typeof body.text === 'string' ? body.text : ''
    if (name.length === 0 || text.trim().length === 0) {
      sendJson(res, 400, { error: 'name and text are required' })
      return
    }
    sendJson(res, 200, { chunks: await ctx.stVector.indexFile(name, text) })
  },
  'POST vector/file/delete': async (ctx, req, res) => {
    const body = await readJson(req)
    await ctx.stVector.forgetFile(String(body.name ?? ''))
    sendJson(res, 200, { ok: true })
  },
  'POST vector/file/search': async (ctx, req, res) => {
    const body = await readJson(req)
    const query = String(body.query ?? '')
    if (query.length === 0) {
      sendJson(res, 400, { error: 'query is required' })
      return
    }
    sendJson(res, 200, await ctx.stVector.searchFiles(query, searchOptions(body)))
  },

  // ── regex ──
  'POST regex/list': async (ctx, _req, res) => {
    sendJson(res, 200, await ctx.stRegex.list())
  },
  'POST regex/save': async (ctx, req, res) => {
    const body = await readJson(req)
    const script = body.script as Partial<RegexScript> | undefined
    if (script === undefined || typeof script !== 'object' || typeof script.findRegex !== 'string') {
      sendJson(res, 400, { error: 'script (the regex script object) with findRegex is required' })
      return
    }
    const scripts = await ctx.stRegex.list()
    // ST's saveRegex upserts by id and stamps a fresh one for new scripts
    const id = typeof script.id === 'string' && script.id.length > 0 ? script.id : String(scripts.length + 1)
    const next: RegexScript = { ...script, id } as RegexScript
    const at = scripts.findIndex((s) => s.id === id)
    if (at >= 0) scripts.splice(at, 1, next)
    else scripts.push(next)
    await ctx.stRegex.save(scripts)
    sendJson(res, 200, next)
  },
  'POST regex/delete': async (ctx, req, res) => {
    const body = await readJson(req)
    const id = String(body.id ?? '')
    const scripts = await ctx.stRegex.list()
    const next = scripts.filter((s) => s.id !== id)
    if (next.length === scripts.length) {
      sendJson(res, 404, { error: 'not found' })
      return
    }
    await ctx.stRegex.save(next)
    sendJson(res, 200, { ok: true })
  },

  // ── persona library (ST's personas/ directory) ──

'POST personas/list': async (ctx, _req, res) => {
    sendJson(res, 200, await ctx.stPersona.list())
  },
  'POST personas/save': async (ctx, req, res) => {
    const body = await readJson(req)
    const persona = body.persona as Partial<StPersona> | undefined
    if (persona === undefined || typeof persona !== 'object'
      || typeof persona.filename !== 'string' || persona.filename.length === 0
      || typeof persona.name !== 'string') {
      sendJson(res, 400, { error: 'persona (with filename and name) is required' })
      return
    }
    try {
      sendJson(res, 200, await ctx.stPersona.save({
        filename: persona.filename,
        name: persona.name,
        description: typeof persona.description === 'string' ? persona.description : '',
      }))
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message })
    }
  },
  'POST personas/delete': async (ctx, req, res) => {
    const body = await readJson(req)
    try {
      await ctx.stPersona.delete(String(body.filename ?? ''))
      sendJson(res, 200, { ok: true })
    } catch (error) {
      sendJson(res, 404, { error: (error as Error).message })
    }
  },

  // ── instruct template library (ST's instructs/ directory) ──

  'POST instructs/list': async (ctx, _req, res) => {
    sendJson(res, 200, await ctx.stInstruct.list())
  },
  'POST instructs/save': async (ctx, req, res) => {
    const body = await readJson(req)
    const instruct = body.instruct as Partial<StInstruct> | undefined
    if (instruct === undefined || typeof instruct !== 'object'
      || typeof instruct.filename !== 'string' || instruct.filename.length === 0
      || typeof instruct.name !== 'string'
      || instruct.template === undefined || typeof instruct.template !== 'object') {
      sendJson(res, 400, { error: 'instruct (with filename, name, and template) is required' })
      return
    }
    try {
      sendJson(res, 200, await ctx.stInstruct.save(instruct as StInstruct))
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message })
    }
  },
  'POST instructs/delete': async (ctx, req, res) => {
    const body = await readJson(req)
    try {
      await ctx.stInstruct.delete(String(body.filename ?? ''))
      sendJson(res, 200, { ok: true })
    } catch (error) {
      sendJson(res, 404, { error: (error as Error).message })
    }
  },

  // ── generation ──
  'GET models': async (ctx, _req, res) => {
    sendJson(res, 200, await ctx.stGenerate.availableModels())
  },

  // ── api-config ──
  'POST api-config/get': async (ctx, _req, res) => {
    sendJson(res, 200, await ctx.stApiConfig.get())
  },
  'POST api-config/save': async (ctx, req, res) => {
    const body = await readJson(req)
    const config = (body as Record<string, unknown>).config
    await ctx.stApiConfig.save(validateApiConfig(config))
    sendJson(res, 200, { ok: true })
  },
  'POST api-config/models': async (ctx, req, res) => {
    const body = await readJson(req)
    const source = String(body.source ?? '')
    if (!API_SOURCES.includes(source as StApiSource)) {
      sendJson(res, 400, { error: `api-config.source: must be one of ${API_SOURCES.join(', ')}` })
      return
    }
    sendJson(res, 200, await ctx.stApiConfig.listModels(source as StApiSource))
  },
  // Registered llm provider routes: the custom source's provider picker.
  'POST api-config/providers': async (ctx, _req, res) => {
    sendJson(res, 200, ctx.llm.listProviders().map((p) => ({ id: p.id, name: p.name })))
  },

  // ── presets ──
'POST presets/list': async (ctx, _req, res) => {
    sendJson(res, 200, await ctx.stPreset.list())
  },
'POST presets/get': async (ctx, req, res) => {
    const body = await readJson(req)
    const preset = await ctx.stPreset.get(String(body.id ?? '') as PresetId)
    preset === undefined ? sendJson(res, 404, { error: 'not found' }) : sendJson(res, 200, preset)
  },
'POST presets/create': async (ctx, req, res) => {
    const body = await readJson(req)
    sendJson(res, 200, { id: await ctx.stPreset.create(body as never) })
  },
'POST presets/update': async (ctx, req, res) => {
    const body = await readJson(req)
    const input = body.input as Record<string, unknown> | undefined
    if (input === undefined || typeof input !== 'object') {
      sendJson(res, 400, { error: 'input (the preset fields object) is required' })
      return
    }
    await ctx.stPreset.update(String(body.id ?? '') as PresetId, input as never)
    sendJson(res, 200, { ok: true })
  },
'POST presets/delete': async (ctx, req, res) => {
    const body = await readJson(req)
    await ctx.stPreset.delete(String(body.id ?? '') as PresetId)
    sendJson(res, 200, { ok: true })
  },
'POST presets/duplicate': async (ctx, req, res) => {
    const body = await readJson(req)
    sendJson(res, 200, { id: await ctx.stPreset.duplicate(String(body.id ?? '') as PresetId) })
  },
'POST presets/import': async (ctx, req, res) => {
    const body = await readJson(req)
    sendJson(res, 200, { id: await ctx.stPreset.importJson(String(body.json ?? '')) })
  },
'POST presets/export': async (ctx, req, res) => {
    const body = await readJson(req)
    sendJson(res, 200, { json: await ctx.stPreset.exportJson(String(body.id ?? '') as PresetId) })
  },
  'POST generate': async (ctx, req, res) => {
    const body = await readJson(req)
    const avatar = String(body.avatar ?? '')
    const chatId = String(body.chatId ?? '')
    // ST activates several books at once: `world` accepts one name or an array
    const worldNames = Array.isArray(body.world)
      ? body.world.map(String).filter((w: string) => w.length > 0)
      : typeof body.world === 'string' && body.world.length > 0 ? [body.world] : []
    const model = typeof body.model === 'string' ? body.model : undefined
    const historyLimit = typeof body.historyLimit === 'number' && body.historyLimit > 0
      ? Math.floor(body.historyLimit)
      : undefined
    // The client persona name wins over the chat header: settings changes
    // must reach {{user}} substitution in already-open chats, as in SillyTavern.
    const userNameOverride = typeof body.userName === 'string' && body.userName.length > 0
      ? body.userName
      : undefined
    // ST's persona_description travels the same path as the name: the client's
    // settings own it, so an explicit body field overrides nothing on disk.
    const personaDescription = typeof body.persona === 'string' && body.persona.length > 0
      ? body.persona
      : undefined
    // The context-template story string likewise travels with the client's
    // settings; a non-empty string activates template-driven block assembly.
    const contextTemplate: ContextTemplate | undefined = typeof body.storyString === 'string' && body.storyString.length > 0
      ? { storyString: body.storyString }
      : undefined
    // The active instruct template names its library file; the server owns
    // the template bodies, so a stale id fails loud instead of generating
    // unwrapped.
    let instructTemplate: InstructTemplate | undefined
    if (typeof body.instructId === 'string' && body.instructId.length > 0) {
      const found = (await ctx.stInstruct.list()).find((t) => t.filename === body.instructId)
      if (found === undefined) {
        sendJson(res, 404, { error: 'instruct not found' })
        return
      }
      instructTemplate = found.template
    }
    // Swipe/regeneration sends its own trimmed history: the swiped message must
    // not reach the model, so an explicit array overrides the stored chat.
    const override = Array.isArray(body.messages) ? body.messages as StChatMessage[] : undefined
    // body.signal cannot survive JSON serialization, so the disconnect
    // controller (below) is the request's abort source.
    let sendIfEmpty = typeof body.sendIfEmpty === 'string' && body.sendIfEmpty.length > 0 ? body.sendIfEmpty : undefined
    // ST's impersonation/continue control prompts: an explicit body text
    // wins, then the preset's extensions block (filled below), then ST's stock
    // text.
    let impersonationPrompt: string | undefined
    if (body.impersonate === true) {
      impersonationPrompt = typeof body.impersonationPrompt === 'string' && body.impersonationPrompt.length > 0
        ? body.impersonationPrompt
        : undefined
    }
    let continueNudgePrompt: string | undefined
    if (body.continueGeneration === true) {
      continueNudgePrompt = typeof body.continueNudgePrompt === 'string' && body.continueNudgePrompt.length > 0
        ? body.continueNudgePrompt
        : undefined
    }

    // Group generation: the chat lives under the group id while the replying
    // member's card drives the prompt; the other members arrive as context.
    const replyAs = typeof body.replyAs === 'string' && body.replyAs.length > 0 ? body.replyAs : undefined
    let cardAvatar = avatar
    let groupContext: string | undefined
    if (body.group === true) {
      const group = await ctx.stGroup.get(avatar as GroupId)
      if (group === undefined) {
        sendJson(res, 404, { error: 'group not found' })
        return
      }
      const member = replyAs !== undefined ? group.members.find((m) => m.character_id === replyAs) : undefined
      if (member === undefined || !member.enabled) {
        sendJson(res, 400, { error: 'replyAs must name an enabled member of the group' })
        return
      }
      cardAvatar = member.character_id
      const others: string[] = []
      const otherNames: string[] = []
      for (const other of group.members.filter((m) => m.enabled && m.character_id !== member.character_id)) {
        const card = await ctx.stCharacter.get(other.character_id)
        if (card === undefined) continue
        otherNames.push(card.name)
        const intro = card.card.data.description.trim()
        others.push(intro.length > 0 ? `${card.name}: ${intro.slice(0, 200)}` : card.name)
      }
      groupContext = [
        `[This is a group conversation between {{char}}, ${otherNames.join(', ')}, and the user.`,
        'Write only {{char}}\'s next reply; never speak for the other members or the user.',
        'Other members:',
        ...others,
        ']',
      ].join('\n')
    }

    const full = await ctx.stCharacter.get(cardAvatar)
    const chat = await ctx.stChat.get(avatar, chatId)
    if (!full || !chat) {
      sendJson(res, 404, { error: 'character or chat not found' })
      return
    }

    // The active chat-completion preset carries the sampling parameters and
    // the main/jailbreak prompt blocks; ST keys them the same way. It loads
    // before the world-info scan because the scan's token budget derives from
    // the resolved max context, which the preset may carry.
    let temperature: number | undefined
    let maxTokens: number | undefined
    let topP: number | undefined
    let topK: number | undefined
    let minP: number | undefined
    let frequencyPenalty: number | undefined
    let presencePenalty: number | undefined
    let repetitionPenalty: number | undefined
    let seed: number | undefined
    let stopSequences: string[] | undefined
    let systemPromptOverride: string | undefined
    let postHistoryOverride: string | undefined
    let promptEntries: PromptEntry[] | undefined
    if (typeof body.presetId === 'string' && body.presetId.length > 0) {
      const preset = await ctx.stPreset.get(body.presetId as PresetId)
      if (preset === undefined) {
        sendJson(res, 404, { error: 'preset not found' })
        return
      }
      if (preset.generation.temp > 0) temperature = preset.generation.temp
      if (preset.generation.max_tokens > 0) maxTokens = preset.generation.max_tokens
      if (preset.generation.top_p > 0) topP = preset.generation.top_p
      if (preset.generation.top_k > 0) topK = preset.generation.top_k
      if (preset.generation.min_p > 0) minP = preset.generation.min_p
      if (preset.generation.frequency_penalty !== 0) frequencyPenalty = preset.generation.frequency_penalty
      if (preset.generation.presence_penalty !== 0) presencePenalty = preset.generation.presence_penalty
      if (preset.generation.repetition_penalty !== 1) repetitionPenalty = preset.generation.repetition_penalty
      if (preset.generation.seed !== 0) seed = preset.generation.seed
      if (preset.generation.stop_sequences.length > 0) stopSequences = preset.generation.stop_sequences
      systemPromptOverride = preset.mainPrompt.length > 0 ? preset.mainPrompt : undefined
      postHistoryOverride = preset.jailbreakPrompt.length > 0 ? preset.jailbreakPrompt : undefined
      // Enabled prompt-manager rows take over the system and post-history
      // slots (ST's prompt_order); an entry list with no enabled rows leaves
      // the legacy main/jailbreak fields in charge.
      const enabled = preset.promptOrder.entries
        .filter((e) => e.enabled && e.content.trim().length > 0)
      if (enabled.length > 0) {
        promptEntries = enabled.map((e) => ({
          name: e.name,
          role: e.role,
          content: e.content,
          ...(e.depth === undefined ? {} : { depth: e.depth }),
        }))
      }
      // ST's send_if_empty: user nudge text when the last history row is
      // assistant (continue / regenerate). Stored in the preset's extensions
      // block; the client may override via body.sendIfEmpty.
      if (sendIfEmpty === undefined) {
        const ext = preset.extensions as Record<string, unknown> | undefined
        if (typeof ext?.send_if_empty === 'string' && ext.send_if_empty.length > 0) {
          sendIfEmpty = ext.send_if_empty
        }
      }
      // ST stores impersonation_prompt / continue_nudge_prompt in the same
      // extensions block; the stock texts fill any remaining gap.
      const ext = preset.extensions as Record<string, unknown> | undefined
      if (impersonationPrompt === undefined
        && typeof ext?.impersonation_prompt === 'string' && ext.impersonation_prompt.length > 0) {
        impersonationPrompt = ext.impersonation_prompt
      }
      if (continueNudgePrompt === undefined
        && typeof ext?.continue_nudge_prompt === 'string' && ext.continue_nudge_prompt.length > 0) {
        continueNudgePrompt = ext.continue_nudge_prompt
      }
    }
    // ST's stock texts are the last-resort defaults for both prompts; the
    // fields stay undefined for ordinary generations, marking the mode by
    // presence (st-generate keys on it).
    if (body.impersonate === true && impersonationPrompt === undefined) {
      impersonationPrompt = DEFAULT_IMPERSONATION_PROMPT
    }
    if (body.continueGeneration === true && continueNudgePrompt === undefined) {
      continueNudgePrompt = DEFAULT_CONTINUE_NUDGE_PROMPT
    }

    // Max context tokens: the client's explicit body field wins, then the
    // preset's extensions.max_context, then the active API source's context
    // size (ST's openai_max_context on the connection settings), then the
    // deployment config. Unresolved means no context trimming at all.
    let maxContextTokens = typeof body.maxContextTokens === 'number' && body.maxContextTokens > 0
      ? Math.floor(body.maxContextTokens)
      : undefined
    if (maxContextTokens === undefined && typeof body.presetId === 'string' && body.presetId.length > 0) {
      const preset = await ctx.stPreset.get(body.presetId as PresetId)
      const presetMax = (preset?.extensions as Record<string, unknown> | undefined)?.max_context
      if (typeof presetMax === 'number' && presetMax > 0) maxContextTokens = Math.floor(presetMax)
    }
    if (maxContextTokens === undefined) {
      const cfg = await ctx.stApiConfig.get()
      const sourceGroup = (cfg as unknown as Record<string, Record<string, unknown>>)[cfg.source]
      const sourceContext = typeof sourceGroup?.contextSize === 'number' && sourceGroup.contextSize > 0
        ? sourceGroup.contextSize
        : undefined
      maxContextTokens = sourceContext === undefined ? activeConfig?.defaultMaxContextTokens : Math.floor(sourceContext)
    }

    // World-info global scan settings, ST's world_info_* settings; absent
    // fields keep the scan engine's defaults. The token budget is a percent
    // of the resolved max context (ST's world_info_budget, default 25).
    const wiBudgetPercent = typeof body.worldInfoBudget === 'number' && body.worldInfoBudget >= 0 && body.worldInfoBudget <= 100
      ? body.worldInfoBudget
      : 25

    // World info scan over the recent history, ST's core path. Books stack in
    // ST's order: globally activated books, the card's linked book
    // (`extensions.world`), and the card's embedded `character_book`.
    let worldInfo: WorldInfoBlock[] | undefined
    const books: Array<{ name: string; file: WorldInfoFile }> = []
    for (const name of worldNames) {
      const book = await ctx.stLorebook.get(name)
      if (book !== undefined) books.push({ name, file: book })
    }
    const cardWorld = full.card.data.extensions.world
    if (typeof cardWorld === 'string' && cardWorld.length > 0 && !worldNames.includes(cardWorld)) {
      const book = await ctx.stLorebook.get(cardWorld)
      if (book !== undefined) books.push({ name: cardWorld, file: book })
    }
    if (full.card.data.character_book !== undefined) {
      books.push({
        name: full.card.data.character_book.name,
        file: bookFromCharacterBook(full.card.data.character_book),
      })
    }
    if (books.length > 0) {
      // Vectorized entries activate through the vector index: embed the scan
      // window once and pass the similarity hits into the keyword scan (ST's
      // Vector Storage supplying the vectorized World Info activation).
      let vectorHits: Map<string, number> | undefined
      const hasVectorized = books.some(({ file }) => Object.values(file.entries).some((e) => e.vectorized))
      if (hasVectorized) {
        vectorHits = new Map(
          (await ctx.stVector.searchWorld(chat.messages.slice(-10).map((m) => m.mes).join('\n'), { topK: 5 }))
            .map((hit) => [hit.key, hit.score]),
        )
      }
      const scanOptions: WorldInfoScanOptions = { timedState: wiTimedState, nowMs: Date.now() }
      if (vectorHits !== undefined) scanOptions.vectorHits = vectorHits
      if (typeof body.worldInfoDepth === 'number' && body.worldInfoDepth >= 1) {
        scanOptions.scanDepthMessages = Math.floor(body.worldInfoDepth)
      }
      if (typeof body.worldInfoCaseSensitive === 'boolean') scanOptions.caseSensitive = body.worldInfoCaseSensitive
      if (typeof body.worldInfoMatchWholeWords === 'boolean') scanOptions.matchWholeWords = body.worldInfoMatchWholeWords
      if (body.worldInfoRecursive === false) scanOptions.maxRecursionSteps = 0
      if (maxContextTokens !== undefined) {
        scanOptions.tokenBudget = Math.floor(maxContextTokens * wiBudgetPercent / 100)
      }
      const activated = scanWorldInfo(
        books,
        {
          chatHistory: chat.messages.slice(-10).map((m) => m.mes),
          messageCount: chat.messages.length,
          characterDescription: full.card.data.description,
          characterPersonality: full.card.data.personality,
          characterDepthPrompt: full.card.data.extensions.depth_prompt.prompt,
          scenario: full.card.data.scenario,
        },
        scanOptions,
      )
      worldInfo = activated.map(({ entry }) => ({
        content: entry.content,
        position: entry.position,
        depth: entry.depth,
        role: entry.role,
      }))
    }

    // Data Bank retrieval: search indexed documents against the recent chat
    // window and pass matching chunks into the prompt assembly (ST's Data
    // Bank file_template_db injection at file_depth_db = 4).
    let dataBankContext: string | undefined
    try {
      const bankQuery = chat.messages.slice(-5).map((m) => m.mes).join('\n')
      if (bankQuery.length > 0) {
        const bankHits = await ctx.stVector.searchFiles(bankQuery, { threshold: 0.05, topK: 5 })
        if (bankHits.length > 0) {
          dataBankContext = bankHits.map((h) => h.text).join('\n\n')
        }
      }
    } catch {
      // Data Bank retrieval failure is non-fatal: generation proceeds without
      // the context, matching ST's graceful degradation when the vector store
      // is empty or the embedder is unreachable.
    }

    // The chat-scoped author's note lives in ST's chat_metadata keys.
    const meta = chat.header.chat_metadata as { note_prompt?: unknown, note_depth?: unknown, variables?: unknown }
    const authorsNote = typeof meta.note_prompt === 'string' && meta.note_prompt.length > 0
      ? meta.note_prompt
      : undefined
    const authorsNoteDepth = typeof meta.note_depth === 'number' && meta.note_depth >= 0
      ? meta.note_depth
      : undefined
    // ST's chat variables (chat_metadata.variables): `{{getvar::}}` reads and
    // `{{setvar::}}` writes this store during prompt assembly; mutations persist
    // back to the chat (ST's saveMetadataDebounced). A missing store starts fresh.
    const chatVariables = (meta.variables !== null && typeof meta.variables === 'object'
      ? structuredClone(meta.variables)
      : {}) as Record<string, string | number | boolean>
    const variablesBefore = JSON.stringify(chatVariables)

    // Regex scripts run on the prompt side only: USER_INPUT scripts rewrite
    // user rows, AI_OUTPUT scripts rewrite model rows, before assembly. The
    // display side is the client's mirror of the same engine.
    const regexScripts = await ctx.stRegex.list()
    const sourceMessages = override ?? chat.messages
    const promptMessages = regexScripts.length === 0 ? sourceMessages : (() => {
      const macros = { char: full.card.data.name, user: userNameOverride ?? chat.header.user_name }
      return sourceMessages.map((m) => ({
        ...m,
        mes: applyRegexScripts(regexScripts, m.mes, m.is_user ? 'user_input' : 'ai_output', macros),
      }))
    })()

    // SSE streaming, ST's native reply transport
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    })
    const send = (event: string, data: unknown): void => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }
    // A client disconnect (the user's stop button aborts the fetch) cancels the
    // in-flight model call instead of burning tokens into a dead socket; the
    // abort's own error frame never reaches the disconnected client, and a
    // normal completion closes before this fires.
    const disconnect = new AbortController()
    res.on('close', () => {
      if (!res.writableEnded) disconnect.abort()
    })
    try {
      let reply = await ctx.stGenerate.generateReply(
        {
          card: full.card,
          messages: promptMessages,
          userName: userNameOverride ?? chat.header.user_name,
          ...(personaDescription === undefined ? {} : { personaDescription }),
          ...(contextTemplate === undefined ? {} : { contextTemplate }),
          ...(instructTemplate === undefined ? {} : { instruct: instructTemplate }),
          ...(groupContext === undefined ? {} : { groupContext }),
          ...(worldInfo === undefined ? {} : { worldInfo }),
          ...(dataBankContext === undefined ? {} : { dataBankContext }),
          ...(authorsNote === undefined ? {} : { authorsNote }),
          ...(authorsNoteDepth === undefined ? {} : { authorsNoteDepth }),
          ...(systemPromptOverride === undefined ? {} : { systemPromptOverride }),
          ...(postHistoryOverride === undefined ? {} : { postHistoryOverride }),
          ...(promptEntries === undefined ? {} : { promptEntries }),
          ...(temperature === undefined ? {} : { temperature }),
          ...(maxTokens === undefined ? {} : { maxTokens }),
          ...(topP === undefined ? {} : { topP }),
          ...(topK === undefined ? {} : { topK }),
          ...(minP === undefined ? {} : { minP }),
          ...(frequencyPenalty === undefined ? {} : { frequencyPenalty }),
          ...(presencePenalty === undefined ? {} : { presencePenalty }),
          ...(repetitionPenalty === undefined ? {} : { repetitionPenalty }),
          ...(seed === undefined ? {} : { seed }),
          ...(stopSequences === undefined ? {} : { stopSequences }),
          ...(sendIfEmpty === undefined ? {} : { sendIfEmpty }),
          ...(impersonationPrompt === undefined ? {} : { impersonationPrompt }),
          ...(continueNudgePrompt === undefined ? {} : { continueNudgePrompt }),
          ...(historyLimit === undefined ? {} : { historyLimit }),
          ...(maxContextTokens === undefined ? {} : { maxContextTokens }),
          ...(maxContextTokens === undefined || maxTokens === undefined ? {} : { maxResponseTokens: maxTokens }),
          ...(model === undefined ? {} : { model }),
          signal: disconnect.signal,
          variables: chatVariables,
        },
        { onDelta: (text) => send('delta', { text }) },
      )
      // ST's impersonation post-processing: trim a leading `{{user}}:` label
      // the model may echo and surrounding whitespace (script.js's trimNames
      // + trim for isImpersonate).
      if (impersonationPrompt !== undefined) {
        const userName = userNameOverride ?? chat.header.user_name
        const label = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        reply = reply.replace(new RegExp(`^${label}:\\s*`), '').trim()
      }
      send('done', { reply })
      // Persist chat variables mutated by {{setvar::}} during assembly (ST's
      // saveMetadataDebounced); the SSE reply already went out, so a persist
      // failure is logged rather than surfaced as a generation error.
      if (JSON.stringify(chatVariables) !== variablesBefore) {
        chat.header.chat_metadata = { ...chat.header.chat_metadata, variables: chatVariables }
        try {
          await ctx.stChat.save(avatar, chatId, chat)
        } catch {
          // The model reply stands; only the variable mutation is lost.
        }
      }
    } catch (error) {
      send('error', { message: (error as Error).message })
    }
    res.end()
  },
}

export function apply(ctx: Context, config: Config): void {
  if (config.defaultMaxContextTokens !== undefined
    && (!Number.isInteger(config.defaultMaxContextTokens) || config.defaultMaxContextTokens <= 0)) {
    throw new Error('st-api: defaultMaxContextTokens must be a positive integer')
  }
  activeConfig = config
  const prefix = config.routePrefix.replace(/\/$/, '')
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: `${prefix}`,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const sub = url.pathname.slice(prefix.length).replace(/^\//, '')
      const key = `${req.method ?? 'GET'} ${sub.split('?')[0]}`
      const route = routes[key]
      if (route === undefined) {
        sendJson(res, 404, { error: `no st route "${key}"` })
        return
      }
      try {
        await route(ctx, req, res, url.searchParams)
      } catch (error) {
        if (!res.headersSent) sendJson(res, 500, { error: (error as Error).message })
        else res.end()
      }
    },
  }), 'st-api: route table')
}
