/**
 * ST's impersonate and continue generation modes: the impersonation prompt
 * closes the assembled prompt, the continue nudge rides after the last history
 * row, and neither appears in ordinary generations.
 */
import { describe, expect, it } from 'vitest'
import { assemblePrompt, DEFAULT_IMPERSONATION_PROMPT, DEFAULT_CONTINUE_NUDGE_PROMPT } from '../src/index.ts'
import type { StCharacterCard } from '@deepseek-ai/dsh-st-character'
import type { StChatMessage } from '@deepseek-ai/dsh-st-chat'

const CARD = {
  name: 'Seraphina',
  description: '',
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
    description: '',
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
  { name: 'Kai', is_user: true, is_system: false, send_date: '', mes: 'hi there', extra: {} },
  { name: 'Seraphina', is_user: false, is_system: false, send_date: '', mes: 'greetings', extra: {} },
]

function texts(messages: ReturnType<typeof assemblePrompt>['messages']): string[] {
  return messages.map((m) => m.content[0]!.type === 'text' ? m.content[0]!.text : '')
}

describe('impersonate', () => {
  it('closes the prompt with the stock impersonation instruction, macros expanded', () => {
    const prompt = assemblePrompt({
      card: CARD, messages: HISTORY, userName: 'Kai',
      impersonationPrompt: DEFAULT_IMPERSONATION_PROMPT,
    })
    const last = prompt.messages.at(-1)!
    expect(last.role).toBe('system')
    const text = texts([last])[0]!
    expect(text).toContain('point of view of Kai')
    expect(text).not.toContain('{{user}}')
    expect(text).not.toContain('{{char}}')
  })

  it('accepts a custom instruction text', () => {
    const prompt = assemblePrompt({
      card: CARD, messages: HISTORY, userName: 'Kai',
      impersonationPrompt: '[Write as {{user}} next.]',
    })
    expect(texts(prompt.messages).at(-1)).toBe('[Write as Kai next.]')
  })

  it('adds nothing for ordinary generations', () => {
    const prompt = assemblePrompt({ card: CARD, messages: HISTORY, userName: 'Kai' })
    expect(texts(prompt.messages)).not.toContain(DEFAULT_IMPERSONATION_PROMPT.replace('{{user}}', 'Kai'))
  })
})

describe('continue', () => {
  it('places the nudge after the last history row and before the post-history block', () => {
    const prompt = assemblePrompt({
      card: CARD, messages: HISTORY, userName: 'Kai',
      continueNudgePrompt: DEFAULT_CONTINUE_NUDGE_PROMPT,
    })
    const rows = texts(prompt.messages)
    const nudgeIdx = rows.findIndex((t) => t === DEFAULT_CONTINUE_NUDGE_PROMPT)
    expect(nudgeIdx).toBeGreaterThan(-1)
    // the last history row sits right before the nudge
    expect(rows[nudgeIdx - 1]).toBe('greetings')
    // the nudge precedes the post-history instruction row
    expect(rows.length - nudgeIdx).toBeGreaterThanOrEqual(2)
  })

  it('expands {lastChatMessage} to the last history row text', () => {
    const prompt = assemblePrompt({
      card: CARD, messages: HISTORY, userName: 'Kai',
      continueNudgePrompt: 'Continue after: {lastChatMessage}',
    })
    expect(texts(prompt.messages)).toContain('Continue after: greetings')
  })

  it('adds nothing for ordinary generations', () => {
    const prompt = assemblePrompt({ card: CARD, messages: HISTORY, userName: 'Kai' })
    expect(texts(prompt.messages)).not.toContain(DEFAULT_CONTINUE_NUDGE_PROMPT)
  })
})
