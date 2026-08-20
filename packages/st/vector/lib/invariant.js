//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-st-vector`.
* @module @deepseek-ai/dsh-st-vector/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-st-vector";
/** Cordis companion plugin name. */
const name = "st-vector-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: embedding determinism and retrieval thresholds are
* pinned by the package suite; the index has no independent event sequence
* to assert at runtime.
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
