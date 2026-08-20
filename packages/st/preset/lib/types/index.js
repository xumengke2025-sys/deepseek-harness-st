/**
 * SillyTavern prompt preset management service.
 *
 * Presets bundle generation parameters, prompt ordering, instruct format
 * templates, and system prompt configuration. They map directly to
 * SillyTavern's preset types: generation settings, instruct mode,
 * context template, and AI persona.
 *
 * @module @deepseek-ai/dsh-st-preset
 */
import { Service } from '@deepseek-ai/cordis';
import { readFile, writeFile, readdir, mkdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
// ── Default generation parameters ──────────────────────────────────────────
export const DEFAULT_GENERATION = {
    temp: 0.9,
    top_p: 0.95,
    top_k: 40,
    top_a: 0,
    min_p: 0.05,
    repetition_penalty: 1.1,
    repetition_penalty_range: 1024,
    max_tokens: 2048,
    min_tokens: 1,
    seed: -1,
    presence_penalty: 0,
    frequency_penalty: 0,
    stop_sequences: [],
    stream: true,
};
export const DEFAULT_INSTRUCT = {
    enabled: false,
    systemPrompt: '{{content}}',
    inputSequence: '',
    outputSequence: '',
    lastOutputSequence: '',
    firstOutputSequence: '',
    firstInputSequence: '',
    separator: '\n',
    wrap: false,
    macros: {},
};
/**
 * Prompt preset management service.
 *
 * Provides CRUD for generation settings, instruct templates, prompt
 * ordering, and system prompt configuration. Supports import/export
 * compatible with SillyTavern's preset JSON format.
 */
export class StPresetService extends Service {
    constructor(ctx) {
        super(ctx, 'stPreset');
    }
}
// ── Helpers ────────────────────────────────────────────────────────────────
function generatePresetId() {
    return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function createBlankPreset(input) {
    const now = new Date().toISOString();
    return {
        id: generatePresetId(),
        name: input.name,
        description: input.description ?? '',
        apiSource: input.apiSource ?? 'openai',
        generation: { ...DEFAULT_GENERATION, ...input.generation },
        instruct: { ...DEFAULT_INSTRUCT, ...input.instruct },
        promptOrder: { entries: input.promptOrder?.entries ?? [] },
        mainPrompt: input.mainPrompt ?? '',
        nsfw: input.nsfw ?? false,
        jailbreakPrompt: input.jailbreakPrompt ?? '',
        createDate: now,
        modifyDate: now,
        extensions: input.extensions ?? {},
    };
}
/** Expand macros in a template string. */
function expandMacros(template, vars) {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
        result = result.replaceAll(`{{${key}}}`, value);
    }
    return result;
}
/** Recognize SillyTavern's legacy flat preset shape (a `prompts` list keyed by identifiers). */
function isStLegacyPreset(raw) {
    return typeof raw === 'object' && raw !== null && Array.isArray(raw.prompts);
}
/** Map one legacy preset into this service's `Preset` shape; the raw object survives in `extensions.st`. */
function normalizeStLegacyPreset(raw, id, name) {
    const byIdentifier = new Map();
    for (const prompt of raw.prompts ?? []) {
        if (prompt.identifier !== undefined)
            byIdentifier.set(prompt.identifier, prompt);
    }
    // SillyTavern keys the current character's order under character_id 100001
    // (100000 is the shared default); fall back to the first row present.
    const orderRow = raw.prompt_order?.find(row => row.character_id === 100001)
        ?? raw.prompt_order?.[0];
    const entries = (orderRow?.order ?? []).flatMap(({ identifier, enabled }) => {
        const prompt = byIdentifier.get(identifier);
        if (prompt === undefined)
            return [];
        return [{
                name: prompt.name ?? identifier,
                enabled,
                role: prompt.role ?? 'system',
                content: prompt.content ?? '',
                ...(prompt.marker === true ? { constant: true } : {}),
            }];
    });
    const now = new Date().toISOString();
    return {
        id,
        name,
        description: `Imported SillyTavern preset (${raw.chat_completion_source ?? 'unknown'} source)`,
        apiSource: raw.chat_completion_source ?? 'openai',
        generation: {
            ...DEFAULT_GENERATION,
            temp: raw.temperature ?? DEFAULT_GENERATION.temp,
            top_p: raw.top_p ?? DEFAULT_GENERATION.top_p,
            top_k: raw.top_k ?? DEFAULT_GENERATION.top_k,
            top_a: raw.top_a ?? DEFAULT_GENERATION.top_a,
            min_p: raw.min_p ?? DEFAULT_GENERATION.min_p,
            repetition_penalty: raw.repetition_penalty ?? DEFAULT_GENERATION.repetition_penalty,
            max_tokens: raw.openai_max_tokens ?? DEFAULT_GENERATION.max_tokens,
            seed: raw.seed ?? DEFAULT_GENERATION.seed,
            presence_penalty: raw.presence_penalty ?? DEFAULT_GENERATION.presence_penalty,
            frequency_penalty: raw.frequency_penalty ?? DEFAULT_GENERATION.frequency_penalty,
            stream: raw.stream_openai ?? DEFAULT_GENERATION.stream,
        },
        instruct: { ...DEFAULT_INSTRUCT },
        promptOrder: { entries },
        mainPrompt: byIdentifier.get('main')?.content ?? '',
        nsfw: (byIdentifier.get('nsfw')?.content ?? '').length > 0,
        jailbreakPrompt: byIdentifier.get('jailbreak')?.content ?? '',
        createDate: now,
        modifyDate: now,
        // The full legacy payload travels along so export and later writes keep
        // every SillyTavern field instead of dropping the ones this shape lacks.
        extensions: { st: raw },
    };
}
/**
 * Read one preset file into the service shape: native `Preset` files pass
 * through, legacy SillyTavern flat presets are normalized with `id`/`name`
 * from the file name.
 */
function parsePresetFile(text, id) {
    const raw = JSON.parse(text);
    if (isStLegacyPreset(raw))
        return normalizeStLegacyPreset(raw, id, id);
    const preset = raw;
    return { ...preset, id, ...(preset.name === undefined ? { name: id } : {}) };
}
class FilePresetProvider extends StPresetService {
    root;
    constructor(ctx, config) {
        super(ctx);
        this.root = resolve(config.root);
    }
    async ensureRoot() {
        if (!existsSync(this.root))
            await mkdir(this.root, { recursive: true });
    }
    presetPath(id) {
        return join(this.root, `${id}.json`);
    }
    async list() {
        await this.ensureRoot();
        const files = await readdir(this.root);
        const presets = [];
        for (const f of files) {
            if (!f.endsWith('.json'))
                continue;
            try {
                presets.push(parsePresetFile(await readFile(join(this.root, f), 'utf-8'), f.slice(0, -'.json'.length)));
            }
            catch { /* skip */ }
        }
        return presets.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    }
    async get(id) {
        const path = this.presetPath(id);
        if (!existsSync(path))
            return undefined;
        try {
            return parsePresetFile(await readFile(path, 'utf-8'), id);
        }
        catch {
            return undefined;
        }
    }
    async create(input) {
        await this.ensureRoot();
        const preset = createBlankPreset(input);
        await writeFile(this.presetPath(preset.id), JSON.stringify(preset, null, 2), 'utf-8');
        return preset.id;
    }
    async update(id, input) {
        const path = this.presetPath(id);
        const preset = await this.get(id);
        if (preset === undefined)
            throw new Error(`Preset ${id} not found`);
        if (input.name !== undefined)
            preset.name = input.name;
        if (input.description !== undefined)
            preset.description = input.description;
        if (input.apiSource !== undefined)
            preset.apiSource = input.apiSource;
        if (input.generation)
            Object.assign(preset.generation, input.generation);
        if (input.instruct)
            Object.assign(preset.instruct, input.instruct);
        if (input.promptOrder)
            Object.assign(preset.promptOrder, input.promptOrder);
        if (input.mainPrompt !== undefined)
            preset.mainPrompt = input.mainPrompt;
        if (input.nsfw !== undefined)
            preset.nsfw = input.nsfw;
        if (input.jailbreakPrompt !== undefined)
            preset.jailbreakPrompt = input.jailbreakPrompt;
        if (input.extensions)
            Object.assign(preset.extensions, input.extensions);
        preset.modifyDate = new Date().toISOString();
        await writeFile(path, JSON.stringify(preset, null, 2), 'utf-8');
    }
    async delete(id) {
        const path = this.presetPath(id);
        if (existsSync(path))
            await unlink(path);
    }
    async duplicate(id) {
        const preset = await this.get(id);
        if (!preset)
            throw new Error(`Preset ${id} not found`);
        return this.create({ ...preset, name: `${preset.name} (copy)` });
    }
    async importJson(json) {
        const parsed = JSON.parse(json);
        if (isStLegacyPreset(parsed)) {
            const name = typeof parsed.preset_name === 'string' && parsed.preset_name.length > 0
                ? parsed.preset_name
                : 'Imported Preset';
            const preset = normalizeStLegacyPreset(parsed, generatePresetId(), name);
            await this.ensureRoot();
            await writeFile(this.presetPath(preset.id), JSON.stringify(preset, null, 2), 'utf-8');
            return preset.id;
        }
        const record = parsed;
        const description = record.description;
        const apiSource = record.api_source ?? record.apiSource;
        const generation = record.genamt ?? record.generation;
        const instruct = record.instruct;
        const promptOrder = record.prompt_order ?? record.promptOrder;
        const mainPrompt = record.main_prompt ?? record.mainPrompt;
        const nsfw = record.nsfw;
        const jailbreakPrompt = record.jailbreak_prompt ?? record.jailbreakPrompt;
        return this.create({
            name: record.name ?? record.preset_name ?? 'Imported Preset',
            ...description !== undefined ? { description } : {},
            ...apiSource !== undefined ? { apiSource } : {},
            ...generation !== undefined ? { generation } : {},
            ...instruct !== undefined ? { instruct } : {},
            ...promptOrder !== undefined ? { promptOrder } : {},
            ...mainPrompt !== undefined ? { mainPrompt } : {},
            ...nsfw !== undefined ? { nsfw } : {},
            ...jailbreakPrompt !== undefined ? { jailbreakPrompt } : {},
        });
    }
    async exportJson(id) {
        const preset = await this.get(id);
        if (!preset)
            throw new Error(`Preset ${id} not found`);
        return JSON.stringify(preset, null, 2);
    }
    async buildPrompt(presetId, characterData) {
        const preset = await this.get(presetId);
        if (!preset)
            throw new Error(`Preset ${presetId} not found`);
        const vars = {
            ...preset.instruct.macros,
            ...characterData,
            char: characterData.name ?? '',
            user: characterData.userName ?? 'User',
        };
        // Build prompt from the ordered entries
        const parts = [];
        // Main prompt first
        if (preset.mainPrompt) {
            parts.push(expandMacros(preset.mainPrompt, vars));
        }
        // Then ordered entries
        for (const entry of preset.promptOrder.entries) {
            if (!entry.enabled)
                continue;
            parts.push(expandMacros(entry.content, vars));
        }
        // Apply instruct wrapper if enabled
        if (preset.instruct.enabled) {
            const systemContent = parts.join(preset.instruct.separator);
            return expandMacros(preset.instruct.systemPrompt, { ...vars, content: systemContent });
        }
        return parts.join('\n\n');
    }
}
// ── Plugin entry ───────────────────────────────────────────────────────────
export const name = 'st-preset-file';
export default FilePresetProvider;
//# sourceMappingURL=index.js.map