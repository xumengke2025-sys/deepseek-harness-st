import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The World Info (lorebook) editor: book picker, entry list, and entry editor
 * over the st-lorebook service's HTTP table — ST's world-info screen layout.
 */
import { useCallback, useEffect, useState } from 'react';
import css from './lorebook.module.css';
/** Chinese label per secondary-key logic value (ST's world_info_logic). */
const LOGIC_LABELS = {
    0: '任意副关键词 (AND_ANY)',
    1: '非全部 (NOT_ALL)',
    2: '均不含 (NOT_ANY)',
    3: '全部包含 (AND_ALL)',
};
/** Common insertion positions (ST's world_info_position subset). */
const POSITION_OPTIONS = [
    { value: 0, label: '角色定义之前 (before)' },
    { value: 1, label: '角色定义之后 (after)' },
    { value: 4, label: '按深度插入 (atDepth)' },
    { value: 7, label: '系统提示 (system)' },
    { value: 1000, label: '示例对话之前 (beforeChar)' },
    { value: 1001, label: '示例对话之后 (afterChar)' },
];
/** ST's newWorldInfoEntry template defaults (client mirror). */
function newEntry(uid, displayIndex) {
    return {
        uid,
        key: [],
        keysecondary: [],
        comment: '',
        content: '',
        constant: false,
        vectorized: false,
        selective: true,
        selectiveLogic: 0,
        addMemo: false,
        order: 100,
        position: 0,
        disable: false,
        ignoreBudget: false,
        excludeRecursion: false,
        preventRecursion: false,
        matchPersonaDescription: false,
        matchCharacterDescription: false,
        matchCharacterPersonality: false,
        matchCharacterDepthPrompt: false,
        matchScenario: false,
        matchCreatorNotes: false,
        delayUntilRecursion: 0,
        probability: 100,
        useProbability: true,
        depth: 4,
        outletName: '',
        group: '',
        groupOverride: false,
        groupWeight: 100,
        scanDepth: null,
        caseSensitive: null,
        matchWholeWords: null,
        useGroupScoring: null,
        automationId: '',
        role: 0,
        sticky: null,
        cooldown: null,
        delay: null,
        displayIndex,
    };
}
/** Comma-separated editing view of a keyword list. */
function joinKeys(keys) {
    return keys.join(', ');
}
/** Parse a comma-separated input back into a keyword list. */
function splitKeys(text) {
    return text.split(',').map((k) => k.trim()).filter((k) => k !== '');
}
/** Blank input means "not set": ST's sticky/cooldown editor shows empty for null. */
function msOfSeconds(text) {
    const t = text.trim();
    if (t === '')
        return null;
    const n = Number(t);
    return Number.isFinite(n) ? Math.round(n * 1000) : null;
}
/** Seconds view of a millisecond field; null renders blank. */
function secondsOfMs(ms) {
    return ms === null ? '' : String(ms / 1000);
}
/** Blank input means "not set" for a message-count field (delay / scanDepth). */
function countOrNull(text) {
    const t = text.trim();
    if (t === '')
        return null;
    const n = Number(t);
    return Number.isFinite(n) ? Math.floor(n) : null;
}
function stringOfCount(v) {
    return v === null ? '' : String(v);
}
/**
 * The ST lorebook surface.
 * @param props - the {@link StFace} share (state hook, api, actions).
 */
export function LorebookPanel({ useSt, api, actions }) {
    const st = useSt((s) => s);
    const activeWorlds = st.worlds;
    const [books, setBooks] = useState([]);
    const [book, setBook] = useState('');
    const [file, setFile] = useState(null);
    const [selUid, setSelUid] = useState(null);
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState('');
    const loadBooks = useCallback(async () => {
        const rows = await api.listWorlds();
        const names = rows.map((r) => r.name);
        setBooks(names);
        return names;
    }, [api]);
    useEffect(() => {
        loadBooks()
            .then((list) => {
            if (list.length > 0 && book === '')
                setBook(list[0]);
        })
            .catch((e) => { setError(String(e)); });
    }, [loadBooks, book]);
    useEffect(() => {
        if (book === '') {
            setFile(null);
            setSelUid(null);
            return;
        }
        setError('');
        api.getWorld(book)
            .then((f) => {
            setFile(f);
            setSelUid(null);
            setDirty(false);
        })
            .catch((e) => { setError(e instanceof Error ? e.message : String(e)); });
    }, [api, book]);
    const entries = file === null ? [] : Object.values(file.entries).sort((a, b) => a.displayIndex - b.displayIndex);
    const selected = entries.find((e) => e.uid === selUid) ?? null;
    /** Local edit: rewrite the selected entry in the file, mark dirty. */
    const patchEntry = useCallback((patch) => {
        if (selected === null)
            return;
        setFile((prev) => prev === null ? prev : {
            ...prev,
            entries: { ...prev.entries, [String(selected.uid)]: { ...selected, ...patch } },
        });
        setDirty(true);
    }, [selected]);
    const addEntry = useCallback(() => {
        if (file === null)
            return;
        const uid = entries.reduce((m, e) => Math.max(m, e.uid), -1) + 1;
        const entry = newEntry(uid, entries.length);
        setFile({ ...file, entries: { ...file.entries, [String(uid)]: entry } });
        setSelUid(uid);
        setDirty(true);
    }, [file, entries]);
    const removeEntry = useCallback((uid) => {
        if (file === null)
            return;
        const next = { ...file.entries };
        delete next[String(uid)];
        setFile({ ...file, entries: next });
        if (selUid === uid)
            setSelUid(null);
        setDirty(true);
    }, [file, selUid]);
    const save = useCallback(async () => {
        if (file === null || book === '')
            return;
        setError('');
        try {
            await api.saveWorld(book, file);
            setDirty(false);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, book, file]);
    const createBook = useCallback(async () => {
        const name = window.prompt('新世界书名称');
        if (name === null || name.trim() === '')
            return;
        try {
            await api.saveWorld(name.trim(), { entries: {} });
            const list = await loadBooks();
            setBook(name.trim());
            if (list.length === 0)
                void loadBooks();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, loadBooks]);
    /** ST activates several books at once: the toggle adds/removes from the set. */
    const toggleActive = useCallback((name) => {
        actions.setWorlds(activeWorlds.includes(name)
            ? activeWorlds.filter((w) => w !== name)
            : [...activeWorlds, name]);
    }, [actions, activeWorlds]);
    /** Flush pending edits, then (re)index the current book's vectorized entries. */
    const indexBook = useCallback(async () => {
        if (file === null || book === '')
            return;
        setError('');
        try {
            if (dirty) {
                await api.saveWorld(book, file);
                setDirty(false);
            }
            const { indexed } = await api.indexWorld(book);
            window.alert(`已为「${book}」建立向量索引：${indexed} 个向量检索条目`);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, file, book, dirty]);
    const deleteBook = useCallback(async (name) => {
        if (!window.confirm(`删除世界书「${name}」？此操作不可恢复。`))
            return;
        try {
            await api.deleteWorld(name);
            const list = await loadBooks();
            if (book === name)
                setBook(list[0] ?? '');
            if (activeWorlds.includes(name))
                actions.setWorlds(activeWorlds.filter((w) => w !== name));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, loadBooks, book, activeWorlds, actions]);
    return (_jsxs("div", { className: css.panel, children: [_jsxs("div", { className: css.globalBar, children: [_jsx("span", { className: css.globalTitle, children: "\u5168\u5C40\u8BBE\u7F6E\uFF08ST \u7684 world_info_*\uFF0C\u4F5C\u7528\u4E8E\u6240\u6709\u542F\u7528\u4E16\u754C\u4E66\u7684\u626B\u63CF\uFF09" }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.number, children: ["\u626B\u63CF\u6DF1\u5EA6\uFF08\u6D88\u606F\uFF09\uFF1A", st.worldInfoDepth ?? 2, _jsx("input", { className: css.input, type: "range", min: 1, max: 10, step: 1, value: st.worldInfoDepth ?? 2, onChange: (e) => { actions.setWorldInfoDepth(Number(e.target.value)); } })] }), _jsxs("label", { className: css.number, children: ["Token \u9884\u7B97\uFF08% \u4E0A\u4E0B\u6587\uFF09\uFF1A", st.worldInfoBudget ?? 25, _jsx("input", { className: css.input, type: "range", min: 1, max: 100, step: 5, value: st.worldInfoBudget ?? 25, onChange: (e) => { actions.setWorldInfoBudget(Number(e.target.value)); } })] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: st.worldInfoCaseSensitive ?? false, onChange: (e) => { actions.setWorldInfoCaseSensitive(e.target.checked); } }), "\u5927\u5C0F\u5199\u654F\u611F"] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: st.worldInfoMatchWholeWords ?? true, onChange: (e) => { actions.setWorldInfoMatchWholeWords(e.target.checked); } }), "\u5168\u8BCD\u5339\u914D"] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: st.worldInfoRecursive ?? true, onChange: (e) => { actions.setWorldInfoRecursive(e.target.checked); } }), "\u9012\u5F52\u626B\u63CF"] })] })] }), _jsxs("div", { className: css.books, children: [_jsxs("div", { className: css.booksHead, children: [_jsx("span", { children: "\u4E16\u754C\u4E66" }), _jsx("button", { type: "button", className: css.miniBtn, title: "\u65B0\u5EFA\u4E16\u754C\u4E66", onClick: () => { void createBook(); }, children: "\uFF0B" })] }), books.map((name) => {
                        const active = activeWorlds.includes(name);
                        return (_jsxs("div", { className: name === book ? css.bookRowActive : css.bookRow, children: [_jsxs("button", { type: "button", className: css.bookBtn, onClick: () => { setBook(name); }, children: [name, active && _jsx("span", { className: css.activeTag, children: " \u2726" })] }), _jsx("button", { type: "button", className: css.miniBtn, title: active ? '取消启用' : '在对话中启用', onClick: () => { toggleActive(name); }, children: active ? '✓' : '＋' }), _jsx("button", { type: "button", className: css.miniBtn, title: "\u5220\u9664\u4E16\u754C\u4E66", onClick: () => { void deleteBook(name); }, children: "\u2715" })] }, name));
                    }), books.length === 0 && _jsx("div", { className: css.hint, children: "\u8FD8\u6CA1\u6709\u4E16\u754C\u4E66" })] }), _jsxs("div", { className: css.entries, children: [_jsxs("div", { className: css.entriesHead, children: [_jsxs("span", { children: [entries.length, " \u4E2A\u6761\u76EE"] }), _jsxs("span", { children: [_jsx("button", { type: "button", className: css.miniBtn, disabled: file === null, title: "\u4E3A\u672C\u4E66\u7684\u5411\u91CF\u68C0\u7D22\u6761\u76EE\u5EFA\u7ACB/\u5237\u65B0\u5411\u91CF\u7D22\u5F15", onClick: () => { void indexBook(); }, children: "\u2317" }), ' ', _jsx("button", { type: "button", className: css.miniBtn, disabled: file === null, title: "\u65B0\u5EFA\u6761\u76EE", onClick: addEntry, children: "\uFF0B" })] })] }), _jsxs("div", { className: css.entryList, children: [entries.map((e) => (_jsxs("div", { className: e.uid === selUid ? css.entryRowActive : css.entryRow, children: [_jsxs("button", { type: "button", className: css.entryBtn, onClick: () => { setSelUid(e.uid); }, children: [e.disable && _jsx("span", { className: css.offTag, children: "\u5DF2\u505C\u7528 \u00B7 " }), e.comment !== '' ? e.comment : e.content.slice(0, 24) || '(空条目)'] }), _jsx("button", { type: "button", className: css.miniBtn, title: "\u5220\u9664\u6761\u76EE", onClick: () => { removeEntry(e.uid); }, children: "\u2715" })] }, e.uid))), file !== null && entries.length === 0 && _jsx("div", { className: css.hint, children: "\u8FD8\u6CA1\u6709\u6761\u76EE" })] }), file !== null && (_jsxs("div", { className: css.entriesFoot, children: [_jsx("button", { type: "button", className: css.primaryBtn, disabled: !dirty, onClick: () => { void save(); }, children: dirty ? '保存更改' : '已保存' }), _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { toggleActive(book); }, children: activeWorlds.includes(book) ? '✓ 对话中已启用' : '在对话中启用' })] }))] }), _jsxs("div", { className: css.editor, children: [selected === null
                        ? _jsx("div", { className: css.hint, children: "\u9009\u62E9\u5DE6\u4FA7\u6761\u76EE\u8FDB\u884C\u7F16\u8F91" })
                        : (_jsxs("div", { className: css.form, children: [_jsxs("label", { className: css.label, children: ["\u5907\u6CE8", _jsx("input", { className: css.input, value: selected.comment, onChange: (e) => { patchEntry({ comment: e.target.value }); } })] }), _jsxs("label", { className: css.label, children: ["\u4E3B\u5173\u952E\u8BCD\uFF08\u9017\u53F7\u5206\u9694\uFF09", _jsx("input", { className: css.input, value: joinKeys(selected.key), onChange: (e) => { patchEntry({ key: splitKeys(e.target.value) }); } })] }), _jsxs("label", { className: css.label, children: ["\u526F\u5173\u952E\u8BCD\uFF08\u9017\u53F7\u5206\u9694\uFF09", _jsx("input", { className: css.input, value: joinKeys(selected.keysecondary), onChange: (e) => { patchEntry({ keysecondary: splitKeys(e.target.value) }); } })] }), _jsxs("label", { className: css.label, children: ["\u526F\u5173\u952E\u8BCD\u903B\u8F91", _jsx("select", { className: css.input, value: selected.selectiveLogic, onChange: (e) => { patchEntry({ selectiveLogic: Number(e.target.value) }); }, children: Object.entries(LOGIC_LABELS).map(([v, label]) => _jsx("option", { value: v, children: label }, v)) })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.label, children: ["\u5927\u5C0F\u5199\u654F\u611F", _jsxs("select", { className: css.input, value: String(selected.caseSensitive ?? 'null'), onChange: (e) => { patchEntry({ caseSensitive: e.target.value === 'null' ? null : e.target.value === 'true' }); }, children: [_jsx("option", { value: "null", children: "\u6CBF\u7528\u5168\u5C40" }), _jsx("option", { value: "true", children: "\u662F" }), _jsx("option", { value: "false", children: "\u5426" })] })] }), _jsxs("label", { className: css.label, children: ["\u6574\u8BCD\u5339\u914D", _jsxs("select", { className: css.input, value: String(selected.matchWholeWords ?? 'null'), onChange: (e) => { patchEntry({ matchWholeWords: e.target.value === 'null' ? null : e.target.value === 'true' }); }, children: [_jsx("option", { value: "null", children: "\u6CBF\u7528\u5168\u5C40" }), _jsx("option", { value: "true", children: "\u662F" }), _jsx("option", { value: "false", children: "\u5426" })] })] }), _jsxs("label", { className: css.label, children: ["\u7EC4\u8BC4\u5206", _jsxs("select", { className: css.input, value: String(selected.useGroupScoring ?? 'null'), onChange: (e) => { patchEntry({ useGroupScoring: e.target.value === 'null' ? null : e.target.value === 'true' }); }, children: [_jsx("option", { value: "null", children: "\u6CBF\u7528\u5168\u5C40" }), _jsx("option", { value: "true", children: "\u662F" }), _jsx("option", { value: "false", children: "\u5426" })] })] })] }), _jsxs("label", { className: css.label, children: ["\u5185\u5BB9\uFF08\u89E6\u53D1\u540E\u6CE8\u5165\u7684\u6587\u672C\uFF09", _jsx("textarea", { className: css.textarea, rows: 6, value: selected.content, onChange: (e) => { patchEntry({ content: e.target.value }); } })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.constant, onChange: (e) => { patchEntry({ constant: e.target.checked }); } }), "\u5E38\u9A7B\uFF08\u65E0\u9700\u5173\u952E\u8BCD\uFF09"] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.disable, onChange: (e) => { patchEntry({ disable: e.target.checked }); } }), "\u505C\u7528"] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.selective, onChange: (e) => { patchEntry({ selective: e.target.checked }); } }), "\u9009\u62E9\u6027\uFF08Selective\uFF09"] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.useProbability, onChange: (e) => { patchEntry({ useProbability: e.target.checked }); } }), "\u542F\u7528\u6982\u7387"] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.addMemo, onChange: (e) => { patchEntry({ addMemo: e.target.checked }); } }), "\u6DFB\u52A0 Memo"] })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.number, children: ["Automation ID", _jsx("input", { className: css.input, value: selected.automationId, onChange: (e) => { patchEntry({ automationId: e.target.value }); } })] }), _jsxs("label", { className: css.number, children: ["Outlet Name", _jsx("input", { className: css.input, value: selected.outletName, onChange: (e) => { patchEntry({ outletName: e.target.value }); } })] }), _jsxs("label", { className: css.number, children: ["Recursion Level", _jsx("input", { className: css.input, type: "number", min: 0, value: selected.delayUntilRecursion, onChange: (e) => { patchEntry({ delayUntilRecursion: Number(e.target.value) }); } })] })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.number, children: ["\u987A\u5E8F", _jsx("input", { className: css.input, type: "number", value: selected.order, onChange: (e) => { patchEntry({ order: Number(e.target.value) }); } })] }), _jsxs("label", { className: css.number, children: ["\u89E6\u53D1\u6982\u7387 %", _jsx("input", { className: css.input, type: "number", min: 0, max: 100, value: selected.probability, onChange: (e) => { patchEntry({ probability: Number(e.target.value) }); } })] })] }), _jsxs("label", { className: css.label, children: ["\u63D2\u5165\u4F4D\u7F6E", _jsx("select", { className: css.input, value: selected.position, onChange: (e) => { patchEntry({ position: Number(e.target.value) }); }, children: POSITION_OPTIONS.map((o) => _jsx("option", { value: o.value, children: o.label }, o.value)) })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.number, children: ["\u5206\u7EC4\uFF08\u540C\u540D\u4E92\u65A5\uFF09", _jsx("input", { className: css.input, value: selected.group, onChange: (e) => { patchEntry({ group: e.target.value }); } })] }), _jsxs("label", { className: css.number, children: ["\u7EC4\u6743\u91CD", _jsx("input", { className: css.input, type: "number", min: 0, value: selected.groupWeight, onChange: (e) => { patchEntry({ groupWeight: Number(e.target.value) }); } })] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.groupOverride, onChange: (e) => { patchEntry({ groupOverride: e.target.checked }); } }), "\u7EC4\u5185\u8986\u76D6"] })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.excludeRecursion, onChange: (e) => { patchEntry({ excludeRecursion: e.target.checked }); } }), "\u4E0D\u53EF\u88AB\u9012\u5F52\u6FC0\u6D3B"] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.preventRecursion, onChange: (e) => { patchEntry({ preventRecursion: e.target.checked }); } }), "\u4E0D\u5411\u9012\u5F52\u8D21\u732E\u5185\u5BB9"] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.ignoreBudget, onChange: (e) => { patchEntry({ ignoreBudget: e.target.checked }); } }), "\u65E0\u89C6\u9884\u7B97"] }), _jsxs("label", { className: css.check, title: "\u5411\u91CF\u68C0\u7D22\uFF1A\u6761\u76EE\u4E0D\u505A\u5173\u952E\u8BCD\u5339\u914D\uFF0C\u7531\u5411\u91CF\u5B58\u50A8\u6309\u8BED\u4E49\u76F8\u4F3C\u5EA6\u6FC0\u6D3B\uFF08\u9700\u5148\u4E3A\u672C\u4E66\u5EFA\u7ACB\u5411\u91CF\u7D22\u5F15\uFF09", children: [_jsx("input", { type: "checkbox", checked: selected.vectorized, onChange: (e) => { patchEntry({ vectorized: e.target.checked }); } }), "\u5411\u91CF\u68C0\u7D22"] })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.number, children: ["Sticky\uFF08\u79D2\uFF0C\u7559\u7A7A\u5173\u95ED\uFF09", _jsx("input", { className: css.input, value: secondsOfMs(selected.sticky), onChange: (e) => { patchEntry({ sticky: msOfSeconds(e.target.value) }); } })] }), _jsxs("label", { className: css.number, children: ["Cooldown\uFF08\u79D2\uFF0C\u7559\u7A7A\u5173\u95ED\uFF09", _jsx("input", { className: css.input, value: secondsOfMs(selected.cooldown), onChange: (e) => { patchEntry({ cooldown: msOfSeconds(e.target.value) }); } })] })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.number, children: ["Delay\uFF08\u6D88\u606F\u6570\uFF0C\u7559\u7A7A\u5173\u95ED\uFF09", _jsx("input", { className: css.input, value: stringOfCount(selected.delay), onChange: (e) => { patchEntry({ delay: countOrNull(e.target.value) }); } })] }), _jsxs("label", { className: css.number, children: ["\u626B\u63CF\u6DF1\u5EA6\uFF08\u6D88\u606F\uFF0C\u7559\u7A7A\u7528\u5168\u5C40\uFF09", _jsx("input", { className: css.input, value: stringOfCount(selected.scanDepth), onChange: (e) => { patchEntry({ scanDepth: countOrNull(e.target.value) }); } })] })] }), _jsx("div", { className: css.row, children: _jsx("span", { className: css.label, children: "Additional Matching Sources\uFF08\u5173\u952E\u8BCD\u540C\u65F6\u626B\u63CF\u4EE5\u4E0B\u5B57\u6BB5\uFF09" }) }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.matchCharacterDescription, onChange: (e) => { patchEntry({ matchCharacterDescription: e.target.checked }); } }), "\u89D2\u8272\u63CF\u8FF0"] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.matchCharacterPersonality, onChange: (e) => { patchEntry({ matchCharacterPersonality: e.target.checked }); } }), "\u89D2\u8272\u6027\u683C"] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.matchScenario, onChange: (e) => { patchEntry({ matchScenario: e.target.checked }); } }), "\u573A\u666F"] })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.matchPersonaDescription, onChange: (e) => { patchEntry({ matchPersonaDescription: e.target.checked }); } }), "\u4EBA\u7269\u63CF\u8FF0"] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.matchCharacterDepthPrompt, onChange: (e) => { patchEntry({ matchCharacterDepthPrompt: e.target.checked }); } }), "\u89D2\u8272 Note"] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: selected.matchCreatorNotes, onChange: (e) => { patchEntry({ matchCreatorNotes: e.target.checked }); } }), "\u4F5C\u8005\u6CE8\u91CA"] })] })] })), error !== '' && _jsx("div", { className: css.error, children: error })] })] }));
}
//# sourceMappingURL=LorebookPanel.js.map