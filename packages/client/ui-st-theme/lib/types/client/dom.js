/**
 * DOM application of the theme registry: writes the active theme's custom
 * properties onto the document root (every ST panel's CSS resolves them with
 * its own fallbacks) and persists the selection in localStorage.
 */
import { resolveStoredTheme, resolveTheme } from "./themes.js";
/** localStorage key holding the selected theme id. */
export const THEME_STORAGE_KEY = 'dsh-st.theme';
/** Read the persisted theme id; `null` when storage is unavailable or empty. */
export function readStoredThemeId() {
    try {
        return localStorage.getItem(THEME_STORAGE_KEY);
    }
    catch {
        // Only swallow storage denial (sandboxed about:blank, disabled storage):
        // the default theme applies instead.
        return null;
    }
}
/**
 * Write one theme's custom properties onto the document root and persist its id.
 * @param theme - the theme to activate and remember.
 */
export function applyTheme(theme) {
    for (const [name, value] of Object.entries(theme.vars)) {
        document.documentElement.style.setProperty(name, value);
    }
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme.id);
    }
    catch {
        // Only swallow a full or denied quota: the applied theme stays active
        // for this session and reload persistence is best-effort.
    }
}
/** Apply the persisted (or default) theme; called once at plugin load. */
export function restoreTheme() {
    applyTheme(resolveStoredTheme(readStoredThemeId()));
}
/** Apply and persist a theme by id; unknown ids resolve to the default. */
export function selectTheme(id) {
    applyTheme(resolveTheme(id));
}
//# sourceMappingURL=dom.js.map