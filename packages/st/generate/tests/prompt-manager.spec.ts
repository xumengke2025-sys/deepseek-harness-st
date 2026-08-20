/**
 * Prompt-manager assembly (ST's prompts/prompt_order): enabled system rows
 * replace the system prompt, depth-less chat rows become the post-history
 * block, and depth rows embed among the history in entry order.
 */
import { describe, expect, it } from 'vitest'
import { assemblePrompt } from '../src/index.ts'
import type { StCharacterCard } from '@deepseek-ai/dsh-st-character'
import type { StChatMessage } from '@deepseek-ai/dsh-st-chat'

const CARD = {
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
    system_prompt: 'You are Seraphina.',
    post_history_instructions: '',
    tags: [],
    creator: '',
    character_version: '',
    extensions: { depth_prompt: { prompt: '', depth: 4, role: 'system' } },
  },
} as unknown as StCharacterCard

const HISTORY: StChatMessage[] = [
  { name: 'User', is_user: true, is_system: false, send_date: '', mes: 'one', extra: {} },
  { name: 'Seraphina', is_user: false, is_system: false, send_date: '', mes: 'two', extra: {} },
  { name: 'User', is_user: true, is_system: false, send_date: '', mes: 'three', extra: {} },
]

function texts(messages: ReturnType<typeof assemblePrompt>['messages']): string[] {
  return messages.map((m) => m.content[0]!.type === 'text' ? m.content[0]!.text : '')
}

describe('prompt-manager assembly', () => {
  it('replaces the system prompt with enabled depth-less system rows in order', () => {
    const out = assemblePrompt({
      card: CARD, messages: HISTORY, userName: 'Kai',
      promptEntries: [
        { name: 'main', role: 'system', content: 'Write as {{char}}.' },
        { name: 'style', role: 'system', content: 'Keep replies short.' },
      ],
    })
    expect(out.system).toContain('Write as Seraphina.')
    expect(out.system).toContain('Keep replies short.')
    expect(out.system.indexOf('Write as')).toBeLessThan(out.system.indexOf('Keep replies'))
  })

  it('uses depth-less chat rows as the post-history block, replacing the default instruction', () => {
    const out = assemblePrompt({
      card: CARD, messages: HISTORY, userName: 'Kai',
      promptEntries: [
        { name: 'main', role: 'system', content: 'Write as {{char}}.' },
        { name: 'jb', role: 'user', content: 'Stay in character, {{user}}.' },
      ],
    })
    const rows = texts(out.messages)
    expect(rows.at(-1)).toBe('Stay in character, Kai.')
    // The default post-history row is gone when chat rows exist.
    expect(rows.at(-1)).not.toContain('[System note:')
  })

  it('embeds depth rows among the history counting back from the newest row', () => {
    const out = assemblePrompt({
      card: CARD, messages: HISTORY, userName: 'Kai',
      promptEntries: [
        { name: 'main', role: 'system', content: 'Write as {{char}}.' },
        { name: 'mid', role: 'system', content: 'reminder', depth: 1 },
      ],
    })
    const rows = texts(out.messages)
    // history is ['one','two','three']; depth 1 inserts one row before 'three'
    const idx = rows.indexOf('reminder')
    expect(idx).toBeGreaterThan(0)
    expect(rows[idx + 1]).toBe('three')
    const reminder = out.messages[idx]!
    expect(reminder.role).toBe('system')
  })

  it('skips empty-content entries and leaves the card system prompt standing without system rows', () => {
    const out = assemblePrompt({
      card: CARD, messages: HISTORY, userName: 'Kai',
      promptEntries: [
        { name: 'blank', role: 'system', content: '   ' },
        { name: 'jb', role: 'user', content: 'Go.' },
      ],
    })
    expect(out.system).toContain('You are Seraphina.')
    expect(texts(out.messages).at(-1)).toBe('Go.')
  })
})
