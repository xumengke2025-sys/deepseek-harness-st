/**
 * SillyTavern instruct template library — a port of ST's `instructs/`
 * directory (text templates: ChatML, Alpaca, Metharme, ...).
 *
 * One template per `<name>.json` file using ST's snake_case field names, so
 * a checkout's `instructs/` directory works unmodified. Serialization is
 * owned by `dsh-st-generate`'s `serializeInstruct`; this service is pure
 * storage: list, upsert, delete.
 *
 * @module @deepseek-ai/dsh-st-instruct
 */
import { Service, type Context } from '@deepseek-ai/cordis';
import type { InstructTemplate } from '@deepseek-ai/dsh-st-generate';
/** One named instruct template as ST persists it in `instructs/<name>.json`. */
export interface StInstruct {
    /** File name sans extension; also the template's id. */
    filename: string;
    /** Display name (ST's `name` field). */
    name: string;
    /** The wrapper sequences ST's instruct mode serializes with. */
    template: InstructTemplate;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        stInstruct: StInstructService;
    }
}
/** Instruct template storage: one ST-format JSON per file under `instructs/`. */
export declare abstract class StInstructService extends Service {
    constructor(ctx: Context);
    /** List all templates sorted by file name. */
    abstract list(): Promise<StInstruct[]>;
    /** Create or overwrite one template; `filename` decides which file. */
    abstract save(instruct: StInstruct): Promise<StInstruct>;
    /** Delete one template file; missing files are an error. */
    abstract delete(filename: string): Promise<void>;
}
export interface Config {
    /** SillyTavern data root (the directory containing `instructs/`). */
    dataRoot: string;
}
declare class StInstructFileProvider extends StInstructService {
    private readonly config;
    static inject: never[];
    constructor(ctx: Context, config: Config);
    private get dir();
    list(): Promise<StInstruct[]>;
    save(instruct: StInstruct): Promise<StInstruct>;
    delete(filename: string): Promise<void>;
}
export declare const name = "st-instruct-file";
export default StInstructFileProvider;
//# sourceMappingURL=index.d.ts.map