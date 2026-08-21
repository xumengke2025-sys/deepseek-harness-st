/**
 * ST's chat-variable macros: {{getvar::name}} reads and {{setvar::name::value}}
 * writes the chat_metadata.variables store during substitution, with the same
 * in-place mutation semantics as ST's macro engine.
 */
import { describe, expect, it } from 'vitest'
import { substituteMacros, assemblePrompt } from '../src/index.ts'
import type { StCharacterCard } from '@deepseek-ai/dsh-st-character'
import type { StChatMessage } from '@deepseek-ai/dsh-st-chat'

const CTX = { char: 'Seraphina', user: 'Kai' }

describe('variable macros', () => {
  it('reads an existing variable and blanks a missing one', () => {
    const out = substituteMacros('HP: {{getvar::hp}} / missing: [{{getvar::nope}}]', { ...CTX, variables: { hp: 42 } })
    expect(out).toBe('HP: 42 / missing: []')
  })

  it('sets a variable, keeps numeric values typed, and expands to nothing', () => {
    const vars: Record<string, string | number | boolean> = {}
    const out = substituteMacros('before {{setvar::hp::57}} after', { ...CTX, variables: vars })
    expect(out).toBe('before  after')
    expect(vars.hp).toBe(57)
  })

  it('stores non-numeric values as strings', () => {
    const vars: Record<string, string | number | boolean> = {}
    substituteMacros('{{setvar::mood::happy}}', { ...CTX, variables: vars })
    expect(vars.mood).toBe('happy')
  })

  it('lets a later getvar read an earlier setvar in the same text', () => {
    const vars: Record<string, string | number | boolean> = {}
    const out = substituteMacros('{{setvar::hp::10}} HP={{getvar::hp}}', { ...CTX, variables: vars })
    expect(out).toBe(' HP=10')
    expect(vars.hp).toBe(10)
  })

  it('leaves variable macros untouched when no store is supplied', () => {
    expect(substituteMacros('{{getvar::hp}} {{setvar::hp::1}}', CTX))
      .toBe('{{getvar::hp}} {{setvar::hp::1}}')
  })
})

const CARD = {
  name: 'Seraphina',
  description: '', personality: '', scenario: '', first_mes: 'Hello!', mes_example: '',
  creatorcomment: '', avatar: 'none', chat: '', talkativeness: 0.5, fav: false, tags: [],
  spec: 'chara_card_v2', spec_version: '2.0',
  data: {
    name: 'Seraphina', description: '', personality: '', scenario: '', first_mes: 'Hello!',
    mes_example: '', system_prompt: '', post_history_instructions: '', tags: [], creator: '',
    character_version: '', extensions: { depth_prompt: { prompt: '', depth: 4, role: 'system' } },
  },
} as unknown as StCharacterCard

const HISTORY: StChatMessage[] = [
  { name: 'Kai', is_user: true, is_system: false, send_date: '', mes: '{{setvar::hp::80}}', extra: {} },
  { name: 'Seraphina', is_user: false, is_system: false, send_date: '', mes: 'HP is {{getvar::hp}}', extra: {} },
]

describe('prompt assembly with variables', () => {
  it('expands variable macros across history rows and mutates the store', () => {
    const vars: Record<string, string | number | boolean> = {}
    const prompt = assemblePrompt({ card: CARD, messages: HISTORY, userName: 'Kai', variables: vars })
    const texts = prompt.messages.map((m) => m.content[0]!.type === 'text' ? m.content[0]!.text : '')
    expect(texts).toContain('HP is 80')
    expect(vars.hp).toBe(80)
  })
})
