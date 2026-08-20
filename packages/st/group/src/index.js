/**
 * SillyTavern group chat management service.
 *
 * Groups allow multiple characters to participate in a single conversation
 * with configurable activation strategies determining which character
 * responds next.
 *
 * @module @deepseek-ai/dsh-st-group
 */
import { Service } from '@deepseek-ai/cordis';
import { readFile, writeFile, readdir, mkdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
/**
 * Group chat management service.
 *
 * Provides CRUD for multi-character groups and the activation strategy
 * engine that determines which character responds next in a group chat.
 */
export class StGroupService extends Service {
    constructor(ctx) {
        super(ctx, 'stGroup');
    }
}
// ── Helpers ────────────────────────────────────────────────────────────────
function generateGroupId() {
    return `grp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
class FileGroupProvider extends StGroupService {
    root;
    constructor(ctx, config) {
        super(ctx);
        this.root = resolve(config.root);
    }
    async ensureRoot() {
        if (!existsSync(this.root))
            await mkdir(this.root, { recursive: true });
    }
    groupPath(id) {
        return join(this.root, `${id}.json`);
    }
    async list() {
        await this.ensureRoot();
        const files = await readdir(this.root);
        const groups = [];
        for (const f of files) {
            if (!f.endsWith('.json'))
                continue;
            try {
                groups.push(JSON.parse(await readFile(join(this.root, f), 'utf-8')));
            }
            catch { /* skip */ }
        }
        return groups.sort((a, b) => {
            if (a.favourited !== b.favourited)
                return a.favourited ? -1 : 1;
            return b.modifyDate.localeCompare(a.modifyDate);
        });
    }
    async get(id) {
        const path = this.groupPath(id);
        if (!existsSync(path))
            return undefined;
        try {
            return JSON.parse(await readFile(path, 'utf-8'));
        }
        catch {
            return undefined;
        }
    }
    async create(input) {
        await this.ensureRoot();
        const id = generateGroupId();
        const now = new Date().toISOString();
        const group = {
            id,
            name: input.name,
            members: input.members ?? [],
            activationStrategy: input.activationStrategy ?? 'sequential',
            allowSelfResponses: input.allowSelfResponses ?? false,
            favourited: input.favourited ?? false,
            createDate: now,
            modifyDate: now,
            metadata: input.metadata ?? {},
        };
        await writeFile(this.groupPath(id), JSON.stringify(group, null, 2), 'utf-8');
        return id;
    }
    async update(id, input) {
        const path = this.groupPath(id);
        const group = JSON.parse(await readFile(path, 'utf-8'));
        Object.assign(group, { ...input, modifyDate: new Date().toISOString() });
        await writeFile(path, JSON.stringify(group, null, 2), 'utf-8');
    }
    async delete(id) {
        const path = this.groupPath(id);
        if (existsSync(path))
            await unlink(path);
    }
    async selectNextSpeaker(groupId, lastSpeakerId) {
        const group = await this.get(groupId);
        if (!group)
            return undefined;
        const enabled = group.members.filter((m) => m.enabled);
        if (enabled.length === 0)
            return undefined;
        switch (group.activationStrategy) {
            case 'sequential': {
                const lastIdx = enabled.findIndex((m) => m.characterId === lastSpeakerId);
                const next = enabled[(lastIdx + 1) % enabled.length];
                return next.characterId;
            }
            case 'random': {
                return enabled[Math.floor(Math.random() * enabled.length)].characterId;
            }
            case 'weighted': {
                const totalWeight = enabled.reduce((s, m) => s + m.weight, 0);
                if (totalWeight === 0)
                    return enabled[0].characterId;
                let roll = Math.random() * totalWeight;
                for (const m of enabled) {
                    roll -= m.weight;
                    if (roll <= 0)
                        return m.characterId;
                }
                return enabled[enabled.length - 1].characterId;
            }
            case 'narrator':
                // Narrator mode: return undefined, the caller decides based on context
                return undefined;
        }
    }
}
// ── Plugin entry ───────────────────────────────────────────────────────────
export const name = 'st-group-file';
export default FileGroupProvider;
//# sourceMappingURL=index.js.map