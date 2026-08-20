/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-bundle-sillytavern`.
 * @module @deepseek-ai/dsh-bundle-sillytavern/invariant
 */
const PACKAGE_NAME = '@deepseek-ai/dsh-bundle-sillytavern';
/** Cordis companion plugin name. */
export const name = 'sillytavern-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/**
 * No runtime invariant: the bundle is a static cordis.patch.yml composition
 * over the st packages' own companions; it holds no runtime state to audit.
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