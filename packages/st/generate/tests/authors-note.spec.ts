/**
 * Author's-note injection: ST inserts the note among the history rows at the
 * configured depth (counting back from the newest row), default 4.
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

function msg(name: string, isUser: boolean, mes: string): StChatMessage {
  return { name, is_user: isUser, is_system: false, send_date: '', mes, extra: {} }
}

describe("author's note injection", () => {
  const six = ['1', '2', '3', '4', '5', '6'].map((n) => msg('Seraphina', false, n))

  it('inserts the note exactly four rows from the end by default', () => {
    const { messages } = assemblePrompt({
      card: CARD, messages: six, userName: 'User',
      authorsNote: 'Keep the tone light.',
    })
    const texts = messages.map((m) => m.content[0]!.type === 'text' ? m.content[0]!.text : '')
    const noteIndex = texts.findIndex((t) => t.includes("[Author's note: Keep the tone light.]"))
    // Four history rows follow the note ('3'-'6'); only the post-history row is after those.
    expect(texts.slice(noteIndex + 1, noteIndex + 5)).toEqual(['3', '4', '5', '6'])
    expect(texts[noteIndex - 1]).toBe('2')
    expect(texts[noteIndex + 5]).toContain('System note')
  })

  it('honors an explicit depth of 0 by placing the note after the newest row', () => {
    const { messages } = assemblePrompt({
      card: CARD, messages: six, userName: 'User',
      authorsNote: 'post-history nudge', authorsNoteDepth: 0,
    })
    const texts = messages.map((m) => m.content[0]!.type === 'text' ? m.content[0]!.text : '')
    const noteIndex = texts.findIndex((t) => t.includes("[Author's note: post-history nudge]"))
    expect(texts[noteIndex - 1]).toBe('6')
  })

  it('substitutes macros inside the note and omits it when empty', () => {
    const withMacros = assemblePrompt({
      card: CARD, messages: six, userName: 'Alex',
      authorsNote: 'Address {{user}} kindly.',
    })
    expect(withMacros.messages.some((m) =>
      m.content[0]!.type === 'text' && m.content[0]!.text.includes('Address Alex kindly.'),
    )).toBe(true)

    const without = assemblePrompt({ card: CARD, messages: six, userName: 'User', authorsNote: '' })
    expect(without.messages.some((m) =>
      m.content[0]!.type === 'text' && m.content[0]!.text.includes("Author's note"),
    )).toBe(false)
  })
})
