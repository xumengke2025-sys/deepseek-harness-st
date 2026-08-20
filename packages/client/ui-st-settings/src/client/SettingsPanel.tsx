/**
 * The settings panel: user persona name, the persona library (ST's personas/
 * directory), instruct templates (ST's instructs/), model selection, and
 * chat-completion preset management
 * (create/edit/duplicate/delete/export) — ST's settings surface reduced to the
 * fields this harness's generation path consumes.
 */
import { useCallback, useEffect, useState } from 'react'
import type { StApiConfig, StApiSource, StFaceProps, StInstructRow, StInstructTemplate, StModelRow, StPersonaRow, StPreset, StPresetEntry } from '@deepseek-ai/dsh-client-ui-st-chat/client'
import css from './settings.module.css'

/** Generation sliders shown in the preset editor; the rest stay untouched. */
const SLIDERS: ReadonlyArray<{ key: 'temp' | 'frequency_penalty' | 'presence_penalty' | 'repetition_penalty' | 'min_p' | 'top_p' | 'top_k' | 'max_tokens'; label: string; min: number; max: number; step: number }> = [
  { key: 'temp', label: '温度', min: 0, max: 2, step: 0.05 },
  { key: 'frequency_penalty', label: '频率惩罚', min: -2, max: 2, step: 0.01 },
  { key: 'presence_penalty', label: '存在惩罚', min: -2, max: 2, step: 0.01 },
  { key: 'repetition_penalty', label: '重复惩罚', min: 1, max: 2, step: 0.01 },
  { key: 'min_p', label: 'Min P', min: 0, max: 1, step: 0.001 },
  { key: 'top_p', label: 'Top P', min: 0, max: 1, step: 0.05 },
  { key: 'top_k', label: 'Top K', min: 0, max: 100, step: 1 },
  { key: 'max_tokens', label: '最大回复长度', min: 64, max: 8192, step: 64 },
]

/** ChatML wrapper preset mirroring the server's CHATML_INSTRUCT; seeds the built-in button. */
const CHATML: StInstructTemplate = {
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
}

/** Entry fields for in-place edits; `depth: undefined` clears the depth (an explicit empty input). */
type StPresetEntryPatch = Partial<Omit<StPresetEntry, 'depth'>> & { depth?: number | undefined }

/**
 * The ST settings surface.
 * @param props - the {@link StFace} share (state hook, api, actions).
 */
export function SettingsPanel({ useSt, api, actions }: StFaceProps) {
  const st = useSt((s) => s)
  const [models, setModels] = useState<StModelRow[]>([])
  const [personas, setPersonas] = useState<StPersonaRow[]>([])
  const [selPersona, setSelPersona] = useState('')
  const [instructs, setInstructs] = useState<StInstructRow[]>([])
  const [instructDraft, setInstructDraft] = useState<StInstructRow | null>(null)
  const [instructDirty, setInstructDirty] = useState(false)
  const [presets, setPresets] = useState<StPreset[]>([])
  const [selId, setSelId] = useState('')
  const [draft, setDraft] = useState<StPreset | null>(null)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  // API configuration state: loaded from the server, edited as a draft, saved back.
  const [cfgDraft, setCfgDraft] = useState<StApiConfig | null>(null)
  const [sourceModels, setSourceModels] = useState<StModelRow[]>([])
  // Registered llm provider routes for the custom source's picker.
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([])

  const refreshPresets = useCallback(async (): Promise<void> => {
    try {
      const list = await api.listPresets()
      setPresets(list)
      setSelId((prev) => (list.some((p) => p.id === prev) ? prev : list[0]?.id ?? ''))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api])

  useEffect(() => {
    api.listModels().then(setModels).catch((e: unknown) => { setError(String(e)) })
    api.listPersonas().then(setPersonas).catch((e: unknown) => { setError(String(e)) })
    api.listInstructs().then(setInstructs).catch((e: unknown) => { setError(String(e)) })
    api.getApiConfig().then(setCfgDraft).catch((e: unknown) => { setError(String(e)) })
    api.listProviders().then(setProviders).catch(() => { setProviders([]) })
    void refreshPresets()
  }, [api, refreshPresets])

  /** Load the model catalog for the active API source (the custom source's pinned
   * provider decides the catalog); empty on failure (fallback to manual entry). */
  useEffect(() => {
    if (cfgDraft === null) return
    api.listModelsBySource(cfgDraft.source).then(setSourceModels).catch(() => { setSourceModels([]) })
  }, [api, cfgDraft?.source, cfgDraft?.custom?.provider])

  useEffect(() => {
    const found = presets.find((p) => p.id === selId) ?? null
    setDraft(found === null ? null : structuredClone(found))
    setDirty(false)
  }, [presets, selId])

  /** Keep the instruct editor draft in sync with the active template selection. */
  useEffect(() => {
    const row = instructs.find((t) => t.filename === st.instructId) ?? null
    setInstructDraft(row === null ? null : structuredClone(row))
    setInstructDirty(false)
  }, [instructs, st.instructId])

  /** Edit one instruct-template sequence field in place. */
  const patchInstruct = useCallback((patch: Partial<StInstructTemplate>): void => {
    setInstructDraft((prev) => prev === null ? prev : { ...prev, template: { ...prev.template, ...patch } })
    setInstructDirty(true)
  }, [])

  /** Persist the edited instruct template; the list refreshes from the saved row. */
  const saveInstructDraft = useCallback(async (): Promise<void> => {
    if (instructDraft === null) return
    setError('')
    try {
      const saved = await api.saveInstruct(instructDraft)
      setInstructs((prev) => [...prev.filter((t) => t.filename !== saved.filename), saved]
        .sort((a, b) => a.filename.localeCompare(b.filename)))
      setInstructDirty(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, instructDraft])

  /** Patch the API-config draft; triggers the source-specific useEffect that re-fetches models. */
  const patchCfg = useCallback((patch: Partial<StApiConfig>): void => {
    setCfgDraft((prev) => prev === null ? prev : { ...prev, ...patch })
  }, [])

  /** Persist the current API-config draft; re-reads from server on success so subsequent edits start fresh. */
  const handleSaveApiConfig = useCallback(async (): Promise<void> => {
    if (cfgDraft === null) return
    try {
      await api.saveApiConfig(cfgDraft)
      const fresh = await api.getApiConfig()
      setCfgDraft(fresh)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, cfgDraft])

  /** Local edit on the draft preset; mark dirty. */
  const patchDraft = useCallback((patch: Partial<StPreset>): void => {
    setDraft((prev) => prev === null ? prev : { ...prev, ...patch })
    setDirty(true)
  }, [])

  /** Edit one prompt-manager entry in place. */
  const patchEntry = useCallback((index: number, patch: StPresetEntryPatch): void => {
    setDraft((prev) => prev === null ? prev : {
      ...prev,
      promptOrder: {
        entries: prev.promptOrder.entries.map((e, i): StPresetEntry => {
          if (i !== index) return e
          const { depth, ...rest } = patch
          const next: StPresetEntry = { ...e, ...rest }
          if (depth === undefined) delete next.depth
          else next.depth = depth
          return next
        }),
      },
    })
    setDirty(true)
  }, [])

  /** Move one prompt-manager entry within the order. */
  const moveEntry = useCallback((index: number, delta: number): void => {
    setDraft((prev) => {
      if (prev === null) return prev
      const entries = [...prev.promptOrder.entries]
      const target = index + delta
      if (target < 0 || target >= entries.length) return prev
      ;[entries[index], entries[target]] = [entries[target]!, entries[index]!]
      return { ...prev, promptOrder: { entries } }
    })
    setDirty(true)
  }, [])

  /** Append a blank disabled entry; the user fills name and content. */
  const addEntry = useCallback((): void => {
    setDraft((prev) => prev === null ? prev : {
      ...prev,
      promptOrder: { entries: [...prev.promptOrder.entries, { name: '', enabled: true, role: 'system', content: '' }] },
    })
    setDirty(true)
  }, [])

  const removeEntry = useCallback((index: number): void => {
    setDraft((prev) => prev === null ? prev : {
      ...prev,
      promptOrder: { entries: prev.promptOrder.entries.filter((_, i) => i !== index) },
    })
    setDirty(true)
  }, [])

  const patchGeneration = useCallback((key: string, value: number): void => {
    setDraft((prev) => prev === null ? prev : { ...prev, generation: { ...prev.generation, [key]: value } })
    setDirty(true)
  }, [])

  const save = useCallback(async (): Promise<void> => {
    if (draft === null) return
    setError('')
    try {
      await api.updatePreset(draft.id, draft)
      await refreshPresets()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [draft, api, refreshPresets])

  const create = useCallback(async (): Promise<void> => {
    const name = window.prompt('新预设名称')
    if (name === null || name.trim() === '') return
    try {
      const { id } = await api.createPreset({ name: name.trim() })
      await refreshPresets()
      setSelId(id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, refreshPresets])

  const duplicate = useCallback(async (id: string): Promise<void> => {
    try {
      const { id: newId } = await api.duplicatePreset(id)
      await refreshPresets()
      setSelId(newId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, refreshPresets])

  const remove = useCallback(async (id: string, name: string): Promise<void> => {
    if (!window.confirm(`删除预设「${name}」？此操作不可恢复。`)) return
    try {
      await api.deletePreset(id)
      await refreshPresets()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, refreshPresets])

  const exportJson = useCallback(async (id: string, name: string): Promise<void> => {
    try {
      const { json } = await api.exportPreset(id)
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${name}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api])

  /** Import a preset from its exported JSON file; selects it on success. */
  const importJson = useCallback(async (file: File): Promise<void> => {
    setError('')
    try {
      const { id } = await api.importPreset(await file.text())
      await refreshPresets()
      setSelId(id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, refreshPresets])

  /** Persist the current name + persona description as a new persona file. */
  const savePersona = useCallback(async (): Promise<void> => {
    const name = window.prompt('新 persona 名字（同时用作 {{user}} 显示名）', st.userName)
    if (name === null || name.trim() === '') return
    setError('')
    try {
      const saved = await api.savePersona({ filename: name.trim(), name: name.trim(), description: st.persona })
      setPersonas((prev) => [...prev.filter((p) => p.filename !== saved.filename), saved]
        .sort((a, b) => a.filename.localeCompare(b.filename)))
      setSelPersona(saved.filename)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, st.userName, st.persona])

  const removePersona = useCallback(async (filename: string): Promise<void> => {
    if (!window.confirm(`删除 persona「${filename}」？此操作不可恢复。`)) return
    try {
      await api.deletePersona(filename)
      setPersonas((prev) => prev.filter((p) => p.filename !== filename))
      setSelPersona('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api])

  /** Save the built-in ChatML template as a library file. */
  const createChatML = useCallback(async (): Promise<void> => {
    setError('')
    try {
      const saved = await api.saveInstruct({ filename: 'ChatML', name: 'ChatML', template: CHATML })
      setInstructs((prev) => [...prev.filter((t) => t.filename !== saved.filename), saved]
        .sort((a, b) => a.filename.localeCompare(b.filename)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api])

  const removeInstruct = useCallback(async (filename: string): Promise<void> => {
    if (!window.confirm(`删除指令模板「${filename}」？此操作不可恢复。`)) return
    try {
      await api.deleteInstruct(filename)
      setInstructs((prev) => prev.filter((t) => t.filename !== filename))
      if (st.instructId === filename) actions.setInstructId('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, st.instructId, actions])

  return (
    <div className={css.panel}>
      <section className={css.section}>
        <h3 className={css.sectionTitle}>用户</h3>
        <label className={css.label}>
          你的名字（{'{{user}}'} 宏替换值）
          <input className={css.input} value={st.userName}
            onChange={(e) => { actions.setUserName(e.target.value) }} />
        </label>
        <label className={css.label}>
          用户人设（注入到角色描述之前，支持 {'{{char}}/{{user}}'} 宏）
          <textarea className={css.textarea} rows={3} value={st.persona}
            placeholder="描述 {'{{user}}'} 是谁：外貌、身份、性格…"
            onChange={(e) => { actions.setPersona(e.target.value) }} />
        </label>
        <label className={css.label}>
          人设描述位置（ST's persona_description_position）
          <select className={css.input} value={st.personaPosition ?? 0}
            onChange={(e) => { actions.setPersonaPosition(Number(e.target.value) as 0 | 2 | 3 | 4 | 9) }}>
            <option value={0}>In Story String / Prompt Manager</option>
            <option value={2}>Top of Author's Note</option>
            <option value={3}>Bottom of Author's Note</option>
            <option value={4}>In-chat @ Depth</option>
            <option value={9}>None (disabled)</option>
          </select>
        </label>
        {st.personaPosition === 4 && (
          <div className={css.row}>
            <label className={css.label}>
              Depth
              <input className={css.input} type="number" min={0} max={9999} value={st.personaDepth ?? 4}
                onChange={(e) => { actions.setPersonaDepth(Number(e.target.value)) }} />
            </label>
            <label className={css.label}>
              Role
              <select className={css.input} value={st.personaDepthRole ?? 0}
                onChange={(e) => { actions.setPersonaDepthRole(Number(e.target.value) as 0 | 1 | 2) }}>
                <option value={0}>System</option>
                <option value={1}>User</option>
                <option value={2}>Assistant</option>
              </select>
            </label>
          </div>
        )}
        <label className={css.label}>
          上下文模板（Story String，留空用默认布局；激活后 {'{{persona}}'} 槽接管人设行）
          <textarea className={css.textarea} rows={5} value={st.storyString}
            placeholder="{'{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}\'s personality: {{personality}}\n{{/if}}…'}"
            onChange={(e) => { actions.setStoryString(e.target.value) }} />
        </label>
        <div className={css.label}>
          Persona 库（ST 的 personas/ 目录；选中即把名字+人设写入上方输入框）
          <div className={css.presetBar}>
            <select className={css.input} value={selPersona}
              onChange={(e) => {
                setSelPersona(e.target.value)
                const p = personas.find((x) => x.filename === e.target.value)
                if (p !== undefined) {
                  actions.setUserName(p.name)
                  actions.setPersona(p.description)
                }
              }}>
              <option value="">（无）</option>
              {personas.map((p) => <option key={p.filename} value={p.filename}>{p.name}</option>)}
            </select>
            <button type="button" className={css.toolBtn} onClick={() => { void savePersona() }}>保存当前为 persona</button>
            <button type="button" className={css.toolBtn} disabled={selPersona === ''}
              onClick={() => { void removePersona(selPersona) }}>删除</button>
          </div>
        </div>
      </section>

      <section className={css.section}>
        <h3 className={css.sectionTitle}>指令模板（Instruct Mode）</h3>
        <label className={css.label}>
          激活模板（把提示词展平为角色标记包裹的单条文本，ST 的 instruct 模式）
          <select className={css.input} value={st.instructId}
            onChange={(e) => { actions.setInstructId(e.target.value) }}>
            <option value="">（关闭，聊天模式）</option>
            {instructs.map((t) => <option key={t.filename} value={t.filename}>{t.name}</option>)}
          </select>
        </label>
        <div className={css.presetBar}>
          <button type="button" className={css.toolBtn} onClick={() => { void createChatML() }}>＋ 内置 ChatML</button>
          <button type="button" className={css.toolBtn} disabled={st.instructId === ''}
            onClick={() => { void removeInstruct(st.instructId) }}>删除</button>
        </div>
        {instructDraft !== null && (
          <div className={css.form}>
            <label className={css.label}>
              模板名
              <input className={css.input} value={instructDraft.name}
                onChange={(e) => {
                  setInstructDraft({ ...instructDraft, name: e.target.value })
                  setInstructDirty(true)
                }} />
            </label>
            <label className={css.label}>
              System 序列（system_sequence；留空则不输出系统行）
              <input className={css.input} value={instructDraft.template.systemSequence}
                onChange={(e) => { patchInstruct({ systemSequence: e.target.value }) }} />
            </label>
            <div className={css.row}>
              <label className={css.label}>
                System 前缀（system_sequence_prefix）
                <input className={css.input} value={instructDraft.template.systemSequencePrefix}
                  onChange={(e) => { patchInstruct({ systemSequencePrefix: e.target.value }) }} />
              </label>
              <label className={css.label}>
                System 后缀（system_sequence_suffix）
                <input className={css.input} value={instructDraft.template.systemSequenceSuffix}
                  onChange={(e) => { patchInstruct({ systemSequenceSuffix: e.target.value }) }} />
              </label>
            </div>
            <div className={css.row}>
              <label className={css.label}>
                用户开（input_sequence）
                <input className={css.input} value={instructDraft.template.inputSequence}
                  onChange={(e) => { patchInstruct({ inputSequence: e.target.value }) }} />
              </label>
              <label className={css.label}>
                用户闭（input_suffix）
                <input className={css.input} value={instructDraft.template.inputSuffix}
                  onChange={(e) => { patchInstruct({ inputSuffix: e.target.value }) }} />
              </label>
            </div>
            <div className={css.row}>
              <label className={css.label}>
                AI 开（output_sequence）
                <input className={css.input} value={instructDraft.template.outputSequence}
                  onChange={(e) => { patchInstruct({ outputSequence: e.target.value }) }} />
              </label>
              <label className={css.label}>
                AI 闭（output_suffix）
                <input className={css.input} value={instructDraft.template.outputSuffix}
                  onChange={(e) => { patchInstruct({ outputSuffix: e.target.value }) }} />
              </label>
            </div>
            <div className={css.row}>
              <label className={css.label}>
                首条 AI 开（first_output_sequence）
                <input className={css.input} value={instructDraft.template.firstOutputSequence}
                  onChange={(e) => { patchInstruct({ firstOutputSequence: e.target.value }) }} />
              </label>
              <label className={css.label}>
                首条 AI 闭（first_output_suffix）
                <input className={css.input} value={instructDraft.template.firstOutputSuffix}
                  onChange={(e) => { patchInstruct({ firstOutputSuffix: e.target.value }) }} />
              </label>
            </div>
            <div className={css.row}>
              <label className={css.label}>
                末条 AI 开（last_output_sequence）
                <input className={css.input} value={instructDraft.template.lastOutputSequence}
                  onChange={(e) => { patchInstruct({ lastOutputSequence: e.target.value }) }} />
              </label>
              <label className={css.label}>
                末条 AI 闭（last_output_suffix）
                <input className={css.input} value={instructDraft.template.lastOutputSuffix}
                  onChange={(e) => { patchInstruct({ lastOutputSuffix: e.target.value }) }} />
              </label>
            </div>
            <div className={css.row}>
              <label className={css.label}>
                停止序列（stop_sequence，追加到生成停止列表）
                <input className={css.input} value={instructDraft.template.stopSequence}
                  onChange={(e) => { patchInstruct({ stopSequence: e.target.value }) }} />
              </label>
              <label className={css.label}>
                行间分隔（separator_sequence）
                <input className={css.input} value={instructDraft.template.separatorSequence}
                  onChange={(e) => { patchInstruct({ separatorSequence: e.target.value }) }} />
              </label>
            </div>
            <div className={css.row}>
              <label className={css.check}>
                <input type="checkbox" checked={instructDraft.template.wrap}
                  onChange={(e) => { patchInstruct({ wrap: e.target.checked }) }} />
                开序列后换行（wrap）
              </label>
              <label className={css.check}>
                <input type="checkbox" checked={instructDraft.template.trimSequences}
                  onChange={(e) => { patchInstruct({ trimSequences: e.target.checked }) }} />
                使用前修剪序列空白（trim_sequences）
              </label>
            </div>
            <button type="button" className={css.primaryBtn} disabled={!instructDirty} onClick={() => { void saveInstructDraft() }}>
              {instructDirty ? '保存模板更改' : '已保存'}
            </button>
          </div>
        )}
      </section>

      <section className={css.section}>
        <h3 className={css.sectionTitle}>API 配置</h3>
        {cfgDraft === null ? (
          <p className={css.hint}>加载中…</p>
        ) : (
          <>
            <label className={css.label}>
              API 类型
              <select className={css.input} value={cfgDraft.source}
                onChange={(e) => { patchCfg({ source: e.target.value as StApiSource }) }}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="custom">Custom（OpenAI 兼容）</option>
                <option value="openrouter">OpenRouter</option>
                <option value="ollama">Ollama（本地）</option>
              </select>
            </label>
            {cfgDraft.source === 'openai' && (
              <>
                <label className={css.label}>API Server URL
                  <input className={css.input} value={cfgDraft.openai?.baseUrl ?? 'https://api.openai.com/v1'} readOnly />
                </label>
                <label className={css.label}>API Key 环境变量名
                  <input className={css.input} value={cfgDraft.openai?.apiKeyEnv ?? 'OPENAI_API_KEY'}
                    onChange={(e) => { patchCfg({ openai: { ...cfgDraft.openai, apiKeyEnv: e.target.value } }) }} />
                </label>
                <label className={css.label}>Model
                  <select className={css.input} value={cfgDraft.openai?.model ?? ''}
                    onChange={(e) => { patchCfg({ openai: { ...cfgDraft.openai, model: e.target.value } }) }}>
                    <option value="">默认（服务器决定）</option>
                    {sourceModels.map((m) => <option key={m.model} value={m.model}>{m.model}</option>)}
                  </select>
                </label>
                <label className={css.label}>Streaming
                  <select className={css.input} value={String(cfgDraft.openai?.streaming ?? true)}
                    onChange={(e) => { patchCfg({ openai: { ...cfgDraft.openai, streaming: e.target.value === 'true' } }) }}>
                    <option value="true">开启</option>
                    <option value="false">关闭</option>
                  </select>
                </label>
                <label className={css.label}>上下文大小（tokens）
                  <input type="number" className={css.input} value={cfgDraft.openai?.contextSize ?? 4096}
                    onChange={(e) => { patchCfg({ openai: { ...cfgDraft.openai, contextSize: Number(e.target.value) } }) }} />
                </label>
              </>
            )}
            {cfgDraft.source === 'anthropic' && (
              <>
                <label className={css.label}>API Server URL
                  <input className={css.input} value={cfgDraft.anthropic?.baseUrl ?? 'https://api.anthropic.com'} readOnly />
                </label>
                <label className={css.label}>API Key 环境变量名
                  <input className={css.input} value={cfgDraft.anthropic?.apiKeyEnv ?? 'ANTHROPIC_API_KEY'}
                    onChange={(e) => { patchCfg({ anthropic: { ...cfgDraft.anthropic, apiKeyEnv: e.target.value } }) }} />
                </label>
                <label className={css.label}>Model
                  <select className={css.input} value={cfgDraft.anthropic?.model ?? ''}
                    onChange={(e) => { patchCfg({ anthropic: { ...cfgDraft.anthropic, model: e.target.value } }) }}>
                    <option value="">默认（服务器决定）</option>
                    {sourceModels.map((m) => <option key={m.model} value={m.model}>{m.model}</option>)}
                  </select>
                </label>
                <label className={css.label}>Streaming
                  <select className={css.input} value={String(cfgDraft.anthropic?.streaming ?? true)}
                    onChange={(e) => { patchCfg({ anthropic: { ...cfgDraft.anthropic, streaming: e.target.value === 'true' } }) }}>
                    <option value="true">开启</option>
                    <option value="false">关闭</option>
                  </select>
                </label>
                <label className={css.label}>上下文大小（tokens）
                  <input type="number" className={css.input} value={cfgDraft.anthropic?.contextSize ?? 4096}
                    onChange={(e) => { patchCfg({ anthropic: { ...cfgDraft.anthropic, contextSize: Number(e.target.value) } }) }} />
                </label>
                <label className={css.label}>Assistant Prefill（注入到 assistant 第一条消息的文本）
                  <input className={css.input} value={cfgDraft.anthropic?.assistantPrefill ?? ''}
                    onChange={(e) => { patchCfg({ anthropic: { ...cfgDraft.anthropic, assistantPrefill: e.target.value } }) }} />
                </label>
              </>
            )}
            {cfgDraft.source === 'custom' && (
              <>
                <label className={css.label}>提供方（已注册的 LLM 路由）
                  <select className={css.input} value={cfgDraft.custom?.provider ?? ''}
                    onChange={(e) => { patchCfg({ custom: { ...cfgDraft.custom, baseUrl: cfgDraft.custom?.baseUrl ?? '', model: cfgDraft.custom?.model ?? '', ...(e.target.value === '' ? {} : { provider: e.target.value }) } }) }}>
                    <option value="">默认（部署配置的提供方）</option>
                    {providers.map((p) => <option key={p.id} value={p.id}>{p.name}（{p.id}）</option>)}
                  </select>
                </label>
                <p className={css.hint}>
                  API 密钥与地址在各提供方的 DSH 设置 → 模型页管理（顶栏右侧齿轮 → 模型）；这里只选择路由与模型。
                </p>
                <label className={css.label}>Custom Endpoint URL
                  <input className={css.input} value={cfgDraft.custom?.baseUrl ?? ''}
                    placeholder="https://example.com/v1"
                    onChange={(e) => { patchCfg({ custom: { ...cfgDraft.custom, baseUrl: e.target.value, model: cfgDraft.custom?.model ?? '' } }) }} />
                </label>
                <label className={css.label}>API Key 环境变量名（可选）
                  <input className={css.input} value={cfgDraft.custom?.apiKeyEnv ?? ''}
                    onChange={(e) => { patchCfg({ custom: { ...cfgDraft.custom, baseUrl: cfgDraft.custom?.baseUrl ?? '', model: cfgDraft.custom?.model ?? '', apiKeyEnv: e.target.value } }) }} />
                </label>
                <label className={css.label}>Model ID（可手动输入）
                  <input className={css.input} value={cfgDraft.custom?.model ?? ''}
                    placeholder="deepseek-v4-flash"
                    onChange={(e) => { patchCfg({ custom: { ...cfgDraft.custom, baseUrl: cfgDraft.custom?.baseUrl ?? '', model: e.target.value } }) }} />
                  {sourceModels.length > 0 && (
                    <select className={css.input} value={cfgDraft.custom?.model ?? ''}
                      onChange={(e) => { patchCfg({ custom: { ...cfgDraft.custom, baseUrl: cfgDraft.custom?.baseUrl ?? '', model: e.target.value } }) }}>
                      <option value="">（手动输入）</option>
                      {sourceModels.map((m) => <option key={m.model} value={m.model}>{m.model}</option>)}
                    </select>
                  )}
                </label>
                <label className={css.label}>Streaming
                  <select className={css.input} value={String(cfgDraft.custom?.streaming ?? true)}
                    onChange={(e) => { patchCfg({ custom: { ...cfgDraft.custom, baseUrl: cfgDraft.custom?.baseUrl ?? '', model: cfgDraft.custom?.model ?? '', streaming: e.target.value === 'true' } }) }}>
                    <option value="true">开启</option>
                    <option value="false">关闭</option>
                  </select>
                </label>
                <label className={css.label}>上下文大小（tokens）
                  <input type="number" className={css.input} value={cfgDraft.custom?.contextSize ?? 4096}
                    onChange={(e) => { patchCfg({ custom: { ...cfgDraft.custom, baseUrl: cfgDraft.custom?.baseUrl ?? '', model: cfgDraft.custom?.model ?? '', contextSize: Number(e.target.value) } }) }} />
                </label>
              </>
            )}
            {cfgDraft.source === 'openrouter' && (
              <>
                <label className={css.label}>API Server URL
                  <input className={css.input} value={cfgDraft.openrouter?.baseUrl ?? 'https://openrouter.ai/api/v1'} readOnly />
                </label>
                <label className={css.label}>API Key 环境变量名
                  <input className={css.input} value={cfgDraft.openrouter?.apiKeyEnv ?? 'OPENROUTER_API_KEY'}
                    onChange={(e) => { patchCfg({ openrouter: { ...cfgDraft.openrouter, model: cfgDraft.openrouter?.model ?? '', apiKeyEnv: e.target.value } }) }} />
                </label>
                <label className={css.label}>Model ID（如 anthropic/claude-3.5-sonnet）
                  <input className={css.input} value={cfgDraft.openrouter?.model ?? ''}
                    onChange={(e) => { patchCfg({ openrouter: { ...cfgDraft.openrouter, model: e.target.value } }) }} />
                  {sourceModels.length > 0 && (
                    <select className={css.input} value={cfgDraft.openrouter?.model ?? ''}
                      onChange={(e) => { patchCfg({ openrouter: { ...cfgDraft.openrouter, model: e.target.value } }) }}>
                      <option value="">（手动输入）</option>
                      {sourceModels.map((m) => <option key={m.model} value={m.model}>{m.model}</option>)}
                    </select>
                  )}
                </label>
                <label className={css.label}>Streaming
                  <select className={css.input} value={String(cfgDraft.openrouter?.streaming ?? true)}
                    onChange={(e) => { patchCfg({ openrouter: { ...cfgDraft.openrouter, model: cfgDraft.openrouter?.model ?? '', streaming: e.target.value === 'true' } }) }}>
                    <option value="true">开启</option>
                    <option value="false">关闭</option>
                  </select>
                </label>
                <label className={css.label}>上下文大小（tokens）
                  <input type="number" className={css.input} value={cfgDraft.openrouter?.contextSize ?? 4096}
                    onChange={(e) => { patchCfg({ openrouter: { ...cfgDraft.openrouter, model: cfgDraft.openrouter?.model ?? '', contextSize: Number(e.target.value) } }) }} />
                </label>
              </>
            )}
            {cfgDraft.source === 'ollama' && (
              <>
                <label className={css.label}>Ollama Endpoint
                  <input className={css.input} value={cfgDraft.ollama?.baseUrl ?? 'http://localhost:11434'}
                    onChange={(e) => { patchCfg({ ollama: { ...cfgDraft.ollama, model: cfgDraft.ollama?.model ?? '', baseUrl: e.target.value } }) }} />
                </label>
                <label className={css.label}>Model ID（如 llama3、mistral）
                  <input className={css.input} value={cfgDraft.ollama?.model ?? ''}
                    onChange={(e) => { patchCfg({ ollama: { ...cfgDraft.ollama, model: e.target.value } }) }} />
                  {sourceModels.length > 0 && (
                    <select className={css.input} value={cfgDraft.ollama?.model ?? ''}
                      onChange={(e) => { patchCfg({ ollama: { ...cfgDraft.ollama, model: e.target.value } }) }}>
                      <option value="">（手动输入）</option>
                      {sourceModels.map((m) => <option key={m.model} value={m.model}>{m.model}</option>)}
                    </select>
                  )}
                </label>
                <label className={css.label}>上下文大小（tokens）
                  <input type="number" className={css.input} value={cfgDraft.ollama?.contextSize ?? 4096}
                    onChange={(e) => { patchCfg({ ollama: { ...cfgDraft.ollama, model: cfgDraft.ollama?.model ?? '', contextSize: Number(e.target.value) } }) }} />
                </label>
                <label className={css.label}>Streaming
                  <select className={css.input} value={String(cfgDraft.ollama?.streaming ?? true)}
                    onChange={(e) => { patchCfg({ ollama: { ...cfgDraft.ollama, model: cfgDraft.ollama?.model ?? '', streaming: e.target.value === 'true' } }) }}>
                    <option value="true">开启</option>
                    <option value="false">关闭</option>
                  </select>
                </label>
              </>
            )}
            <div className={css.presetBar}>
              <button type="button" className={css.toolBtn} onClick={() => { void handleSaveApiConfig() }}>
                保存 API 配置
              </button>
            </div>
          </>
        )}
      </section>

      <section className={css.section}>
        <h3 className={css.sectionTitle}>模型</h3>
        <label className={css.label}>
          当前模型
          <select className={css.input} value={st.model}
            onChange={(e) => { actions.setModel(e.target.value) }}>
            <option value="">服务器默认</option>
            {models.map((m) => <option key={`${m.provider}/${m.model}`} value={m.model}>
              {m.model}（{m.provider}）
            </option>)}
          </select>
        </label>
      </section>

      <section className={css.section}>
        <h3 className={css.sectionTitle}>预设（OpenAI Settings）</h3>
        <label className={css.label}>
          激活预设（生成时应用其参数与主/越狱提示词）
          <select className={css.input} value={st.presetId}
            onChange={(e) => { actions.setPresetId(e.target.value) }}>
            <option value="">（不使用）</option>
            {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <div className={css.presetBar}>
          <select className={css.input} value={selId} onChange={(e) => { setSelId(e.target.value) }}>
            {presets.length === 0 && <option value="">（无预设）</option>}
            {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button type="button" className={css.toolBtn} onClick={() => { void create() }}>＋ 新建</button>
          <button type="button" className={css.toolBtn} disabled={selId === ''} onClick={() => { void duplicate(selId) }}>复制</button>
          <button type="button" className={css.toolBtn} disabled={selId === ''} onClick={() => { void exportJson(selId, presets.find((p) => p.id === selId)?.name ?? 'preset') }}>导出</button>
          <label className={css.toolBtn}>
            📥 导入
            <input
              type="file"
              accept=".json,application/json"
              className={css.fileInput}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file !== undefined) void importJson(file)
                e.target.value = ''
              }}
            />
          </label>
          <button type="button" className={css.toolBtn} disabled={selId === ''}
            onClick={() => { void remove(selId, presets.find((p) => p.id === selId)?.name ?? '') }}>删除</button>
        </div>

        {draft !== null && (
          <div className={css.form}>
            <label className={css.label}>
              名称
              <input className={css.input} value={draft.name}
                onChange={(e) => { patchDraft({ name: e.target.value }) }} />
            </label>
            <label className={css.label}>
              描述
              <input className={css.input} value={draft.description}
                onChange={(e) => { patchDraft({ description: e.target.value }) }} />
            </label>
            <label className={css.label}>
              主提示词（系统提示）
              <textarea className={css.textarea} rows={4} value={draft.mainPrompt}
                onChange={(e) => { patchDraft({ mainPrompt: e.target.value }) }} />
            </label>
            <label className={css.label}>
              越狱提示词（历史后注入）
              <textarea className={css.textarea} rows={3} value={draft.jailbreakPrompt}
                onChange={(e) => { patchDraft({ jailbreakPrompt: e.target.value }) }} />
            </label>
            <div className={css.label}>
              提示词管理器（启用条目接管系统提示与历史后区块；带深度则注入历史内）
              {draft.promptOrder.entries.map((e, i) => (
                <div className={css.form} key={i}>
                  <div className={css.presetBar}>
                    <input
                      type="checkbox" checked={e.enabled} title="启用"
                      onChange={(ev) => { patchEntry(i, { enabled: ev.target.checked }) }} />
                    <input className={css.input} value={e.name} placeholder="条目名"
                      onChange={(ev) => { patchEntry(i, { name: ev.target.value }) }} />
                    <select className={css.input} value={e.role}
                      onChange={(ev) => { patchEntry(i, { role: ev.target.value as StPresetEntry['role'] }) }}>
                      <option value="system">system</option>
                      <option value="user">user</option>
                      <option value="assistant">assistant</option>
                    </select>
                    <input className={css.input} type="number" min={0} placeholder="深度"
                      value={e.depth === undefined ? '' : e.depth}
                      onChange={(ev) => { patchEntry(i, { depth: ev.target.value === '' ? undefined : Number(ev.target.value) }) }} />
                    <button type="button" className={css.toolBtn} onClick={() => { moveEntry(i, -1) }}>↑</button>
                    <button type="button" className={css.toolBtn} onClick={() => { moveEntry(i, 1) }}>↓</button>
                    <button type="button" className={css.toolBtn} onClick={() => { removeEntry(i) }}>✕</button>
                  </div>
                  <textarea className={css.textarea} rows={2} value={e.content}
                    onChange={(ev) => { patchEntry(i, { content: ev.target.value }) }} />
                </div>
              ))}
              <button type="button" className={css.toolBtn} onClick={addEntry}>＋ 新条目</button>
            </div>
            {SLIDERS.map((s) => (
              <label className={css.label} key={s.key}>
                {s.label}：{draft.generation[s.key]}
                <input
                  type="range" min={s.min} max={s.max} step={s.step} value={draft.generation[s.key]}
                  onChange={(e) => { patchGeneration(s.key, Number(e.target.value)) }}
                />
              </label>
            ))}
            <label className={css.check}>
              <input type="checkbox" checked={draft.nsfw}
                onChange={(e) => { patchDraft({ nsfw: e.target.checked }) }} />
              NSFW 内容
            </label>
            <button type="button" className={css.primaryBtn} disabled={!dirty} onClick={() => { void save() }}>
              {dirty ? '保存更改' : '已保存'}
            </button>
          </div>
        )}
      </section>

      {error !== '' && <div className={css.error}>{error}</div>}
    </div>
  )
}
