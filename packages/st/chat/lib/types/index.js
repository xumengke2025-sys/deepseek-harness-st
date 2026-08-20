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
import { Service } from '@deepseek-ai/cordis';
import { readFile, writeFile, readdir, mkdir, unlink, rename } from 'node:fs/promises';
import { join, resolve, parse as parsePath } from 'node:path';
import { existsSync } from 'node:fs';
import { humanizedDateTime, sanitizeFilename } from '@deepseek-ai/dsh-st-character';
/** @param bytes File size in bytes. @returns Human-readable size, ST's formatBytes. */
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${(bytes / k ** i).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}
/** Build a message in ST's exact serialization shape. */
export function makeMessage(name, isUser, mes) {
    const now = new Date().toISOString();
    return {
        name,
        is_user: isUser,
        is_system: false,
        send_date: now,
        mes,
        extra: {},
    };
}
/** Initialize swipe arrays on a message that has none; port of script.js 101282. */
export function initSwipes(message) {
    if (typeof message.swipe_id !== 'number') {
        message.swipe_id = 0;
        message.swipes = [];
        message.swipes[0] = message.mes;
        message.swipe_info = [];
        message.swipe_info[0] = {
            send_date: message.send_date,
            ...(message.gen_started === undefined ? {} : { gen_started: message.gen_started }),
            ...(message.gen_finished === undefined ? {} : { gen_finished: message.gen_finished }),
            extra: structuredClone(message.extra ?? {}),
        };
    }
}
/**
 * SillyTavern chat persistence service.
 * All files are JSONL under `<dataRoot>/chats/<character>/`, with throttled
 * backups written to `<dataRoot>/backups/dsh/` — ST-compatible on disk.
 */
export class StChatService extends Service {
    constructor(ctx) {
        super(ctx, 'stChat');
    }
}
class StChatFileProvider extends StChatService {
    chatsDir;
    backupsDir;
    lastBackupAt = new Map();
    constructor(ctx, config) {
        super(ctx);
        this.chatsDir = resolve(config.dataRoot, 'chats');
        this.backupsDir = resolve(config.dataRoot, 'backups', 'dsh');
        ctx.effect(() => () => this.lastBackupAt.clear());
    }
    charDir(avatar) {
        return join(this.chatsDir, sanitizeFilename(parsePath(avatar).name));
    }
    chatPath(avatar, chatId) {
        return join(this.charDir(avatar), `${sanitizeFilename(chatId)}.jsonl`);
    }
    async ensureDir(dir) {
        if (!existsSync(dir))
            await mkdir(dir, { recursive: true });
    }
    serialize(chat) {
        return [chat.header, ...chat.messages].map((o) => JSON.stringify(o)).join('\n') + '\n';
    }
    parse(lines, pathFor) {
        const jsonLines = lines.split('\n').filter((l) => l.trim().length > 0);
        if (jsonLines.length === 0)
            return undefined;
        const objects = jsonLines.map((l) => JSON.parse(l));
        const header = objects[0];
        // ST validates the first line carries chat identity fields
        if (header.user_name === undefined && header.name === undefined && header.chat_metadata === undefined) {
            throw new Error(`Incorrect chat format (header line): ${pathFor}`);
        }
        // Header line may also be a message (older files); treat any object with
        // `mes` among the rest as a message
        const messages = objects.slice(1);
        if (header.mes !== undefined) {
            messages.unshift(header);
            return { header: { user_name: 'unused', character_name: 'unused', chat_metadata: {}, create_date: new Date().toISOString() }, messages };
        }
        return { header, messages };
    }
    async list(avatar) {
        const dir = this.charDir(avatar);
        if (!existsSync(dir))
            return [];
        const files = (await readdir(dir))
            .filter((f) => f.endsWith('.jsonl'))
            .map((f) => join(dir, f));
        const infos = [];
        for (const path of files) {
            const stat = await import('node:fs/promises').then((fs) => fs.stat(path));
            const info = {
                file_id: parsePath(path).name,
                file_name: parsePath(path).base,
                file_size: formatBytes(stat.size),
                chat_items: 0,
                mes: '[The chat is empty]',
                last_mes: new Date(Math.round(stat.mtimeMs)).toISOString(),
            };
            if (stat.size > 0) {
                const chat = this.parse(await readFile(path, 'utf8'), path);
                if (chat) {
                    if (chat.header.chat_metadata && Object.keys(chat.header.chat_metadata).length > 0) {
                        info.chat_metadata = chat.header.chat_metadata;
                    }
                    info.chat_items = chat.messages.length;
                    const last = chat.messages.at(-1);
                    info.mes = last?.mes || '[The message is empty]';
                    info.last_mes = last?.send_date || info.last_mes;
                }
            }
            infos.push(info);
        }
        // ST sorts newest-first by mtime in the chat picker
        infos.sort((a, b) => String(b.last_mes).localeCompare(String(a.last_mes)));
        return infos;
    }
    async get(avatar, chatId) {
        const path = this.chatPath(avatar, chatId);
        if (!existsSync(path))
            return undefined;
        return this.parse(await readFile(path, 'utf8'), path);
    }
    async create(avatar, userName, characterName, firstMessage) {
        const dir = this.charDir(avatar);
        await this.ensureDir(dir);
        const chatId = `${characterName} - ${humanizedDateTime()}`;
        const chat = {
            header: {
                user_name: userName,
                character_name: characterName,
                chat_metadata: {},
                create_date: new Date().toISOString(),
            },
            messages: [],
        };
        if (firstMessage) {
            const greeting = makeMessage(characterName, false, firstMessage);
            initSwipes(greeting);
            chat.messages.push(greeting);
        }
        await writeFile(this.chatPath(avatar, chatId), this.serialize(chat), 'utf8');
        return chatId;
    }
    async save(avatar, chatId, chat) {
        const path = this.chatPath(avatar, chatId);
        await this.ensureDir(this.charDir(avatar));
        const data = this.serialize(chat);
        await writeFile(path, data, 'utf8');
        await this.maybeBackup(avatar, chatId, data);
    }
    /** Throttled backup, port of ST's getBackupFunction with 60s interval. */
    async maybeBackup(avatar, chatId, data) {
        const key = `${avatar}/${chatId}`;
        const now = Date.now();
        const last = this.lastBackupAt.get(key) ?? 0;
        if (now - last < 60_000)
            return;
        this.lastBackupAt.set(key, now);
        const dir = join(this.backupsDir, parsePath(avatar).name);
        await this.ensureDir(dir);
        await writeFile(join(dir, `chat_${parsePath(avatar).name}_${humanizedDateTime()}.jsonl`), data, 'utf8');
    }
    async delete(avatar, chatId) {
        const path = this.chatPath(avatar, chatId);
        if (existsSync(path))
            await unlink(path);
    }
    async rename(avatar, chatId, newName) {
        const oldPath = this.chatPath(avatar, chatId);
        const newId = sanitizeFilename(newName);
        const newPath = this.chatPath(avatar, newId);
        if (existsSync(oldPath) && !existsSync(newPath))
            await rename(oldPath, newPath);
        return newId;
    }
    async checkpoint(avatar, chatId, upto) {
        const source = await this.get(avatar, chatId);
        if (source === undefined)
            throw new Error('chat not found');
        const limit = upto === undefined
            ? source.messages.length
            : Math.min(Math.max(upto + 1, 0), source.messages.length);
        const newId = `${chatId} - branch@${humanizedDateTime()}`;
        const branch = {
            header: { ...structuredClone(source.header), create_date: new Date().toISOString() },
            messages: structuredClone(source.messages.slice(0, limit)),
        };
        await this.ensureDir(this.charDir(avatar));
        await writeFile(this.chatPath(avatar, newId), this.serialize(branch), 'utf8');
        return newId;
    }
    async exportChat(avatar, chatId) {
        const path = this.chatPath(avatar, chatId);
        return existsSync(path) ? readFile(path, 'utf8') : undefined;
    }
    async importChat(avatar, jsonl) {
        const parsed = this.parse(jsonl, 'import');
        if (!parsed)
            throw new Error('Empty chat file');
        const chatId = `${parsed.header.character_name} - ${humanizedDateTime()} imported`;
        await this.ensureDir(this.charDir(avatar));
        await writeFile(this.chatPath(avatar, chatId), jsonl, 'utf8');
        return chatId;
    }
    async search(query) {
        if (!existsSync(this.chatsDir))
            return [];
        const needle = query.toLowerCase();
        const hits = [];
        // Scan all character directories
        const charDirs = (await readdir(this.chatsDir, { withFileTypes: true }))
            .filter((d) => d.isDirectory());
        for (const charDir of charDirs) {
            const avatar = charDir.name;
            const files = (await readdir(join(this.chatsDir, charDir.name)))
                .filter((f) => f.endsWith('.jsonl'));
            for (const file of files) {
                const chatId = parsePath(file).name;
                const path = join(this.chatsDir, charDir.name, file);
                try {
                    const chat = this.parse(await readFile(path, 'utf8'), path);
                    if (!chat)
                        continue;
                    // Find the first matching message
                    for (let i = chat.messages.length - 1; i >= 0; i--) {
                        const msg = chat.messages[i];
                        if (msg.mes.toLowerCase().includes(needle)) {
                            const start = Math.max(0, msg.mes.toLowerCase().indexOf(needle) - 80);
                            const end = Math.min(msg.mes.length, start + 200);
                            hits.push({
                                chatId,
                                avatar,
                                characterName: chat.header.character_name,
                                messageIndex: i,
                                snippet: msg.mes.slice(start, end),
                            });
                            break; // one hit per chat
                        }
                    }
                }
                catch {
                    // Skip unreadable files
                }
            }
        }
        return hits;
    }
}
// ── Plugin entry ───────────────────────────────────────────────────────────
export const name = 'st-chat-file';
export default StChatFileProvider;
//# sourceMappingURL=index.js.map