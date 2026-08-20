//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-st-instruct`.
* @module @deepseek-ai/dsh-st-instruct/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-st-instruct";
/** Cordis companion plugin name. */
const name = "st-instruct-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: the file provider owns no live registries — the
* instructs directory is read per call, and the ST field mapping is pinned
* by the package suite.
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
