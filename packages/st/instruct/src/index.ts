/**
 * SillyTavern instruct template library — a port of ST's `instructs/`
 * directory (text templates: ChatML, Alpaca, Metharme, ...).
 *
 * One template per `<name>.json` file using ST's snake_case field names, so
 * a checkout's `instructs/` directory works unmodified. Serialization is
 * owned by `dsh-st-generate`'s `serializeInstruct`; this service is pure
 * storage: list, upsert, delete.
 *
 * @module @deepseek-ai/dsh-st-instruct
 */
import { Service, type Context } from '@deepseek-ai/cordis'
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import type { InstructTemplate } from '@deepseek-ai/dsh-st-generate'

/** One named instruct template as ST persists it in `instructs/<name>.json`. */
export interface StInstruct {
  /** File name sans extension; also the template's id. */
  filename: string
  /** Display name (ST's `name` field). */
  name: string
  /** The wrapper sequences ST's instruct mode serializes with. */
  template: InstructTemplate
}

/** ST's on-disk field names, mapped to {@link InstructTemplate} members. */
const FIELDS: ReadonlyArray<{ disk: string; key: keyof InstructTemplate }> = [
  { disk: 'system_sequence', key: 'systemSequence' },
  { disk: 'system_sequence_prefix', key: 'systemSequencePrefix' },
  { disk: 'system_sequence_suffix', key: 'systemSequenceSuffix' },
  { disk: 'input_sequence', key: 'inputSequence' },
  { disk: 'input_suffix', key: 'inputSuffix' },
  { disk: 'output_sequence', key: 'outputSequence' },
  { disk: 'output_suffix', key: 'outputSuffix' },
  { disk: 'first_output_sequence', key: 'firstOutputSequence' },
  { disk: 'first_output_suffix', key: 'firstOutputSuffix' },
  { disk: 'last_output_sequence', key: 'lastOutputSequence' },
  { disk: 'last_output_suffix', key: 'lastOutputSuffix' },
  { disk: 'stop_sequence', key: 'stopSequence' },
  { disk: 'separator_sequence', key: 'separatorSequence' },
  { disk: 'wrap', key: 'wrap' },
  { disk: 'trim_sequences', key: 'trimSequences' },
]

/** Templates are named by file; strip the extension and path separators. */
function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim()
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    stInstruct: StInstructService
  }
}

/** Instruct template storage: one ST-format JSON per file under `instructs/`. */
export abstract class StInstructService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'stInstruct')
  }

  /** List all templates sorted by file name. */
  abstract list(): Promise<StInstruct[]>

  /** Create or overwrite one template; `filename` decides which file. */
  abstract save(instruct: StInstruct): Promise<StInstruct>

  /** Delete one template file; missing files are an error. */
  abstract delete(filename: string): Promise<void>
}

// ── File provider ──────────────────────────────────────────────────────────

export interface Config {
  /** SillyTavern data root (the directory containing `instructs/`). */
  dataRoot: string
}

class StInstructFileProvider extends StInstructService {
  static inject = []

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx)
  }

  private get dir(): string {
    return resolve(this.config.dataRoot, 'instructs')
  }

  async list(): Promise<StInstruct[]> {
    if (!existsSync(this.dir)) return []
    const files = (await readdir(this.dir)).filter((f) => f.endsWith('.json')).sort()
    const instructs: StInstruct[] = []
    for (const file of files) {
      try {
        const raw = JSON.parse(await readFile(join(this.dir, file), 'utf8')) as Record<string, unknown>
        const template = {} as Record<string, unknown>
        for (const { disk, key } of FIELDS) {
          const value = raw[disk]
          if (key === 'wrap' || key === 'trimSequences') template[key] = value === true
          else template[key] = typeof value === 'string' ? value : ''
        }
        instructs.push({
          filename: file.slice(0, -'.json'.length),
          name: typeof raw.name === 'string' ? raw.name : file,
          template: template as unknown as InstructTemplate,
        })
      } catch {
        // A malformed template file is one unreadable entry, not a broken
        // library; ST toasts per file and keeps the list alive.
      }
    }
    return instructs
  }

  async save(instruct: StInstruct): Promise<StInstruct> {
    const filename = sanitizeFilename(instruct.filename)
    if (filename.length === 0) throw new Error('instruct filename is empty')
    const disk: Record<string, unknown> = { name: instruct.name }
    for (const { disk: field, key } of FIELDS) {
      disk[field] = instruct.template[key]
    }
    await mkdir(this.dir, { recursive: true })
    await writeFile(join(this.dir, `${filename}.json`), JSON.stringify(disk, null, 4))
    return { ...instruct, filename }
  }

  async delete(filename: string): Promise<void> {
    const path = join(this.dir, `${sanitizeFilename(filename)}.json`)
    if (!existsSync(path)) throw new Error(`instruct ${filename} not found`)
    await unlink(path)
  }
}

// ── Plugin entry ───────────────────────────────────────────────────────────

export const name = 'st-instruct-file'

export default StInstructFileProvider
