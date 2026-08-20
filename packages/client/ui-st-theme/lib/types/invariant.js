/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-st-theme`.
 * @module @deepseek-ai/dsh-client-ui-st-theme/invariant
 */
const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-st-theme';
/** Cordis companion plugin name. */
export const name = 'st-theme-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/**
 * No runtime invariant: the theme registry is pure presentation writing CSS
 * custom properties; behavior coverage lives in this package's unit tests.
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