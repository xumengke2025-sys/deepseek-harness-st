/**
 * The chats panel: past-chat management for the selected character — switch,
 * start a new chat, delete, and jsonl/text export/import, plus ST's global
 * message search — mirroring ST's chat file drawer and searchMessage.
 */
import { useCallback, useEffect, useState } from 'react'
import type { StChatRow, StChatSearchHit, StFaceProps } from './contract.ts'
import css from './chats.module.css'

/**
 * The ST chat-management surface.
 * @param props - the {@link StFace} share (state hook, api, actions).
 */
export function ChatsPanel({ useSt, api, actions }: StFaceProps) {
  const avatar = useSt((s) => s.avatar)
  const chatId = useSt((s) => s.chatId)
  const userName = useSt((s) => s.userName)
  const [rows, setRows] = useState<StChatRow[]>([])
  const [characterName, setCharacterName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // ST's searchMessage: a global query box over every chat, any character.
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<StChatSearchHit[]>([])

  const refresh = useCallback(async (): Promise<void> => {
    if (avatar === '') {
      setRows([])
      return
    }
    setError('')
    try {
      const [list, full] = await Promise.all([api.listChats(avatar), api.getCharacter(avatar)])
      setRows(list)
      setCharacterName(full.name)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, avatar])

  useEffect(() => { void refresh() }, [refresh])

  const runSearch = useCallback(async (text: string): Promise<void> => {
    if (text.trim() === '') {
      setHits([])
      return
    }
    setError('')
    try {
      setHits(await api.searchChats(text.trim()))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api])

  /** ST's search hit opens its chat: switch avatar + chat, then the chat panel. */
  const openHit = useCallback((hit: StChatSearchHit): void => {
    actions.setAvatar(hit.avatar)
    actions.setChatId(hit.chatId)
    actions.setPanel('chat')
  }, [actions])

  const open = useCallback((row: StChatRow): void => {
    actions.setChatId(row.file_id)
    actions.setPanel('chat')
  }, [actions])

  /** Start a fresh chat seeded with the card's first message, ST's "Start new chat". */
  const startNew = useCallback(async (): Promise<void> => {
    if (avatar === '') return
    setBusy(true)
    try {
      const full = await api.getCharacter(avatar)
      const card = full.card.data as { first_mes?: string }
      const { chatId: created } = await api.createChat(avatar, userName, full.name, card.first_mes ?? '')
      actions.setChatId(created)
      setRows(await api.listChats(avatar))
      actions.setPanel('chat')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [actions, api, avatar, userName])

  const remove = useCallback(async (row: StChatRow): Promise<void> => {
    if (!window.confirm(`删除聊天 ${row.file_name}？此操作不可撤销。`)) return
    setBusy(true)
    try {
      await api.deleteChat(avatar, row.file_id)
      if (row.file_id === chatId) actions.setChatId('')
      setRows(await api.listChats(avatar))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [actions, api, avatar, chatId])

  const exportOne = useCallback(async (row: StChatRow, format: 'jsonl' | 'text'): Promise<void> => {
    try {
      const content = format === 'jsonl'
        ? await api.exportChat(avatar, row.file_id)
        : await api.exportChatText(avatar, row.file_id)
      const base = row.file_name.endsWith('.jsonl') ? row.file_name.slice(0, -6) : row.file_name
      const url = URL.createObjectURL(new Blob([content], { type: format === 'jsonl' ? 'application/jsonl' : 'text/plain' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${base}.${format === 'jsonl' ? 'jsonl' : 'txt'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, avatar])

  const importFile = useCallback(async (file: File): Promise<void> => {
    setBusy(true)
    try {
      const jsonl = await file.text()
      const { chatId: imported } = await api.importChat(avatar, jsonl)
      setRows(await api.listChats(avatar))
      actions.setChatId(imported)
      actions.setPanel('chat')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [actions, api, avatar])

  return (
    <div className={css.panel}>
      <div className={css.toolbar}>
        <span className={css.count}>{characterName === '' ? '未选择角色' : `${characterName} · ${rows.length} 个聊天`}</span>
        <button type="button" className={css.toolBtn} onClick={() => { void refresh() }} disabled={busy || avatar === ''}>⟳ 刷新</button>
        <button type="button" className={css.toolBtn} onClick={() => { void startNew() }} disabled={busy || avatar === ''}>＋ 新聊天</button>
        <label className={avatar === '' ? css.toolBtnDisabled : css.toolBtn}>
          📥 导入 jsonl
          <input
            type="file"
            accept=".jsonl,application/jsonl"
            className={css.fileInput}
            disabled={avatar === ''}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file !== undefined) void importFile(file)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      <div className={css.searchBar}>
        <input
          className={css.searchInput}
          type="search"
          placeholder="🔍 搜索所有聊天的消息…"
          value={query}
          onChange={(e) => { setQuery(e.target.value) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void runSearch(query)
          }}
        />
        {query.trim() !== '' && (
          <button type="button" className={css.toolBtn} onClick={() => { setQuery(''); setHits([]) }}>
            清除
          </button>
        )}
      </div>

      {error !== '' && <div className={css.error}>{error}</div>}

      {query.trim() !== '' ? (
        <div className={css.list}>
          {hits.map((hit) => (
            <div
              key={`${hit.avatar}/${hit.chatId}/${hit.messageIndex}`}
              className={css.row}
              onClick={() => { openHit(hit) }}
            >
              <div className={css.rowMain}>
                <div className={css.rowName}>{hit.characterName} · {hit.chatId}</div>
                <div className={css.rowMeta}>{hit.snippet}</div>
              </div>
            </div>
          ))}
          {hits.length === 0 && <div className={css.empty}>没有匹配的消息</div>}
        </div>
      ) : (
        <div className={css.list}>
          {rows.map((row) => (
            <div
              key={row.file_id}
              className={row.file_id === chatId ? css.rowActive : css.row}
              onClick={() => { open(row) }}
            >
              <div className={css.rowMain}>
                <div className={css.rowName} title={row.file_name}>{row.file_name}</div>
                <div className={css.rowMeta}>{row.chat_items} 条消息 · {row.file_size}</div>
              </div>
              <div className={css.rowActions}>
                <button
                  type="button"
                  className={css.miniBtn}
                  title="导出纯文本"
                  onClick={(e) => { e.stopPropagation(); void exportOne(row, 'text') }}
                >
                  📄
                </button>
                <button
                  type="button"
                  className={css.miniBtn}
                  title="导出 jsonl"
                  onClick={(e) => { e.stopPropagation(); void exportOne(row, 'jsonl') }}
                >
                  ⭳
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
          {avatar !== '' && rows.length === 0 && <div className={css.empty}>还没有聊天——新建一个吧。</div>}
        </div>
      )}
    </div>
  )
}
