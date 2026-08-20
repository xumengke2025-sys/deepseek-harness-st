import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The regex-script panel: list, edit, create, enable, and delete find-replace
 * scripts over the st-api regex routes. Saves broadcast 'st-regex-updated' on
 * window so the chat surface re-fetches its display-side copy.
 */
import { useCallback, useEffect, useState } from 'react';
import css from './regex.module.css';
/** ST's placement flags, mirrored locally: cross-plugin value imports are forbidden in client bundles. */
const PLACEMENT = { USER_INPUT: 1, DISPLAY: 0, AI_OUTPUT: 2 };
/** A fresh script skeleton for the editor, ST's defaults. */
function blankScript() {
    return {
        id: '', scriptName: '新建脚本', findRegex: '', replaceString: '', trimStrings: [],
        placement: [PLACEMENT.DISPLAY], disabled: false,
        markdownOnly: false, promptOnly: false, substituteRegex: false,
    };
}
/** One placement flag's label. */
const PLACEMENTS = [
    { flag: PLACEMENT.USER_INPUT, label: '用户输入' },
    { flag: PLACEMENT.DISPLAY, label: '显示' },
    { flag: PLACEMENT.AI_OUTPUT, label: 'AI 输出' },
];
/**
 * The regex-script management surface.
 * @param props - the {@link StFace} share (api, actions).
 */
export function RegexPanel({ api }) {
    const [scripts, setScripts] = useState([]);
    const [editing, setEditing] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const load = useCallback(() => {
        api.listRegex().then(setScripts).catch((e) => { setError(String(e)); });
    }, [api]);
    useEffect(load, [load]);
    /** Persist the editor's script, then tell the chat surface to refetch. */
    const handleSave = useCallback(async () => {
        if (editing === null)
            return;
        if (editing.findRegex === '') {
            setError('查找正则不能为空');
            return;
        }
        setBusy(true);
        setError('');
        try {
            // An invalid pattern must not reach storage; ST validates per script.
            new RegExp(editing.findRegex);
            const saved = await api.saveRegex(editing);
            setEditing(saved);
            window.dispatchEvent(new CustomEvent('st-regex-updated'));
            load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setBusy(false);
        }
    }, [api, editing, load]);
    const handleDelete = useCallback(async (id) => {
        setBusy(true);
        setError('');
        try {
            await api.deleteRegex(id);
            if (editing?.id === id)
                setEditing(null);
            window.dispatchEvent(new CustomEvent('st-regex-updated'));
            load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setBusy(false);
        }
    }, [api, editing?.id, load]);
    /** Toggle one placement flag in the editor. */
    const togglePlacement = (flag) => {
        setEditing((cur) => cur === null ? null : {
            ...cur,
            placement: cur.placement.includes(flag)
                ? cur.placement.filter((p) => p !== flag)
                : [...cur.placement, flag],
        });
    };
    return (_jsxs("div", { className: css.panel, children: [_jsxs("div", { className: css.head, children: [_jsx("span", { className: css.title, children: "\u6B63\u5219\u811A\u672C" }), _jsx("button", { type: "button", className: css.smallBtn, disabled: busy, onClick: () => { setEditing(blankScript()); setError(''); }, children: "\uFF0B \u65B0\u5EFA" })] }), _jsx("p", { className: css.hint, children: "\u67E5\u627E\u66FF\u6362\u811A\u672C\uFF1A\u6309\u4F5C\u7528\u4F4D\u7F6E\u6539\u5199\u5165\u63D0\u793A\u8BCD\u6216\u4EC5\u663E\u793A\u7684\u6587\u672C\u3002\u5B58\u50A8\u5728 settings/regex.json\uFF0C\u4E0E SillyTavern \u517C\u5BB9\u3002" }), _jsxs("div", { className: css.list, children: [scripts.map((s) => (_jsxs("div", { className: s.id === editing?.id ? css.itemActive : css.item, children: [_jsxs("button", { type: "button", className: css.itemMain, onClick: () => { setEditing({ ...s }); setError(''); }, children: [_jsx("span", { className: s.disabled ? css.nameOff : css.name, children: s.scriptName }), _jsxs("span", { className: css.rule, children: [s.findRegex, " \u2192 ", s.replaceString === '' ? '(删除)' : s.replaceString] })] }), _jsx("button", { type: "button", className: css.toolBtn, title: s.disabled ? '启用' : '停用', onClick: () => { setEditing({ ...s, disabled: !s.disabled }); }, children: s.disabled ? '⏸' : '▶' }), _jsx("button", { type: "button", className: css.toolBtn, title: "\u5220\u9664", onClick: () => { void handleDelete(s.id); }, children: "\u2715" })] }, s.id))), scripts.length === 0 && _jsx("p", { className: css.hint, children: "\u6682\u65E0\u811A\u672C\u3002" })] }), editing !== null && (_jsxs("div", { className: css.editor, children: [_jsxs("label", { className: css.label, children: ["\u540D\u79F0", _jsx("input", { className: css.input, value: editing.scriptName, onChange: (e) => { setEditing({ ...editing, scriptName: e.target.value }); } })] }), _jsxs("label", { className: css.label, children: ["\u67E5\u627E\u6B63\u5219\uFF08\u5168\u5C40\u5339\u914D\uFF09", _jsx("input", { className: css.input, value: editing.findRegex, placeholder: '例如 \\*\\*(.+?)\\*\\*', onChange: (e) => { setEditing({ ...editing, findRegex: e.target.value }); } })] }), _jsxs("label", { className: css.label, children: ["\u66FF\u6362\u4E3A\uFF08\u652F\u6301 $1 \u53CD\u5411\u5F15\u7528\u3001", '{{char}}/{{user}}', "\uFF09", _jsx("input", { className: css.input, value: editing.replaceString, onChange: (e) => { setEditing({ ...editing, replaceString: e.target.value }); } })] }), _jsxs("label", { className: css.label, children: ["\u79FB\u9664\u7247\u6BB5\uFF08\u6BCF\u884C\u4E00\u4E2A\uFF0C\u66FF\u6362\u540E\u5220\u9664\uFF09", _jsx("textarea", { className: css.area, rows: 2, value: editing.trimStrings.join('\n'), onChange: (e) => {
                                    setEditing({ ...editing, trimStrings: e.target.value.split('\n').filter((t) => t !== '') });
                                } })] }), _jsxs("div", { className: css.label, children: ["\u4F5C\u7528\u4F4D\u7F6E", _jsx("div", { className: css.row, children: PLACEMENTS.map(({ flag, label }) => (_jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: editing.placement.includes(flag), onChange: () => { togglePlacement(flag); } }), label] }, flag))) })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: editing.substituteRegex, onChange: (e) => { setEditing({ ...editing, substituteRegex: e.target.checked }); } }), "\u66FF\u6362\u6587\u672C\u4E2D\u4EE3\u5165 ", '{{char}}/{{user}}'] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: editing.disabled, onChange: (e) => { setEditing({ ...editing, disabled: e.target.checked }); } }), "\u505C\u7528"] })] }), _jsxs("div", { className: css.row, children: [_jsx("button", { type: "button", className: css.smallBtn, disabled: busy, onClick: () => { void handleSave(); }, children: "\u4FDD\u5B58" }), _jsx("button", { type: "button", className: css.smallBtn, onClick: () => { setEditing(null); }, children: "\u5173\u95ED" })] })] })), error !== '' && _jsx("div", { className: css.error, children: error })] }));
}
//# sourceMappingURL=RegexPanel.js.map