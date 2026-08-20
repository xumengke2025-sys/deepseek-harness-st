import { jsx as _jsx } from "react/jsx-runtime";
import { CharactersPanel } from "./CharactersPanel.js";
import css from './characters.module.css';
/** Services required by the browser plugin. */
export const inject = ['slots'];
/** The nav row for the characters surface; the panel key is closed over. */
function CharactersNavRow(props) {
    return (_jsx("button", { type: "button", className: props.panel === 'characters' ? css.navBtnActive : css.navBtn, onClick: () => { props.select('characters'); }, children: "\uD83D\uDC65 \u89D2\u8272\u5361" }));
}
/**
 * Mount the characters surface into the ST shell's nav and panel slots.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    // ui-st-chat's shell declares 'st.nav'/'st.panel' at its own load time; wait
    // for it so plugin load order cannot matter.
    ctx.slots.inject('st.panel', () => {
        const disposePanel = ctx.slots.register({ name: 'st.panel', key: 'characters' }, CharactersPanel);
        const disposeNav = ctx.slots.register({ name: 'st.nav', id: 'characters', order: 10 }, CharactersNavRow);
        return [disposeNav, disposePanel];
    });
}
//# sourceMappingURL=apply.js.map