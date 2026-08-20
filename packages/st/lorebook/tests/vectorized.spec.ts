/**
 * Vectorized-entry activation and useGroupScoring group coordination:
 * vectorized entries activate through `vectorHits` scores only, and scored
 * group members beat the weighted roll.
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

describe('vectorized entries', () => {
  it('activates only through a vector hit, never through keyword matching', () => {
    const e = entry(0, ['dragon'], 'Dragon lore.')
    e.vectorized = true
    const withHit = scanWorldInfo(
      [book(e)],
      { chatHistory: ['A dragon!'] },
      { vectorHits: new Map([['W#0', 0.7]]) },
    )
    expect(withHit.map(({ entry: x }) => x.content)).toEqual(['Dragon lore.'])
    const keywordOnly = scanWorldInfo([book(e)], { chatHistory: ['A dragon!'] })
    expect(keywordOnly).toEqual([])
  })

  it('constant vectorized entries stay always-on', () => {
    const e = entry(0, [], 'Constant lore.')
    e.vectorized = true
    e.constant = true
    const activated = scanWorldInfo([book(e)], { chatHistory: ['Nothing.'] })
    expect(activated.map(({ entry: x }) => x.content)).toEqual(['Constant lore.'])
  })

  it('grouped vectorized entries pick the highest-scored member (useGroupScoring)', () => {
    const low = entry(0, [], 'Low-scored lore.')
    low.vectorized = true
    low.group = 'g'
    const high = entry(1, [], 'High-scored lore.')
    high.vectorized = true
    high.group = 'g'
    const activated = scanWorldInfo(
      [book(low, high)],
      { chatHistory: ['Anything.'] },
      {
        vectorHits: new Map([
          ['W#0', 0.4],
          ['W#1', 0.9],
        ]),
        random: () => 0,
      },
    )
    expect(activated.map(({ entry: x }) => x.uid)).toEqual([1])
  })

  it('a scored member beats unscored group members regardless of weight', () => {
    const heavy = entry(0, ['dragon'], 'Heavy but unscored.')
    heavy.group = 'g'
    heavy.groupWeight = 1000
    const scored = entry(1, [], 'Vectorized winner.')
    scored.vectorized = true
    scored.group = 'g'
    scored.groupWeight = 1
    const activated = scanWorldInfo(
      [book(heavy, scored)],
      { chatHistory: ['A dragon!'] },
      { vectorHits: new Map([['W#1', 0.5]]), random: () => 0 },
    )
    expect(activated.map(({ entry: x }) => x.uid)).toEqual([1])
  })
})
