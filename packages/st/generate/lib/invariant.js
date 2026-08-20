//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-st-generate`.
* @module @deepseek-ai/dsh-st-generate/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-st-generate";
/** Cordis companion plugin name. */
const name = "st-generate-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: prompt assembly is pure and pinned by the package
* suites; streaming delegates to the dsh-llm seam's own checks.
*/
const install = () => {};
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
