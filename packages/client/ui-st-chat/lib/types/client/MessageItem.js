import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * One chat message row: avatar, name, body (editable), and ST swipe
 * navigation when alternates exist.
 */
import { useEffect, useRef, useState } from 'react';
import { speak, stripExpressionMarks } from "./tts.js";
import css from './chat.module.css';
/** ST's swipe floor: swipe_id 0 is the first alternate. */
function swipeId(message) {
    return message.swipe_id ?? 0;
}
/** Render markdown-lite: paragraphs and line breaks only; full rendering lands with the theme pass. */
function bodyLines(text) {
    return stripExpressionMarks(text).split(/\n{2,}/);
}
/**
 * One message row with edit-in-place and swipe controls.
 * @param props - row owner share.
 */
export function MessageItem(props) {
    const { message } = props;
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const areaRef = useRef(null);
    useEffect(() => {
        if (!editing)
            return;
        setDraft(message.mes);
        areaRef.current?.focus();
    }, [editing, message.mes]);
    const swipes = message.swipes;
    const id = swipeId(message);
    const hasSwipes = swipes !== undefined && swipes.length > 1;
    return (_jsxs("div", { className: message.is_user ? css.rowUser : css.rowChar, children: [!message.is_user && (_jsx("img", { className: css.avatar, src: props.avatarUrl, alt: message.name, draggable: false })), _jsxs("div", { className: css.bubble, children: [_jsxs("div", { className: css.meta, children: [_jsx("span", { className: css.name, children: message.name }), !props.locked && (_jsxs("span", { className: css.tools, children: [_jsx("button", { type: "button", className: css.toolBtn, title: "\u7F16\u8F91", onClick: () => { setEditing((v) => !v); }, children: "\u270E" }), _jsx("button", { type: "button", className: css.toolBtn, title: "\u6717\u8BFB", onClick: () => { speak(message.mes); }, children: "\uD83D\uDD0A" }), props.onBranch !== undefined && (_jsx("button", { type: "button", className: css.toolBtn, title: "\u4ECE\u6B64\u5904\u5206\u652F\uFF08\u4FDD\u5B58\u4E3A\u65B0\u804A\u5929\uFF09", onClick: props.onBranch, children: "\uD83C\uDF8B" })), _jsx("button", { type: "button", className: css.toolBtn, title: "\u5220\u9664", onClick: props.onDelete, children: "\uD83D\uDDD1" })] }))] }), editing
                        ? (_jsxs("div", { className: css.editBox, children: [_jsx("textarea", { ref: areaRef, className: css.editArea, value: draft, onChange: (e) => { setDraft(e.target.value); }, rows: Math.max(3, draft.split('\n').length) }), _jsxs("div", { className: css.editActions, children: [_jsx("button", { type: "button", className: css.smallBtn, onClick: () => { props.onEdit(draft); setEditing(false); }, children: "\u4FDD\u5B58" }), _jsx("button", { type: "button", className: css.smallBtn, onClick: () => { setEditing(false); }, children: "\u53D6\u6D88" })] })] }))
                        : (_jsx("div", { className: css.body, children: bodyLines(props.displayMes ?? message.mes).map((para, i) => _jsx("p", { children: para }, i)) })), hasSwipes && !editing && (_jsxs("div", { className: css.swipeBar, children: [_jsx("button", { type: "button", className: css.swipeBtn, title: "\u4E0A\u4E00\u4E2A\u5019\u9009\u56DE\u590D", disabled: id === 0, onClick: () => { props.onSwipe(id - 1); }, children: "\u25C0" }), _jsxs("span", { className: css.swipeCount, children: [id + 1, " / ", swipes.length] }), _jsx("button", { type: "button", className: css.swipeBtn, title: "\u4E0B\u4E00\u4E2A\u5019\u9009\u56DE\u590D\uFF08\u672B\u5C3E\u65F6\u751F\u6210\u65B0\u7684\uFF09", onClick: () => {
                                    if (id < swipes.length - 1)
                                        props.onSwipe(id + 1);
                                    else
                                        props.onNewSwipe();
                                }, children: "\u25B6" }), props.onDeleteSwipe !== undefined && swipes.length > 1 && (_jsx("button", { type: "button", className: css.swipeBtn, title: "\u5220\u9664\u5F53\u524D\u5019\u9009\u56DE\u590D", onClick: props.onDeleteSwipe, children: "\u2715" }))] }))] })] }));
}
//# sourceMappingURL=MessageItem.js.map