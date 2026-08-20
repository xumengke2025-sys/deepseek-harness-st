import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The settings panel: user persona name, the persona library (ST's personas/
 * directory), instruct templates (ST's instructs/), model selection, and
 * chat-completion preset management
 * (create/edit/duplicate/delete/export) — ST's settings surface reduced to the
 * fields this harness's generation path consumes.
 */
import { useCallback, useEffect, useState } from 'react';
import css from './settings.module.css';
/** Generation sliders shown in the preset editor; the rest stay untouched. */
const SLIDERS = [
    { key: 'temp', label: '温度', min: 0, max: 2, step: 0.05 },
    { key: 'frequency_penalty', label: '频率惩罚', min: -2, max: 2, step: 0.01 },
    { key: 'presence_penalty', label: '存在惩罚', min: -2, max: 2, step: 0.01 },
    { key: 'repetition_penalty', label: '重复惩罚', min: 1, max: 2, step: 0.01 },
    { key: 'min_p', label: 'Min P', min: 0, max: 1, step: 0.001 },
    { key: 'top_p', label: 'Top P', min: 0, max: 1, step: 0.05 },
    { key: 'top_k', label: 'Top K', min: 0, max: 100, step: 1 },
    { key: 'max_tokens', label: '最大回复长度', min: 64, max: 8192, step: 64 },
];
/** ChatML wrapper preset mirroring the server's CHATML_INSTRUCT; seeds the built-in button. */
const CHATML = {
    systemSequence: '<|im_start|>system\n',
    systemSequencePrefix: '',
    systemSequenceSuffix: '',
    inputSequence: '<|im_start|>user\n',
    inputSuffix: '<|im_end|>\n',
    outputSequence: '<|im_start|>assistant\n',
    outputSuffix: '<|im_end|>\n',
    firstOutputSequence: '',
    firstOutputSuffix: '',
    lastOutputSequence: '',
    lastOutputSuffix: '',
    stopSequence: '<|im_end|>',
    separatorSequence: '',
    wrap: false,
    trimSequences: false,
};
/**
 * The ST settings surface.
 * @param props - the {@link StFace} share (state hook, api, actions).
 */
export function SettingsPanel({ useSt, api, actions }) {
    const st = useSt((s) => s);
    const [models, setModels] = useState([]);
    const [personas, setPersonas] = useState([]);
    const [selPersona, setSelPersona] = useState('');
    const [instructs, setInstructs] = useState([]);
    const [instructDraft, setInstructDraft] = useState(null);
    const [instructDirty, setInstructDirty] = useState(false);
    const [presets, setPresets] = useState([]);
    const [selId, setSelId] = useState('');
    const [draft, setDraft] = useState(null);
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState('');
    // API configuration state: loaded from the server, edited as a draft, saved back.
    const [cfgDraft, setCfgDraft] = useState(null);
    const [sourceModels, setSourceModels] = useState([]);
    // Registered llm provider routes for the custom source's picker.
    const [providers, setProviders] = useState([]);
    const refreshPresets = useCallback(async () => {
        try {
            const list = await api.listPresets();
            setPresets(list);
            setSelId((prev) => (list.some((p) => p.id === prev) ? prev : list[0]?.id ?? ''));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api]);
    useEffect(() => {
        api.listModels().then(setModels).catch((e) => { setError(String(e)); });
        api.listPersonas().then(setPersonas).catch((e) => { setError(String(e)); });
        api.listInstructs().then(setInstructs).catch((e) => { setError(String(e)); });
        api.getApiConfig().then(setCfgDraft).catch((e) => { setError(String(e)); });
        api.listProviders().then(setProviders).catch(() => { setProviders([]); });
        void refreshPresets();
    }, [api, refreshPresets]);
    /** Load the model catalog for the active API source (the custom source's pinned
     * provider decides the catalog); empty on failure (fallback to manual entry). */
    useEffect(() => {
        if (cfgDraft === null)
            return;
        api.listModelsBySource(cfgDraft.source).then(setSourceModels).catch(() => { setSourceModels([]); });
    }, [api, cfgDraft?.source, cfgDraft?.custom?.provider]);
    useEffect(() => {
        const found = presets.find((p) => p.id === selId) ?? null;
        setDraft(found === null ? null : structuredClone(found));
        setDirty(false);
    }, [presets, selId]);
    /** Keep the instruct editor draft in sync with the active template selection. */
    useEffect(() => {
        const row = instructs.find((t) => t.filename === st.instructId) ?? null;
        setInstructDraft(row === null ? null : structuredClone(row));
        setInstructDirty(false);
    }, [instructs, st.instructId]);
    /** Edit one instruct-template sequence field in place. */
    const patchInstruct = useCallback((patch) => {
        setInstructDraft((prev) => prev === null ? prev : { ...prev, template: { ...prev.template, ...patch } });
        setInstructDirty(true);
    }, []);
    /** Persist the edited instruct template; the list refreshes from the saved row. */
    const saveInstructDraft = useCallback(async () => {
        if (instructDraft === null)
            return;
        setError('');
        try {
            const saved = await api.saveInstruct(instructDraft);
            setInstructs((prev) => [...prev.filter((t) => t.filename !== saved.filename), saved]
                .sort((a, b) => a.filename.localeCompare(b.filename)));
            setInstructDirty(false);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, instructDraft]);
    /** Patch the API-config draft; triggers the source-specific useEffect that re-fetches models. */
    const patchCfg = useCallback((patch) => {
        setCfgDraft((prev) => prev === null ? prev : { ...prev, ...patch });
    }, []);
    /** Persist the current API-config draft; re-reads from server on success so subsequent edits start fresh. */
    const handleSaveApiConfig = useCallback(async () => {
        if (cfgDraft === null)
            return;
        try {
            await api.saveApiConfig(cfgDraft);
            const fresh = await api.getApiConfig();
            setCfgDraft(fresh);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, cfgDraft]);
    /** Local edit on the draft preset; mark dirty. */
    const patchDraft = useCallback((patch) => {
        setDraft((prev) => prev === null ? prev : { ...prev, ...patch });
        setDirty(true);
    }, []);
    /** Edit one prompt-manager entry in place. */
    const patchEntry = useCallback((index, patch) => {
        setDraft((prev) => prev === null ? prev : {
            ...prev,
            promptOrder: {
                entries: prev.promptOrder.entries.map((e, i) => {
                    if (i !== index)
                        return e;
                    const { depth, ...rest } = patch;
                    const next = { ...e, ...rest };
                    if (depth === undefined)
                        delete next.depth;
                    else
                        next.depth = depth;
                    return next;
                }),
            },
        });
        setDirty(true);
    }, []);
    /** Move one prompt-manager entry within the order. */
    const moveEntry = useCallback((index, delta) => {
        setDraft((prev) => {
            if (prev === null)
                return prev;
            const entries = [...prev.promptOrder.entries];
            const target = index + delta;
            if (target < 0 || target >= entries.length)
                return prev;
            [entries[index], entries[target]] = [entries[target], entries[index]];
            return { ...prev, promptOrder: { entries } };
        });
        setDirty(true);
    }, []);
    /** Append a blank disabled entry; the user fills name and content. */
    const addEntry = useCallback(() => {
        setDraft((prev) => prev === null ? prev : {
            ...prev,
            promptOrder: { entries: [...prev.promptOrder.entries, { name: '', enabled: true, role: 'system', content: '' }] },
        });
        setDirty(true);
    }, []);
    const removeEntry = useCallback((index) => {
        setDraft((prev) => prev === null ? prev : {
            ...prev,
            promptOrder: { entries: prev.promptOrder.entries.filter((_, i) => i !== index) },
        });
        setDirty(true);
    }, []);
    const patchGeneration = useCallback((key, value) => {
        setDraft((prev) => prev === null ? prev : { ...prev, generation: { ...prev.generation, [key]: value } });
        setDirty(true);
    }, []);
    const save = useCallback(async () => {
        if (draft === null)
            return;
        setError('');
        try {
            await api.updatePreset(draft.id, draft);
            await refreshPresets();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [draft, api, refreshPresets]);
    const create = useCallback(async () => {
        const name = window.prompt('新预设名称');
        if (name === null || name.trim() === '')
            return;
        try {
            const { id } = await api.createPreset({ name: name.trim() });
            await refreshPresets();
            setSelId(id);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, refreshPresets]);
    const duplicate = useCallback(async (id) => {
        try {
            const { id: newId } = await api.duplicatePreset(id);
            await refreshPresets();
            setSelId(newId);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, refreshPresets]);
    const remove = useCallback(async (id, name) => {
        if (!window.confirm(`删除预设「${name}」？此操作不可恢复。`))
            return;
        try {
            await api.deletePreset(id);
            await refreshPresets();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, refreshPresets]);
    const exportJson = useCallback(async (id, name) => {
        try {
            const { json } = await api.exportPreset(id);
            const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api]);
    /** Import a preset from its exported JSON file; selects it on success. */
    const importJson = useCallback(async (file) => {
        setError('');
        try {
            const { id } = await api.importPreset(await file.text());
            await refreshPresets();
            setSelId(id);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, refreshPresets]);
    /** Persist the current name + persona description as a new persona file. */
    const savePersona = useCallback(async () => {
        const name = window.prompt('新 persona 名字（同时用作 {{user}} 显示名）', st.userName);
        if (name === null || name.trim() === '')
            return;
        setError('');
        try {
            const saved = await api.savePersona({ filename: name.trim(), name: name.trim(), description: st.persona });
            setPersonas((prev) => [...prev.filter((p) => p.filename !== saved.filename), saved]
                .sort((a, b) => a.filename.localeCompare(b.filename)));
            setSelPersona(saved.filename);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, st.userName, st.persona]);
    const removePersona = useCallback(async (filename) => {
        if (!window.confirm(`删除 persona「${filename}」？此操作不可恢复。`))
            return;
        try {
            await api.deletePersona(filename);
            setPersonas((prev) => prev.filter((p) => p.filename !== filename));
            setSelPersona('');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api]);
    /** Save the built-in ChatML template as a library file. */
    const createChatML = useCallback(async () => {
        setError('');
        try {
            const saved = await api.saveInstruct({ filename: 'ChatML', name: 'ChatML', template: CHATML });
            setInstructs((prev) => [...prev.filter((t) => t.filename !== saved.filename), saved]
                .sort((a, b) => a.filename.localeCompare(b.filename)));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api]);
    const removeInstruct = useCallback(async (filename) => {
        if (!window.confirm(`删除指令模板「${filename}」？此操作不可恢复。`))
            return;
        try {
            await api.deleteInstruct(filename);
            setInstructs((prev) => prev.filter((t) => t.filename !== filename));
            if (st.instructId === filename)
                actions.setInstructId('');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [api, st.instructId, actions]);
    return (_jsxs("div", { className: css.panel, children: [_jsxs("section", { className: css.section, children: [_jsx("h3", { className: css.sectionTitle, children: "\u7528\u6237" }), _jsxs("label", { className: css.label, children: ["\u4F60\u7684\u540D\u5B57\uFF08", '{{user}}', " \u5B8F\u66FF\u6362\u503C\uFF09", _jsx("input", { className: css.input, value: st.userName, onChange: (e) => { actions.setUserName(e.target.value); } })] }), _jsxs("label", { className: css.label, children: ["\u7528\u6237\u4EBA\u8BBE\uFF08\u6CE8\u5165\u5230\u89D2\u8272\u63CF\u8FF0\u4E4B\u524D\uFF0C\u652F\u6301 ", '{{char}}/{{user}}', " \u5B8F\uFF09", _jsx("textarea", { className: css.textarea, rows: 3, value: st.persona, placeholder: "\u63CF\u8FF0 {'{{user}}'} \u662F\u8C01\uFF1A\u5916\u8C8C\u3001\u8EAB\u4EFD\u3001\u6027\u683C\u2026", onChange: (e) => { actions.setPersona(e.target.value); } })] }), _jsxs("label", { className: css.label, children: ["\u4EBA\u8BBE\u63CF\u8FF0\u4F4D\u7F6E\uFF08ST's persona_description_position\uFF09", _jsxs("select", { className: css.input, value: st.personaPosition ?? 0, onChange: (e) => { actions.setPersonaPosition(Number(e.target.value)); }, children: [_jsx("option", { value: 0, children: "In Story String / Prompt Manager" }), _jsx("option", { value: 2, children: "Top of Author's Note" }), _jsx("option", { value: 3, children: "Bottom of Author's Note" }), _jsx("option", { value: 4, children: "In-chat @ Depth" }), _jsx("option", { value: 9, children: "None (disabled)" })] })] }), st.personaPosition === 4 && (_jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.label, children: ["Depth", _jsx("input", { className: css.input, type: "number", min: 0, max: 9999, value: st.personaDepth ?? 4, onChange: (e) => { actions.setPersonaDepth(Number(e.target.value)); } })] }), _jsxs("label", { className: css.label, children: ["Role", _jsxs("select", { className: css.input, value: st.personaDepthRole ?? 0, onChange: (e) => { actions.setPersonaDepthRole(Number(e.target.value)); }, children: [_jsx("option", { value: 0, children: "System" }), _jsx("option", { value: 1, children: "User" }), _jsx("option", { value: 2, children: "Assistant" })] })] })] })), _jsxs("label", { className: css.label, children: ["\u4E0A\u4E0B\u6587\u6A21\u677F\uFF08Story String\uFF0C\u7559\u7A7A\u7528\u9ED8\u8BA4\u5E03\u5C40\uFF1B\u6FC0\u6D3B\u540E ", '{{persona}}', " \u69FD\u63A5\u7BA1\u4EBA\u8BBE\u884C\uFF09", _jsx("textarea", { className: css.textarea, rows: 5, value: st.storyString, placeholder: "{'{{#if description}}{{description}}\\n{{/if}}{{#if personality}}{{char}}\\'s personality: {{personality}}\\n{{/if}}\u2026'}", onChange: (e) => { actions.setStoryString(e.target.value); } })] }), _jsxs("div", { className: css.label, children: ["Persona \u5E93\uFF08ST \u7684 personas/ \u76EE\u5F55\uFF1B\u9009\u4E2D\u5373\u628A\u540D\u5B57+\u4EBA\u8BBE\u5199\u5165\u4E0A\u65B9\u8F93\u5165\u6846\uFF09", _jsxs("div", { className: css.presetBar, children: [_jsxs("select", { className: css.input, value: selPersona, onChange: (e) => {
                                            setSelPersona(e.target.value);
                                            const p = personas.find((x) => x.filename === e.target.value);
                                            if (p !== undefined) {
                                                actions.setUserName(p.name);
                                                actions.setPersona(p.description);
                                            }
                                        }, children: [_jsx("option", { value: "", children: "\uFF08\u65E0\uFF09" }), personas.map((p) => _jsx("option", { value: p.filename, children: p.name }, p.filename))] }), _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { void savePersona(); }, children: "\u4FDD\u5B58\u5F53\u524D\u4E3A persona" }), _jsx("button", { type: "button", className: css.toolBtn, disabled: selPersona === '', onClick: () => { void removePersona(selPersona); }, children: "\u5220\u9664" })] })] })] }), _jsxs("section", { className: css.section, children: [_jsx("h3", { className: css.sectionTitle, children: "\u6307\u4EE4\u6A21\u677F\uFF08Instruct Mode\uFF09" }), _jsxs("label", { className: css.label, children: ["\u6FC0\u6D3B\u6A21\u677F\uFF08\u628A\u63D0\u793A\u8BCD\u5C55\u5E73\u4E3A\u89D2\u8272\u6807\u8BB0\u5305\u88F9\u7684\u5355\u6761\u6587\u672C\uFF0CST \u7684 instruct \u6A21\u5F0F\uFF09", _jsxs("select", { className: css.input, value: st.instructId, onChange: (e) => { actions.setInstructId(e.target.value); }, children: [_jsx("option", { value: "", children: "\uFF08\u5173\u95ED\uFF0C\u804A\u5929\u6A21\u5F0F\uFF09" }), instructs.map((t) => _jsx("option", { value: t.filename, children: t.name }, t.filename))] })] }), _jsxs("div", { className: css.presetBar, children: [_jsx("button", { type: "button", className: css.toolBtn, onClick: () => { void createChatML(); }, children: "\uFF0B \u5185\u7F6E ChatML" }), _jsx("button", { type: "button", className: css.toolBtn, disabled: st.instructId === '', onClick: () => { void removeInstruct(st.instructId); }, children: "\u5220\u9664" })] }), instructDraft !== null && (_jsxs("div", { className: css.form, children: [_jsxs("label", { className: css.label, children: ["\u6A21\u677F\u540D", _jsx("input", { className: css.input, value: instructDraft.name, onChange: (e) => {
                                            setInstructDraft({ ...instructDraft, name: e.target.value });
                                            setInstructDirty(true);
                                        } })] }), _jsxs("label", { className: css.label, children: ["System \u5E8F\u5217\uFF08system_sequence\uFF1B\u7559\u7A7A\u5219\u4E0D\u8F93\u51FA\u7CFB\u7EDF\u884C\uFF09", _jsx("input", { className: css.input, value: instructDraft.template.systemSequence, onChange: (e) => { patchInstruct({ systemSequence: e.target.value }); } })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.label, children: ["System \u524D\u7F00\uFF08system_sequence_prefix\uFF09", _jsx("input", { className: css.input, value: instructDraft.template.systemSequencePrefix, onChange: (e) => { patchInstruct({ systemSequencePrefix: e.target.value }); } })] }), _jsxs("label", { className: css.label, children: ["System \u540E\u7F00\uFF08system_sequence_suffix\uFF09", _jsx("input", { className: css.input, value: instructDraft.template.systemSequenceSuffix, onChange: (e) => { patchInstruct({ systemSequenceSuffix: e.target.value }); } })] })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.label, children: ["\u7528\u6237\u5F00\uFF08input_sequence\uFF09", _jsx("input", { className: css.input, value: instructDraft.template.inputSequence, onChange: (e) => { patchInstruct({ inputSequence: e.target.value }); } })] }), _jsxs("label", { className: css.label, children: ["\u7528\u6237\u95ED\uFF08input_suffix\uFF09", _jsx("input", { className: css.input, value: instructDraft.template.inputSuffix, onChange: (e) => { patchInstruct({ inputSuffix: e.target.value }); } })] })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.label, children: ["AI \u5F00\uFF08output_sequence\uFF09", _jsx("input", { className: css.input, value: instructDraft.template.outputSequence, onChange: (e) => { patchInstruct({ outputSequence: e.target.value }); } })] }), _jsxs("label", { className: css.label, children: ["AI \u95ED\uFF08output_suffix\uFF09", _jsx("input", { className: css.input, value: instructDraft.template.outputSuffix, onChange: (e) => { patchInstruct({ outputSuffix: e.target.value }); } })] })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.label, children: ["\u9996\u6761 AI \u5F00\uFF08first_output_sequence\uFF09", _jsx("input", { className: css.input, value: instructDraft.template.firstOutputSequence, onChange: (e) => { patchInstruct({ firstOutputSequence: e.target.value }); } })] }), _jsxs("label", { className: css.label, children: ["\u9996\u6761 AI \u95ED\uFF08first_output_suffix\uFF09", _jsx("input", { className: css.input, value: instructDraft.template.firstOutputSuffix, onChange: (e) => { patchInstruct({ firstOutputSuffix: e.target.value }); } })] })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.label, children: ["\u672B\u6761 AI \u5F00\uFF08last_output_sequence\uFF09", _jsx("input", { className: css.input, value: instructDraft.template.lastOutputSequence, onChange: (e) => { patchInstruct({ lastOutputSequence: e.target.value }); } })] }), _jsxs("label", { className: css.label, children: ["\u672B\u6761 AI \u95ED\uFF08last_output_suffix\uFF09", _jsx("input", { className: css.input, value: instructDraft.template.lastOutputSuffix, onChange: (e) => { patchInstruct({ lastOutputSuffix: e.target.value }); } })] })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.label, children: ["\u505C\u6B62\u5E8F\u5217\uFF08stop_sequence\uFF0C\u8FFD\u52A0\u5230\u751F\u6210\u505C\u6B62\u5217\u8868\uFF09", _jsx("input", { className: css.input, value: instructDraft.template.stopSequence, onChange: (e) => { patchInstruct({ stopSequence: e.target.value }); } })] }), _jsxs("label", { className: css.label, children: ["\u884C\u95F4\u5206\u9694\uFF08separator_sequence\uFF09", _jsx("input", { className: css.input, value: instructDraft.template.separatorSequence, onChange: (e) => { patchInstruct({ separatorSequence: e.target.value }); } })] })] }), _jsxs("div", { className: css.row, children: [_jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: instructDraft.template.wrap, onChange: (e) => { patchInstruct({ wrap: e.target.checked }); } }), "\u5F00\u5E8F\u5217\u540E\u6362\u884C\uFF08wrap\uFF09"] }), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: instructDraft.template.trimSequences, onChange: (e) => { patchInstruct({ trimSequences: e.target.checked }); } }), "\u4F7F\u7528\u524D\u4FEE\u526A\u5E8F\u5217\u7A7A\u767D\uFF08trim_sequences\uFF09"] })] }), _jsx("button", { type: "button", className: css.primaryBtn, disabled: !instructDirty, onClick: () => { void saveInstructDraft(); }, children: instructDirty ? '保存模板更改' : '已保存' })] }))] }), _jsxs("section", { className: css.section, children: [_jsx("h3", { className: css.sectionTitle, children: "API \u914D\u7F6E" }), cfgDraft === null ? (_jsx("p", { className: css.hint, children: "\u52A0\u8F7D\u4E2D\u2026" })) : (_jsxs(_Fragment, { children: [_jsxs("label", { className: css.label, children: ["API \u7C7B\u578B", _jsxs("select", { className: css.input, value: cfgDraft.source, onChange: (e) => { patchCfg({ source: e.target.value }); }, children: [_jsx("option", { value: "openai", children: "OpenAI" }), _jsx("option", { value: "anthropic", children: "Anthropic" }), _jsx("option", { value: "custom", children: "Custom\uFF08OpenAI \u517C\u5BB9\uFF09" }), _jsx("option", { value: "openrouter", children: "OpenRouter" }), _jsx("option", { value: "ollama", children: "Ollama\uFF08\u672C\u5730\uFF09" })] })] }), cfgDraft.source === 'openai' && (_jsxs(_Fragment, { children: [_jsxs("label", { className: css.label, children: ["API Server URL", _jsx("input", { className: css.input, value: cfgDraft.openai?.baseUrl ?? 'https://api.openai.com/v1', readOnly: true })] }), _jsxs("label", { className: css.label, children: ["API Key \u73AF\u5883\u53D8\u91CF\u540D", _jsx("input", { className: css.input, value: cfgDraft.openai?.apiKeyEnv ?? 'OPENAI_API_KEY', onChange: (e) => { patchCfg({ openai: { ...cfgDraft.openai, apiKeyEnv: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["Model", _jsxs("select", { className: css.input, value: cfgDraft.openai?.model ?? '', onChange: (e) => { patchCfg({ openai: { ...cfgDraft.openai, model: e.target.value } }); }, children: [_jsx("option", { value: "", children: "\u9ED8\u8BA4\uFF08\u670D\u52A1\u5668\u51B3\u5B9A\uFF09" }), sourceModels.map((m) => _jsx("option", { value: m.model, children: m.model }, m.model))] })] }), _jsxs("label", { className: css.label, children: ["Streaming", _jsxs("select", { className: css.input, value: String(cfgDraft.openai?.streaming ?? true), onChange: (e) => { patchCfg({ openai: { ...cfgDraft.openai, streaming: e.target.value === 'true' } }); }, children: [_jsx("option", { value: "true", children: "\u5F00\u542F" }), _jsx("option", { value: "false", children: "\u5173\u95ED" })] })] }), _jsxs("label", { className: css.label, children: ["\u4E0A\u4E0B\u6587\u5927\u5C0F\uFF08tokens\uFF09", _jsx("input", { type: "number", className: css.input, value: cfgDraft.openai?.contextSize ?? 4096, onChange: (e) => { patchCfg({ openai: { ...cfgDraft.openai, contextSize: Number(e.target.value) } }); } })] })] })), cfgDraft.source === 'anthropic' && (_jsxs(_Fragment, { children: [_jsxs("label", { className: css.label, children: ["API Server URL", _jsx("input", { className: css.input, value: cfgDraft.anthropic?.baseUrl ?? 'https://api.anthropic.com', readOnly: true })] }), _jsxs("label", { className: css.label, children: ["API Key \u73AF\u5883\u53D8\u91CF\u540D", _jsx("input", { className: css.input, value: cfgDraft.anthropic?.apiKeyEnv ?? 'ANTHROPIC_API_KEY', onChange: (e) => { patchCfg({ anthropic: { ...cfgDraft.anthropic, apiKeyEnv: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["Model", _jsxs("select", { className: css.input, value: cfgDraft.anthropic?.model ?? '', onChange: (e) => { patchCfg({ anthropic: { ...cfgDraft.anthropic, model: e.target.value } }); }, children: [_jsx("option", { value: "", children: "\u9ED8\u8BA4\uFF08\u670D\u52A1\u5668\u51B3\u5B9A\uFF09" }), sourceModels.map((m) => _jsx("option", { value: m.model, children: m.model }, m.model))] })] }), _jsxs("label", { className: css.label, children: ["Streaming", _jsxs("select", { className: css.input, value: String(cfgDraft.anthropic?.streaming ?? true), onChange: (e) => { patchCfg({ anthropic: { ...cfgDraft.anthropic, streaming: e.target.value === 'true' } }); }, children: [_jsx("option", { value: "true", children: "\u5F00\u542F" }), _jsx("option", { value: "false", children: "\u5173\u95ED" })] })] }), _jsxs("label", { className: css.label, children: ["\u4E0A\u4E0B\u6587\u5927\u5C0F\uFF08tokens\uFF09", _jsx("input", { type: "number", className: css.input, value: cfgDraft.anthropic?.contextSize ?? 4096, onChange: (e) => { patchCfg({ anthropic: { ...cfgDraft.anthropic, contextSize: Number(e.target.value) } }); } })] }), _jsxs("label", { className: css.label, children: ["Assistant Prefill\uFF08\u6CE8\u5165\u5230 assistant \u7B2C\u4E00\u6761\u6D88\u606F\u7684\u6587\u672C\uFF09", _jsx("input", { className: css.input, value: cfgDraft.anthropic?.assistantPrefill ?? '', onChange: (e) => { patchCfg({ anthropic: { ...cfgDraft.anthropic, assistantPrefill: e.target.value } }); } })] })] })), cfgDraft.source === 'custom' && (_jsxs(_Fragment, { children: [_jsxs("label", { className: css.label, children: ["\u63D0\u4F9B\u65B9\uFF08\u5DF2\u6CE8\u518C\u7684 LLM \u8DEF\u7531\uFF09", _jsxs("select", { className: css.input, value: cfgDraft.custom?.provider ?? '', onChange: (e) => { patchCfg({ custom: { ...cfgDraft.custom, baseUrl: cfgDraft.custom?.baseUrl ?? '', model: cfgDraft.custom?.model ?? '', ...(e.target.value === '' ? {} : { provider: e.target.value }) } }); }, children: [_jsx("option", { value: "", children: "\u9ED8\u8BA4\uFF08\u90E8\u7F72\u914D\u7F6E\u7684\u63D0\u4F9B\u65B9\uFF09" }), providers.map((p) => _jsxs("option", { value: p.id, children: [p.name, "\uFF08", p.id, "\uFF09"] }, p.id))] })] }), _jsx("p", { className: css.hint, children: "API \u5BC6\u94A5\u4E0E\u5730\u5740\u5728\u5404\u63D0\u4F9B\u65B9\u7684 DSH \u8BBE\u7F6E \u2192 \u6A21\u578B\u9875\u7BA1\u7406\uFF08\u9876\u680F\u53F3\u4FA7\u9F7F\u8F6E \u2192 \u6A21\u578B\uFF09\uFF1B\u8FD9\u91CC\u53EA\u9009\u62E9\u8DEF\u7531\u4E0E\u6A21\u578B\u3002" }), _jsxs("label", { className: css.label, children: ["Custom Endpoint URL", _jsx("input", { className: css.input, value: cfgDraft.custom?.baseUrl ?? '', placeholder: "https://example.com/v1", onChange: (e) => { patchCfg({ custom: { ...cfgDraft.custom, baseUrl: e.target.value, model: cfgDraft.custom?.model ?? '' } }); } })] }), _jsxs("label", { className: css.label, children: ["API Key \u73AF\u5883\u53D8\u91CF\u540D\uFF08\u53EF\u9009\uFF09", _jsx("input", { className: css.input, value: cfgDraft.custom?.apiKeyEnv ?? '', onChange: (e) => { patchCfg({ custom: { ...cfgDraft.custom, baseUrl: cfgDraft.custom?.baseUrl ?? '', model: cfgDraft.custom?.model ?? '', apiKeyEnv: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["Model ID\uFF08\u53EF\u624B\u52A8\u8F93\u5165\uFF09", _jsx("input", { className: css.input, value: cfgDraft.custom?.model ?? '', placeholder: "deepseek-v4-flash", onChange: (e) => { patchCfg({ custom: { ...cfgDraft.custom, baseUrl: cfgDraft.custom?.baseUrl ?? '', model: e.target.value } }); } }), sourceModels.length > 0 && (_jsxs("select", { className: css.input, value: cfgDraft.custom?.model ?? '', onChange: (e) => { patchCfg({ custom: { ...cfgDraft.custom, baseUrl: cfgDraft.custom?.baseUrl ?? '', model: e.target.value } }); }, children: [_jsx("option", { value: "", children: "\uFF08\u624B\u52A8\u8F93\u5165\uFF09" }), sourceModels.map((m) => _jsx("option", { value: m.model, children: m.model }, m.model))] }))] }), _jsxs("label", { className: css.label, children: ["Streaming", _jsxs("select", { className: css.input, value: String(cfgDraft.custom?.streaming ?? true), onChange: (e) => { patchCfg({ custom: { ...cfgDraft.custom, baseUrl: cfgDraft.custom?.baseUrl ?? '', model: cfgDraft.custom?.model ?? '', streaming: e.target.value === 'true' } }); }, children: [_jsx("option", { value: "true", children: "\u5F00\u542F" }), _jsx("option", { value: "false", children: "\u5173\u95ED" })] })] }), _jsxs("label", { className: css.label, children: ["\u4E0A\u4E0B\u6587\u5927\u5C0F\uFF08tokens\uFF09", _jsx("input", { type: "number", className: css.input, value: cfgDraft.custom?.contextSize ?? 4096, onChange: (e) => { patchCfg({ custom: { ...cfgDraft.custom, baseUrl: cfgDraft.custom?.baseUrl ?? '', model: cfgDraft.custom?.model ?? '', contextSize: Number(e.target.value) } }); } })] })] })), cfgDraft.source === 'openrouter' && (_jsxs(_Fragment, { children: [_jsxs("label", { className: css.label, children: ["API Server URL", _jsx("input", { className: css.input, value: cfgDraft.openrouter?.baseUrl ?? 'https://openrouter.ai/api/v1', readOnly: true })] }), _jsxs("label", { className: css.label, children: ["API Key \u73AF\u5883\u53D8\u91CF\u540D", _jsx("input", { className: css.input, value: cfgDraft.openrouter?.apiKeyEnv ?? 'OPENROUTER_API_KEY', onChange: (e) => { patchCfg({ openrouter: { ...cfgDraft.openrouter, model: cfgDraft.openrouter?.model ?? '', apiKeyEnv: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["Model ID\uFF08\u5982 anthropic/claude-3.5-sonnet\uFF09", _jsx("input", { className: css.input, value: cfgDraft.openrouter?.model ?? '', onChange: (e) => { patchCfg({ openrouter: { ...cfgDraft.openrouter, model: e.target.value } }); } }), sourceModels.length > 0 && (_jsxs("select", { className: css.input, value: cfgDraft.openrouter?.model ?? '', onChange: (e) => { patchCfg({ openrouter: { ...cfgDraft.openrouter, model: e.target.value } }); }, children: [_jsx("option", { value: "", children: "\uFF08\u624B\u52A8\u8F93\u5165\uFF09" }), sourceModels.map((m) => _jsx("option", { value: m.model, children: m.model }, m.model))] }))] }), _jsxs("label", { className: css.label, children: ["Streaming", _jsxs("select", { className: css.input, value: String(cfgDraft.openrouter?.streaming ?? true), onChange: (e) => { patchCfg({ openrouter: { ...cfgDraft.openrouter, model: cfgDraft.openrouter?.model ?? '', streaming: e.target.value === 'true' } }); }, children: [_jsx("option", { value: "true", children: "\u5F00\u542F" }), _jsx("option", { value: "false", children: "\u5173\u95ED" })] })] }), _jsxs("label", { className: css.label, children: ["\u4E0A\u4E0B\u6587\u5927\u5C0F\uFF08tokens\uFF09", _jsx("input", { type: "number", className: css.input, value: cfgDraft.openrouter?.contextSize ?? 4096, onChange: (e) => { patchCfg({ openrouter: { ...cfgDraft.openrouter, model: cfgDraft.openrouter?.model ?? '', contextSize: Number(e.target.value) } }); } })] })] })), cfgDraft.source === 'ollama' && (_jsxs(_Fragment, { children: [_jsxs("label", { className: css.label, children: ["Ollama Endpoint", _jsx("input", { className: css.input, value: cfgDraft.ollama?.baseUrl ?? 'http://localhost:11434', onChange: (e) => { patchCfg({ ollama: { ...cfgDraft.ollama, model: cfgDraft.ollama?.model ?? '', baseUrl: e.target.value } }); } })] }), _jsxs("label", { className: css.label, children: ["Model ID\uFF08\u5982 llama3\u3001mistral\uFF09", _jsx("input", { className: css.input, value: cfgDraft.ollama?.model ?? '', onChange: (e) => { patchCfg({ ollama: { ...cfgDraft.ollama, model: e.target.value } }); } }), sourceModels.length > 0 && (_jsxs("select", { className: css.input, value: cfgDraft.ollama?.model ?? '', onChange: (e) => { patchCfg({ ollama: { ...cfgDraft.ollama, model: e.target.value } }); }, children: [_jsx("option", { value: "", children: "\uFF08\u624B\u52A8\u8F93\u5165\uFF09" }), sourceModels.map((m) => _jsx("option", { value: m.model, children: m.model }, m.model))] }))] }), _jsxs("label", { className: css.label, children: ["\u4E0A\u4E0B\u6587\u5927\u5C0F\uFF08tokens\uFF09", _jsx("input", { type: "number", className: css.input, value: cfgDraft.ollama?.contextSize ?? 4096, onChange: (e) => { patchCfg({ ollama: { ...cfgDraft.ollama, model: cfgDraft.ollama?.model ?? '', contextSize: Number(e.target.value) } }); } })] }), _jsxs("label", { className: css.label, children: ["Streaming", _jsxs("select", { className: css.input, value: String(cfgDraft.ollama?.streaming ?? true), onChange: (e) => { patchCfg({ ollama: { ...cfgDraft.ollama, model: cfgDraft.ollama?.model ?? '', streaming: e.target.value === 'true' } }); }, children: [_jsx("option", { value: "true", children: "\u5F00\u542F" }), _jsx("option", { value: "false", children: "\u5173\u95ED" })] })] })] })), _jsx("div", { className: css.presetBar, children: _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { void handleSaveApiConfig(); }, children: "\u4FDD\u5B58 API \u914D\u7F6E" }) })] }))] }), _jsxs("section", { className: css.section, children: [_jsx("h3", { className: css.sectionTitle, children: "\u6A21\u578B" }), _jsxs("label", { className: css.label, children: ["\u5F53\u524D\u6A21\u578B", _jsxs("select", { className: css.input, value: st.model, onChange: (e) => { actions.setModel(e.target.value); }, children: [_jsx("option", { value: "", children: "\u670D\u52A1\u5668\u9ED8\u8BA4" }), models.map((m) => _jsxs("option", { value: m.model, children: [m.model, "\uFF08", m.provider, "\uFF09"] }, `${m.provider}/${m.model}`))] })] })] }), _jsxs("section", { className: css.section, children: [_jsx("h3", { className: css.sectionTitle, children: "\u9884\u8BBE\uFF08OpenAI Settings\uFF09" }), _jsxs("label", { className: css.label, children: ["\u6FC0\u6D3B\u9884\u8BBE\uFF08\u751F\u6210\u65F6\u5E94\u7528\u5176\u53C2\u6570\u4E0E\u4E3B/\u8D8A\u72F1\u63D0\u793A\u8BCD\uFF09", _jsxs("select", { className: css.input, value: st.presetId, onChange: (e) => { actions.setPresetId(e.target.value); }, children: [_jsx("option", { value: "", children: "\uFF08\u4E0D\u4F7F\u7528\uFF09" }), presets.map((p) => _jsx("option", { value: p.id, children: p.name }, p.id))] })] }), _jsxs("div", { className: css.presetBar, children: [_jsxs("select", { className: css.input, value: selId, onChange: (e) => { setSelId(e.target.value); }, children: [presets.length === 0 && _jsx("option", { value: "", children: "\uFF08\u65E0\u9884\u8BBE\uFF09" }), presets.map((p) => _jsx("option", { value: p.id, children: p.name }, p.id))] }), _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { void create(); }, children: "\uFF0B \u65B0\u5EFA" }), _jsx("button", { type: "button", className: css.toolBtn, disabled: selId === '', onClick: () => { void duplicate(selId); }, children: "\u590D\u5236" }), _jsx("button", { type: "button", className: css.toolBtn, disabled: selId === '', onClick: () => { void exportJson(selId, presets.find((p) => p.id === selId)?.name ?? 'preset'); }, children: "\u5BFC\u51FA" }), _jsxs("label", { className: css.toolBtn, children: ["\uD83D\uDCE5 \u5BFC\u5165", _jsx("input", { type: "file", accept: ".json,application/json", className: css.fileInput, onChange: (e) => {
                                            const file = e.target.files?.[0];
                                            if (file !== undefined)
                                                void importJson(file);
                                            e.target.value = '';
                                        } })] }), _jsx("button", { type: "button", className: css.toolBtn, disabled: selId === '', onClick: () => { void remove(selId, presets.find((p) => p.id === selId)?.name ?? ''); }, children: "\u5220\u9664" })] }), draft !== null && (_jsxs("div", { className: css.form, children: [_jsxs("label", { className: css.label, children: ["\u540D\u79F0", _jsx("input", { className: css.input, value: draft.name, onChange: (e) => { patchDraft({ name: e.target.value }); } })] }), _jsxs("label", { className: css.label, children: ["\u63CF\u8FF0", _jsx("input", { className: css.input, value: draft.description, onChange: (e) => { patchDraft({ description: e.target.value }); } })] }), _jsxs("label", { className: css.label, children: ["\u4E3B\u63D0\u793A\u8BCD\uFF08\u7CFB\u7EDF\u63D0\u793A\uFF09", _jsx("textarea", { className: css.textarea, rows: 4, value: draft.mainPrompt, onChange: (e) => { patchDraft({ mainPrompt: e.target.value }); } })] }), _jsxs("label", { className: css.label, children: ["\u8D8A\u72F1\u63D0\u793A\u8BCD\uFF08\u5386\u53F2\u540E\u6CE8\u5165\uFF09", _jsx("textarea", { className: css.textarea, rows: 3, value: draft.jailbreakPrompt, onChange: (e) => { patchDraft({ jailbreakPrompt: e.target.value }); } })] }), _jsxs("div", { className: css.label, children: ["\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\uFF08\u542F\u7528\u6761\u76EE\u63A5\u7BA1\u7CFB\u7EDF\u63D0\u793A\u4E0E\u5386\u53F2\u540E\u533A\u5757\uFF1B\u5E26\u6DF1\u5EA6\u5219\u6CE8\u5165\u5386\u53F2\u5185\uFF09", draft.promptOrder.entries.map((e, i) => (_jsxs("div", { className: css.form, children: [_jsxs("div", { className: css.presetBar, children: [_jsx("input", { type: "checkbox", checked: e.enabled, title: "\u542F\u7528", onChange: (ev) => { patchEntry(i, { enabled: ev.target.checked }); } }), _jsx("input", { className: css.input, value: e.name, placeholder: "\u6761\u76EE\u540D", onChange: (ev) => { patchEntry(i, { name: ev.target.value }); } }), _jsxs("select", { className: css.input, value: e.role, onChange: (ev) => { patchEntry(i, { role: ev.target.value }); }, children: [_jsx("option", { value: "system", children: "system" }), _jsx("option", { value: "user", children: "user" }), _jsx("option", { value: "assistant", children: "assistant" })] }), _jsx("input", { className: css.input, type: "number", min: 0, placeholder: "\u6DF1\u5EA6", value: e.depth === undefined ? '' : e.depth, onChange: (ev) => { patchEntry(i, { depth: ev.target.value === '' ? undefined : Number(ev.target.value) }); } }), _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { moveEntry(i, -1); }, children: "\u2191" }), _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { moveEntry(i, 1); }, children: "\u2193" }), _jsx("button", { type: "button", className: css.toolBtn, onClick: () => { removeEntry(i); }, children: "\u2715" })] }), _jsx("textarea", { className: css.textarea, rows: 2, value: e.content, onChange: (ev) => { patchEntry(i, { content: ev.target.value }); } })] }, i))), _jsx("button", { type: "button", className: css.toolBtn, onClick: addEntry, children: "\uFF0B \u65B0\u6761\u76EE" })] }), SLIDERS.map((s) => (_jsxs("label", { className: css.label, children: [s.label, "\uFF1A", draft.generation[s.key], _jsx("input", { type: "range", min: s.min, max: s.max, step: s.step, value: draft.generation[s.key], onChange: (e) => { patchGeneration(s.key, Number(e.target.value)); } })] }, s.key))), _jsxs("label", { className: css.check, children: [_jsx("input", { type: "checkbox", checked: draft.nsfw, onChange: (e) => { patchDraft({ nsfw: e.target.checked }); } }), "NSFW \u5185\u5BB9"] }), _jsx("button", { type: "button", className: css.primaryBtn, disabled: !dirty, onClick: () => { void save(); }, children: dirty ? '保存更改' : '已保存' })] }))] }), error !== '' && _jsx("div", { className: css.error, children: error })] }));
}
//# sourceMappingURL=SettingsPanel.js.map