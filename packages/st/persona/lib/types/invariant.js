/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-st-persona`.
 * @module @deepseek-ai/dsh-st-persona/invariant
 */
const PACKAGE_NAME = '@deepseek-ai/dsh-st-persona';
/** Cordis companion plugin name. */
export const name = 'st-persona-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/**
 * No runtime invariant: the file provider owns no live registries — the
 * personas directory is read per call, and list/save/delete behavior is
 * pinned by the package suite.
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