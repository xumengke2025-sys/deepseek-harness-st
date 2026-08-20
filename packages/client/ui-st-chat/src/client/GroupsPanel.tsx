/**
 * The groups panel: multi-character group management — create groups, pick
 * members from the character roster, toggle/weight members, choose the
 * activation strategy, and start a group chat, mirroring ST's group editor.
 */
import { useCallback, useEffect, useState } from 'react'
import type { StCharacterRow, StFaceProps, StGroup, StGroupActivation, StGroupMember } from './contract.ts'
import css from './groups.module.css'

const ACTIVATIONS: Array<{ value: StGroupActivation, label: string }> = [
  { value: 0, label: '自然顺序' },
  { value: 1, label: '列表顺序' },
  { value: 2, label: '手动选择' },
  { value: 3, label: '随机池' },
]

/**
 * The ST group-management surface.
 * @param props - the {@link StFace} share (state hook, api, actions).
 */
export function GroupsPanel({ useSt, api, actions }: StFaceProps) {
  const avatar = useSt((s) => s.avatar)
  const [groups, setGroups] = useState<StGroup[]>([])
  const [characters, setCharacters] = useState<StCharacterRow[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<string[]>([])

  const refresh = useCallback(async (): Promise<void> => {
    setError('')
    try {
      const [groupRows, characterRows] = await Promise.all([api.listGroups(), api.listCharacters()])
      setGroups(groupRows)
      setCharacters(characterRows)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api])

  useEffect(() => { void refresh() }, [refresh])

  const submitCreate = useCallback(async (): Promise<void> => {
    if (name.trim() === '') {
      setError('请输入群聊名称')
      return
    }
    if (picked.length < 2) {
      setError('群聊至少需要 2 名成员')
      return
    }
    setBusy(true)
    try {
      const { id } = await api.createGroup({
        name: name.trim(),
        members: picked.map((characterId) => ({ character_id: characterId, enabled: true, weight: 100 })),
        activation_strategy: 0,
      })
      setName('')
      setPicked([])
      setShowForm(false)
      setGroups(await api.listGroups())
      actions.setAvatar(id)
      actions.setChatId('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [actions, api, name, picked])

  const patchGroup = useCallback(async (group: StGroup, patch: Partial<StGroup>): Promise<void> => {
    setGroups((rows) => rows.map((g) => g.id === group.id ? { ...g, ...patch } as StGroup : g))
    try {
      await api.updateGroup(group.id, patch)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      await refresh()
    }
  }, [api, refresh])

  const patchMember = useCallback((group: StGroup, characterId: string, patch: Partial<StGroupMember>): void => {
    const members = group.members.map((m) => m.character_id === characterId ? { ...m, ...patch } : m)
    void patchGroup(group, { members })
  }, [patchGroup])

  const togglePick = useCallback((characterAvatar: string): void => {
    setPicked((rows) => rows.includes(characterAvatar)
      ? rows.filter((a) => a !== characterAvatar)
      : [...rows, characterAvatar])
  }, [])

  const startChat = useCallback(async (group: StGroup): Promise<void> => {
    actions.setAvatar(group.id)
    actions.setChatId('')
    actions.setPanel('chat')
  }, [actions])

  const remove = useCallback(async (group: StGroup): Promise<void> => {
    if (!window.confirm(`删除群聊 ${group.name}？（聊天记录保留在磁盘上）`)) return
    try {
      await api.deleteGroup(group.id)
      if (group.id === avatar) actions.setAvatar('')
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [actions, api, avatar, refresh])

  const nameOf = useCallback((characterId: string): string =>
    characters.find((c) => c.avatar === characterId)?.name ?? characterId, [characters])

  return (
    <div className={css.panel}>
      <div className={css.toolbar}>
        <span className={css.count}>{groups.length} 个群聊</span>
        <button type="button" className={css.toolBtn} onClick={() => { void refresh() }} disabled={busy}>⟳ 刷新</button>
        <button type="button" className={css.toolBtn} onClick={() => { setShowForm(!showForm) }}>＋ 新建群聊</button>
      </div>

      {showForm && (
        <div className={css.form}>
          <input
            className={css.input}
            placeholder="群聊名称"
            value={name}
            onChange={(e) => { setName(e.target.value) }}
          />
          <div className={css.picker}>
            {characters.map((c) => (
              <label key={c.avatar} className={css.pickRow}>
                <input
                  type="checkbox"
                  checked={picked.includes(c.avatar)}
                  onChange={() => { togglePick(c.avatar) }}
                />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
          <button type="button" className={css.primaryBtn} onClick={() => { void submitCreate() }} disabled={busy}>
            创建（{picked.length} 名成员）
          </button>
        </div>
      )}

      {error !== '' && <div className={css.error}>{error}</div>}

      <div className={css.list}>
        {groups.map((group) => (
          <div key={group.id} className={group.id === avatar ? css.cardActive : css.card}>
            <div className={css.cardHead}>
              <span className={css.cardName} title={group.id}>{group.name}</span>
              <select
                className={css.select}
                value={group.activation_strategy}
                onChange={(e) => { void patchGroup(group, { activation_strategy: Number(e.target.value) as StGroupActivation }) }}
              >
                {ACTIVATIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
              <button type="button" className={css.toolBtn} onClick={() => { void startChat(group) }}>💬 进入聊天</button>
              <button type="button" className={css.miniBtn} title="删除" onClick={() => { void remove(group) }}>✕</button>
            </div>
            <div className={css.members}>
              {group.members.map((m) => (
                <div key={m.character_id} className={css.member}>
                  <label className={css.memberName} title={m.character_id}>
                    <input
                      type="checkbox"
                      checked={m.enabled}
                      onChange={() => { patchMember(group, m.character_id, { enabled: !m.enabled }) }}
                    />
                    {nameOf(m.character_id)}
                  </label>
                  <label className={css.weight}>
                    权重
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={m.weight}
                      onChange={(e) => { patchMember(group, m.character_id, { weight: Number(e.target.value) }) }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && <div className={css.empty}>还没有群聊——新建一个，把多个角色拉进同一场对话。</div>}
      </div>
    </div>
  )
}
