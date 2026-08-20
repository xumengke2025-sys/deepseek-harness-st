/**
 * Timed effects (sticky/cooldown/delay), recursion flags' true semantics
 * (excludeRecursion = not activatable by recursion, preventRecursion = not a
 * recursion source), and the token budget cut.
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

describe('recursion flags', () => {
  it('excludeRecursion entries are not activated by recursion content', () => {
    const root = entry(0, ['dragon'], 'The dragon guards the sigil of zarquon.')
    const child = entry(1, ['zarquon'], 'Zarquon lore.')
    child.excludeRecursion = true
    const activated = scanWorldInfo([book(root, child)], { chatHistory: ['A dragon sleeps.'] })
    // The root activates and its content contains "zarquon", but the child is non-recursable
    expect(activated.map(({ entry: e }) => e.uid)).toEqual([0])
  })

  it('preventRecursion entries do not contribute content to further scans', () => {
    const root = entry(0, ['dragon'], 'The dragon guards the sigil of zarquon.')
    root.preventRecursion = true
    const child = entry(1, ['zarquon'], 'Zarquon lore.')
    const activated = scanWorldInfo([book(root, child)], { chatHistory: ['A dragon sleeps.'] })
    // The root's content never becomes scannable, so the child stays dormant
    expect(activated.map(({ entry: e }) => e.uid)).toEqual([0])
  })

  it('a plain chain still recurses when neither flag is set', () => {
    const root = entry(0, ['dragon'], 'The dragon guards the sigil of zarquon.')
    const child = entry(1, ['zarquon'], 'Zarquon lore.')
    const activated = scanWorldInfo([book(root, child)], { chatHistory: ['A dragon sleeps.'] })
    expect(activated.map(({ entry: e }) => e.uid)).toEqual([0, 1])
  })
})

describe('delay', () => {
  it('gates activation on the chat message count', () => {
    const late = entry(0, ['dragon'], 'Late lore.')
    late.delay = 5
    const scan = (messageCount: number) =>
      scanWorldInfo([book(late)], { chatHistory: ['A dragon.'], messageCount })
    expect(scan(4).map(({ entry: e }) => e.content)).toEqual([])
    expect(scan(5).map(({ entry: e }) => e.content)).toEqual(['Late lore.'])
  })
})

describe('sticky / cooldown', () => {
  it('sticky keeps a previously activated entry alive without a match', () => {
    const e = entry(0, ['dragon'], 'Dragon lore.')
    e.sticky = 60_000
    const timedState = new Map([['W#0', { at: 10_000, active: true }]])
    const activated = scanWorldInfo(
      [book(e)],
      { chatHistory: ['Nothing here.'] },
      { timedState, nowMs: 50_000 },
    )
    expect(activated.map(({ entry: x }) => x.content)).toEqual(['Dragon lore.'])
    // the scan refreshed the activation mark
    expect(timedState.get('W#0')).toEqual({ at: 50_000, active: true })
  })

  it('sticky lapsing lets the entry go dormant again', () => {
    const e = entry(0, ['dragon'], 'Dragon lore.')
    e.sticky = 60_000
    const activated = scanWorldInfo(
      [book(e)],
      { chatHistory: ['Nothing here.'] },
      { timedState: new Map([['W#0', { at: 10_000, active: true }]]), nowMs: 80_000 },
    )
    expect(activated).toEqual([])
  })

  it('a lapsed active mark becomes a deactivation mark, not a sticky keep', () => {
    const e = entry(0, ['dragon'], 'Dragon lore.')
    e.sticky = 60_000
    const timedState = new Map([['W#0', { at: 10_000, active: true }]])
    const activated = scanWorldInfo(
      [book(e)],
      { chatHistory: ['Nothing here.'] },
      { timedState, nowMs: 80_000 },
    )
    expect(activated).toEqual([])
    expect(timedState.get('W#0')).toEqual({ at: 80_000, active: false })
  })

  it('cooldown blocks re-activation inside the window from deactivation', () => {
    const e = entry(0, ['dragon'], 'Dragon lore.')
    e.cooldown = 60_000
    const activated = scanWorldInfo(
      [book(e)],
      { chatHistory: ['A dragon!'] },
      { timedState: new Map([['W#0', { at: 10_000, active: false }]]), nowMs: 20_000 },
    )
    expect(activated).toEqual([])
  })

  it('cooldown counts from deactivation, not from the last activation', () => {
    const e = entry(0, ['dragon'], 'Dragon lore.')
    e.cooldown = 60_000
    const timedState = new Map([['W#0', { at: 30_000, active: false }]])
    // last activation was at 0, deactivation at 30s; at 50s the cooldown (60s from
    // deactivation) still blocks what an activation-based window would allow
    const blocked = scanWorldInfo(
      [book(e)],
      { chatHistory: ['A dragon!'] },
      { timedState, nowMs: 50_000 },
    )
    expect(blocked).toEqual([])
    expect(timedState.get('W#0')).toEqual({ at: 30_000, active: false })
    const released = scanWorldInfo(
      [book(e)],
      { chatHistory: ['A dragon!'] },
      { timedState, nowMs: 100_000 },
    )
    expect(released.map(({ entry: x }) => x.content)).toEqual(['Dragon lore.'])
  })

  it('an active mark never blocks re-activation (no cooldown while active)', () => {
    const e = entry(0, ['dragon'], 'Dragon lore.')
    e.cooldown = 60_000
    const activated = scanWorldInfo(
      [book(e)],
      { chatHistory: ['A dragon!'] },
      { timedState: new Map([['W#0', { at: 10_000, active: true }]]), nowMs: 20_000 },
    )
    expect(activated.map(({ entry: x }) => x.content)).toEqual(['Dragon lore.'])
  })

  it('a scan that drops the match writes a deactivation mark', () => {
    const e = entry(0, ['dragon'], 'Dragon lore.')
    e.cooldown = 60_000
    const timedState = new Map<string, { at: number; active: boolean }>()
    scanWorldInfo([book(e)], { chatHistory: ['A dragon!'] }, { timedState, nowMs: 10_000 })
    expect(timedState.get('W#0')).toEqual({ at: 10_000, active: true })
    scanWorldInfo([book(e)], { chatHistory: ['Nothing now.'] }, { timedState, nowMs: 30_000 })
    expect(timedState.get('W#0')).toEqual({ at: 30_000, active: false })
    const blocked = scanWorldInfo(
      [book(e)],
      { chatHistory: ['A dragon!'] },
      { timedState, nowMs: 50_000 },
    )
    expect(blocked).toEqual([])
  })
})

describe('per-entry scan depth', () => {
  it('scanDepth narrows the entry to its own message window', () => {
    const near = entry(0, ['dragon'], 'Near lore.')
    near.scanDepth = 1
    const activated = scanWorldInfo(
      [book(near)],
      { chatHistory: ['A dragon appeared long ago.', 'Just small talk now.'] },
    )
    // The global window is the last 2 messages, but scanDepth 1 only sees the latest
    expect(activated).toEqual([])
  })

  it('scanDepth null falls back to the global window', () => {
    const e = entry(0, ['dragon'], 'Dragon lore.')
    const activated = scanWorldInfo(
      [book(e)],
      { chatHistory: ['A dragon appeared long ago.', 'Just small talk now.'] },
    )
    expect(activated.map(({ entry: x }) => x.content)).toEqual(['Dragon lore.'])
  })
})

describe('token budget', () => {
  it('drops later entries once the budget is spent; ignoreBudget rides along', () => {
    const first = entry(0, ['alpha'], 'x'.repeat(40)) // 10 tokens
    const second = entry(2, ['beta'], 'y'.repeat(40)) // 10 tokens, order ties fall to uid order
    const exempt = entry(1, ['gamma'], 'z'.repeat(40))
    exempt.ignoreBudget = true
    const activated = scanWorldInfo(
      [book(first, second, exempt)],
      { chatHistory: ['alpha beta gamma'] },
      { tokenBudget: 12 },
    )
    const contents = activated.map(({ entry: e }) => e.content)
    expect(contents).toContain('x'.repeat(40))
    expect(contents).toContain('z'.repeat(40))
    expect(contents).not.toContain('y'.repeat(40))
  })
})
