/**
 * SillyTavern HTTP API: exposes the st character/chat/lorebook/generate
 * services over the DSH webServer under `/api/st/...`.
 *
 * Route names mirror SillyTavern's own REST surface (`characters/all`,
 * `chats/save`, `worldinfo/get`, ...) so the React client is a straight port
 * of ST's request flow. Reply generation streams over SSE, ST's native
 * streaming transport.
 *
 * @module @deepseek-ai/dsh-st-api
 */
import type { Context } from '@deepseek-ai/cordis';
/** Plugin config. */
export interface Config {
    /** Route prefix; every endpoint lives under `<prefix>/...`. */
    routePrefix: string;
    /** Deployment-wide max context tokens for generation; a positive integer or absent for no trimming. Body/preset/api-config values override it. */
    defaultMaxContextTokens?: number;
}
export declare const name = "st-api";
export declare const inject: string[];
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map