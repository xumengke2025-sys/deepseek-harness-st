/**
 * SillyTavern World Info (lorebook) service — faithful port of ST's format
 * and core activation engine.
 *
 * Files are `worlds/<name>.json` containing `{ name, entries: { [uid]: entry },
 * extensions }`. Entry fields, defaults, and the selective-logic enum mirror
 * ST's `newWorldInfoEntryDefinition` (public/scripts/world-info.js). The
 * activation scan ports ST's checkWorldInfo core path: constant entries,
 * primary/secondary key logic (AND_ANY / NOT_ALL / NOT_ANY / AND_ALL),
 * recursive scanning, timed effects (sticky/cooldown/delay), probability,
 * and token-budget insertion ordering.
 *
 * @module @deepseek-ai/dsh-st-lorebook
 */
import { Service, type Context } from '@deepseek-ai/cordis';
import { type CharacterBook } from '@deepseek-ai/dsh-st-character';
/** Secondary-key logic enum; ST's world_info_logic. */
export declare const world_info_logic: {
    readonly AND_ANY: 0;
    readonly NOT_ALL: 1;
    readonly NOT_ANY: 2;
    readonly AND_ALL: 3;
};
export type WorldInfoLogic = 0 | 1 | 2 | 3;
/** Entry insertion position enum; ST's world_info_position. */
export declare const world_info_position: {
    readonly before: 0;
    readonly after: 1;
    readonly ANTop: 2;
    readonly ANBottom: 3;
    readonly atDepth: 4;
    readonly EMTop: 5;
    readonly EMBottom: 6;
    readonly outlet: 7;
    readonly sysTop: 800;
    readonly sysBottom: 801;
    readonly beforeChar: 1000;
    readonly afterChar: 1001;
    readonly EMTopKmp: 1002;
    readonly EMBottomKmp: 1003;
};
/** ST's DEFAULT_DEPTH for entries. */
export declare const DEFAULT_DEPTH = 4;
/** ST's DEFAULT_WEIGHT for grouped entries. */
export declare const DEFAULT_WEIGHT = 100;
/** A World Info entry — exact serialization shape of ST's WIEntry. */
export interface WorldInfoEntry {
    uid: number;
    key: string[];
    keysecondary: string[];
    comment: string;
    content: string;
    constant: boolean;
    vectorized: boolean;
    selective: boolean;
    selectiveLogic: WorldInfoLogic;
    addMemo: boolean;
    order: number;
    position: number;
    disable: boolean;
    ignoreBudget: boolean;
    excludeRecursion: boolean;
    preventRecursion: boolean;
    matchPersonaDescription: boolean;
    matchCharacterDescription: boolean;
    matchCharacterPersonality: boolean;
    matchCharacterDepthPrompt: boolean;
    matchScenario: boolean;
    matchCreatorNotes: boolean;
    delayUntilRecursion: number;
    probability: number;
    useProbability: boolean;
    depth: number;
    outletName: string;
    group: string;
    groupOverride: boolean;
    groupWeight: number;
    scanDepth: number | null;
    caseSensitive: boolean | null;
    matchWholeWords: boolean | null;
    useGroupScoring: boolean | null;
    automationId: string;
    role: number;
    sticky: number | null;
    cooldown: number | null;
    delay: number | null;
    displayIndex: number;
    [key: string]: unknown;
}
/** A World Info book — the on-disk `worlds/<name>.json` shape. */
export interface WorldInfoFile {
    name?: string;
    entries: Record<string, WorldInfoEntry>;
    extensions?: Record<string, unknown>;
}
/** Listing row for the book picker. */
export interface WorldInfoListItem {
    file_id: string;
    name: string;
    extensions: Record<string, unknown>;
}
/** Create an entry with ST's template defaults. */
export declare function newWorldInfoEntry(): WorldInfoEntry;
/** Texts scanned for key matches. */
export interface WorldInfoScanTexts {
    chatHistory: string[];
    /** Total messages in the chat; gates entries whose `delay` (delay-until-message count) has not elapsed. */
    messageCount?: number;
    personaDescription?: string;
    characterDescription?: string;
    characterPersonality?: string;
    characterDepthPrompt?: string;
    scenario?: string;
    creatorNotes?: string;
}
/** Cross-request sticky/cooldown tracking for one entry: the last activation
 * or deactivation timestamp plus whether the entry was active at that mark
 * (ST counts cooldown from deactivation, not from the last activation). */
export interface TimedStateRecord {
    at: number;
    active: boolean;
}
/** Options for a scan. */
export interface WorldInfoScanOptions {
    /** Max messages scanned back; ST's world_info_depth (default 2 messages, capped). */
    scanDepthMessages?: number;
    /** Global case sensitivity override. */
    caseSensitive?: boolean;
    /** Whole-word matching; ST default true for latin content. */
    matchWholeWords?: boolean;
    /** Token budget cap for activated entries; ST default 25% of context. */
    tokenBudget?: number;
    /** Recursive scan iterations; ST's maxRecursionSteps. */
    maxRecursionSteps?: number;
    /** Cross-request timed tracking keyed `<world>#<uid>`; sticky keeps entries active past their match, cooldown (from deactivation) blocks re-activation. The scan writes activation and deactivation marks. */
    timedState?: Map<string, TimedStateRecord>;
    /** Vector-similarity hits keyed `<world>#<uid>` (from the st-vector service); vectorized entries activate through these scores instead of keyword matching. */
    vectorHits?: Map<string, number>;
    /** Wall clock for sticky/cooldown windows; defaults to Date.now(). */
    nowMs?: number;
    /** RNG source for probability rolls (injectable for tests). */
    random?: () => number;
}
/** An activated entry with its resolved content. */
export interface ActivatedEntry {
    entry: WorldInfoEntry;
    /** Which book the entry came from. */
    world: string;
}
/**
 * Scan books against the chat context and return activated entries.
 * Ports ST's primary path: constants first, key matching per message slice,
 * secondary-key logic, recursion over activated content, probability roll,
 * then sort by order for prompt assembly.
 */
export declare function scanWorldInfo(books: Array<{
    name: string;
    file: WorldInfoFile;
}>, texts: WorldInfoScanTexts, options?: WorldInfoScanOptions): ActivatedEntry[];
/**
 * Convert a chara_card_v2 embedded `character_book` to the standalone
 * `worlds/*.json` scan format; ST's conversion in `convertCharacterBook`.
 * @param book - the card's embedded book.
 * @returns a book with the standalone entry shape, keyed by entry id.
 */
export declare function bookFromCharacterBook(book: CharacterBook): WorldInfoFile;
declare module '@deepseek-ai/cordis' {
    interface Context {
        stLorebook: StLorebookService;
    }
}
/**
 * SillyTavern World Info file service. CRUD over `worlds/*.json` in the
 * ST-compatible layout, plus the activation scan for prompt assembly.
 */
export declare abstract class StLorebookService extends Service {
    constructor(ctx: Context);
    /** List all books. */
    abstract list(): Promise<WorldInfoListItem[]>;
    /** Read one book; `undefined` when missing (ST's readWorldInfoFile without dummy). */
    abstract get(name: string): Promise<WorldInfoFile | undefined>;
    /** Read one book, creating `{entries:{}}` when missing (ST's allowDummy). */
    abstract getOrDummy(name: string): Promise<WorldInfoFile>;
    /** Create/replace a book. */
    abstract save(name: string, file: WorldInfoFile): Promise<void>;
    /** Delete a book. */
    abstract delete(name: string): Promise<void>;
    /** Import raw JSON as a book; returns the stored name. */
    abstract import(name: string, json: string): Promise<string>;
    /** Worlds root directory (ST layout: `<dataRoot>/worlds`). */
    abstract readonly worldsDir: string;
}
export interface Config {
    /** SillyTavern data root (directory containing `worlds/`). */
    dataRoot: string;
}
declare class StLorebookFileProvider extends StLorebookService {
    readonly worldsDir: string;
    constructor(ctx: Context, config: Config);
    private path;
    private ensureDir;
    list(): Promise<WorldInfoListItem[]>;
    get(name: string): Promise<WorldInfoFile | undefined>;
    getOrDummy(name: string): Promise<WorldInfoFile>;
    save(name: string, file: WorldInfoFile): Promise<void>;
    delete(name: string): Promise<void>;
    import(name: string, json: string): Promise<string>;
}
export declare const name = "st-lorebook-file";
export default StLorebookFileProvider;
//# sourceMappingURL=index.d.ts.map