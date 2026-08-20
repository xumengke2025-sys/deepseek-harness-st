/**
 * SillyTavern persona library — a port of ST's `personas/` directory.
 *
 * One persona per `<name>.json` file, byte-compatible with SillyTavern's
 * storage, so a checkout's `personas/` directory works unmodified. The
 * active persona is client state (ST binds it per chat through
 * `chat_metadata`; the port carries it in the settings snapshot), so this
 * service is pure storage: list, upsert, delete.
 *
 * @module @deepseek-ai/dsh-st-persona
 */
import { Service } from '@deepseek-ai/cordis';
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
/** Personas are named by file; strip the extension and path separators. */
function sanitizeFilename(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}
/** Persona library storage: one JSON per file under `personas/`. */
export class StPersonaService extends Service {
    constructor(ctx) {
        super(ctx, 'stPersona');
    }
}
class StPersonaFileProvider extends StPersonaService {
    config;
    static inject = [];
    constructor(ctx, config) {
        super(ctx);
        this.config = config;
    }
    get dir() {
        return resolve(this.config.dataRoot, 'personas');
    }
    async list() {
        if (!existsSync(this.dir))
            return [];
        const files = (await readdir(this.dir)).filter((f) => f.endsWith('.json')).sort();
        const personas = [];
        for (const file of files) {
            try {
                const raw = JSON.parse(await readFile(join(this.dir, file), 'utf8'));
                personas.push({
                    filename: file.slice(0, -'.json'.length),
                    name: typeof raw.name === 'string' ? raw.name : file,
                    description: typeof raw.description === 'string' ? raw.description : '',
                    ...(raw.avatar !== undefined ? { avatar: String(raw.avatar) } : {}),
                    ...(raw.position !== undefined ? { position: raw.position } : {}),
                    ...(raw.depth !== undefined ? { depth: Number(raw.depth) } : {}),
                    ...(raw.depth_role !== undefined ? { depth_role: raw.depth_role } : {}),
                    ...(raw.is_default !== undefined ? { is_default: !!raw.is_default } : {}),
                    ...(raw.lock_to_char !== undefined ? { lock_to_char: String(raw.lock_to_char) } : {}),
                    ...(raw.lock_to_chat !== undefined ? { lock_to_chat: String(raw.lock_to_chat) } : {}),
                });
            }
            catch {
                // A malformed persona file is one unreadable entry, not a broken
                // library: ST toasts per file and keeps the list alive.
            }
        }
        return personas;
    }
    async save(persona) {
        const filename = sanitizeFilename(persona.filename);
        if (filename.length === 0)
            throw new Error('persona filename is empty');
        const disk = {
            name: persona.name,
            description: persona.description,
        };
        // Persist all optional ST persona fields when present
        if (persona.avatar !== undefined)
            disk.avatar = persona.avatar;
        if (persona.position !== undefined)
            disk.position = persona.position;
        if (persona.depth !== undefined)
            disk.depth = persona.depth;
        if (persona.depth_role !== undefined)
            disk.depth_role = persona.depth_role;
        if (persona.is_default !== undefined)
            disk.is_default = persona.is_default;
        if (persona.lock_to_char !== undefined)
            disk.lock_to_char = persona.lock_to_char;
        if (persona.lock_to_chat !== undefined)
            disk.lock_to_chat = persona.lock_to_chat;
        await mkdir(this.dir, { recursive: true });
        await writeFile(join(this.dir, `${filename}.json`), JSON.stringify(disk, null, 4));
        return { ...persona, filename };
    }
    async delete(filename) {
        const path = join(this.dir, `${sanitizeFilename(filename)}.json`);
        if (!existsSync(path))
            throw new Error(`persona ${filename} not found`);
        await unlink(path);
    }
}
// ── Plugin entry ───────────────────────────────────────────────────────────
export const name = 'st-persona-file';
export default StPersonaFileProvider;
//# sourceMappingURL=index.js.map