/**
 * Expression-sprite listing/serving over the ST characters directory:
 * sprites live under `characters/sprites/<base>/<expression>.png` and are
 * absent for most characters — both paths must behave.
 */
import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import StCharacterFileProvider from '../src/index.ts'

async function fixtureDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'dsh-st-sprites-'))
}

describe('expression sprites', () => {
  it('lists and serves sprites, sorted, without the .png suffix', async () => {
    const dir = await fixtureDir()
    const ctx = new Context()
    await ctx.plugin(StCharacterFileProvider, { dataRoot: dir })
    const avatar = await ctx.stCharacter.create({ ch_name: 'Sprite Bot' })

    const spriteDir = join(dir, 'characters', 'sprites', 'Sprite Bot')
    await mkdir(spriteDir, { recursive: true })
    await writeFile(join(spriteDir, 'joy.png'), 'png-joy')
    await writeFile(join(spriteDir, 'anger.png'), 'png-anger')

    expect(await ctx.stCharacter.listSprites(avatar)).toEqual(['anger', 'joy'])
    expect((await ctx.stCharacter.spriteBytes(avatar, 'joy'))?.toString()).toBe('png-joy')
    // Unknown expressions and path escapes resolve to undefined, not an error.
    expect(await ctx.stCharacter.spriteBytes(avatar, 'sorrow')).toBeUndefined()
    expect(await ctx.stCharacter.spriteBytes(avatar, '../Sprite Bot')).toBeUndefined()
  })

  it('returns an empty list when the character has no sprite directory', async () => {
    const dir = await fixtureDir()
    const ctx = new Context()
    await ctx.plugin(StCharacterFileProvider, { dataRoot: dir })
    await ctx.stCharacter.create({ ch_name: 'Plain Bot' })

    expect(await ctx.stCharacter.listSprites('Plain Bot.png')).toEqual([])
  })
})
