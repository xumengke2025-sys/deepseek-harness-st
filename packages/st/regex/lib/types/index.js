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
import { Service } from '@deepseek-ai/cordis';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
// ── Script shape (ST's settings/regex.json entries) ───────────────────────
/** ST's placement flags; the array form of the legacy per-bit booleans. */
export const PLACEMENT = {
    USER_INPUT: 1,
    AI_OUTPUT: 2,
    /** Display-only transformation (ST's deprecated MD_DISPLAY). */
    DISPLAY: 0,
};
function substituteMacros(text, ctx) {
    return text
        .replace(/\{\{char\}\}/gi, ctx.char)
        .replace(/\{\{user\}\}/gi, ctx.user);
}
/** The targets a script runs on, resolving ST's placement array vs legacy booleans. */
export function scriptTargets(script) {
    const targets = new Set();
    if (script.placement.length > 0) {
        if (script.placement.includes(PLACEMENT.USER_INPUT))
            targets.add('user_input');
        if (script.placement.includes(PLACEMENT.AI_OUTPUT))
            targets.add('ai_output');
        if (script.placement.includes(PLACEMENT.DISPLAY))
            targets.add('display');
        return targets;
    }
    // Legacy booleans: markdownOnly is display-only; promptOnly covers both
    // history roles; a script with neither flag runs everywhere (ST's default).
    if (script.markdownOnly) {
        targets.add('display');
        return targets;
    }
    targets.add('user_input');
    targets.add('ai_output');
    if (!script.promptOnly)
        targets.add('display');
    return targets;
}
/**
 * Apply every enabled script targeting `target` to `text`.
 * @param scripts - all stored scripts, any order (the file order is preserved).
 * @param text - the message text to transform.
 * @param target - which side is asking (prompt assembly or display).
 * @param macros - {{user}}/{{char}} values; required only when a script substitutes.
 * @returns the transformed text.
 */
export function applyRegexScripts(scripts, text, target, macros = { char: '', user: '' }) {
    let out = text;
    for (const script of scripts) {
        if (script.disabled || !scriptTargets(script).has(target))
            continue;
        let replacement = script.replaceString;
        if (script.substituteRegex)
            replacement = substituteMacros(replacement, macros);
        try {
            out = out.replace(new RegExp(script.findRegex, 'g'), replacement);
        }
        catch {
            // An invalid regex source is one broken script, not a broken pipeline:
            // ST shows a per-script toast and skips; skipping keeps generation alive.
        }
        for (const trim of script.trimStrings) {
            out = out.split(trim).join('');
        }
    }
    return out;
}
/** Regex-script storage: one ST-compatible `settings/regex.json` file. */
export class StRegexService extends Service {
    constructor(ctx) {
        super(ctx, 'stRegex');
    }
}
class StRegexFileProvider extends StRegexService {
    config;
    static inject = [];
    constructor(ctx, config) {
        super(ctx);
        this.config = config;
    }
    get path() {
        return resolve(this.config.dataRoot, 'settings', 'regex.json');
    }
    async list() {
        if (!existsSync(this.path))
            return [];
        const raw = JSON.parse(await readFile(this.path, 'utf8'));
        return Array.isArray(raw) ? raw : [];
    }
    async save(scripts) {
        await mkdir(dirname(this.path), { recursive: true });
        await writeFile(this.path, JSON.stringify(scripts, null, 4));
    }
}
// ── Plugin entry ───────────────────────────────────────────────────────────
export const name = 'st-regex-file';
export default StRegexFileProvider;
//# sourceMappingURL=index.js.map