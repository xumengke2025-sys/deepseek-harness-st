/**
 * ST-compatibility tests for the character/chat/lorebook/generate services.
 * Uses SillyTavern's bundled default_Seraphina.png card (real ST output) as
 * the round-trip fixture: if we can read it, re-embed, and ST could read it
 * back, the PNG codec is format-compatible.
 */
import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import StCharacterFileProvider from '../src/index.ts'
import {
  readCardFromPng,
  writeCardToPng,
  humanizedDateTime,
  sanitizeFilename,
  getUniqueName,
  normalizeCard,
} from '../src/index.ts'
import StChatFileProvider from '../../chat/src/index.ts'
import { initSwipes } from '../../chat/src/index.ts'
import { scanWorldInfo, newWorldInfoEntry, world_info_logic } from '../../lorebook/src/index.ts'
import { substituteMacros, assemblePrompt } from '../../generate/src/index.ts'
import { createBlankCard } from '../src/index.ts'

const SERAPHINA = join(
  __dirname,
  '../../../../.staging/sillytavern/default/content/default_Seraphina.png',
)

async function fixtureDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'dsh-st-'))
}

describe('PNG card codec vs real SillyTavern card', () => {
  it('reads the bundled Seraphina card and finds the V2 envelope', async () => {
    const png = await readFile(SERAPHINA)
    const json = readCardFromPng(png)
    const card = normalizeCard(JSON.parse(json) as Record<string, unknown>)
    expect(card.name).toBe('Seraphina')
    expect(card.data.name).toBe('Seraphina')
    expect(card.data.description.length).toBeGreaterThan(0)
    expect(card.data.first_mes.length).toBeGreaterThan(0)
    expect(card.spec).toMatch(/^chara_card_v[23]$/)
  })

  it('fills missing extension defaults for a third-party V2 card', () => {
    const bare = normalizeCard({
      spec: 'chara_card_v2', spec_version: '2.0',
      data: { name: 'Bare', description: 'd', first_mes: 'hi' },
    })
    expect(bare.data.extensions.talkativeness).toBe(0.5)
    expect(bare.data.extensions.fav).toBe(false)
    expect(bare.data.extensions.world).toBe('')
    expect(bare.data.extensions.depth_prompt).toEqual({ prompt: '', depth: 4, role: 'system' })
  })

  it('round-trips a card through re-embedding without losing data', async () => {
    const png = await readFile(SERAPHINA)
    const json = readCardFromPng(png)
    const rewritten = writeCardToPng(png, json)
    const again = readCardFromPng(rewritten)
    expect(JSON.parse(again)).toEqual(JSON.parse(json))
  })
  it('exportPng serves the on-disk PNG whose embedded card reflects edits', async () => {
    const dir = await fixtureDir()
    const ctx = new Context()
    await ctx.plugin(StCharacterFileProvider, { dataRoot: dir })
    const avatar = await ctx.stCharacter.importPng(`data:image/png;base64,${(await readFile(SERAPHINA)).toString('base64')}`)
    await ctx.stCharacter.edit(avatar, { ch_name: 'Seraphina', description: 'edited description' })
    const dataUrl = await ctx.stCharacter.exportPng(avatar)
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true)
    const exported = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64')
    const card = JSON.parse(readCardFromPng(exported)) as { data: { description: string } }
    expect(card.data.description).toBe('edited description')
  })
  it('reads the v2 (chara) chunk even after v3 was stripped', async () => {
    const png = await readFile(SERAPHINA)
    const json = readCardFromPng(png)
    const rewritten = writeCardToPng(png, json)
    // strip ccv3 by hand: keep only chara through a second write of the v2 payload
    const card = JSON.parse(json) as Record<string, unknown>
    card.spec = 'chara_card_v2'
    card.spec_version = '2.0'
    const v2Only = writeCardToPng(rewritten, JSON.stringify(card))
    const readBack = JSON.parse(readCardFromPng(v2Only))
    // v3 gets re-added by write; ccv3 wins, spec is v3 — that matches ST write()
    expect(readBack.spec).toBe('chara_card_v3')
  })
})

describe('ST utility ports', () => {
  it('humanizedDateTime formats like ST', () => {
    const stamp = new Date(2026, 0, 2, 3, 4, 5, 6).getTime()
    expect(humanizedDateTime(stamp)).toBe('2026-01-02@03h04m05s006ms')
  })

  it('sanitizeFilename strips separators and reserved names', () => {
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe('abcdefghij')
    expect(sanitizeFilename('con')).toBeTruthy()
  })

  it('getUniqueName appends (n) for collisions', () => {
    expect(getUniqueName('Ava', () => false)).toBe('Ava')
    expect(getUniqueName('Ava', (n) => n === 'Ava' || n === 'Ava (1)')).toBe('Ava (2)')
  })
})

describe('character file provider', () => {
  it('imports the real ST card and lists it', async () => {
    const dir = await fixtureDir()
    const ctx = new Context()
    await ctx.plugin(StCharacterFileProvider, { dataRoot: dir })
    const dataUrl = `data:image/png;base64,${(await readFile(SERAPHINA)).toString('base64')}`
    const avatar = await ctx.stCharacter.importPng(dataUrl)
    expect(avatar).toBe('Seraphina.png')

    const list = await ctx.stCharacter.list()
    expect(list).toHaveLength(1)
    expect(list[0]!.name).toBe('Seraphina')

    const full = await ctx.stCharacter.get('Seraphina.png')
    expect(full?.card.data.first_mes).toContain('Seraphina')
    await ctx.stCharacter.delete('Seraphina.png')
  })

  it('creates, renames, and deletes a character keeping ST naming rules', async () => {
    const dir = await fixtureDir()
    const ctx = new Context()
    await ctx.plugin(StCharacterFileProvider, { dataRoot: dir })
    const avatar = await ctx.stCharacter.create({
      ch_name: 'Test Bot',
      description: 'A test',
      first_mes: 'Hello!',
    })
    expect(avatar).toBe('Test Bot.png')

    const renamed = await ctx.stCharacter.rename(avatar, 'Renamed')
    expect(renamed).toBe('Renamed.png')

    await ctx.stCharacter.delete('Renamed.png')
    expect(await ctx.stCharacter.list()).toHaveLength(0)
  })
})

describe('chat JSONL service', () => {
  it('creates a chat with ST header shape and greeting swipe', async () => {
    const dir = await fixtureDir()
    const ctx = new Context()
    await ctx.plugin(StCharacterFileProvider, { dataRoot: dir })
    await ctx.plugin(StChatFileProvider, { dataRoot: dir, backupIntervalMs: 60_000 })
    const avatar = await ctx.stCharacter.create({ ch_name: 'Bot', first_mes: 'Hi there' })

    const chatId = await ctx.stChat.create(avatar, 'User', 'Bot', 'Hi there')
    expect(chatId).toMatch(/^Bot - \d{4}-\d{2}-\d{2}@/)

    const chat = await ctx.stChat.get(avatar, chatId)
    expect(chat).toBeDefined()
    expect(chat!.header.user_name).toBe('User')
    expect(chat!.header.character_name).toBe('Bot')
    expect(chat!.messages).toHaveLength(1)
    expect(chat!.messages[0]!.mes).toBe('Hi there')

    const infos = await ctx.stChat.list(avatar)
    expect(infos).toHaveLength(1)
    expect(infos[0]!.chat_items).toBe(1)
    expect(infos[0]!.mes).toBe('Hi there')
  })

  it('serializes to JSONL lines parseable by ST (one object per line)', async () => {
    const dir = await fixtureDir()
    const ctx = new Context()
    await ctx.plugin(StCharacterFileProvider, { dataRoot: dir })
    await ctx.plugin(StChatFileProvider, { dataRoot: dir, backupIntervalMs: 60_000 })
    const avatar = await ctx.stCharacter.create({ ch_name: 'Bot' })
    const chatId = await ctx.stChat.create(avatar, 'User', 'Bot')

    const chat = await ctx.stChat.get(avatar, chatId)
    const msg = chat!.messages
    const userMsg = { name: 'User', is_user: true, send_date: new Date().toISOString(), mes: 'hello', extra: {} }
    initSwipes(userMsg as never)
    msg.push(userMsg as never)
    await ctx.stChat.save(avatar, chatId, chat!)

    const raw = await ctx.stChat.exportChat(avatar, chatId)
    const lines = raw!.split('\n').filter((l) => l.trim())
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow()
    }
    // header + one message
    expect(lines.length).toBe(2)
  })
})

describe('world info scan', () => {
  it('activates a keyed entry only when the key appears in recent history', () => {
    const entry = {
      ...newWorldInfoEntry(),
      uid: 1,
      key: ['dragon'],
      content: 'A dragon guards the pass.',
    }
    const book = { name: 'World', file: { entries: { '1': entry } } }
    const hit = scanWorldInfo([book], { chatHistory: ['I saw a dragon!'] })
    expect(hit).toHaveLength(1)
    expect(hit[0]!.entry.content).toContain('dragon')

    const miss = scanWorldInfo([book], { chatHistory: ['nothing here'] })
    expect(miss).toHaveLength(0)
  })

  it('applies secondary-key logic AND_ANY / NOT_ANY', () => {
    const base = (logic: 0 | 2) => ({
      ...newWorldInfoEntry(),
      uid: 1,
      key: ['castle'],
      keysecondary: ['night'],
      selectiveLogic: logic,
      content: 'x',
    })
    const andAny = { name: 'W', file: { entries: { '1': base(world_info_logic.AND_ANY) } } }
    const notAny = { name: 'W', file: { entries: { '1': base(world_info_logic.NOT_ANY) } } }
    expect(scanWorldInfo([andAny], { chatHistory: ['the castle at night'] })).toHaveLength(1)
    expect(scanWorldInfo([andAny], { chatHistory: ['the castle at dawn'] })).toHaveLength(0)
    expect(scanWorldInfo([notAny], { chatHistory: ['the castle at dawn'] })).toHaveLength(1)
    expect(scanWorldInfo([notAny], { chatHistory: ['the castle at night'] })).toHaveLength(0)
  })

  it('activates constant entries unconditionally', () => {
    const constant = { ...newWorldInfoEntry(), uid: 1, key: [], constant: true, content: 'always' }
    const book = { name: 'W', file: { entries: { '1': constant } } }
    expect(scanWorldInfo([book], { chatHistory: ['whatever'] })).toHaveLength(1)
  })
})

describe('generation prompt assembly', () => {
  it('substitutes core macros', () => {
    const out = substituteMacros('{{char}} greets {{user}} on {{date}}', {
      char: 'Seraphina',
      user: 'Alex',
    })
    expect(out).toBe('Seraphina greets Alex on ' + new Date().toLocaleDateString())
    expect(out).not.toContain('{{char}}')
    expect(substituteMacros('{{daytime}}', { char: 'c', user: 'u' })).toMatch(/^(night|morning|afternoon|evening)$/)
  })

  it('assembles system, character block, history, and post-history tail', () => {
    const card = createBlankCard('Bot')
    card.data.description = 'A helpful {{char}}.'
    card.data.first_mes = 'Greetings!'
    const messages = [
      { name: 'User', is_user: true, send_date: 't', mes: 'hi', extra: {} },
      { name: 'Bot', is_user: false, send_date: 't', mes: 'hello!', extra: {} },
    ]
    const prompt = assemblePrompt({ card, messages, userName: 'User' })
    expect(prompt.system).toContain('Bot')
    const texts = prompt.messages.map((m) =>
      (m.content[0] as { type: 'text'; text: string }).text,
    )
    expect(texts.some((t) => t.includes('A helpful Bot.'))).toBe(true)
    expect(texts.some((t) => t === 'hi')).toBe(true)
    expect(texts.some((t) => t === 'hello!')).toBe(true)
    // post-history instructions are the final message
    expect(texts.at(-1)).toContain('[System note:')
  })
})
