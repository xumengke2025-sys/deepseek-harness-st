/**
 * Client-side mirror of the st-regex engine's display half. The client bundle
 * forbids cross-plugin value imports, so `@deepseek-ai/dsh-st-regex`'s
 * `applyRegexScripts` is re-implemented here over the wire types — keep the
 * two engines in lockstep (the host runs user_input/ai_output on the prompt,
 * this one runs display on rendered text).
 * @module ./regex.ts
 */
import type { StRegexScript } from './contract.ts'
import { ST_REGEX_PLACEMENT } from './contract.ts'

/** The display-side macro values a script may substitute. */
export interface RegexMacroContext {
  char: string
  user: string
}

/** The targets a script runs on, resolving ST's placement array vs legacy booleans. */
function scriptRunsOnDisplay(script: StRegexScript): boolean {
  if (script.placement.length > 0) return script.placement.includes(ST_REGEX_PLACEMENT.DISPLAY)
  // Legacy booleans: markdownOnly is display-only; promptOnly excludes display.
  return script.markdownOnly || !script.promptOnly
}

/**
 * Apply every enabled display-targeting script to one rendered text.
 * @param scripts - all stored scripts, in file order.
 * @param text - the stored message text.
 * @param macros - {{user}}/{{char}} values; required only when a script substitutes.
 * @returns the display text; the stored text is never rewritten.
 */
export function displayRegex(
  scripts: StRegexScript[],
  text: string,
  macros: RegexMacroContext = { char: '', user: '' },
): string {
  let out = text
  for (const script of scripts) {
    if (script.disabled || !scriptRunsOnDisplay(script)) continue
    let replacement = script.replaceString
    if (script.substituteRegex) {
      replacement = replacement.replace(/\{\{char\}\}/gi, macros.char).replace(/\{\{user\}\}/gi, macros.user)
    }
    try {
      out = out.replace(new RegExp(script.findRegex, 'g'), replacement)
    } catch {
      // An invalid regex source is one broken script, not a broken renderer;
      // the row shows its stored text, matching the host engine's skip.
    }
    for (const trim of script.trimStrings) {
      out = out.split(trim).join('')
    }
  }
  return out
}
