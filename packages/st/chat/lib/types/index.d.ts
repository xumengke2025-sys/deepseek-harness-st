/**
 * SillyTavern chat service — faithful port of ST's chat storage model.
 *
 * Chats are JSONL files: the first line is a header (`user_name`,
 * `character_name`, `chat_metadata`, `create_date`); every following line is
 * one message (`name`, `is_user`, `send_date`, `mes`, `extra`, and swipe
 * state `swipes`/`swipe_id`/`swipe_info`). Files live at
 * `chats/<character>/<chatName>.jsonl` — byte-compatible with SillyTavern,
 * so directories are interchangeable between the two applications.
 *
 * @module @deepseek-ai/dsh-st-chat
 */
import { Service, type Context } from '@deepseek-ai/cordis';
/** Per-swipe metadata, parallel to `swipes`; port of ST's SwipeInfo. */
export interface SwipeInfo {
    send_date: string;
    gen_started?: string;
    gen_finished?: string;
    extra: Record<string, unknown>;
}
/**
 * One chat message as serialized on a JSONL line.
 * `mes` always equals `swipes[swipe_id]` when swipe data exists.
 */
export interface StChatMessage {
    name: string;
    is_user: boolean;
    is_system?: boolean;
    send_date: string;
    mes: string;
    extra: {
        bias?: string | null;
        token_count?: number;
        api?: string;
        model?: string;
        title?: string;
        image?: string;
        image_swipes?: string[];
        typing?: string;
        reasoning?: string;
        [key: string]: unknown;
    };
    swipes?: string[];
    swipe_id?: number;
    swipe_info?: SwipeInfo[];
    gen_started?: string;
    gen_finished?: string;
    force_avatar?: string;
    original_avatar?: string;
    [key: string]: unknown;
}
/** First JSONL line of every chat file. Header lines from older files may carry message fields too. */
export interface StChatHeader {
    user_name: string;
    character_name: string;
    chat_metadata: Record<string, unknown>;
    create_date: string;
    [key: string]: unknown;
}
/** A full chat: header plus messages. */
export interface StChat {
    header: StChatHeader;
    messages: StChatMessage[];
}
/** Listing row for the chat picker; port of ST's getChatInfo result. */
export interface StChatInfo {
    file_id: string;
    file_name: string;
    file_size: string;
    chat_items: number;
    mes: string;
    last_mes: string | number;
    chat_metadata?: Record<string, unknown>;
}
/** One chat search hit: the chat id plus a matching message snippet. */
export interface StChatSearchHit {
    chatId: string;
    avatar: string;
    /** Character name from the chat header. */
    characterName: string;
    /** Index of the first matching message. */
    messageIndex: number;
    /** Text snippet around the match (up to 200 chars). */
    snippet: string;
}
/** Build a message in ST's exact serialization shape. */
export declare function makeMessage(name: string, isUser: boolean, mes: string): StChatMessage;
/** Initialize swipe arrays on a message that has none; port of script.js 101282. */
export declare function initSwipes(message: StChatMessage): void;
declare module '@deepseek-ai/cordis' {
    interface Context {
        stChat: StChatService;
    }
}
/**
 * SillyTavern chat persistence service.
 * All files are JSONL under `<dataRoot>/chats/<character>/`, with throttled
 * backups written to `<dataRoot>/backups/dsh/` — ST-compatible on disk.
 */
export declare abstract class StChatService extends Service {
    constructor(ctx: Context);
    /** List chats for a character (avatar filename, e.g. `Seraphina.png`). */
    abstract list(avatar: string): Promise<StChatInfo[]>;
    /** Read one chat file. */
    abstract get(avatar: string, chatId: string): Promise<StChat | undefined>;
    /** Create a new chat for a character; returns the chat id (file name sans extension). */
    abstract create(avatar: string, userName: string, characterName: string, firstMessage?: string): Promise<string>;
    /** Save a chat (header + messages) to `<avatar>/<chatId>.jsonl`. */
    abstract save(avatar: string, chatId: string, chat: StChat): Promise<void>;
    /** Delete a chat file. */
    abstract delete(avatar: string, chatId: string): Promise<void>;
    /** Rename a chat file; returns the new id. */
    abstract rename(avatar: string, chatId: string, newName: string): Promise<string>;
    /**
     * Branch a chat (ST's checkpoint / "branch from here"): copy the messages up
     * to index `upto` (inclusive; omitted copies all) into a new chat file.
     * @returns the new chat id.
     */
    abstract checkpoint(avatar: string, chatId: string, upto?: number): Promise<string>;
    /** Export a chat as raw JSONL text. */
    abstract exportChat(avatar: string, chatId: string): Promise<string | undefined>;
    /** Import a chat from JSONL text; returns the assigned chat id. */
    abstract importChat(avatar: string, jsonl: string): Promise<string>;
    /** Chats root directory (ST layout: `<dataRoot>/chats`). */
    abstract readonly chatsDir: string;
    /**
     * Full-text search across all chats (all characters). Returns one hit per
     * matching chat, ordered by most recent match first.
     * @param query - case-insensitive substring to find.
     */
    abstract search(query: string): Promise<StChatSearchHit[]>;
}
export interface Config {
    /** SillyTavern data root (directory containing `chats/`). */
    dataRoot: string;
    /** Interval in ms between chat backups per file; ST uses 60_000. */
    backupIntervalMs: number;
}
declare class StChatFileProvider extends StChatService {
    readonly chatsDir: string;
    private readonly backupsDir;
    private readonly lastBackupAt;
    constructor(ctx: Context, config: Config);
    private charDir;
    private chatPath;
    private ensureDir;
    private serialize;
    private parse;
    list(avatar: string): Promise<StChatInfo[]>;
    get(avatar: string, chatId: string): Promise<StChat | undefined>;
    create(avatar: string, userName: string, characterName: string, firstMessage?: string): Promise<string>;
    save(avatar: string, chatId: string, chat: StChat): Promise<void>;
    /** Throttled backup, port of ST's getBackupFunction with 60s interval. */
    private maybeBackup;
    delete(avatar: string, chatId: string): Promise<void>;
    rename(avatar: string, chatId: string, newName: string): Promise<string>;
    checkpoint(avatar: string, chatId: string, upto?: number): Promise<string>;
    exportChat(avatar: string, chatId: string): Promise<string | undefined>;
    importChat(avatar: string, jsonl: string): Promise<string>;
    search(query: string): Promise<StChatSearchHit[]>;
}
export declare const name = "st-chat-file";
export default StChatFileProvider;
//# sourceMappingURL=index.d.ts.map