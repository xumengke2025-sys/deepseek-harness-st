//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-llm-ollama`.
* @module @deepseek-ai/dsh-llm-ollama/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-llm-ollama";
/** Cordis companion plugin name. */
const name = "llm-ollama-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/** No runtime invariant: the adapter is stateless. */
const install = () => {};
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
