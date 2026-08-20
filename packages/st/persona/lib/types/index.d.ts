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
import { Service, type Context } from '@deepseek-ai/cordis';
/** One named user persona as SillyTavern persists it in `personas/<name>.json`. */
/** Persona description position (ST's persona_description_position). */
export type PersonaPosition = 0 | 2 | 3 | 4 | 9;
/** Persona depth role (ST's persona_depth_role). */
export type PersonaDepthRole = 0 | 1 | 2;
export interface StPersona {
    /** File name sans extension; also the persona's id. */
    filename: string;
    /** Display name substituted for {{user}} when the persona is active. */
    name: string;
    /** Persona description injected as persona_description. */
    description: string;
    /** Avatar image path (ST's user_avatar). */
    avatar?: string;
    /** Description position (ST's persona_description_position). */
    position?: PersonaPosition;
    /** Depth value when position = 4 (In-chat @ Depth). */
    depth?: number;
    /** Role when position = 4 (ST's persona_depth_role). */
    depth_role?: PersonaDepthRole;
    /** Whether this is the default persona for new chats (ST's default_persona). */
    is_default?: boolean;
    /** Locked to character avatar (ST's lock_persona_to_char). */
    lock_to_char?: string;
    /** Locked to chat id (ST's lock_user_name). */
    lock_to_chat?: string;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        stPersona: StPersonaService;
    }
}
/** Persona library storage: one JSON per file under `personas/`. */
export declare abstract class StPersonaService extends Service {
    constructor(ctx: Context);
    /** List all personas sorted by file name. */
    abstract list(): Promise<StPersona[]>;
    /** Create or overwrite one persona; `filename` decides which file. */
    abstract save(persona: StPersona): Promise<StPersona>;
    /** Delete one persona file; missing files are an error. */
    abstract delete(filename: string): Promise<void>;
}
export interface Config {
    /** SillyTavern data root (the directory containing `personas/`). */
    dataRoot: string;
}
declare class StPersonaFileProvider extends StPersonaService {
    private readonly config;
    static inject: never[];
    constructor(ctx: Context, config: Config);
    private get dir();
    list(): Promise<StPersona[]>;
    save(persona: StPersona): Promise<StPersona>;
    delete(filename: string): Promise<void>;
}
export declare const name = "st-persona-file";
export default StPersonaFileProvider;
//# sourceMappingURL=index.d.ts.map