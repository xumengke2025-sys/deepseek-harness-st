/**
 * Global scan options (ST's world_info_* settings): the scan-depth window,
 * case sensitivity, whole-word matching, and the recursion toggle, as the
 * settings UI sends them through the generate handler.
 */
import { describe, expect, it } from 'vitest'
import { scanWorldInfo, newWorldInfoEntry } from '../src/index.ts'

function entry(uid: number, key: string[], content: string): ReturnType<typeof newWorldInfoEntry> {
  return { ...newWorldInfoEntry(), uid, key, content }
}

function book(...entries: Array<ReturnType<typeof newWorldInfoEntry>>) {
  const map: Record<string, ReturnType<typeof newWorldInfoEntry>> = {}
  for (const e of entries) map[String(e.uid)] = e
  return { name: 'W', file: { entries: map } }
}

describe('global scan depth', () => {
  it('limits the scanned chat window like world_info_depth', () => {
    const e = entry(0, ['dragon'], 'Dragon lore.')
    const scan = (depth: number) => scanWorldInfo(
      [book(e)],
      { chatHistory: ['A dragon appeared long ago.', 'Just small talk now.'] },
      { scanDepthMessages: depth },
    )
    // Depth 1 sees only the latest message; the match is in the older one
    expect(scan(1)).toEqual([])
    expect(scan(2).map(({ entry: x }) => x.content)).toEqual(['Dragon lore.'])
  })
})

describe('global case sensitivity', () => {
  it('case-insensitive by default, strict when world_info_case_sensitive is set', () => {
    const e = entry(0, ['Dragon'], 'Dragon lore.')
    const loose = scanWorldInfo([book(e)], { chatHistory: ['a dragon appears'] })
    expect(loose.map(({ entry: x }) => x.content)).toEqual(['Dragon lore.'])
    const strict = scanWorldInfo(
      [book(e)],
      { chatHistory: ['a dragon appears'] },
      { caseSensitive: true },
    )
    expect(strict).toEqual([])
    const strictHit = scanWorldInfo(
      [book(e)],
      { chatHistory: ['a Dragon appears'] },
      { caseSensitive: true },
    )
    expect(strictHit.map(({ entry: x }) => x.content)).toEqual(['Dragon lore.'])
  })
})

describe('global whole-word matching', () => {
  it('substring matching when world_info_match_whole_words is off', () => {
    const e = entry(0, ['dragon'], 'Dragon lore.')
    const whole = scanWorldInfo(
      [book(e)],
      { chatHistory: ['dragons sleep here'] },
      { matchWholeWords: true },
    )
    expect(whole).toEqual([])
    const substring = scanWorldInfo(
      [book(e)],
      { chatHistory: ['dragons sleep here'] },
      { matchWholeWords: false },
    )
    expect(substring.map(({ entry: x }) => x.content)).toEqual(['Dragon lore.'])
  })
})

describe('global recursion toggle', () => {
  it('maxRecursionSteps 0 disables recursive activation like world_info_recursive off', () => {
    const root = entry(0, ['dragon'], 'The dragon guards the sigil of zarquon.')
    const child = entry(1, ['zarquon'], 'Zarquon lore.')
    const chain = scanWorldInfo([book(root, child)], { chatHistory: ['A dragon sleeps.'] })
    expect(chain.map(({ entry: x }) => x.uid)).toEqual([0, 1])
    const gated = scanWorldInfo(
      [book(root, child)],
      { chatHistory: ['A dragon sleeps.'] },
      { maxRecursionSteps: 0 },
    )
    expect(gated.map(({ entry: x }) => x.uid)).toEqual([0])
  })
})
