import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The chats panel: past-chat management for the selected character — switch,
 * start a new chat, delete, and jsonl/text export/import, plus ST's global
 * message search — mirroring ST's chat file drawer and searchMessage.
 */
import { useCallback, useEffect, useState } from 'react';
import css from './chats.module.css';
/**
 * The ST chat-management surface.
 * @param props - the {@link StFace} share (state hook, api, actions).
 */
export function ChatsPanel({ useSt, api, actions }) {
    const avatar = useSt((s) => s.avatar);
    const chatId = useSt((s) => s.chatId);
    const userName = useSt((s) => s.userName);
    const [rows, setRows] = useState([]);
    const [characterName, setCharacterName] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    // ST's searchMessage: a global query box over every chat, any character.
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState([]);
    const refresh = useCallback(async () => {
        if (avatar === '') {
            setRows([]);
            return;
        }
        setError('');
        try {
            const [list, full] = await Promise.all([api.listChats(avatar), api.getCharacter(avatar)]);
            setRows(list);
            setCharacterName(full.name);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, avatar]);
    useEffect(() => { void refresh(); }, [refresh]);
    const runSearch = useCallback(async (text) => {
        if (text.trim() === '') {
            setHits([]);
            return;
        }
        setError('');
        try {
            setHits(await api.searchChats(text.trim()));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api]);
    /** ST's search hit opens its chat: switch avatar + chat, then the chat panel. */
    const openHit = useCallback((hit) => {
        actions.setAvatar(hit.avatar);
        actions.setChatId(hit.chatId);
        actions.setPanel('chat');
    }, [actions]);
    const open = useCallback((row) => {
        actions.setChatId(row.file_id);
        actions.setPanel('chat');
    }, [actions]);
    /** Start a fresh chat seeded with the card's first message, ST's "Start new chat". */
    const startNew = useCallback(async () => {
        if (avatar === '')
            return;
        setBusy(true);
        try {
            const full = await api.getCharacter(avatar);
            const card = full.card.data;
            const { chatId: created } = await api.createChat(avatar, userName, full.name, card.first_mes ?? '');
            actions.setChatId(created);
            setRows(await api.listChats(avatar));
            actions.setPanel('chat');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setBusy(false);
        }
    }, [actions, api, avatar, userName]);
    const remove = useCallback(async (row) => {
        if (!window.confirm(`删除聊天 ${row.file_name}？此操作不可撤销。`))
            return;
        setBusy(true);
        try {
            await api.deleteChat(avatar, row.file_id);
            if (row.file_id === chatId)
                actions.setChatId('');
            setRows(await api.listChats(avatar));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setBusy(false);
        }
    }, [actions, api, avatar, chatId]);
    const exportOne = useCallback(async (row, format) => {
        try {
            const content = format === 'jsonl'
                ? await api.exportChat(avatar, row.file_id)
                : await api.exportChatText(avatar, row.file_id);
            const base = row.file_name.endsWith('.jsonl') ? row.file_name.slice(0, -6) : row.file_name;
            const url = URL.createObjectURL(new Blob([content], { type: format === 'jsonl' ? 'application/jsonl' : 'text/plain' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${base}.${format === 'jsonl' ? 'jsonl' : 'txt'}`;
            a.click();
            URL.revokeObjectURL(url);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, avatar]);
    const importFile = useCallback(async (file) => {
        setBusy(true);
        try {
            const jsonl = await file.text();
            const { chatId: imported } = await api.importChat(avatar, jsonl);
            setRows(await api.listChats(avatar));
            actions.setChatId(imported);
            actions.setPanel('chat');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setBusy(false);
        }
    }, [actions, api, avatar]);
    return (_jsxs("div", { className: css.panel, children: [_jsxs("div", { className: css.toolbar, children: [_jsx("span", { className: css.count, children: characterName === '' ? '未选择角色' : `${characterName} · ${rows.length} 个聊天` }), _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { void refresh(); }, disabled: busy || avatar === '', children: "\u27F3 \u5237\u65B0" }), _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { void startNew(); }, disabled: busy || avatar === '', children: "\uFF0B \u65B0\u804A\u5929" }), _jsxs("label", { className: avatar === '' ? css.toolBtnDisabled : css.toolBtn, children: ["\uD83D\uDCE5 \u5BFC\u5165 jsonl", _jsx("input", { type: "file", accept: ".jsonl,application/jsonl", className: css.fileInput, disabled: avatar === '', onChange: (e) => {
                                    const file = e.target.files?.[0];
                                    if (file !== undefined)
                                        void importFile(file);
                                    e.target.value = '';
                                } })] })] }), _jsxs("div", { className: css.searchBar, children: [_jsx("input", { className: css.searchInput, type: "search", placeholder: "\uD83D\uDD0D \u641C\u7D22\u6240\u6709\u804A\u5929\u7684\u6D88\u606F\u2026", value: query, onChange: (e) => { setQuery(e.target.value); }, onKeyDown: (e) => {
                            if (e.key === 'Enter')
                                void runSearch(query);
                        } }), query.trim() !== '' && (_jsx("button", { type: "button", className: css.toolBtn, onClick: () => { setQuery(''); setHits([]); }, children: "\u6E05\u9664" }))] }), error !== '' && _jsx("div", { className: css.error, children: error }), query.trim() !== '' ? (_jsxs("div", { className: css.list, children: [hits.map((hit) => (_jsx("div", { className: css.row, onClick: () => { openHit(hit); }, children: _jsxs("div", { className: css.rowMain, children: [_jsxs("div", { className: css.rowName, children: [hit.characterName, " \u00B7 ", hit.chatId] }), _jsx("div", { className: css.rowMeta, children: hit.snippet })] }) }, `${hit.avatar}/${hit.chatId}/${hit.messageIndex}`))), hits.length === 0 && _jsx("div", { className: css.empty, children: "\u6CA1\u6709\u5339\u914D\u7684\u6D88\u606F" })] })) : (_jsxs("div", { className: css.list, children: [rows.map((row) => (_jsxs("div", { className: row.file_id === chatId ? css.rowActive : css.row, onClick: () => { open(row); }, children: [_jsxs("div", { className: css.rowMain, children: [_jsx("div", { className: css.rowName, title: row.file_name, children: row.file_name }), _jsxs("div", { className: css.rowMeta, children: [row.chat_items, " \u6761\u6D88\u606F \u00B7 ", row.file_size] })] }), _jsxs("div", { className: css.rowActions, children: [_jsx("button", { type: "button", className: css.miniBtn, title: "\u5BFC\u51FA\u7EAF\u6587\u672C", onClick: (e) => { e.stopPropagation(); void exportOne(row, 'text'); }, children: "\uD83D\uDCC4" }), _jsx("button", { type: "button", className: css.miniBtn, title: "\u5BFC\u51FA jsonl", onClick: (e) => { e.stopPropagation(); void exportOne(row, 'jsonl'); }, children: "\u2B73" }), _jsx("button", { type: "button", className: css.miniBtn, title: "\u5220\u9664", onClick: (e) => { e.stopPropagation(); void remove(row); }, children: "\u2715" })] })] }, row.file_id))), avatar !== '' && rows.length === 0 && _jsx("div", { className: css.empty, children: "\u8FD8\u6CA1\u6709\u804A\u5929\u2014\u2014\u65B0\u5EFA\u4E00\u4E2A\u5427\u3002" })] }))] }));
}
//# sourceMappingURL=ChatsPanel.js.map