/**
 * Group-mode prompt assembly tests: the group context block is injected after
 * the replying card's description, and history rows carry speaker labels.
 */
import { describe, expect, it } from 'vitest'
import { assemblePrompt } from '../src/index.ts'
import type { StCharacterCard } from '@deepseek-ai/dsh-st-character'
import type { StChatMessage } from '@deepseek-ai/dsh-st-chat'

/** Minimal card; only the fields assemblePrompt reads (StCharacterCard is the inner { spec, data }). */
const CARD = {
  spec: 'chara_card_v2',
  spec_version: '2.0',
  data: {
    name: 'Seraphina',
    description: 'A soprano loremaster.',
    personality: '',
    scenario: '',
    first_mes: 'Hello!',
    mes_example: '',
    system_prompt: '',
    post_history_instructions: '',
    tags: [],
    creator: '',
    character_version: '',
    extensions: { depth_prompt: { prompt: '', depth: 4, role: 'system' } },
  },
} as unknown as StCharacterCard

function msg(name: string, mes: string, isUser: boolean): StChatMessage {
  return { name, is_user: isUser, send_date: '2026-08-15T00:00:00Z', mes, extra: {} }
}

describe('group-mode prompt assembly', () => {
  it('injects the group context after the replying card description', () => {
    const prompt = assemblePrompt({
      card: CARD,
      messages: [msg('User', 'hi', true)],
      userName: 'User',
      groupContext: 'Other members: Ruby',
    })
    const texts = prompt.messages.map((m) => m.content[0]!.type === 'text' ? m.content[0]!.text : '')
    const cardIndex = texts.findIndex((t) => t.includes('soprano'))
    const groupIndex = texts.findIndex((t) => t.includes('Other members'))
    expect(cardIndex).toBeGreaterThanOrEqual(0)
    expect(groupIndex).toBeGreaterThan(cardIndex)
  })

  it('labels history rows with their speaker names', () => {
    const prompt = assemblePrompt({
      card: CARD,
      messages: [msg('User', 'hi', true), msg('Ruby', 'greetings', false)],
      userName: 'User',
      groupContext: 'Other members: Ruby',
    })
    const texts = prompt.messages.map((m) => m.content[0]!.type === 'text' ? m.content[0]!.text : '')
    expect(texts).toContain('[Ruby]: greetings')
  })

  it('keeps plain history rows without a group context', () => {
    const prompt = assemblePrompt({
      card: CARD,
      messages: [msg('User', 'hi', true), msg('Ruby', 'greetings', false)],
      userName: 'User',
    })
    const texts = prompt.messages.map((m) => m.content[0]!.type === 'text' ? m.content[0]!.text : '')
    expect(texts.some((t) => t.includes('[Ruby]:'))).toBe(false)
  })
})
