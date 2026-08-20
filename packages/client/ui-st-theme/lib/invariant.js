//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-st-theme`.
* @module @deepseek-ai/dsh-client-ui-st-theme/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-client-ui-st-theme";
/** Cordis companion plugin name. */
const name = "st-theme-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: the theme registry is pure presentation writing CSS
* custom properties; behavior coverage lives in this package's unit tests.
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
