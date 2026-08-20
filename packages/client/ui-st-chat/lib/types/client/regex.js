import { ST_REGEX_PLACEMENT } from "./contract.js";
/** The targets a script runs on, resolving ST's placement array vs legacy booleans. */
function scriptRunsOnDisplay(script) {
    if (script.placement.length > 0)
        return script.placement.includes(ST_REGEX_PLACEMENT.DISPLAY);
    // Legacy booleans: markdownOnly is display-only; promptOnly excludes display.
    return script.markdownOnly || !script.promptOnly;
}
/**
 * Apply every enabled display-targeting script to one rendered text.
 * @param scripts - all stored scripts, in file order.
 * @param text - the stored message text.
 * @param macros - {{user}}/{{char}} values; required only when a script substitutes.
 * @returns the display text; the stored text is never rewritten.
 */
export function displayRegex(scripts, text, macros = { char: '', user: '' }) {
    let out = text;
    for (const script of scripts) {
        if (script.disabled || !scriptRunsOnDisplay(script))
            continue;
        let replacement = script.replaceString;
        if (script.substituteRegex) {
            replacement = replacement.replace(/\{\{char\}\}/gi, macros.char).replace(/\{\{user\}\}/gi, macros.user);
        }
        try {
            out = out.replace(new RegExp(script.findRegex, 'g'), replacement);
        }
        catch {
            // An invalid regex source is one broken script, not a broken renderer;
            // the row shows its stored text, matching the host engine's skip.
        }
        for (const trim of script.trimStrings) {
            out = out.split(trim).join('');
        }
    }
    return out;
}
//# sourceMappingURL=regex.js.map