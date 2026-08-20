/**
 * SillyTavern regex-script engine and storage — a port of ST's
 * extensions/regex find-replace pipeline.
 *
 * Scripts live in `settings/regex.json` exactly as SillyTavern stores them.
 * The engine is pure data-driven text transformation: each enabled script
 * whose placement matches applies `findRegex → replaceString` (with `{{macro}}`
 * substitution when the script asks and `$1`-style backreferences natively),
 * then removes any `trimStrings` occurrences. The prompt side runs here (host,
 * before prompt assembly); the display side is mirrored in the client
 * (`ui-st-chat/src/client/regex.ts`) because the client bundle forbids
 * cross-plugin value imports — keep the two engines in lockstep.
 *
 * @module @deepseek-ai/dsh-st-regex
 */
import { Service, type Context } from '@deepseek-ai/cordis'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { existsSync } from 'node:fs'

// ── Script shape (ST's settings/regex.json entries) ───────────────────────

/** ST's placement flags; the array form of the legacy per-bit booleans. */
export const PLACEMENT = {
  USER_INPUT: 1,
  AI_OUTPUT: 2,
  /** Display-only transformation (ST's deprecated MD_DISPLAY). */
  DISPLAY: 0,
} as const

/** One find-replace script as SillyTavern persists it. */
export interface RegexScript {
  id: string
  scriptName: string
  /** ECMAScript regex source applied globally. */
  findRegex: string
  /** Replacement text; `$1` backreferences work natively. */
  replaceString: string
  /** Substrings deleted from the replaced text. */
  trimStrings: string[]
  /** Placement flags (ST's placement array); empty falls back to the legacy booleans. */
  placement: number[]
  disabled: boolean
  /** Legacy display-only flag. */
  markdownOnly: boolean
  /** Legacy prompt-only flag. */
  promptOnly: boolean
  /** Substitute {{user}}/{{char}} in the replacement text. */
  substituteRegex: boolean
}

/** Where a transformation is being applied; selects which scripts run. */
export type RegexTarget = 'user_input' | 'ai_output' | 'display'

/** Macro values the engine substitutes when a script asks for them. */
export interface RegexMacroContext {
  char: string
  user: string
}

function substituteMacros(text: string, ctx: RegexMacroContext): string {
  return text
    .replace(/\{\{char\}\}/gi, ctx.char)
    .replace(/\{\{user\}\}/gi, ctx.user)
}

/** The targets a script runs on, resolving ST's placement array vs legacy booleans. */
export function scriptTargets(script: RegexScript): Set<RegexTarget> {
  const targets = new Set<RegexTarget>()
  if (script.placement.length > 0) {
    if (script.placement.includes(PLACEMENT.USER_INPUT)) targets.add('user_input')
    if (script.placement.includes(PLACEMENT.AI_OUTPUT)) targets.add('ai_output')
    if (script.placement.includes(PLACEMENT.DISPLAY)) targets.add('display')
    return targets
  }
  // Legacy booleans: markdownOnly is display-only; promptOnly covers both
  // history roles; a script with neither flag runs everywhere (ST's default).
  if (script.markdownOnly) {
    targets.add('display')
    return targets
  }
  targets.add('user_input')
  targets.add('ai_output')
  if (!script.promptOnly) targets.add('display')
  return targets
}

/**
 * Apply every enabled script targeting `target` to `text`.
 * @param scripts - all stored scripts, any order (the file order is preserved).
 * @param text - the message text to transform.
 * @param target - which side is asking (prompt assembly or display).
 * @param macros - {{user}}/{{char}} values; required only when a script substitutes.
 * @returns the transformed text.
 */
export function applyRegexScripts(
  scripts: RegexScript[],
  text: string,
  target: RegexTarget,
  macros: RegexMacroContext = { char: '', user: '' },
): string {
  let out = text
  for (const script of scripts) {
    if (script.disabled || !scriptTargets(script).has(target)) continue
    let replacement = script.replaceString
    if (script.substituteRegex) replacement = substituteMacros(replacement, macros)
    try {
      out = out.replace(new RegExp(script.findRegex, 'g'), replacement)
    } catch {
      // An invalid regex source is one broken script, not a broken pipeline:
      // ST shows a per-script toast and skips; skipping keeps generation alive.
    }
    for (const trim of script.trimStrings) {
      out = out.split(trim).join('')
    }
  }
  return out
}

// ── Service definition ─────────────────────────────────────────────────────

declare module '@deepseek-ai/cordis' {
  interface Context {
    stRegex: StRegexService
  }
}

/** Regex-script storage: one ST-compatible `settings/regex.json` file. */
export abstract class StRegexService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'stRegex')
  }

  /** List all scripts in file order. */
  abstract list(): Promise<RegexScript[]>

  /** Replace the whole script list (ST saves the array in one write). */
  abstract save(scripts: RegexScript[]): Promise<void>
}

// ── File provider ──────────────────────────────────────────────────────────

export interface Config {
  /** SillyTavern data root (the directory containing `settings/`). */
  dataRoot: string
}

class StRegexFileProvider extends StRegexService {
  static inject = []

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx)
  }

  private get path(): string {
    return resolve(this.config.dataRoot, 'settings', 'regex.json')
  }

  async list(): Promise<RegexScript[]> {
    if (!existsSync(this.path)) return []
    const raw = JSON.parse(await readFile(this.path, 'utf8')) as unknown
    return Array.isArray(raw) ? raw as RegexScript[] : []
  }

  async save(scripts: RegexScript[]): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true })
    await writeFile(this.path, JSON.stringify(scripts, null, 4))
  }
}

// ── Plugin entry ───────────────────────────────────────────────────────────

export const name = 'st-regex-file'

export default StRegexFileProvider
