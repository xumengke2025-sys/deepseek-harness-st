//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-st-regex`.
* @module @deepseek-ai/dsh-st-regex/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-st-regex";
/** Cordis companion plugin name. */
const name = "st-regex-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: script application order and find-replace semantics
* are pure functions pinned by the package suites; there is no mutable
* relation to audit inside the tree.
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
