/**
 * Chat branching (ST checkpoints): a prefix copy lands under a new chat id,
 * the source chat stays untouched, and a missing source fails loud.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import StChatFileProvider from '../src/index.ts'

let root = ''

/** Minimal Context stub: the Service base touches `reflect.provide`, the provider registers one teardown effect. */
const fakeCtx = { reflect: { provide: () => {} }, effect: () => () => {} } as never

async function makeProvider(): Promise<StChatFileProvider> {
  root = await mkdtemp(join(tmpdir(), 'st-chat-'))
  return new StChatFileProvider(fakeCtx, { dataRoot: root, backupIntervalMs: 60_000 })
}

async function seeded(provider: StChatFileProvider): Promise<string> {
  const chatId = await provider.create('Seraphina.png', 'User', 'Seraphina', 'Hello there.')
  const chat = await provider.get('Seraphina.png', chatId)
  if (chat === undefined) throw new Error('seed failed')
  await provider.save('Seraphina.png', chatId, {
    ...chat,
    messages: [
      ...chat.messages,
      { ...chat.messages[0]!, is_user: true, name: 'User', mes: 'Hi!' },
      { ...chat.messages[0]!, mes: 'How are you?' },
    ],
  })
  return chatId
}

afterEach(async () => {
  if (root !== '') await rm(root, { recursive: true, force: true })
  root = ''
})

describe('chat branching', () => {
  it('copies the whole chat when upto is omitted and leaves the source untouched', async () => {
    const provider = await makeProvider()
    const chatId = await seeded(provider)
    const newId = await provider.checkpoint('Seraphina.png', chatId)
    expect(newId).toContain('branch')
    expect(newId).not.toBe(chatId)
    const branch = await provider.get('Seraphina.png', newId)
    const source = await provider.get('Seraphina.png', chatId)
    expect(branch?.messages.map((m) => m.mes)).toEqual(source?.messages.map((m) => m.mes))
    expect(branch?.header.character_name).toBe('Seraphina')
  })

  it('copies only the prefix up to the given index', async () => {
    const provider = await makeProvider()
    const chatId = await seeded(provider)
    const newId = await provider.checkpoint('Seraphina.png', chatId, 1)
    const branch = await provider.get('Seraphina.png', newId)
    expect(branch?.messages.map((m) => m.mes)).toEqual(['Hello there.', 'Hi!'])
  })

  it('rejects a missing source chat', async () => {
    const provider = await makeProvider()
    await expect(provider.checkpoint('Seraphina.png', 'nobody')).rejects.toThrow('chat not found')
  })
})
