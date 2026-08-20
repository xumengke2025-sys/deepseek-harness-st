/**
 * SillyTavern character card service — faithful port of ST's character model.
 *
 * Characters are stored exactly as SillyTavern stores them: one PNG file per
 * character in `characters/`, where the avatar image IS the card. Card JSON
 * lives in PNG `tEXt` chunks (`chara` = V2 spec, `ccv3` = V3 spec, V3 wins),
 * base64-encoded. Top-level V1 fields and `data.*` V2 fields are both kept
 * and synchronized, mirroring `charaFormatData` / `readFromV2` in
 * ST's src/endpoints/characters.js.
 *
 * @module @deepseek-ai/dsh-st-character
 */
import { Service, type Context } from '@deepseek-ai/cordis';
/** Avatar render width; ST's AVATAR_WIDTH. */
export declare const AVATAR_WIDTH = 512;
/** Avatar render height; ST's AVATAR_HEIGHT. */
export declare const AVATAR_HEIGHT = 768;
/** V2 card `data.extensions.depth_prompt`. */
export interface DepthPrompt {
    prompt: string;
    depth: number;
    role: 'system' | 'user' | 'assistant';
}
/** V2 character book entry (ST world-info-in-card). */
export interface CharacterBookEntry {
    keys: string[];
    secondary_keys?: string[];
    comment: string;
    content: string;
    constant: boolean;
    selective: boolean;
    insertion_order: number;
    enabled: boolean;
    position?: 'before_char' | 'after_char';
    extensions?: Record<string, unknown>;
    id?: number;
    case_sensitive?: boolean;
    priority?: number;
}
/** V2 character book. */
export interface CharacterBook {
    name: string;
    description?: string;
    scan_depth?: number;
    token_budget?: number;
    recursive_scanning?: boolean;
    extensions: Record<string, unknown>;
    entries: CharacterBookEntry[];
}
/**
 * A SillyTavern character card object as stored inside the PNG.
 * Carries BOTH the V1 top-level fields and the V2 `data` block (ST keeps
 * them synchronized; `readFromV2` reconciles mismatches).
 */
export interface StCharacterCard {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creatorcomment: string;
    avatar: string;
    chat: string;
    talkativeness: string | number;
    fav: boolean;
    tags: string[];
    spec: 'chara_card_v2' | 'chara_card_v3';
    spec_version: string;
    data: {
        name: string;
        description: string;
        personality: string;
        scenario: string;
        first_mes: string;
        mes_example: string;
        creator_notes: string;
        system_prompt: string;
        post_history_instructions: string;
        alternate_greetings: string[];
        tags: string[];
        creator: string;
        character_version: string;
        extensions: {
            talkativeness: number;
            fav: boolean;
            world: string;
            depth_prompt: DepthPrompt;
            [key: string]: unknown;
        };
        character_book?: CharacterBook;
    };
    create_date?: string;
    [key: string]: unknown;
}
/** Shallow listing row for the character grid. */
export interface StCharacterListItem {
    avatar: string;
    name: string;
    tags: string[];
    fav: boolean;
    create_date?: string;
    /** Chat title derived by ST convention: `${name} - ${humanizedDateTime()}`. */
    chat: string;
    talkativeness: number;
    mes_example?: string;
}
/** Result row for full-card reads. */
export interface StCharacterFull extends StCharacterListItem {
    card: StCharacterCard;
}
/**
 * ST's humanizedDateTime: `YYYY-MM-DD@HHhMMmSSsmmmms`.
 * @param timestamp - epoch millis; defaults to now.
 * @returns the ST-format timestamp used in chat filenames.
 */
export declare function humanizedDateTime(timestamp?: number): string;
/**
 * Port of sanitize-filename's observable behavior for the characters surface:
 * ST passes card names through it before using them as filenames.
 */
export declare function sanitizeFilename(name: string): string;
/** Get a unique filename (base, ext) when `base.ext` already exists. ST's getUniqueName. */
export declare function getUniqueName(baseName: string, exists: (name: string) => boolean, startIndex?: number, maxTries?: number): string;
/**
 * Read card JSON from a PNG buffer. V3 (`ccv3`) wins over V2 (`chara`),
 * mirroring ST's character-card-parser read().
 * @throws when the PNG carries no card metadata.
 */
export declare function readCardFromPng(png: Buffer): string;
/**
 * Write card JSON into a PNG buffer as `chara` (V2) + `ccv3` (V3) tEXt
 * chunks inserted before IEND, removing any prior card chunks — the exact
 * behavior of ST's character-card-parser write().
 */
export declare function writeCardToPng(png: Buffer, cardJson: string): Buffer;
/**
 * Build a blank V2 card, mirroring charaFormatData's defaults for a
 * newly-created character.
 */
export declare function createBlankCard(name: string): StCharacterCard;
/**
 * Normalize any incoming card object to the synchronized V1+V2 shape.
 * Port of getCharaCardV2: cards without a `spec` go through convertToV2;
 * cards with a spec go through readFromV2 field reconciliation.
 */
export declare function normalizeCard(raw: Record<string, unknown>): StCharacterCard;
declare module '@deepseek-ai/cordis' {
    interface Context {
        stCharacter: StCharacterService;
    }
}
/**
 * SillyTavern character management service.
 *
 * A character is a PNG file: the image is the avatar, and the card JSON rides
 * in the PNG metadata. All operations keep the on-disk format byte-compatible
 * with SillyTavern, so a `characters/` directory is interchangeable between
 * the two applications.
 */
export declare abstract class StCharacterService extends Service {
    constructor(ctx: Context);
    /** List all characters (shallow rows for the grid). */
    abstract list(): Promise<StCharacterListItem[]>;
    /** Read one character's full card by avatar filename (e.g. `Seraphina.png`). */
    abstract get(avatar: string): Promise<StCharacterFull | undefined>;
    /** Create a character from form fields; returns the avatar filename. */
    abstract create(data: CharacterFormData): Promise<string>;
    /** Import a card from a base64 PNG data URL; returns the avatar filename. */
    abstract importPng(dataUrl: string): Promise<string>;
    /** Import a card from raw JSON (V1 or V2); returns the avatar filename. */
    abstract importJson(json: string): Promise<string>;
    /** Replace a character's card fields. */
    abstract edit(avatar: string, data: CharacterFormData): Promise<void>;
    /** Replace a character's avatar image, preserving the card. */
    abstract editAvatar(avatar: string, dataUrl: string): Promise<void>;
    /** Rename a character (renames the PNG; chats directory follows). */
    abstract rename(avatar: string, newName: string): Promise<string>;
    /** Delete a character and its chats directory. */
    abstract delete(avatar: string): Promise<void>;
    /** Export a character as a PNG data URL with embedded card. */
    abstract exportPng(avatar: string): Promise<string>;
    /** Toggle favourite flag. */
    abstract setFavourite(avatar: string, fav: boolean): Promise<void>;
    /** Serve the raw avatar PNG bytes. */
    abstract avatarBytes(avatar: string): Promise<Buffer | undefined>;
    /** List a character's expression-sprite names (files under `characters/sprites/<base>/`). */
    abstract listSprites(avatar: string): Promise<string[]>;
    /** Serve one expression sprite's raw PNG bytes. */
    abstract spriteBytes(avatar: string, expression: string): Promise<Buffer | undefined>;
    /** Characters root directory (ST layout: `<dataRoot>/characters`). */
    abstract readonly charactersDir: string;
}
/** Form fields for create/edit — mirrors ST's /api/characters/create body. */
export interface CharacterFormData {
    ch_name: string;
    description?: string;
    personality?: string;
    scenario?: string;
    first_mes?: string;
    mes_example?: string;
    creator_notes?: string;
    system_prompt?: string;
    post_history_instructions?: string;
    tags?: string | string[];
    creator?: string;
    character_version?: string;
    alternate_greetings?: string[] | string;
    talkativeness?: string | number;
    fav?: string | boolean;
    world?: string;
    depth_prompt_prompt?: string;
    depth_prompt_depth?: number | string;
    depth_prompt_role?: string;
}
export interface Config {
    /** SillyTavern data root (the directory containing `characters/`, `chats/`, ...). */
    dataRoot: string;
}
declare class StCharacterFileProvider extends StCharacterService {
    readonly charactersDir: string;
    constructor(ctx: Context, config: Config);
    private avatarPath;
    private ensureDir;
    private readCard;
    private writeCard;
    list(): Promise<StCharacterListItem[]>;
    get(avatar: string): Promise<StCharacterFull | undefined>;
    private applyForm;
    create(data: CharacterFormData): Promise<string>;
    importPng(dataUrl: string): Promise<string>;
    importJson(json: string): Promise<string>;
    edit(avatar: string, data: CharacterFormData): Promise<void>;
    editAvatar(avatar: string, dataUrl: string): Promise<void>;
    rename(avatar: string, newName: string): Promise<string>;
    delete(avatar: string): Promise<void>;
    exportPng(avatar: string): Promise<string>;
    setFavourite(avatar: string, fav: boolean): Promise<void>;
    avatarBytes(avatar: string): Promise<Buffer | undefined>;
    listSprites(avatar: string): Promise<string[]>;
    spriteBytes(avatar: string, expression: string): Promise<Buffer | undefined>;
    private spriteDir;
}
export declare const name = "st-character-file";
export default StCharacterFileProvider;
//# sourceMappingURL=index.d.ts.map