/**
 * Context-template story string: the template replaces the hardcoded
 * character-block layout, empty slots drop their blocks, and the persona
 * slot takes over the standalone persona row.
 */
import { describe, expect, it } from 'vitest'
import { assemblePrompt, renderStoryString } from '../src/index.ts'
import type { StCharacterCard } from '@deepseek-ai/dsh-st-character'
import type { StChatMessage } from '@deepseek-ai/dsh-st-chat'

const CARD = {
  // V1 top-level fields, synchronized with data.* as readFromV2 does.
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
    personality: 'Curious.',
    scenario: 'A glade.',
    first_mes: 'Hello!',
    mes_example: '',
    system_prompt: '',
    post_history_instructions: '',
    alternate_greetings: [],
    tags: [],
    creator: '',
    character_version: '',
    extensions: { talkativeness: 0.5, fav: false, world: '', depth_prompt: { prompt: '', depth: 4, role: 'system' } },
  },
} as unknown as StCharacterCard

const HISTORY: StChatMessage[] = [
  { name: 'User', is_user: true, is_system: false, send_date: '', mes: 'hi', extra: {} },
]

function texts(messages: ReturnType<typeof assemblePrompt>['messages']): string[] {
  return messages.map((m) => m.content[0]!.type === 'text' ? m.content[0]!.text : '')
}

describe('renderStoryString', () => {
  it('keeps filled blocks, drops empty ones, and interpolates slots', () => {
    expect(renderStoryString(
      '{{#if description}}{{description}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if persona}}{{persona}}{{/if}}',
      { description: 'A bard.', scenario: '', persona: 'A duelist.' },
    )).toBe('A bard.\nA duelist.')
  })

  it('leaves unknown names verbatim for the macro engine', () => {
    expect(renderStoryString('{{char}} meets {{unknown}}.', {})).toBe('{{char}} meets {{unknown}}.')
  })
})

describe('context-template assembly', () => {
  it('renders the block from the template and drops empty-slot blocks', () => {
    const { messages } = assemblePrompt({
      card: CARD, messages: HISTORY, userName: 'Kai',
      contextTemplate: { storyString: '{{#if description}}DESC {{description}}\n{{/if}}{{#if personality}}{{char}} is {{personality}}\n{{/if}}' },
    })
    const rows = texts(messages)
    expect(rows).toContain('DESC A soprano loremaster.\nSeraphina is Curious.')
  })

  it('fills the persona slot and omits the standalone persona row', () => {
    const { messages } = assemblePrompt({
      card: CARD, messages: HISTORY, userName: 'Kai',
      personaDescription: 'A wandering cartographer.',
      contextTemplate: { storyString: '{{#if persona}}{{user}} is: {{persona}}\n{{/if}}{{description}}' },
    })
    const rows = texts(messages)
    expect(rows.some((t) => t.includes("Kai is: A wandering cartographer."))).toBe(true)
    expect(rows.some((t) => t.startsWith("Kai's persona:"))).toBe(false)
  })

  it('keeps the hardcoded layout and standalone persona row without a template', () => {
    const { messages } = assemblePrompt({
      card: CARD, messages: HISTORY, userName: 'Kai',
      personaDescription: 'A wandering cartographer.',
    })
    const rows = texts(messages)
    expect(rows.some((t) => t.startsWith("Kai's persona:"))).toBe(true)
    expect(rows.some((t) => t.includes("Seraphina's personality:"))).toBe(true)
  })
})
