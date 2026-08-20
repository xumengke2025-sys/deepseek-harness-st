/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-st-instruct`.
 * @module @deepseek-ai/dsh-st-instruct/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-st-instruct'

/** Cordis companion plugin name. */
export const name = 'st-instruct-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the file provider owns no live registries — the
 * instructs directory is read per call, and the ST field mapping is pinned
 * by the package suite.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
