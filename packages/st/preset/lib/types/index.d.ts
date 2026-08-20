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
import { Service, type Context } from '@deepseek-ai/cordis';
export type PresetId = string & {
    readonly __brand: 'PresetId';
};
/** Generation sampling parameters (matching SillyTavern's generation settings). */
export interface GenerationParams {
    temp: number;
    top_p: number;
    top_k: number;
    top_a: number;
    min_p: number;
    repetition_penalty: number;
    repetition_penalty_range: number;
    max_tokens: number;
    min_tokens: number;
    seed: number;
    /** Penalty for presence (OpenAI-style). */
    presence_penalty: number;
    /** Penalty for frequency (OpenAI-style). */
    frequency_penalty: number;
    /** Stop sequences. */
    stop_sequences: string[];
    /** Whether to stream responses. */
    stream: boolean;
}
/** Instruct mode formatting template. */
export interface InstructTemplate {
    enabled: boolean;
    /** System prompt wrapper: {{content}} is replaced with the system prompt. */
    systemPrompt: string;
    /** Instruct mode sequences. */
    inputSequence: string;
    outputSequence: string;
    /** Last output sequence (before generation). */
    lastOutputSequence: string;
    /** First output sequence (for the first assistant turn). */
    firstOutputSequence: string;
    /** First assistant prefix. */
    firstInputSequence: string;
    /** Separator between messages. */
    separator: string;
    /** Wrap system prompt in its own block. */
    wrap: boolean;
    /** Macro overrides: {{user}}, {{char}}, etc. */
    macros: Record<string, string>;
}
/** Prompt order: the sequence of context blocks injected before the chat. */
export interface PromptOrder {
    /** Each entry is a named prompt block. */
    entries: PromptEntry[];
}
/** A single prompt block in the ordering. */
export interface PromptEntry {
    name: string;
    enabled: boolean;
    /** Role for this prompt block. */
    role: 'system' | 'user' | 'assistant';
    /** Content or macro reference. */
    content: string;
    /** Depth (for at-depth insertion). */
    depth?: number;
    /** Whether this is a constant (always injected). */
    constant?: boolean;
}
/** A complete SillyTavern preset. */
export interface Preset {
    id: PresetId;
    name: string;
    description: string;
    /** Which API source this preset targets. */
    apiSource: string;
    generation: GenerationParams;
    instruct: InstructTemplate;
    promptOrder: PromptOrder;
    /** System prompt content (character-agnostic). */
    mainPrompt: string;
    /** NSFW toggle for prompt filtering. */
    nsfw: boolean;
    /** Jailbreak prompt (optional post-system instruction). */
    jailbreakPrompt: string;
    createDate: string;
    modifyDate: string;
    extensions: Record<string, unknown>;
}
/** Input for creating/updating a preset. */
export interface PresetInput {
    name: string;
    description?: string;
    apiSource?: string;
    generation?: Partial<GenerationParams>;
    instruct?: Partial<InstructTemplate>;
    promptOrder?: Partial<PromptOrder>;
    mainPrompt?: string;
    nsfw?: boolean;
    jailbreakPrompt?: string;
    extensions?: Record<string, unknown>;
}
export declare const DEFAULT_GENERATION: GenerationParams;
export declare const DEFAULT_INSTRUCT: InstructTemplate;
declare module '@deepseek-ai/cordis' {
    interface Context {
        stPreset: StPresetService;
    }
}
/**
 * Prompt preset management service.
 *
 * Provides CRUD for generation settings, instruct templates, prompt
 * ordering, and system prompt configuration. Supports import/export
 * compatible with SillyTavern's preset JSON format.
 */
export declare abstract class StPresetService extends Service {
    constructor(ctx: Context);
    abstract list(): Promise<Preset[]>;
    abstract get(id: PresetId): Promise<Preset | undefined>;
    abstract create(input: PresetInput): Promise<PresetId>;
    abstract update(id: PresetId, input: Partial<PresetInput>): Promise<void>;
    abstract delete(id: PresetId): Promise<void>;
    abstract duplicate(id: PresetId): Promise<PresetId>;
    abstract importJson(json: string): Promise<PresetId>;
    abstract exportJson(id: PresetId): Promise<string>;
    /** Build the complete system prompt from a preset + character data. */
    abstract buildPrompt(presetId: PresetId, characterData: Record<string, string>): Promise<string>;
}
export interface FilePresetConfig {
    root: string;
}
declare class FilePresetProvider extends StPresetService {
    private readonly root;
    constructor(ctx: Context, config: FilePresetConfig);
    private ensureRoot;
    private presetPath;
    list(): Promise<Preset[]>;
    get(id: PresetId): Promise<Preset | undefined>;
    create(input: PresetInput): Promise<PresetId>;
    update(id: PresetId, input: Partial<PresetInput>): Promise<void>;
    delete(id: PresetId): Promise<void>;
    duplicate(id: PresetId): Promise<PresetId>;
    importJson(json: string): Promise<PresetId>;
    exportJson(id: PresetId): Promise<string>;
    buildPrompt(presetId: PresetId, characterData: Record<string, string>): Promise<string>;
}
export declare const name = "st-preset-file";
export interface Config extends FilePresetConfig {
}
export default FilePresetProvider;
//# sourceMappingURL=index.d.ts.map