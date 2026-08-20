//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-st-chat`.
* @module @deepseek-ai/dsh-client-ui-st-chat/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-client-ui-st-chat";
/** Cordis companion plugin name. */
const name = "st-chat-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: the surface is pure presentation over the st-api HTTP
* table; behavior coverage lives in the st packages' own companions.
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
