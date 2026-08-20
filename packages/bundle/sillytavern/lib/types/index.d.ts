/**
 * SillyTavern bundle: the SillyTavern surface as a DSH patch layer. The
 * composition authority is `cordis.patch.yml`; this module only marks the
 * package as loadable.
 *
 * Usage: `dsh --profile sillytavern` (a shipped template) or add
 * `@deepseek-ai/dsh-bundle-sillytavern` to any web profile's bundle list.
 * Data location is `ST_DATA_ROOT` (default: a SillyTavern checkout's
 * `data/default-user`), so this bundle and standalone SillyTavern share
 * characters/, chats/, and worlds/ directly.
 *
 * @module @deepseek-ai/dsh-bundle-sillytavern
 */
/** Bundle marker: the patch file is the composition authority. */
export declare const name = "bundle-sillytavern";
//# sourceMappingURL=index.d.ts.map