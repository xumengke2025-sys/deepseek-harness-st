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
import { Service, type Context } from '@deepseek-ai/cordis';
/** ST's five Phase A API sources. */
export type StApiSource = 'openai' | 'anthropic' | 'custom' | 'openrouter' | 'ollama';
/** All valid sources as an array (for validation errors). */
export declare const API_SOURCES: readonly StApiSource[];
/** OpenAI field group. baseUrl defaults to OpenAI's public endpoint. */
export interface StApiSourceOpenAI {
    baseUrl?: string;
    apiKeyEnv?: string;
    model?: string;
    streaming?: boolean;
    contextSize?: number;
}
/** Anthropic field group. baseUrl defaults to Anthropic's public endpoint. */
export interface StApiSourceAnthropic {
    baseUrl?: string;
    apiKeyEnv?: string;
    model?: string;
    streaming?: boolean;
    contextSize?: number;
    /** Claude's `assistant` prefill: text seeded into the assistant's first message. */
    assistantPrefill?: string;
}
/** Custom (OpenAI-compatible) field group. baseUrl + model are required. */
export interface StApiSourceCustom {
    baseUrl: string;
    /** Registered `ctx.llm` provider id serving this source (any adapter route, e.g. an llm-pi-ai gateway); absent uses the deployment's st-generate provider. */
    provider?: string;
    apiKeyEnv?: string;
    model: string;
    streaming?: boolean;
    contextSize?: number;
}
/** OpenRouter field group. baseUrl defaults to OpenRouter's public endpoint. */
export interface StApiSourceOpenRouter {
    baseUrl?: string;
    apiKeyEnv?: string;
    model: string;
    streaming?: boolean;
    contextSize?: number;
}
/** Ollama field group. baseUrl defaults to localhost:11434. No API key. */
export interface StApiSourceOllama {
    baseUrl?: string;
    model: string;
    streaming?: boolean;
    contextSize?: number;
}
/**
 * Persisted API configuration. Exactly one per-source group should carry values
 * for the active source; other groups are retained across source switches.
 */
export interface StApiConfig {
    source: StApiSource;
    openai?: StApiSourceOpenAI;
    anthropic?: StApiSourceAnthropic;
    custom?: StApiSourceCustom;
    openrouter?: StApiSourceOpenRouter;
    ollama?: StApiSourceOllama;
}
/** Default base URLs per source (ST's defaults). */
export declare const DEFAULT_BASE_URLS: Record<StApiSource, string>;
/** Default configuration applied when no file exists; preserves opencode as the Custom source default. */
export declare const DEFAULT_CONFIG: StApiConfig;
/**
 * Map each source to the `ctx.llm` provider id that handles its requests.
 * `custom` reuses the DeepSeek adapter (a generic OpenAI-compatible transport
 * llm-deepseek registers as `deepseek-official`); the source-specific providers
 * (OpenAI / Anthropic / OpenRouter / Ollama) register their own ids.
 */
export declare const SOURCE_TO_PROVIDER: Record<StApiSource, string>;
/**
 * Validate a raw object as {@link StApiConfig}. The active source's required
 * fields are enforced; other sources' groups pass through untouched so a user
 * can switch back without losing configuration.
 */
export declare function validateApiConfig(raw: unknown): StApiConfig;
declare module '@deepseek-ai/cordis' {
    interface Context {
        stApiConfig: StApiConfigService;
    }
}
/**
 * SillyTavern API configuration service: get/save the current source's
 * configuration and list available models per source through the DSH llm
 * runtime.
 */
export declare abstract class StApiConfigService extends Service {
    constructor(ctx: Context);
    /** Read the current configuration; returns {@link DEFAULT_CONFIG} when unset. */
    abstract get(): Promise<StApiConfig>;
    /** Persist a validated configuration; throws on validation failure. */
    abstract save(config: StApiConfig): Promise<void>;
    /** List models available for one source through its mapped llm provider. */
    abstract listModels(source: StApiSource): Promise<Array<{
        provider: string;
        model: string;
    }>>;
}
/** Plugin configuration for the file provider. */
export interface Config {
    /** SillyTavern data root (config persists at `<dataRoot>/api-config.json`). */
    dataRoot: string;
}
/**
 * File-backed API configuration provider: JSON at `<dataRoot>/api-config.json`,
 * one document per user. The llm provider list is queried lazily for
 * `listModels` so a missing provider returns `[]` instead of failing.
 */
declare class StApiConfigFileProvider extends StApiConfigService {
    static inject: readonly ["llm"];
    private readonly path;
    private cached;
    constructor(ctx: Context, config: Config);
    get(): Promise<StApiConfig>;
    save(config: StApiConfig): Promise<void>;
    listModels(source: StApiSource): Promise<Array<{
        provider: string;
        model: string;
    }>>;
}
export declare const name = "st-api-config-file";
export default StApiConfigFileProvider;
//# sourceMappingURL=index.d.ts.map