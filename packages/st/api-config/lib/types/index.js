/**
 * SillyTavern API configuration service: per-source endpoint, key, and model
 * settings persisted to `<dataRoot>/api-config.json`. Mirrors ST's
 * `public/index.html #api_form` field groups and their storage in
 * `settings.json` / `secrets.json`.
 *
 * This is the *configuration* surface only; generation itself reads the
 * active source via `ctx.stApiConfig.get()` and routes to the matching
 * `ctx.llm` provider (see `st-generate`'s dispatch table).
 *
 * @module @deepseek-ai/dsh-st-api-config
 */
import { Service } from '@deepseek-ai/cordis';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
/** All valid sources as an array (for validation errors). */
export const API_SOURCES = Object.freeze([
    'openai', 'anthropic', 'custom', 'openrouter', 'ollama',
]);
// ── Default values per source (ST's "factory reset" state) ──────────────
/** Default base URLs per source (ST's defaults). */
export const DEFAULT_BASE_URLS = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com',
    custom: 'https://opencode.cc/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    ollama: 'http://localhost:11434',
};
/** Default configuration applied when no file exists; preserves opencode as the Custom source default. */
export const DEFAULT_CONFIG = {
    source: 'custom',
    custom: { baseUrl: DEFAULT_BASE_URLS.custom, model: 'deepseek-v4-flash', streaming: true },
    openai: { baseUrl: DEFAULT_BASE_URLS.openai, streaming: true },
    anthropic: { baseUrl: DEFAULT_BASE_URLS.anthropic, streaming: true },
    openrouter: { baseUrl: DEFAULT_BASE_URLS.openrouter, model: 'anthropic/claude-3.5-sonnet', streaming: true },
    ollama: { baseUrl: DEFAULT_BASE_URLS.ollama, model: 'llama3', streaming: true },
};
// ── Dispatch table (source → llm provider id) ──────────────────────────
/**
 * Map each source to the `ctx.llm` provider id that handles its requests.
 * `custom` reuses the DeepSeek adapter (a generic OpenAI-compatible transport
 * llm-deepseek registers as `deepseek-official`); the source-specific providers
 * (OpenAI / Anthropic / OpenRouter / Ollama) register their own ids.
 */
export const SOURCE_TO_PROVIDER = {
    openai: 'openai',
    anthropic: 'anthropic',
    custom: 'deepseek-official',
    openrouter: 'openrouter',
    ollama: 'ollama',
};
// ── Validation ──────────────────────────────────────────────────────────
/**
 * Validate a raw object as {@link StApiConfig}. The active source's required
 * fields are enforced; other sources' groups pass through untouched so a user
 * can switch back without losing configuration.
 */
export function validateApiConfig(raw) {
    if (typeof raw !== 'object' || raw === null) {
        throw new TypeError('api-config: expected object');
    }
    const obj = raw;
    const source = obj.source;
    if (typeof source !== 'string' || !API_SOURCES.includes(source)) {
        throw new TypeError(`api-config.source: must be one of ${API_SOURCES.join(', ')}`);
    }
    const src = source;
    if (src === 'custom') {
        const c = obj.custom;
        if (typeof c !== 'object' || c === null) {
            throw new TypeError('api-config.custom: required when source is custom');
        }
        const cc = c;
        if (typeof cc.baseUrl !== 'string' || cc.baseUrl.trim() === '') {
            throw new TypeError('api-config.custom.baseUrl: required non-empty string');
        }
        if (typeof cc.model !== 'string' || cc.model.trim() === '') {
            throw new TypeError('api-config.custom.model: required non-empty string');
        }
        if (cc.provider !== undefined && (typeof cc.provider !== 'string' || cc.provider.trim() === '')) {
            throw new TypeError('api-config.custom.provider: must be a non-empty provider id when present');
        }
    }
    if (src === 'openrouter') {
        const c = obj.openrouter;
        if (typeof c !== 'object' || c === null) {
            throw new TypeError('api-config.openrouter: required when source is openrouter');
        }
        const cc = c;
        if (typeof cc.model !== 'string' || cc.model.trim() === '') {
            throw new TypeError('api-config.openrouter.model: required non-empty string');
        }
    }
    if (src === 'ollama') {
        const c = obj.ollama;
        if (typeof c !== 'object' || c === null) {
            throw new TypeError('api-config.ollama: required when source is ollama');
        }
        const cc = c;
        if (typeof cc.model !== 'string' || cc.model.trim() === '') {
            throw new TypeError('api-config.ollama.model: required non-empty string');
        }
    }
    // openai/anthropic: all fields optional; model may be unset and resolved at generation time.
    return raw;
}
/**
 * SillyTavern API configuration service: get/save the current source's
 * configuration and list available models per source through the DSH llm
 * runtime.
 */
export class StApiConfigService extends Service {
    constructor(ctx) {
        super(ctx, 'stApiConfig');
    }
}
/**
 * File-backed API configuration provider: JSON at `<dataRoot>/api-config.json`,
 * one document per user. The llm provider list is queried lazily for
 * `listModels` so a missing provider returns `[]` instead of failing.
 */
class StApiConfigFileProvider extends StApiConfigService {
    static inject = ['llm'];
    path;
    cached = null;
    constructor(ctx, config) {
        super(ctx);
        this.path = join(resolve(config.dataRoot), 'api-config.json');
    }
    async get() {
        if (this.cached !== null)
            return this.cached;
        if (!existsSync(this.path))
            return structuredClone(DEFAULT_CONFIG);
        const parsed = JSON.parse(await readFile(this.path, 'utf8'));
        const cfg = validateApiConfig(parsed);
        this.cached = cfg;
        return cfg;
    }
    async save(config) {
        const validated = validateApiConfig(config);
        await mkdir(dirname(this.path), { recursive: true });
        await writeFile(this.path, JSON.stringify(validated, null, 2), 'utf8');
        this.cached = validated;
    }
    async listModels(source) {
        // The custom source may pin any registered provider; other sources own
        // their fixed dispatch entries.
        const provider = source === 'custom'
            ? ((await this.get()).custom?.provider ?? SOURCE_TO_PROVIDER.custom)
            : SOURCE_TO_PROVIDER[source];
        try {
            const models = await this.ctx.llm.listModels(provider);
            return models.map((m) => ({ provider: m.provider ?? provider, model: m.id }));
        }
        catch {
            // Provider not registered or catalog unavailable: an empty list lets the
            // UI fall back to manual model entry (ST's Custom-source behavior).
            return [];
        }
    }
}
// ── Plugin entry ────────────────────────────────────────────────────────
export const name = 'st-api-config-file';
export default StApiConfigFileProvider;
//# sourceMappingURL=index.js.map