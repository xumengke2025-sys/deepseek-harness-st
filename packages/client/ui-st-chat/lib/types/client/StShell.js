import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import css from './st-shell.module.css';
/**
 * The ST surface root.
 * @param props - child render share plus the {@link StFace} share.
 */
export function StShell(props) {
    const panel = props.useSt((s) => s.panel);
    return (_jsxs("div", { className: css.shell, children: [_jsx("nav", { className: css.nav, children: props.renderSlot('st.nav', { panel, select: props.actions.setPanel }) }), _jsx("div", { className: css.surface, children: props.renderSlot('st.panel', {}, {
                    entryKey: panel,
                    fallback: _jsxs("div", { className: css.missing, children: ["Panel \u201C", panel, "\u201D is not registered."] }),
                }) })] }));
}
//# sourceMappingURL=StShell.js.map