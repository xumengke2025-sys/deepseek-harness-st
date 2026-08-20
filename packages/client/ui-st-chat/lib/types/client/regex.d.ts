/**
 * Client-side mirror of the st-regex engine's display half. The client bundle
 * forbids cross-plugin value imports, so `@deepseek-ai/dsh-st-regex`'s
 * `applyRegexScripts` is re-implemented here over the wire types — keep the
 * two engines in lockstep (the host runs user_input/ai_output on the prompt,
 * this one runs display on rendered text).
 * @module ./regex.ts
 */
import type { StRegexScript } from './contract.ts';
/** The display-side macro values a script may substitute. */
export interface RegexMacroContext {
    char: string;
    user: string;
}
/**
 * Apply every enabled display-targeting script to one rendered text.
 * @param scripts - all stored scripts, in file order.
 * @param text - the stored message text.
 * @param macros - {{user}}/{{char}} values; required only when a script substitutes.
 * @returns the display text; the stored text is never rewritten.
 */
export declare function displayRegex(scripts: StRegexScript[], text: string, macros?: RegexMacroContext): string;
//# sourceMappingURL=regex.d.ts.map