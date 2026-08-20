/**
 * Browser assembly of the SillyTavern surface: the shell shadows the
 * 'conversation' seat while the ST bundle is composed (priority -1 beats
 * ui-conversation's 0), declares the ST nav/panel slots, and ships the chat
 * surface as the first panel.
 */
import type { Context } from '@deepseek-ai/cordis';
/** Services required by the browser plugin. */
export declare const inject: string[];
/**
 * Mount the ST surface into the layout's conversation seat.
 * @param ctx - client root context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=apply.d.ts.map