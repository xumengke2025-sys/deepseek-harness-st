import { jsx as _jsx } from "react/jsx-runtime";
import { DataBankPanel } from "./DataBankPanel.js";
import { LorebookPanel } from "./LorebookPanel.js";
import css from './lorebook.module.css';
/** Services required by the browser plugin. */
export const inject = ['slots'];
/** The nav row for the lorebook surface; the panel key is closed over. */
function LorebookNavRow(props) {
    return (_jsx("button", { type: "button", className: props.panel === 'lorebook' ? css.navBtnActive : css.navBtn, onClick: () => { props.select('lorebook'); }, children: "\uD83D\uDCDA \u4E16\u754C\u4E66" }));
}
/** The nav row for the Data Bank surface. */
function DataBankNavRow(props) {
    return (_jsx("button", { type: "button", className: props.panel === 'databank' ? css.navBtnActive : css.navBtn, onClick: () => { props.select('databank'); }, children: "\uD83C\uDFE6 \u6570\u636E\u94F6\u884C" }));
}
/**
 * Mount the lorebook and Data Bank surfaces into the ST shell's nav and panel
 * slots.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    // ui-st-chat's shell declares 'st.nav'/'st.panel' at its own load time; wait
    // for it so plugin load order cannot matter.
    ctx.slots.inject('st.panel', () => {
        const disposeLore = ctx.slots.register({ name: 'st.panel', key: 'lorebook' }, LorebookPanel);
        const disposeLoreNav = ctx.slots.register({ name: 'st.nav', id: 'lorebook', order: 20 }, LorebookNavRow);
        const disposeBank = ctx.slots.register({ name: 'st.panel', key: 'databank' }, DataBankPanel);
        const disposeBankNav = ctx.slots.register({ name: 'st.nav', id: 'databank', order: 25 }, DataBankNavRow);
        return [disposeLoreNav, disposeLore, disposeBankNav, disposeBank];
    });
}
//# sourceMappingURL=apply.js.map