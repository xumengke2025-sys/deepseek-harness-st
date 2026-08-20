/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-llm-openai`.
 * @module @deepseek-ai/dsh-llm-openai/invariant
 */
const PACKAGE_NAME = '@deepseek-ai/dsh-llm-openai';
/** Cordis companion plugin name. */
export const name = 'llm-openai-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/** No runtime invariant: the adapter is stateless. */
const install = () => { };
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
/* jscpd:ignore-end */
//# sourceMappingURL=invariant.js.map