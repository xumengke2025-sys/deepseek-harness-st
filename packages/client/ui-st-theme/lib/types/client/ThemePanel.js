import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The theme panel: one card per registry theme with color swatches; clicking
 * applies the theme immediately and persists the selection.
 */
import { useState } from 'react';
import { THEMES } from "./themes.js";
import { readStoredThemeId, selectTheme } from "./dom.js";
import css from './theme.module.css';
/** Swatch columns shown per card: background, bubbles, accent. */
const SWATCH_VARS = ['--dsh-st-bg', '--dsh-st-bubble-user', '--dsh-st-accent'];
/**
 * The ST theme surface.
 * @param _props - the {@link StFace} share; theme selection is local to this panel.
 */
export function ThemePanel(_props) {
    const [active, setActive] = useState(readStoredThemeId() ?? THEMES[0].id);
    const choose = (id) => {
        selectTheme(id);
        setActive(id);
    };
    return (_jsxs("div", { className: css.panel, children: [_jsx("div", { className: css.hint, children: "\u9009\u62E9\u4E3B\u9898\u540E\u7ACB\u5373\u751F\u6548\uFF0C\u5E76\u4F1A\u5728\u5237\u65B0\u540E\u4FDD\u7559\u3002" }), _jsx("div", { className: css.grid, children: THEMES.map((theme) => (_jsxs("button", { type: "button", className: theme.id === active ? css.cardActive : css.card, onClick: () => { choose(theme.id); }, children: [_jsx("div", { className: css.swatches, children: SWATCH_VARS.map((name) => (_jsx("span", { className: css.swatch, style: { background: theme.vars[name] } }, name))) }), _jsx("div", { className: css.label, children: theme.label })] }, theme.id))) })] }));
}
//# sourceMappingURL=ThemePanel.js.map