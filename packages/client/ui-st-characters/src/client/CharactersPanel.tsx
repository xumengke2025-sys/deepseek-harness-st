/**
 * The characters panel: card grid over `POST characters/all` with select /
 * create / import / edit / favourite / delete, mirroring ST's character
 * management screen and full card editor.
 */
import { useCallback, useEffect, useState } from 'react'
import type { StCharacterForm, StCharacterRow, StFaceProps } from '@deepseek-ai/dsh-client-ui-st-chat/client'
import css from './characters.module.css'

/** Blank creation form; ST creates a minimal card then edits it. */
const EMPTY_FORM: StCharacterForm = { ch_name: '' }

/** Narrow the wire card data to the editor's editable fields. */
type EditableCard = {
  description?: string
  personality?: string
  scenario?: string
  first_mes?: string
  mes_example?: string
  creator_notes?: string
  system_prompt?: string
  post_history_instructions?: string
  tags?: string[]
  alternate_greetings?: string[]
  world?: string
  extensions?: { depth_prompt?: { prompt?: string, depth?: number, role?: string } }
}

/** Fill an edit form from the wire card data. */
function formFromCard(name: string, data: EditableCard): StCharacterForm {
  const depth = data.extensions?.depth_prompt
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
  }
}

/** One line per alternative greeting, ST's alternate_greetings array. */
function splitGreetings(text: string): string[] {
  return text.split('\n').map((g) => g.trim()).filter((g) => g !== '')
}

/**
 * The ST characters surface.
 * @param props - the {@link StFace} share (state hook, api, actions).
 */
export function CharactersPanel({ useSt, api, actions }: StFaceProps) {
  const avatar = useSt((s) => s.avatar)
  const [rows, setRows] = useState<StCharacterRow[]>([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<StCharacterForm>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  /** Card under full-field edit; the avatar stays fixed, renames go through rename. */
  const [editing, setEditing] = useState<{ avatar: string; form: StCharacterForm } | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    setError('')
    try {
      setRows(await api.listCharacters())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api])

  useEffect(() => { void refresh() }, [refresh])

  /** Select a card and jump to its chat, ST's "Start chat" behavior. */
  const select = useCallback((row: StCharacterRow): void => {
    actions.setAvatar(row.avatar)
    actions.setChatId('')
    actions.setPanel('chat')
  }, [actions])

  const submitCreate = useCallback(async (): Promise<void> => {
    if (form.ch_name.trim() === '') {
      setError('请输入角色名')
      return
    }
    setBusy(true)
    try {
      const { avatar: created } = await api.createCharacter(form)
      setForm(EMPTY_FORM)
      setShowForm(false)
      setRows(await api.listCharacters())
      actions.setAvatar(created)
      actions.setChatId('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [form, api, actions])

  /** Open the full-card editor over `characters/get`. */
  const openEdit = useCallback(async (row: StCharacterRow): Promise<void> => {
    setError('')
    try {
      const full = await api.getCharacter(row.avatar)
      setEditing({ avatar: row.avatar, form: formFromCard(full.name, full.card.data as EditableCard) })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api])

  const saveEdit = useCallback(async (): Promise<void> => {
    if (editing === null) return
    const { alternate_greetings, ...rest } = editing.form
    const greetings = typeof alternate_greetings === 'string'
      ? splitGreetings(alternate_greetings)
      : alternate_greetings
    const payload: StCharacterForm = {
      ...rest,
      ...(greetings === undefined ? {} : { alternate_greetings: greetings }),
    }
    setBusy(true)
    try {
      // Renames move the card file first; the field edits then land on the renamed card
      let target = editing.avatar
      const currentName = editing.avatar.replace(/\.png$/, '')
      if (payload.ch_name.trim() !== '' && payload.ch_name.trim() !== currentName) {
        const input = window.confirm(`角色名将改为「${payload.ch_name.trim()}」并重命名角色卡，继续？`)
          ? payload.ch_name.trim() : null
        if (input === null) {
          setBusy(false)
          return
        }
        const { avatar: renamed } = await api.renameCharacter(editing.avatar, input)
        target = renamed
      }
      await api.editCharacter(target, payload)
      setEditing(null)
      setRows(await api.listCharacters())
      if (target !== editing.avatar && editing.avatar === avatar) actions.setAvatar(target)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [editing, api, actions, avatar])

  const importPng = useCallback(async (file: File): Promise<void> => {
    setBusy(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.addEventListener('load', () => { resolve(String(reader.result)) })
        reader.addEventListener('error', () => { reject(reader.error) })
        reader.readAsDataURL(file)
      })
      const { avatar: imported } = await api.importCharacterPng(dataUrl)
      setRows(await api.listCharacters())
      actions.setAvatar(imported)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [api, actions])

  const rename = useCallback(async (row: StCharacterRow): Promise<void> => {
    const input = window.prompt('新的角色名', row.name)
    if (input === null || input.trim() === '') return
    try {
      const { avatar: renamed } = await api.renameCharacter(row.avatar, input.trim())
      setRows(await api.listCharacters())
      if (row.avatar === avatar) actions.setAvatar(renamed)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, actions, avatar])

  const toggleFav = useCallback(async (row: StCharacterRow): Promise<void> => {
    try {
      await api.setFavourite(row.avatar, !row.fav)
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, refresh])
  /** Download the character PNG with its embedded card, ST's export behavior. */
  const exportPng = useCallback(async (row: StCharacterRow): Promise<void> => {
    setError('')
    try {
      const { png } = await api.exportCharacterPng(row.avatar)
      const link = document.createElement('a')
      link.href = png
      link.download = row.avatar.endsWith('.png') ? row.avatar : `${row.avatar}.png`
      link.click()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api])
  const remove = useCallback(async (row: StCharacterRow): Promise<void> => {
    if (!window.confirm(`删除 ${row.name}？其聊天记录也会一并删除。`)) return
    try {
      await api.deleteCharacter(row.avatar)
      if (row.avatar === avatar) actions.setAvatar('')
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, actions, avatar, refresh])

  const sorted = [...rows].sort((a, b) => Number(b.fav) - Number(a.fav) || a.name.localeCompare(b.name))

  const editForm = editing === null ? null : editing.form

  return (
    <div className={css.panel}>
      <div className={css.toolbar}>
        <span className={css.count}>{rows.length} 个角色</span>
        <button type="button" className={css.toolBtn} onClick={() => { void refresh() }} disabled={busy}>⟳ 刷新</button>
        <button type="button" className={css.toolBtn} onClick={() => { setShowForm(!showForm) }}>＋ 新建</button>
        <label className={css.toolBtn}>
          📥 导入 PNG
          <input
            type="file"
            accept="image/png"
            className={css.fileInput}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file !== undefined) void importPng(file)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {showForm && (
        <div className={css.form}>
          <input
            className={css.input}
            placeholder="角色名"
            value={form.ch_name}
            onChange={(e) => { setForm({ ...form, ch_name: e.target.value }) }}
          />
          <input
            className={css.input}
            placeholder="描述"
            value={form.description ?? ''}
            onChange={(e) => { setForm({ ...form, description: e.target.value }) }}
          />
          <input
            className={css.input}
            placeholder="性格 (可选)"
            value={form.personality ?? ''}
            onChange={(e) => { setForm({ ...form, personality: e.target.value }) }}
          />
          <textarea
            className={css.textarea}
            placeholder="开场白 (可选)"
            rows={3}
            value={form.first_mes ?? ''}
            onChange={(e) => { setForm({ ...form, first_mes: e.target.value }) }}
          />
          <button type="button" className={css.primaryBtn} onClick={() => { void submitCreate() }} disabled={busy}>
            创建角色
          </button>
        </div>
      )}

      {editForm !== null && editing !== null && (
        <div className={css.form}>
          <label className={css.label}>
            角色名（修改后保存将重命名角色卡）
            <input
              className={css.input}
              value={editForm.ch_name}
              onChange={(e) => { setEditing({ ...editing, form: { ...editForm, ch_name: e.target.value } }) }}
            />
          </label>
          <label className={css.label}>
            描述
            <textarea className={css.textarea} rows={4} value={editForm.description ?? ''}
              onChange={(e) => { setEditing({ ...editing, form: { ...editForm, description: e.target.value } }) }} />
          </label>
          <label className={css.label}>
            性格
            <textarea className={css.textarea} rows={2} value={editForm.personality ?? ''}
              onChange={(e) => { setEditing({ ...editing, form: { ...editForm, personality: e.target.value } }) }} />
          </label>
          <label className={css.label}>
            情景
            <textarea className={css.textarea} rows={2} value={editForm.scenario ?? ''}
              onChange={(e) => { setEditing({ ...editing, form: { ...editForm, scenario: e.target.value } }) }} />
          </label>
          <label className={css.label}>
            开场白
            <textarea className={css.textarea} rows={3} value={editForm.first_mes ?? ''}
              onChange={(e) => { setEditing({ ...editing, form: { ...editForm, first_mes: e.target.value } }) }} />
          </label>
          <label className={css.label}>
            备选开场白（每行一条；开场白消息左右切换时轮换）
            <textarea className={css.textarea} rows={3} value={String(editForm.alternate_greetings ?? '')}
              onChange={(e) => { setEditing({ ...editing, form: { ...editForm, alternate_greetings: e.target.value } }) }} />
          </label>
          <label className={css.label}>
            对话示例（用 &lt;START&gt; 分隔，支持 {'{{char}}'} / {'{{user}}'} 宏）
            <textarea className={css.textarea} rows={3} value={editForm.mes_example ?? ''}
              onChange={(e) => { setEditing({ ...editing, form: { ...editForm, mes_example: e.target.value } }) }} />
          </label>
          <label className={css.label}>
            作者备注（creator notes）
            <textarea className={css.textarea} rows={2} value={editForm.creator_notes ?? ''}
              onChange={(e) => { setEditing({ ...editing, form: { ...editForm, creator_notes: e.target.value } }) }} />
          </label>
          <label className={css.label}>
            系统提示词（留空用默认）
            <textarea className={css.textarea} rows={2} value={editForm.system_prompt ?? ''}
              onChange={(e) => { setEditing({ ...editing, form: { ...editForm, system_prompt: e.target.value } }) }} />
          </label>
          <label className={css.label}>
            历史后指令（jailbreak）
            <textarea className={css.textarea} rows={2} value={editForm.post_history_instructions ?? ''}
              onChange={(e) => { setEditing({ ...editing, form: { ...editForm, post_history_instructions: e.target.value } }) }} />
          </label>
          <div className={css.row}>
            <label className={css.number}>
              版本
              <input className={css.input} value={editForm.character_version ?? ''}
                onChange={(e) => { setEditing({ ...editing, form: { ...editForm, character_version: e.target.value } }) }} />
            </label>
            <label className={css.number}>
              Talkativeness (0-1)
              <input className={css.input} type="number" min={0} max={1} step={0.05}
                value={Number(editForm.talkativeness ?? 0.5)}
                onChange={(e) => { setEditing({ ...editing, form: { ...editForm, talkativeness: Number(e.target.value) } }) }} />
            </label>
          </div>
          <label className={css.label}>
            深度提示词（按深度注入）
            <textarea className={css.textarea} rows={2} value={editForm.depth_prompt_prompt ?? ''}
              onChange={(e) => { setEditing({ ...editing, form: { ...editForm, depth_prompt_prompt: e.target.value } }) }} />
          </label>
          <div className={css.row}>
            <label className={css.number}>
              深度
              <input className={css.input} type="number" min={0} value={Number(editForm.depth_prompt_depth ?? 4)}
                onChange={(e) => { setEditing({ ...editing, form: { ...editForm, depth_prompt_depth: Number(e.target.value) } }) }} />
            </label>
            <label className={css.number}>
              角色
              <select className={css.input} value={String(editForm.depth_prompt_role ?? 'system')}
                onChange={(e) => { setEditing({ ...editing, form: { ...editForm, depth_prompt_role: e.target.value } }) }}>
                <option value="system">system</option>
                <option value="user">user</option>
                <option value="assistant">assistant</option>
              </select>
            </label>
          </div>
          <label className={css.label}>
            关联世界书（角色卡专属）
            <input className={css.input} value={editForm.world ?? ''}
              onChange={(e) => { setEditing({ ...editing, form: { ...editForm, world: e.target.value } }) }} />
          </label>
          <label className={css.label}>
            标签（逗号分隔）
            <input className={css.input} value={String(editForm.tags ?? '')}
              onChange={(e) => { setEditing({ ...editing, form: { ...editForm, tags: e.target.value } }) }} />
          </label>
          <div className={css.row}>
            <button type="button" className={css.primaryBtn} disabled={busy} onClick={() => { void saveEdit() }}>
              保存角色卡
            </button>
            <button type="button" className={css.toolBtn} onClick={() => { setEditing(null) }}>
              取消
            </button>
          </div>
        </div>
      )}

      {error !== '' && <div className={css.error}>{error}</div>}

      <div className={css.grid}>
        {sorted.map((row) => (
          <div
            key={row.avatar}
            className={row.avatar === avatar ? css.cardActive : css.card}
            onClick={() => { select(row) }}
          >
            <img className={css.avatar} src={api.avatarUrl(row.avatar)} alt={row.name} />
            <div className={css.cardName} title={row.name}>{row.name}</div>
            <div className={css.cardActions}>
              <button
                type="button"
                className={row.fav ? css.favOn : css.favOff}
                title={row.fav ? '取消收藏' : '收藏'}
                onClick={(e) => { e.stopPropagation(); void toggleFav(row) }}
              >
                ★
              </button>
              <button
                type="button"
                className={css.miniBtn}
                title="编辑角色卡"
                onClick={(e) => { e.stopPropagation(); void openEdit(row) }}
              >
                ✎
              </button>
              <button
                type="button"
                className={css.miniBtn}
                title="导出 PNG 角色卡"
                onClick={(e) => { e.stopPropagation(); void exportPng(row) }}
              >
                ⬇
              </button>
              <button
                type="button"
                className={css.miniBtn}
                title="重命名"
                onClick={(e) => { e.stopPropagation(); void rename(row) }}
              >
                ⌗
              </button>
              <button
                type="button"
                className={css.miniBtn}
                title="删除"
                onClick={(e) => { e.stopPropagation(); void remove(row) }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className={css.empty}>还没有角色——新建或导入一个吧。</div>}
      </div>
    </div>
  )
}
