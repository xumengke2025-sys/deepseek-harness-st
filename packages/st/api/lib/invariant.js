//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-st-api`.
* @module @deepseek-ai/dsh-st-api/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-st-api";
/** Cordis companion plugin name. */
const name = "st-api-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: routing correctness is pinned by the route table's
* suite; the endpoint surface owns no independent event sequence.
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
