/**
 * In-group priority: same-group entries compete (groupOverride claims the
 * group, else a groupWeight-weighted roll), and an override winner suppresses
 * other groups' non-override activations.
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

describe('in-group priority', () => {
  it('a same-group clash keeps exactly one entry', () => {
    const a = entry(0, ['alpha'], 'Alpha lore.')
    const b = entry(1, ['beta'], 'Beta lore.')
    a.group = 'mood'
    b.group = 'mood'
    const activated = scanWorldInfo(
      [book(a, b)],
      { chatHistory: ['alpha beta'] },
      { random: () => 0 },
    )
    expect(activated).toHaveLength(1)
    // random()=0 rolls onto the first entry
    expect(activated[0]!.entry.uid).toBe(0)
  })

  it('groupWeight skews the roll to the heavier entry', () => {
    const light = entry(0, ['alpha'], 'Light lore.')
    const heavy = entry(1, ['beta'], 'Heavy lore.')
    light.group = 'mood'
    heavy.group = 'mood'
    light.groupWeight = 1
    heavy.groupWeight = 99
    const activated = scanWorldInfo(
      [book(light, heavy)],
      { chatHistory: ['alpha beta'] },
      { random: () => 0.5 }, // roll 50 of 100 lands past weight 1
    )
    expect(activated.map(({ entry: e }) => e.uid)).toEqual([1])
  })

  it('a groupOverride entry claims its group over plain members', () => {
    const plain = entry(0, ['alpha'], 'Plain lore.')
    const override = entry(1, ['beta'], 'Override lore.')
    plain.group = 'mood'
    override.group = 'mood'
    override.groupOverride = true
    const activated = scanWorldInfo([book(plain, override)], { chatHistory: ['alpha beta'] })
    expect(activated.map(({ entry: e }) => e.uid)).toEqual([1])
  })

  it('an override winner suppresses other groups’ non-override entries', () => {
    const outsider = entry(0, ['alpha'], 'Outsider lore.')
    const plain = entry(1, ['beta'], 'Plain lore.')
    const override = entry(2, ['gamma'], 'Override lore.')
    plain.group = 'mood'
    override.group = 'mood'
    override.groupOverride = true
    const activated = scanWorldInfo([book(outsider, plain, override)], { chatHistory: ['alpha beta gamma'] })
    expect(activated.map(({ entry: e }) => e.uid)).toEqual([2])
  })

  it('entries without a group never compete', () => {
    const a = entry(0, ['alpha'], 'Alpha lore.')
    const b = entry(1, ['beta'], 'Beta lore.')
    const activated = scanWorldInfo([book(a, b)], { chatHistory: ['alpha beta'] })
    expect(activated.map(({ entry: e }) => e.uid)).toEqual([0, 1])
  })
})
