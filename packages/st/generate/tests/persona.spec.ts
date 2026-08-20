/**
 * Persona description assembly: one row after the character block (description +
 * personality + scenario), naming {{user}}, macro-expanded; absent input adds
 * no row; {{persona}} resolves.
 */
import { describe, expect, it } from 'vitest'
import { assemblePrompt, substituteMacros } from '../src/index.ts'
import type { StCharacterCard } from '@deepseek-ai/dsh-st-character'
import type { StChatMessage } from '@deepseek-ai/dsh-st-chat'

const CARD = {
  // V1 top-level fields, synchronized with data.* as readFromV2 does for
  // cards loaded from disk; assemblePrompt's macro context reads card.name.
  name: 'Seraphina',
  description: 'A soprano loremaster.',
  personality: '',
  scenario: '',
  first_mes: 'Hello!',
  mes_example: '',
  creatorcomment: '',
  avatar: 'none',
  chat: '',
  talkativeness: 0.5,
  fav: false,
  tags: [],
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

const HISTORY: StChatMessage[] = [
  { name: 'User', is_user: true, is_system: false, send_date: '', mes: 'hi', extra: {} },
  { name: 'Seraphina', is_user: false, is_system: false, send_date: '', mes: 'hello', extra: {} },
]

function texts(messages: ReturnType<typeof assemblePrompt>['messages']): string[] {
  return messages.map((m) => m.content[0]!.type === 'text' ? m.content[0]!.text : '')
}

describe('persona description assembly', () => {
  it('places the persona row directly after the character block', () => {
    const { messages } = assemblePrompt({
      card: CARD, messages: HISTORY, userName: 'Kai',
      personaDescription: 'A wandering cartographer.',
    })
    const rows = texts(messages)
    const personaIndex = rows.findIndex((t) => t === "Kai's persona: A wandering cartographer.")
    const descIndex = rows.findIndex((t) => t.includes('soprano loremaster'))
    expect(personaIndex).toBeGreaterThanOrEqual(0)
    expect(personaIndex).toBe(descIndex + 1)
  })

  it('expands {{char}}/{{user}} inside the description', () => {
    const { messages } = assemblePrompt({
      card: CARD, messages: HISTORY, userName: 'Kai',
      personaDescription: '{{user}} seeks {{char}}.',
    })
    expect(texts(messages)).toContain("Kai's persona: Kai seeks Seraphina.")
  })

  it('adds no row and keeps {{persona}} resolvable to empty when absent', () => {
    const { messages } = assemblePrompt({ card: CARD, messages: HISTORY, userName: 'Kai' })
    expect(texts(messages).some((t) => t.includes('persona:'))).toBe(false)
    expect(substituteMacros('{{persona}}', { char: 'Seraphina', user: 'Kai' })).toBe('')
    expect(substituteMacros('{{persona}}', { char: 'Seraphina', user: 'Kai', persona: 'Cartographer.' })).toBe('Cartographer.')
  })
})
