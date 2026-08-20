/** StInstructFileProvider: ST-format instruct template files under instructs/. */
import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import StInstructFileProvider, { type StInstruct } from '../src/index.ts'

/** Minimal Context stub: the Service base class only touches `reflect.provide`. */
const fakeCtx = { reflect: { provide: () => {} } } as never

let root = ''

async function makeProvider(): Promise<StInstructFileProvider> {
  root = await mkdtemp(join(tmpdir(), 'st-instruct-'))
  return new StInstructFileProvider(fakeCtx, { dataRoot: root })
}

afterEach(async () => {
  if (root !== '') await rm_rf(root)
})

/** rmdir recursive without pulling fs-extra habits into the suite. */
async function rm_rf(dir: string): Promise<void> {
  await (await import('node:fs/promises')).rm(dir, { recursive: true, force: true })
}

const CHATML: StInstruct = {
  filename: 'ChatML',
  name: 'ChatML',
  template: {
    systemSequence: '<|im_start|>system\n',
    systemSequencePrefix: '',
    systemSequenceSuffix: '',
    inputSequence: '<|im_start|>user\n',
    inputSuffix: '<|im_end|>\n',
    outputSequence: '<|im_start|>assistant\n',
    outputSuffix: '<|im_end|>\n',
    firstOutputSequence: '',
    firstOutputSuffix: '',
    lastOutputSequence: '',
    lastOutputSuffix: '',
    stopSequence: '<|im_end|>',
    separatorSequence: '',
    wrap: false,
    trimSequences: false,
  },
}

describe('StInstructFileProvider', () => {
  it('lists an empty directory as an empty library', async () => {
    const provider = await makeProvider()
    expect(await provider.list()).toEqual([])
  })

  it('writes ST snake_case fields and reads a real ST file back', async () => {
    const provider = await makeProvider()
    await provider.save(CHATML)
    const raw = JSON.parse(await readFile(join(root, 'instructs', 'ChatML.json'), 'utf8')) as Record<string, unknown>
    expect(raw.system_sequence).toBe('<|im_start|>system\n')
    expect(raw.input_suffix).toBe('<|im_end|>\n')
    expect(raw.trim_sequences).toBe(false)

    const list = await provider.list()
    expect(list).toEqual([CHATML])
  })

  it('sorts by file name and overwrites the same filename', async () => {
    const provider = await makeProvider()
    await provider.save(CHATML)
    await provider.save({ ...CHATML, filename: 'Alpaca', name: 'Alpaca', template: { ...CHATML.template, systemSequence: '### Instruction:\n', stopSequence: '###' } })
    expect((await provider.list()).map((t) => t.filename)).toEqual(['Alpaca', 'ChatML'])

    await provider.save({ ...CHATML, template: { ...CHATML.template, stopSequence: 'STOP' } })
    expect((await provider.list()).find((t) => t.filename === 'ChatML')?.template.stopSequence).toBe('STOP')
  })

  it('defaults absent ST fields and skips malformed files', async () => {
    const provider = await makeProvider()
    // A hand-written ST file carrying only the fields its author cared about.
    await mkdir(join(root, 'instructs'), { recursive: true })
    await writeFile(join(root, 'instructs', 'Sparse.json'), JSON.stringify({
      name: 'Sparse',
      input_sequence: 'User: ',
      output_sequence: 'Bot: ',
      wrap: true,
      unknown_future_field: 42,
    }))
    await writeFile(join(root, 'instructs', 'Broken.json'), '{not json')
    const list = await provider.list()
    expect(list).toHaveLength(1)
    expect(list[0]!.template.inputSequence).toBe('User: ')
    expect(list[0]!.template.outputSuffix).toBe('')
    expect(list[0]!.template.wrap).toBe(true)
    expect(list[0]!.template.stopSequence).toBe('')
    expect((await readdir(join(root, 'instructs'))).length).toBe(2)
  })

  it('rejects an empty filename and a missing delete', async () => {
    const provider = await makeProvider()
    await expect(provider.save({ ...CHATML, filename: '  ' })).rejects.toThrow('empty')
    await expect(provider.delete('nope')).rejects.toThrow('not found')
  })
})
