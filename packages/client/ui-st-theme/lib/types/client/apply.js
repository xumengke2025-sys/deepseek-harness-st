import { jsx as _jsx } from "react/jsx-runtime";
import { ThemePanel } from "./ThemePanel.js";
import { restoreTheme } from "./dom.js";
import css from './theme.module.css';
/** Services required by the browser plugin. */
export const inject = ['slots'];
/** The nav row for the theme surface; the panel key is closed over. */
function ThemeNavRow(props) {
    return (_jsx("button", { type: "button", className: props.panel === 'theme' ? css.navBtnActive : css.navBtn, onClick: () => { props.select('theme'); }, children: "\uD83C\uDFA8 \u4E3B\u9898" }));
}
/**
 * Mount the theme surface into the ST shell's nav and panel slots.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    // The theme must be live before first paint of the ST panels, so the
    // restore runs at plugin load rather than on panel entry.
    restoreTheme();
    // ui-st-chat's shell declares 'st.nav'/'st.panel' at its own load time; wait
    // for it so plugin load order cannot matter.
    ctx.slots.inject('st.panel', () => {
        const disposePanel = ctx.slots.register({ name: 'st.panel', key: 'theme' }, ThemePanel);
        const disposeNav = ctx.slots.register({ name: 'st.nav', id: 'theme', order: 40 }, ThemeNavRow);
        return [disposeNav, disposePanel];
    });
}
//# sourceMappingURL=apply.js.map