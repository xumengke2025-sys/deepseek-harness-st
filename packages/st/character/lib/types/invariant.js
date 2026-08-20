/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-st-character`.
 * @module @deepseek-ai/dsh-st-character/invariant
 */
const PACKAGE_NAME = '@deepseek-ai/dsh-st-character';
/** Cordis companion plugin name. */
export const name = 'st-character-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/**
 * No runtime invariant: file round-trips and PNG codec compatibility are
 * pinned by the package suites; there is no independent event sequence to
 * assert at runtime.
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