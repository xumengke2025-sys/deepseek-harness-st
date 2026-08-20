/**
 * Browser assembly of the theme surface: restore the persisted theme onto the
 * document root at load, then one nav row plus the panel cell in the ST
 * shell's slots, both after ui-st-chat declares them.
 */
import type { Context } from '@deepseek-ai/cordis';
/** Services required by the browser plugin. */
export declare const inject: string[];
/**
 * Mount the theme surface into the ST shell's nav and panel slots.
 * @param ctx - client root context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=apply.d.ts.map