/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-st-regex`.
 * @module @deepseek-ai/dsh-client-ui-st-regex/invariant
 */
const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-st-regex';
/** Cordis companion plugin name. */
export const name = 'st-regex-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/**
 * No runtime invariant: the panel is pure presentation over the st-api regex
 * routes; behavior coverage lives in the engine's unit tests.
 */
const install = () => { };
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
/* jscpd:ignore-end */
//# sourceMappingURL=invariant.js.map