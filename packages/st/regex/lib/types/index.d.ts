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
import { Service, type Context } from '@deepseek-ai/cordis';
/** ST's placement flags; the array form of the legacy per-bit booleans. */
export declare const PLACEMENT: {
    readonly USER_INPUT: 1;
    readonly AI_OUTPUT: 2;
    /** Display-only transformation (ST's deprecated MD_DISPLAY). */
    readonly DISPLAY: 0;
};
/** One find-replace script as SillyTavern persists it. */
export interface RegexScript {
    id: string;
    scriptName: string;
    /** ECMAScript regex source applied globally. */
    findRegex: string;
    /** Replacement text; `$1` backreferences work natively. */
    replaceString: string;
    /** Substrings deleted from the replaced text. */
    trimStrings: string[];
    /** Placement flags (ST's placement array); empty falls back to the legacy booleans. */
    placement: number[];
    disabled: boolean;
    /** Legacy display-only flag. */
    markdownOnly: boolean;
    /** Legacy prompt-only flag. */
    promptOnly: boolean;
    /** Substitute {{user}}/{{char}} in the replacement text. */
    substituteRegex: boolean;
}
/** Where a transformation is being applied; selects which scripts run. */
export type RegexTarget = 'user_input' | 'ai_output' | 'display';
/** Macro values the engine substitutes when a script asks for them. */
export interface RegexMacroContext {
    char: string;
    user: string;
}
/** The targets a script runs on, resolving ST's placement array vs legacy booleans. */
export declare function scriptTargets(script: RegexScript): Set<RegexTarget>;
/**
 * Apply every enabled script targeting `target` to `text`.
 * @param scripts - all stored scripts, any order (the file order is preserved).
 * @param text - the message text to transform.
 * @param target - which side is asking (prompt assembly or display).
 * @param macros - {{user}}/{{char}} values; required only when a script substitutes.
 * @returns the transformed text.
 */
export declare function applyRegexScripts(scripts: RegexScript[], text: string, target: RegexTarget, macros?: RegexMacroContext): string;
declare module '@deepseek-ai/cordis' {
    interface Context {
        stRegex: StRegexService;
    }
}
/** Regex-script storage: one ST-compatible `settings/regex.json` file. */
export declare abstract class StRegexService extends Service {
    constructor(ctx: Context);
    /** List all scripts in file order. */
    abstract list(): Promise<RegexScript[]>;
    /** Replace the whole script list (ST saves the array in one write). */
    abstract save(scripts: RegexScript[]): Promise<void>;
}
export interface Config {
    /** SillyTavern data root (the directory containing `settings/`). */
    dataRoot: string;
}
declare class StRegexFileProvider extends StRegexService {
    private readonly config;
    static inject: never[];
    constructor(ctx: Context, config: Config);
    private get path();
    list(): Promise<RegexScript[]>;
    save(scripts: RegexScript[]): Promise<void>;
}
export declare const name = "st-regex-file";
export default StRegexFileProvider;
//# sourceMappingURL=index.d.ts.map