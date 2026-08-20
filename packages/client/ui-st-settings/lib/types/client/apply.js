import { jsx as _jsx } from "react/jsx-runtime";
import { SettingsPanel } from "./SettingsPanel.js";
import css from './settings.module.css';
/** Services required by the browser plugin. */
export const inject = ['slots'];
/** The nav row for the settings surface; the panel key is closed over. */
function SettingsNavRow(props) {
    return (_jsx("button", { type: "button", className: props.panel === 'settings' ? css.navBtnActive : css.navBtn, onClick: () => { props.select('settings'); }, children: "\u2699\uFE0F \u8BBE\u7F6E" }));
}
/**
 * Mount the settings surface into the ST shell's nav and panel slots.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    // ui-st-chat's shell declares 'st.nav'/'st.panel' at its own load time; wait
    // for it so plugin load order cannot matter.
    ctx.slots.inject('st.panel', () => {
        const disposePanel = ctx.slots.register({ name: 'st.panel', key: 'settings' }, SettingsPanel);
        const disposeNav = ctx.slots.register({ name: 'st.nav', id: 'settings', order: 30 }, SettingsNavRow);
        return [disposeNav, disposePanel];
    });
}
//# sourceMappingURL=apply.js.map