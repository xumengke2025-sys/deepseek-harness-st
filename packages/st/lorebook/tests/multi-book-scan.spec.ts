/**
 * Multi-book activation: uids repeat across books, so the scan must key on
 * world+uid; and embedded `character_book` cards convert to the scan format
 * with ST's `convertCharacterBook` field mapping.
 */
import { describe, expect, it } from 'vitest'
import { scanWorldInfo, bookFromCharacterBook, newWorldInfoEntry, world_info_position } from '../src/index.ts'

function entry(uid: number, key: string[], content: string): ReturnType<typeof newWorldInfoEntry> {
  return { ...newWorldInfoEntry(), uid, key, content }
}

describe('multi-book scan', () => {
  it('activates entries with the same uid from different books', () => {
    const activated = scanWorldInfo(
      [
        { name: 'Alpha', file: { entries: { 0: entry(0, ['dragon'], 'Alpha dragon lore.') } } },
        { name: 'Beta', file: { entries: { 0: entry(0, ['castle'], 'Beta castle lore.') } } },
      ],
      { chatHistory: ['A dragon circles the castle.'] },
    )
    const contents = activated.map(({ entry: e }) => e.content)
    expect(contents).toContain('Alpha dragon lore.')
    expect(contents).toContain('Beta castle lore.')
  })
})

describe('bookFromCharacterBook', () => {
  it('maps chara_card_v2 embedded entries onto the standalone shape', () => {
    const file = bookFromCharacterBook({
      name: 'Embedded',
      extensions: {},
      entries: [
        {
          keys: ['elf'], secondary_keys: ['forest'], comment: 'Elves',
          content: 'Elf lore.', constant: true, selective: false,
          insertion_order: 42, enabled: true, position: 'after_char', id: 7,
        },
        {
          keys: ['ghost'], comment: '', content: 'Ghost lore.',
          constant: false, selective: false, insertion_order: 1, enabled: false,
        },
      ],
    })
    const elf = file.entries['7']!
    expect(elf.key).toEqual(['elf'])
    expect(elf.keysecondary).toEqual(['forest'])
    expect(elf.order).toBe(42)
    expect(elf.position).toBe(world_info_position.afterChar)
    expect(elf.disable).toBe(false)
    // No id: the array index becomes both the key and the uid
    const ghost = file.entries['1']
    expect(ghost).toBeDefined()
    expect(ghost!.disable).toBe(true)
    expect(ghost!.position).toBe(world_info_position.beforeChar)
  })

  it('feeds the converted book into the scan like a standalone one', () => {
    const file = bookFromCharacterBook({
      name: 'Embedded',
      extensions: {},
      entries: [
        { keys: ['orb'], comment: '', content: 'Orb lore.', constant: false, selective: false, insertion_order: 100, enabled: true },
      ],
    })
    const activated = scanWorldInfo([{ name: 'Embedded', file }], { chatHistory: ['The orb glows.'] })
    expect(activated.map(({ entry: e }) => e.content)).toEqual(['Orb lore.'])
  })
})
