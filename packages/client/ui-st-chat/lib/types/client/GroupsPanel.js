import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/**
 * The groups panel: multi-character group management — create groups, pick
 * members from the character roster, toggle/weight members, choose the
 * activation strategy, and start a group chat, mirroring ST's group editor.
 */
import { useCallback, useEffect, useState } from 'react';
import css from './groups.module.css';
const ACTIVATIONS = [
    { value: 0, label: '自然顺序' },
    { value: 1, label: '列表顺序' },
    { value: 2, label: '手动选择' },
    { value: 3, label: '随机池' },
];
/**
 * The ST group-management surface.
 * @param props - the {@link StFace} share (state hook, api, actions).
 */
export function GroupsPanel({ useSt, api, actions }) {
    const avatar = useSt((s) => s.avatar);
    const [groups, setGroups] = useState([]);
    const [characters, setCharacters] = useState([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [picked, setPicked] = useState([]);
    const refresh = useCallback(async () => {
        setError('');
        try {
            const [groupRows, characterRows] = await Promise.all([api.listGroups(), api.listCharacters()]);
            setGroups(groupRows);
            setCharacters(characterRows);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api]);
    useEffect(() => { void refresh(); }, [refresh]);
    const submitCreate = useCallback(async () => {
        if (name.trim() === '') {
            setError('请输入群聊名称');
            return;
        }
        if (picked.length < 2) {
            setError('群聊至少需要 2 名成员');
            return;
        }
        setBusy(true);
        try {
            const { id } = await api.createGroup({
                name: name.trim(),
                members: picked.map((characterId) => ({ character_id: characterId, enabled: true, weight: 100 })),
                activation_strategy: 0,
            });
            setName('');
            setPicked([]);
            setShowForm(false);
            setGroups(await api.listGroups());
            actions.setAvatar(id);
            actions.setChatId('');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setBusy(false);
        }
    }, [actions, api, name, picked]);
    const patchGroup = useCallback(async (group, patch) => {
        setGroups((rows) => rows.map((g) => g.id === group.id ? { ...g, ...patch } : g));
        try {
            await api.updateGroup(group.id, patch);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            await refresh();
        }
    }, [api, refresh]);
    const patchMember = useCallback((group, characterId, patch) => {
        const members = group.members.map((m) => m.character_id === characterId ? { ...m, ...patch } : m);
        void patchGroup(group, { members });
    }, [patchGroup]);
    const togglePick = useCallback((characterAvatar) => {
        setPicked((rows) => rows.includes(characterAvatar)
            ? rows.filter((a) => a !== characterAvatar)
            : [...rows, characterAvatar]);
    }, []);
    const startChat = useCallback(async (group) => {
        actions.setAvatar(group.id);
        actions.setChatId('');
        actions.setPanel('chat');
    }, [actions]);
    const remove = useCallback(async (group) => {
        if (!window.confirm(`删除群聊 ${group.name}？（聊天记录保留在磁盘上）`))
            return;
        try {
            await api.deleteGroup(group.id);
            if (group.id === avatar)
                actions.setAvatar('');
            await refresh();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [actions, api, avatar, refresh]);
    const nameOf = useCallback((characterId) => characters.find((c) => c.avatar === characterId)?.name ?? characterId, [characters]);
    return (_jsxs("div", { className: css.panel, children: [_jsxs("div", { className: css.toolbar, children: [_jsxs("span", { className: css.count, children: [groups.length, " \u4E2A\u7FA4\u804A"] }), _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { void refresh(); }, disabled: busy, children: "\u27F3 \u5237\u65B0" }), _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { setShowForm(!showForm); }, children: "\uFF0B \u65B0\u5EFA\u7FA4\u804A" })] }), showForm && (_jsxs("div", { className: css.form, children: [_jsx("input", { className: css.input, placeholder: "\u7FA4\u804A\u540D\u79F0", value: name, onChange: (e) => { setName(e.target.value); } }), _jsx("div", { className: css.picker, children: characters.map((c) => (_jsxs("label", { className: css.pickRow, children: [_jsx("input", { type: "checkbox", checked: picked.includes(c.avatar), onChange: () => { togglePick(c.avatar); } }), _jsx("span", { children: c.name })] }, c.avatar))) }), _jsxs("button", { type: "button", className: css.primaryBtn, onClick: () => { void submitCreate(); }, disabled: busy, children: ["\u521B\u5EFA\uFF08", picked.length, " \u540D\u6210\u5458\uFF09"] })] })), error !== '' && _jsx("div", { className: css.error, children: error }), _jsxs("div", { className: css.list, children: [groups.map((group) => (_jsxs("div", { className: group.id === avatar ? css.cardActive : css.card, children: [_jsxs("div", { className: css.cardHead, children: [_jsx("span", { className: css.cardName, title: group.id, children: group.name }), _jsx("select", { className: css.select, value: group.activation_strategy, onChange: (e) => { void patchGroup(group, { activation_strategy: Number(e.target.value) }); }, children: ACTIVATIONS.map((a) => _jsx("option", { value: a.value, children: a.label }, a.value)) }), _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { void startChat(group); }, children: "\uD83D\uDCAC \u8FDB\u5165\u804A\u5929" }), _jsx("button", { type: "button", className: css.miniBtn, title: "\u5220\u9664", onClick: () => { void remove(group); }, children: "\u2715" })] }), _jsx("div", { className: css.members, children: group.members.map((m) => (_jsxs("div", { className: css.member, children: [_jsxs("label", { className: css.memberName, title: m.character_id, children: [_jsx("input", { type: "checkbox", checked: m.enabled, onChange: () => { patchMember(group, m.character_id, { enabled: !m.enabled }); } }), nameOf(m.character_id)] }), _jsxs("label", { className: css.weight, children: ["\u6743\u91CD", _jsx("input", { type: "number", min: 0, max: 100, value: m.weight, onChange: (e) => { patchMember(group, m.character_id, { weight: Number(e.target.value) }); } })] })] }, m.character_id))) })] }, group.id))), groups.length === 0 && _jsx("div", { className: css.empty, children: "\u8FD8\u6CA1\u6709\u7FA4\u804A\u2014\u2014\u65B0\u5EFA\u4E00\u4E2A\uFF0C\u628A\u591A\u4E2A\u89D2\u8272\u62C9\u8FDB\u540C\u4E00\u573A\u5BF9\u8BDD\u3002" })] })] }));
}
//# sourceMappingURL=GroupsPanel.js.map