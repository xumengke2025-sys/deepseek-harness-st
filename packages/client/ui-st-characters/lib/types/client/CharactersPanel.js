import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/**
 * The characters panel: card grid over `POST characters/all` with select /
 * create / import / edit / favourite / delete, mirroring ST's character
 * management screen and full card editor.
 */
import { useCallback, useEffect, useState } from 'react';
import css from './characters.module.css';
/** Blank creation form; ST creates a minimal card then edits it. */
const EMPTY_FORM = { ch_name: '' };
/** Fill an edit form from the wire card data. */
function formFromCard(name, data) {
    const depth = data.extensions?.depth_prompt;
    return {
        ch_name: name,
        description: data.description ?? '',
        personality: data.personality ?? '',
        scenario: data.scenario ?? '',
        first_mes: data.first_mes ?? '',
        mes_example: data.mes_example ?? '',
        creator_notes: data.creator_notes ?? '',
        system_prompt: data.system_prompt ?? '',
        post_history_instructions: data.post_history_instructions ?? '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
        alternate_greetings: Array.isArray(data.alternate_greetings) ? data.alternate_greetings.join('\n') : '',
        world: data.world ?? '',
        depth_prompt_prompt: depth?.prompt ?? '',
        depth_prompt_depth: depth?.depth ?? 4,
        depth_prompt_role: depth?.role ?? 'system',
    };
}
/** One line per alternative greeting, ST's alternate_greetings array. */
function splitGreetings(text) {
    return text.split('\n').map((g) => g.trim()).filter((g) => g !== '');
}
/**
 * The ST characters surface.
 * @param props - the {@link StFace} share (state hook, api, actions).
 */
export function CharactersPanel({ useSt, api, actions }) {
    const avatar = useSt((s) => s.avatar);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [busy, setBusy] = useState(false);
    /** Card under full-field edit; the avatar stays fixed, renames go through rename. */
    const [editing, setEditing] = useState(null);
    const refresh = useCallback(async () => {
        setError('');
        try {
            setRows(await api.listCharacters());
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api]);
    useEffect(() => { void refresh(); }, [refresh]);
    /** Select a card and jump to its chat, ST's "Start chat" behavior. */
    const select = useCallback((row) => {
        actions.setAvatar(row.avatar);
        actions.setChatId('');
        actions.setPanel('chat');
    }, [actions]);
    const submitCreate = useCallback(async () => {
        if (form.ch_name.trim() === '') {
            setError('请输入角色名');
            return;
        }
        setBusy(true);
        try {
            const { avatar: created } = await api.createCharacter(form);
            setForm(EMPTY_FORM);
            setShowForm(false);
            setRows(await api.listCharacters());
            actions.setAvatar(created);
            actions.setChatId('');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setBusy(false);
        }
    }, [form, api, actions]);
    /** Open the full-card editor over `characters/get`. */
    const openEdit = useCallback(async (row) => {
        setError('');
        try {
            const full = await api.getCharacter(row.avatar);
            setEditing({ avatar: row.avatar, form: formFromCard(full.name, full.card.data) });
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api]);
    const saveEdit = useCallback(async () => {
        if (editing === null)
            return;
        const { alternate_greetings, ...rest } = editing.form;
        const greetings = typeof alternate_greetings === 'string'
            ? splitGreetings(alternate_greetings)
            : alternate_greetings;
        const payload = {
            ...rest,
            ...(greetings === undefined ? {} : { alternate_greetings: greetings }),
        };
        setBusy(true);
        try {
            // Renames move the card file first; the field edits then land on the renamed card
            let target = editing.avatar;
            const currentName = editing.avatar.replace(/\.png$/, '');
            if (payload.ch_name.trim() !== '' && payload.ch_name.trim() !== currentName) {
                const input = window.confirm(`角色名将改为「${payload.ch_name.trim()}」并重命名角色卡，继续？`)
                    ? payload.ch_name.trim() : null;
                if (input === null) {
                    setBusy(false);
                    return;
                }
                const { avatar: renamed } = await api.renameCharacter(editing.avatar, input);
                target = renamed;
            }
            await api.editCharacter(target, payload);
            setEditing(null);
            setRows(await api.listCharacters());
            if (target !== editing.avatar && editing.avatar === avatar)
                actions.setAvatar(target);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setBusy(false);
        }
    }, [editing, api, actions, avatar]);
    const importPng = useCallback(async (file) => {
        setBusy(true);
        try {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.addEventListener('load', () => { resolve(String(reader.result)); });
                reader.addEventListener('error', () => { reject(reader.error); });
                reader.readAsDataURL(file);
            });
            const { avatar: imported } = await api.importCharacterPng(dataUrl);
            setRows(await api.listCharacters());
            actions.setAvatar(imported);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setBusy(false);
        }
    }, [api, actions]);
    const rename = useCallback(async (row) => {
        const input = window.prompt('新的角色名', row.name);
        if (input === null || input.trim() === '')
            return;
        try {
            const { avatar: renamed } = await api.renameCharacter(row.avatar, input.trim());
            setRows(await api.listCharacters());
            if (row.avatar === avatar)
                actions.setAvatar(renamed);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, actions, avatar]);
    const toggleFav = useCallback(async (row) => {
        try {
            await api.setFavourite(row.avatar, !row.fav);
            await refresh();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, refresh]);
    /** Download the character PNG with its embedded card, ST's export behavior. */
    const exportPng = useCallback(async (row) => {
        setError('');
        try {
            const { png } = await api.exportCharacterPng(row.avatar);
            const link = document.createElement('a');
            link.href = png;
            link.download = row.avatar.endsWith('.png') ? row.avatar : `${row.avatar}.png`;
            link.click();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api]);
    const remove = useCallback(async (row) => {
        if (!window.confirm(`删除 ${row.name}？其聊天记录也会一并删除。`))
            return;
        try {
            await api.deleteCharacter(row.avatar);
            if (row.avatar === avatar)
                actions.setAvatar('');
            await refresh();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, actions, avatar, refresh]);
    const sorted = [...rows].sort((a, b) => Number(b.fav) - Number(a.fav) || a.name.localeCompare(b.name));
    const editForm = editing === null ? null : editing.form;
    return (_jsxs("div", { className: css.panel, children: [_jsxs("div", { className: css.toolbar, children: [_jsxs("span", { className: css.count, children: [rows.length, " \u4E2A\u89D2\u8272"] }), _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { void refresh(); }, disabled: busy, children: "\u27F3 \u5237\u65B0" }), _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { setShowForm(!showForm); }, children: "\uFF0B \u65B0\u5EFA" }), _jsxs("label", { className: css.toolBtn, children: ["\uD83D\uDCE5 \u5BFC\u5165 PNG", _jsx("input", { type: "file", accept: "image/png", className: css.fileInput, onChange: (e) => {
                                    const file = e.target.files?.[0];
                                    if (file !== undefined)
                                        void importPng(file);
                                    e.target.value = '';
                                } })] })] }), showForm && (_jsxs("div", { className: css.form, children: [_jsx("input", { className: css.input, placeholder: "\u89D2\u8272\u540D", value: form.ch_name, onChange: (e) => { setForm({ ...form, ch_name: e.target.value }); } }), _jsx("input", { className: css.input, placeholder: "\u63CF\u8FF0", value: form.description ?? '', onChange: (e) => { setForm({ ...form, description: e.target.value }); } }), _jsx("input", { className: css.input, placeholder: "\u6027\u683C (\u53EF\u9009)", value: form.personality ?? '', onChange: (e) => { setForm({ ...form, personality: e.target.value }); } }), _jsx("textarea", { className: css.textarea, placeholder: "\u5F00\u573A\u767D (\u53EF\u9009)", rows: 3, value: form.first_mes ?? '', onChange: (e) => { setForm({ ...form, first_mes: e.target.value }); } }), _jsx("button", { type: "button", className: css.primaryBtn, onClick: () => { void submitCreate(); }, disabled: busy, children: "\u521B\u5EFA\u89D2\u8272" })] })), editForm !== null && editing !== null && (_jsxs("div", { className: css.form, children: [_jsxs("label", { className: css.label, children: ["\u89D2\u8272\u540D\uFF08\u4FEE\u6539\u540E\u4FDD\u5B58\u5C06\u91CD\u547D\u540D\u89D2\u8272\u5361\uFF09", _jsx("input", { className: css.input, value: editForm.ch_name, onChange: (e) => { setEditing({ ...editing, form: { ...editForm, ch_name: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["\u63CF\u8FF0", _jsx("textarea", { className: css.textarea, rows: 4, value: editForm.description ?? '', onChange: (e) => { setEditing({ ...editing, form: { ...editForm, description: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["\u6027\u683C", _jsx("textarea", { className: css.textarea, rows: 2, value: editForm.personality ?? '', onChange: (e) => { setEditing({ ...editing, form: { ...editForm, personality: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["\u60C5\u666F", _jsx("textarea", { className: css.textarea, rows: 2, value: editForm.scenario ?? '', onChange: (e) => { setEditing({ ...editing, form: { ...editForm, scenario: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["\u5F00\u573A\u767D", _jsx("textarea", { className: css.textarea, rows: 3, value: editForm.first_mes ?? '', onChange: (e) => { setEditing({ ...editing, form: { ...editForm, first_mes: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["\u5907\u9009\u5F00\u573A\u767D\uFF08\u6BCF\u884C\u4E00\u6761\uFF1B\u5F00\u573A\u767D\u6D88\u606F\u5DE6\u53F3\u5207\u6362\u65F6\u8F6E\u6362\uFF09", _jsx("textarea", { className: css.textarea, rows: 3, value: String(editForm.alternate_greetings ?? ''), onChange: (e) => { setEditing({ ...editing, form: { ...editForm, alternate_greetings: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["\u5BF9\u8BDD\u793A\u4F8B\uFF08\u7528 <START> \u5206\u9694\uFF0C\u652F\u6301 ", '{{char}}', " / ", '{{user}}', " \u5B8F\uFF09", _jsx("textarea", { className: css.textarea, rows: 3, value: editForm.mes_example ?? '', onChange: (e) => { setEditing({ ...editing, form: { ...editForm, mes_example: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["\u4F5C\u8005\u5907\u6CE8\uFF08creator notes\uFF09", _jsx("textarea", { className: css.textarea, rows: 2, value: editForm.creator_notes ?? '', onChange: (e) => { setEditing({ ...editing, form: { ...editForm, creator_notes: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["\u7CFB\u7EDF\u63D0\u793A\u8BCD\uFF08\u7559\u7A7A\u7528\u9ED8\u8BA4\uFF09", _jsx("textarea", { className: css.textarea, rows: 2, value: editForm.system_prompt ?? '', onChange: (e) => { setEditing({ ...editing, form: { ...editForm, system_prompt: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["\u5386\u53F2\u540E\u6307\u4EE4\uFF08jailbreak\uFF09", _jsx("textarea", { className: css.textarea, rows: 2, value: editForm.post_history_instructions ?? '', onChange: (e) => { setEditing({ ...editing, form: { ...editForm, post_history_instructions: e.target.value } }); } })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.number, children: ["\u7248\u672C", _jsx("input", { className: css.input, value: editForm.character_version ?? '', onChange: (e) => { setEditing({ ...editing, form: { ...editForm, character_version: e.target.value } }); } })] }), _jsxs("label", { className: css.number, children: ["Talkativeness (0-1)", _jsx("input", { className: css.input, type: "number", min: 0, max: 1, step: 0.05, value: Number(editForm.talkativeness ?? 0.5), onChange: (e) => { setEditing({ ...editing, form: { ...editForm, talkativeness: Number(e.target.value) } }); } })] })] }), _jsxs("label", { className: css.label, children: ["\u6DF1\u5EA6\u63D0\u793A\u8BCD\uFF08\u6309\u6DF1\u5EA6\u6CE8\u5165\uFF09", _jsx("textarea", { className: css.textarea, rows: 2, value: editForm.depth_prompt_prompt ?? '', onChange: (e) => { setEditing({ ...editing, form: { ...editForm, depth_prompt_prompt: e.target.value } }); } })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.number, children: ["\u6DF1\u5EA6", _jsx("input", { className: css.input, type: "number", min: 0, value: Number(editForm.depth_prompt_depth ?? 4), onChange: (e) => { setEditing({ ...editing, form: { ...editForm, depth_prompt_depth: Number(e.target.value) } }); } })] }), _jsxs("label", { className: css.number, children: ["\u89D2\u8272", _jsxs("select", { className: css.input, value: String(editForm.depth_prompt_role ?? 'system'), onChange: (e) => { setEditing({ ...editing, form: { ...editForm, depth_prompt_role: e.target.value } }); }, children: [_jsx("option", { value: "system", children: "system" }), _jsx("option", { value: "user", children: "user" }), _jsx("option", { value: "assistant", children: "assistant" })] })] })] }), _jsxs("label", { className: css.label, children: ["\u5173\u8054\u4E16\u754C\u4E66\uFF08\u89D2\u8272\u5361\u4E13\u5C5E\uFF09", _jsx("input", { className: css.input, value: editForm.world ?? '', onChange: (e) => { setEditing({ ...editing, form: { ...editForm, world: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["\u6807\u7B7E\uFF08\u9017\u53F7\u5206\u9694\uFF09", _jsx("input", { className: css.input, value: String(editForm.tags ?? ''), onChange: (e) => { setEditing({ ...editing, form: { ...editForm, tags: e.target.value } }); } })] }), _jsxs("div", { className: css.row, children: [_jsx("button", { type: "button", className: css.primaryBtn, disabled: busy, onClick: () => { void saveEdit(); }, children: "\u4FDD\u5B58\u89D2\u8272\u5361" }), _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { setEditing(null); }, children: "\u53D6\u6D88" })] })] })), error !== '' && _jsx("div", { className: css.error, children: error }), _jsxs("div", { className: css.grid, children: [sorted.map((row) => (_jsxs("div", { className: row.avatar === avatar ? css.cardActive : css.card, onClick: () => { select(row); }, children: [_jsx("img", { className: css.avatar, src: api.avatarUrl(row.avatar), alt: row.name }), _jsx("div", { className: css.cardName, title: row.name, children: row.name }), _jsxs("div", { className: css.cardActions, children: [_jsx("button", { type: "button", className: row.fav ? css.favOn : css.favOff, title: row.fav ? '取消收藏' : '收藏', onClick: (e) => { e.stopPropagation(); void toggleFav(row); }, children: "\u2605" }), _jsx("button", { type: "button", className: css.miniBtn, title: "\u7F16\u8F91\u89D2\u8272\u5361", onClick: (e) => { e.stopPropagation(); void openEdit(row); }, children: "\u270E" }), _jsx("button", { type: "button", className: css.miniBtn, title: "\u5BFC\u51FA PNG \u89D2\u8272\u5361", onClick: (e) => { e.stopPropagation(); void exportPng(row); }, children: "\u2B07" }), _jsx("button", { type: "button", className: css.miniBtn, title: "\u91CD\u547D\u540D", onClick: (e) => { e.stopPropagation(); void rename(row); }, children: "\u2317" }), _jsx("button", { type: "button", className: css.miniBtn, title: "\u5220\u9664", onClick: (e) => { e.stopPropagation(); void remove(row); }, children: "\u2715" })] })] }, row.avatar))), rows.length === 0 && _jsx("div", { className: css.empty, children: "\u8FD8\u6CA1\u6709\u89D2\u8272\u2014\u2014\u65B0\u5EFA\u6216\u5BFC\u5165\u4E00\u4E2A\u5427\u3002" })] })] }));
}
//# sourceMappingURL=CharactersPanel.js.map