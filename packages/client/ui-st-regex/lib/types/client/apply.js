import { jsx as _jsx } from "react/jsx-runtime";
import { RegexPanel } from "./RegexPanel.js";
import css from './regex.module.css';
/** Services required by the browser plugin. */
export const inject = ['slots'];
/** The nav row for the regex surface; the panel key is closed over. */
function RegexNavRow(props) {
    return (_jsx("button", { type: "button", className: props.panel === 'regex' ? css.navBtnActive : css.navBtn, onClick: () => { props.select('regex'); }, children: "\u29C9 \u6B63\u5219" }));
}
/**
 * Mount the regex-script surface into the ST shell's nav and panel slots.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    // ui-st-chat's shell declares 'st.nav'/'st.panel' at its own load time; wait
    // for it so plugin load order cannot matter.
    ctx.slots.inject('st.panel', () => {
        const disposePanel = ctx.slots.register({ name: 'st.panel', key: 'regex' }, RegexPanel);
        const disposeNav = ctx.slots.register({ name: 'st.nav', id: 'regex', order: 25 }, RegexNavRow);
        return [disposeNav, disposePanel];
    });
}
//# sourceMappingURL=apply.js.map