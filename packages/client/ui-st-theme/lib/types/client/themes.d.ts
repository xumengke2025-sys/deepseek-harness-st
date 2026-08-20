/**
 * The theme registry: each theme is a complete assignment of the surface's
 * `--dsh-st-*` custom properties, matching the fallbacks every ST panel's CSS
 * declares. Pure data plus id resolution — no DOM access lives here.
 */
/** Every custom property a theme assigns; the surface's CSS reads exactly these. */
export declare const THEME_VARS: readonly ["--dsh-st-bg", "--dsh-st-fg", "--dsh-st-border", "--dsh-st-nav-bg", "--dsh-st-hover", "--dsh-st-accent", "--dsh-st-accent-dim", "--dsh-st-bubble", "--dsh-st-bubble-user"];
/** One theme-assigned custom property name. */
export type StThemeVar = typeof THEME_VARS[number];
/** A complete theme: a label plus one color per {@link THEME_VARS}. */
export interface StTheme {
    id: string;
    label: string;
    vars: Record<StThemeVar, string>;
}
/** The shipped themes, in panel order; `midnight` doubles as the default. */
export declare const THEMES: readonly StTheme[];
/** The default theme id; also the fallback for unknown persisted values. */
export declare const DEFAULT_THEME_ID = "midnight";
/** Look up a theme by id; unknown ids fall back to {@link DEFAULT_THEME_ID}. */
export declare function resolveTheme(id: string): StTheme;
/** Resolve a persisted storage value; `null` or an unknown id selects the default. */
export declare function resolveStoredTheme(stored: string | null): StTheme;
//# sourceMappingURL=themes.d.ts.map