/**
 * Persona library storage: one JSON per file under `personas/`, listed
 * sorted, upserted by filename, deleted with a loud miss.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import StPersonaFileProvider from '../src/index.ts'

let root = ''

/** Minimal Context stub: the Service base class only touches `reflect.provide`. */
const fakeCtx = { reflect: { provide: () => {} } } as never

async function makeProvider(): Promise<StPersonaFileProvider> {
  root = await mkdtemp(join(tmpdir(), 'st-persona-'))
  return new StPersonaFileProvider(fakeCtx, { dataRoot: root })
}

afterEach(async () => {
  if (root !== '') await rm(root, { recursive: true, force: true })
  root = ''
})

describe('persona library', () => {
  it('lists empty when the directory does not exist', async () => {
    const provider = await makeProvider()
    expect(await provider.list()).toEqual([])
  })

  it('saves one file per persona and lists them sorted', async () => {
    const provider = await makeProvider()
    await provider.save({ filename: 'zeta', name: 'Zeta', description: 'A pilot.' })
    await provider.save({ filename: 'alpha', name: 'Alpha', description: 'A scribe.' })
    expect(await provider.list()).toEqual([
      { filename: 'alpha', name: 'Alpha', description: 'A scribe.' },
      { filename: 'zeta', name: 'Zeta', description: 'A pilot.' },
    ])
  })

  it('overwrites on save with the same filename', async () => {
    const provider = await makeProvider()
    await provider.save({ filename: 'kai', name: 'Kai', description: 'Old.' })
    await provider.save({ filename: 'kai', name: 'Kai', description: 'New.' })
    expect(await provider.list()).toEqual([{ filename: 'kai', name: 'Kai', description: 'New.' }])
  })

  it('rejects an empty filename and a missing delete', async () => {
    const provider = await makeProvider()
    await expect(provider.save({ filename: '  ', name: 'X', description: '' })).rejects.toThrow('empty')
    await expect(provider.delete('nobody')).rejects.toThrow('not found')
  })
})
