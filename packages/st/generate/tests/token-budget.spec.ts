/**
 * Token-budget assembly: with maxContextTokens set, oldest history rows are
 * dropped until the assembled prompt fits the budget minus the response
 * reservation; a budget the mandatory prompt alone overflows fails loud.
 */
import { describe, expect, it } from 'vitest'
import { assemblePrompt, estimatePromptTokens } from '../src/index.ts'
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

/** 10 alternating rows; each row is 100 chars so token costs are predictable. */
const HISTORY: StChatMessage[] = Array.from({ length: 10 }, (_, i) => ({
  name: i % 2 === 0 ? 'User' : 'Seraphina',
  is_user: i % 2 === 0,
  is_system: false,
  send_date: '',
  mes: `message row ${i} `.padEnd(100, 'x'),
  extra: {},
}))

function texts(messages: ReturnType<typeof assemblePrompt>['messages']): string[] {
  return messages.map((m) => m.content[0]!.type === 'text' ? m.content[0]!.text : '')
}

describe('estimatePromptTokens', () => {
  it('prices system text plus every message under the fixed heuristic', () => {
    const prompt = assemblePrompt({ card: CARD, messages: HISTORY, userName: 'Kai' })
    const expected = Math.ceil(prompt.system.length / 4) + 4
      + prompt.messages.reduce((sum, m) => sum + Math.ceil(texts([m])[0]!.length / 4) + 4, 0)
    expect(estimatePromptTokens(prompt)).toBe(expected)
  })
})

describe('token-budget history trimming', () => {
  it('keeps the newest rows and drops the oldest until the prompt fits', () => {
    const prompt = assemblePrompt({ card: CARD, messages: HISTORY, userName: 'Kai', maxContextTokens: 300 })
    expect(estimatePromptTokens(prompt)).toBeLessThanOrEqual(300)
    const rows = texts(prompt.messages)
    // The newest history row always survives; the oldest rows are gone
    expect(rows.some((t) => t.includes('message row 9'))).toBe(true)
    expect(rows.some((t) => t.includes('message row 0'))).toBe(false)
    expect(rows.filter((t) => t.startsWith('message row')).length).toBeLessThan(HISTORY.length)
  })

  it('reserves the response budget before trimming', () => {
    // With a 40-token response reservation the fixed rows must shrink further
    const trimmed = assemblePrompt({ card: CARD, messages: HISTORY, userName: 'Kai', maxContextTokens: 300, maxResponseTokens: 40 })
    const plain = assemblePrompt({ card: CARD, messages: HISTORY, userName: 'Kai', maxContextTokens: 300 })
    const historyOf = (p: ReturnType<typeof assemblePrompt>): number =>
      texts(p.messages).filter((t) => t.startsWith('message row')).length
    expect(historyOf(trimmed)).toBeLessThan(historyOf(plain))
  })

  it('trims within the historyLimit window', () => {
    const prompt = assemblePrompt({
      card: CARD, messages: HISTORY, userName: 'Kai',
      historyLimit: 4, maxContextTokens: 300,
    })
    const rows = texts(prompt.messages).filter((t) => t.startsWith('message row'))
    expect(rows.length).toBeLessThanOrEqual(4)
    expect(rows[rows.length - 1]).toContain('message row 9')
  })

  it('fails loud when the mandatory prompt alone overflows the budget', () => {
    expect(() => assemblePrompt({ card: CARD, messages: HISTORY, userName: 'Kai', maxContextTokens: 10 }))
      .toThrow(/mandatory prompt is .* tokens, over the 10 token context budget/)
  })
})
