/**
 * Preset service tests: legacy SillyTavern flat presets normalize into the
 * service's `Preset` shape on read, with the raw payload preserved for export.
 */
import { describe, expect, it } from 'vitest'
import { mkdtemp, writeFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import StPresetFileProvider from '../src/index.ts'
import type { PresetId } from '../src/index.ts'

/** SillyTavern's Default.json shape, reduced to the fields normalization reads. */
const ST_DEFAULT = {
  chat_completion_source: 'openai',
  temperature: 1,
  top_p: 1,
  top_k: 0,
  openai_max_tokens: 300,
  frequency_penalty: 0.5,
  stream_openai: false,
  seed: 42,
  prompts: [
    { name: 'Main Prompt', identifier: 'main', role: 'system', content: 'Write as {{char}}.' },
    { identifier: 'nsfw', name: 'Auxiliary Prompt', role: 'system', content: '' },
    { identifier: 'chatHistory', name: 'Chat History', marker: true },
  ],
  prompt_order: [
    { character_id: 100000, order: [{ identifier: 'main', enabled: true }, { identifier: 'nsfw', enabled: false }] },
    { character_id: 100001, order: [{ identifier: 'main', enabled: true }, { identifier: 'nsfw', enabled: true }, { identifier: 'chatHistory', enabled: true }] },
  ],
}

async function rootWithLegacy(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-st-preset-'))
  await writeFile(join(root, 'Default.json'), JSON.stringify(ST_DEFAULT), 'utf-8')
  return root
}

function provider(root: string): StPresetFileProvider {
  return new StPresetFileProvider(new Context(), { root })
}

describe('legacy SillyTavern preset normalization', () => {
  it('lists a legacy flat preset under its file name', async () => {
    const svc = provider(await rootWithLegacy())
    const rows = await svc.list()
    expect(rows.map((p) => p.name)).toContain('Default')
  })

  it('maps generation params, main prompt, and the 100001 prompt order', async () => {
    const svc = provider(await rootWithLegacy())
    const preset = await svc.get('Default' as PresetId)
    expect(preset).toBeDefined()
    expect(preset!.apiSource).toBe('openai')
    expect(preset!.generation.temp).toBe(1)
    expect(preset!.generation.top_k).toBe(0)
    expect(preset!.generation.max_tokens).toBe(300)
    expect(preset!.generation.frequency_penalty).toBe(0.5)
    expect(preset!.generation.stream).toBe(false)
    expect(preset!.generation.seed).toBe(42)
    expect(preset!.mainPrompt).toBe('Write as {{char}}.')
    expect(preset!.promptOrder.entries.map((e) => e.name)).toEqual(['Main Prompt', 'Auxiliary Prompt', 'Chat History'])
    expect(preset!.promptOrder.entries[1]!.enabled).toBe(true)
    expect(preset!.promptOrder.entries[2]!.constant).toBe(true)
  })

  it('keeps the raw legacy payload in extensions.st for round-trip export', async () => {
    const svc = provider(await rootWithLegacy())
    const preset = await svc.get('Default' as PresetId)
    expect((preset!.extensions.st as Record<string, unknown>).chat_completion_source).toBe('openai')
  })

  it('does not rewrite the legacy file until an update lands', async () => {
    const root = await rootWithLegacy()
    const svc = provider(root)
    await svc.get('Default' as PresetId)
    expect(await readdir(root)).toEqual(['Default.json'])
    const before = JSON.parse(await (await import('node:fs/promises')).readFile(join(root, 'Default.json'), 'utf-8')) as Record<string, unknown>
    expect(before.prompts).toBeDefined()
  })

  it('imports a legacy JSON body as a new normalized preset', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-st-preset-'))
    const svc = provider(root)
    const id = await svc.importJson(JSON.stringify(ST_DEFAULT))
    const preset = await svc.get(id)
    expect(preset?.mainPrompt).toBe('Write as {{char}}.')
    expect(preset?.generation.max_tokens).toBe(300)
  })
})
