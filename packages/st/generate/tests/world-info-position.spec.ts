/**
 * World-info positional assembly: activated blocks land per ST's
 * `world_info_position` — before/after the character description, appended to
 * the system prompt, or embedded among the history rows at a depth.
 */
import { describe, expect, it } from 'vitest'
import { assemblePrompt } from '../src/index.ts'
import { world_info_position } from '@deepseek-ai/dsh-st-lorebook'
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

const SIX = ['1', '2', '3', '4', '5', '6'].map((n) => msg('Seraphina', false, n))

function texts(messages: ReturnType<typeof assemblePrompt>['messages']): string[] {
  return messages.map((m) => m.content[0]!.type === 'text' ? m.content[0]!.text : '')
}

describe('world-info positional assembly', () => {
  it('places before-char blocks ahead of the character description', () => {
    const { messages } = assemblePrompt({
      card: CARD, messages: SIX, userName: 'User',
      worldInfo: [{ content: 'Before lore.', position: world_info_position.before, depth: 4, role: 1 }],
    })
    const rows = texts(messages)
    const loreIndex = rows.findIndex((t) => t === 'Before lore.')
    expect(loreIndex).toBe(0)
    expect(rows[loreIndex + 1]).toContain('soprano loremaster')
  })

  it('places after-char blocks between the description and the example dialogues', () => {
    const card = { ...CARD, data: { ...CARD.data, mes_example: 'Seraphina: Example dialogue.' } }
    const { messages } = assemblePrompt({
      card, messages: SIX, userName: 'User',
      worldInfo: [{ content: 'After lore.', position: world_info_position.after, depth: 4, role: 1 }],
    })
    const rows = texts(messages)
    const loreIndex = rows.findIndex((t) => t === 'After lore.')
    expect(rows[loreIndex - 1]).toContain('soprano loremaster')
    expect(rows[loreIndex + 1]).toContain('Example dialogue.')
  })

  it('prepends sysTop-position blocks to the system prompt, ST\'s wiBefore slot', () => {
    const { system } = assemblePrompt({
      card: CARD, messages: SIX, userName: 'User',
      worldInfo: [{ content: 'System lore.', position: world_info_position.sysTop, depth: 4, role: 1 }],
    })
    expect(system.startsWith('System lore.\n')).toBe(true)
  })

  it('embeds at-depth blocks among the history rows with their role', () => {
    const { messages } = assemblePrompt({
      card: CARD, messages: SIX, userName: 'User',
      worldInfo: [{ content: 'Depth-2 lore.', position: world_info_position.atDepth, depth: 2, role: 0 }],
    })
    const loreIndex = messages.findIndex((m) =>
      m.content[0]!.type === 'text' && m.content[0]!.text === 'Depth-2 lore.')
    expect(loreIndex).toBeGreaterThan(0)
    // Two history rows follow the block ('5' and '6'), then the post-history row.
    const rows = texts(messages)
    expect(rows.slice(loreIndex + 1, loreIndex + 3)).toEqual(['5', '6'])
    expect(messages[loreIndex]!.role).toBe('system')
  })
})
