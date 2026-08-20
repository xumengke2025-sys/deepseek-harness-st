import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/**
 * The Data Bank panel: paste documents into the vector store, list indexed
 * files, delete them, and test similarity retrieval — ST's Data Bank screen
 * over the st-api vector file routes.
 */
import { useCallback, useEffect, useState } from 'react';
import css from './lorebook.module.css';
/**
 * The Data Bank management surface.
 * @param props - the {@link StFace} share (api).
 */
export function DataBankPanel({ api }) {
    const [files, setFiles] = useState([]);
    const [name, setName] = useState('');
    const [text, setText] = useState('');
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const load = useCallback(() => {
        api.listBankFiles().then(setFiles).catch((e) => { setError(String(e)); });
    }, [api]);
    useEffect(load, [load]);
    /** Chunk and index the form's document, then refresh the file list. */
    const handleIndex = useCallback(async () => {
        if (name.trim() === '' || text.trim() === '') {
            setError('文件名与正文不能为空');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const doc = name.trim();
            const { chunks } = await api.indexBankFile(doc, text);
            window.alert(`已索引「${doc}」：${chunks} 个分块`);
            setName('');
            setText('');
            load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setBusy(false);
        }
    }, [api, name, text, load]);
    const handleDelete = useCallback(async (file) => {
        setBusy(true);
        setError('');
        try {
            await api.deleteBankFile(file);
            if (hits !== null)
                setHits(hits.filter((h) => !h.key.startsWith(`${file}#`)));
            load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setBusy(false);
        }
    }, [api, hits, load]);
    /** Run one similarity query over the indexed chunks. */
    const handleSearch = useCallback(async () => {
        if (query.trim() === '') {
            setError('检索词不能为空');
            return;
        }
        setBusy(true);
        setError('');
        try {
            setHits(await api.searchBankFiles(query));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setBusy(false);
        }
    }, [api, query]);
    return (_jsxs("div", { className: css.panel, children: [_jsxs("div", { className: css.books, children: [_jsx("div", { className: css.booksHead, children: _jsxs("span", { children: ["\u6587\u6863\uFF08", files.length, "\uFF09"] }) }), files.map((f) => (_jsxs("div", { className: css.bookRow, children: [_jsx("span", { className: css.bookBtn, children: f }), _jsx("button", { type: "button", className: css.toolBtn, title: "\u5220\u9664\u7D22\u5F15", disabled: busy, onClick: () => { void handleDelete(f); }, children: "\u2715" })] }, f))), files.length === 0 && _jsx("p", { className: css.hint, children: "\u6682\u65E0\u6587\u6863\u3002\u7C98\u8D34\u6B63\u6587\u5EFA\u7ACB\u7B2C\u4E00\u4E2A\u7D22\u5F15\u3002" })] }), _jsxs("div", { className: css.editor, children: [_jsxs("form", { className: css.form, onSubmit: (e) => { e.preventDefault(); void handleIndex(); }, children: [_jsxs("label", { className: css.label, children: ["\u6587\u4EF6\u540D", _jsx("input", { className: css.input, value: name, placeholder: "\u4F8B\u5982\uFF1A\u4E16\u754C\u8BBE\u5B9A\u96C6", onChange: (e) => { setName(e.target.value); } })] }), _jsxs("label", { className: css.label, children: ["\u6B63\u6587\uFF08\u5206\u5757\u540E\u5EFA\u7ACB\u5411\u91CF\u7D22\u5F15\uFF09", _jsx("textarea", { className: css.textarea, rows: 8, value: text, onChange: (e) => { setText(e.target.value); } })] }), _jsx("div", { className: css.row, children: _jsx("button", { type: "submit", className: css.primaryBtn, disabled: busy, children: "\u5EFA\u7ACB\u7D22\u5F15" }) })] }), _jsxs("form", { className: css.form, onSubmit: (e) => { e.preventDefault(); void handleSearch(); }, children: [_jsxs("label", { className: css.label, children: ["\u68C0\u7D22\u6D4B\u8BD5", _jsxs("div", { className: css.row, children: [_jsx("input", { className: css.input, value: query, placeholder: "\u8F93\u5165\u68C0\u7D22\u8BCD\uFF0C\u6309\u76F8\u4F3C\u5EA6\u8FD4\u56DE\u5206\u5757", onChange: (e) => { setQuery(e.target.value); } }), _jsx("button", { type: "submit", className: css.miniBtn, disabled: busy, children: "\u68C0\u7D22" })] })] }), hits !== null && (_jsxs("div", { className: css.hitList, children: [hits.map((h) => (_jsxs("div", { className: css.hit, children: [_jsxs("span", { className: css.hitMeta, children: [h.key, " \u00B7 ", h.score.toFixed(3)] }), _jsxs("span", { children: [h.text.slice(0, 200), h.text.length > 200 ? '…' : ''] })] }, h.key))), hits.length === 0 && _jsx("p", { className: css.hint, children: "\u65E0\u547D\u4E2D\u3002" })] }))] })] }), error !== '' && _jsx("div", { className: css.error, children: error })] }));
}
//# sourceMappingURL=DataBankPanel.js.map