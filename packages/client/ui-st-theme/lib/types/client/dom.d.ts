/**
 * DOM application of the theme registry: writes the active theme's custom
 * properties onto the document root (every ST panel's CSS resolves them with
 * its own fallbacks) and persists the selection in localStorage.
 */
import { type StTheme } from './themes.ts';
/** localStorage key holding the selected theme id. */
export declare const THEME_STORAGE_KEY = "dsh-st.theme";
/** Read the persisted theme id; `null` when storage is unavailable or empty. */
export declare function readStoredThemeId(): string | null;
/**
 * Write one theme's custom properties onto the document root and persist its id.
 * @param theme - the theme to activate and remember.
 */
export declare function applyTheme(theme: StTheme): void;
/** Apply the persisted (or default) theme; called once at plugin load. */
export declare function restoreTheme(): void;
/** Apply and persist a theme by id; unknown ids resolve to the default. */
export declare function selectTheme(id: string): void;
//# sourceMappingURL=dom.d.ts.map