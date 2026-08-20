/**
 * The chat panel: character selection, message flow with swipes, and the
 * composer driving SSE generation. Chat-file writes are client-driven (ST's
 * architecture: the server streams, the client owns the JSONL).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { StApi, StFaceProps, StRegexScript, StWireChat, StWireMessage } from './contract.ts'
import { MessageItem } from './MessageItem.tsx'
import { displayRegex } from './regex.ts'
import { stripExpressionMarks } from './tts.ts'
import css from './chat.module.css'

/** Whether a row shows swipe affordances. */
function hasSwipes(message: StWireMessage): boolean {
  return (message.swipes?.length ?? 0) > 1
}

/** ST's per-swipe metadata: send_date plus generation timing. */
function swipeInfo(): Record<string, unknown> {
  const now = new Date().toISOString()
  return { send_date: now, gen_started: now, gen_finished: now, extra: {} }
}

/** ST's message construction for a fresh user row. */
function userMessage(name: string, text: string): StWireMessage {
  return {
    name,
    is_user: true,
    send_date: new Date().toISOString(),
    mes: text,
    extra: {},
  }
}

/**
 * Seed a fresh chat's opening row with the card's greeting swipes
 * (first_mes plus alternate_greetings); persists and returns the updated chat.
 * @param api - the ST HTTP client.
 * @param avatar - character avatar file name.
 * @param chatId - the freshly created chat id.
 * @param chat - the chat as served, opening row already seeded with first_mes.
 * @param greetings - the card's alternate greetings; empty list returns the chat unchanged.
 * @returns the chat with greeting swipes in place.
 */
async function seedGreetingSwipes(
  api: StApi, avatar: string, chatId: string, chat: StWireChat, greetings: string[],
): Promise<StWireChat> {
  const first = chat.messages[0]
  if (greetings.length === 0 || first === undefined || first.is_user) return chat
  const swipes = [first.mes, ...greetings]
  const seeded: StWireChat = {
    ...chat,
    messages: [{ ...first, swipes, swipe_id: 0 }, ...chat.messages.slice(1)],
  }
  await api.saveChat(avatar, chatId, seeded)
  return seeded
}

/**
 * The ST chat surface.
 * @param props - the {@link StFace} share (state hook, api, actions).
 */
export function ChatPanel({ useSt, api, actions }: StFaceProps) {
  const st = useSt((s) => s)
  // Group ids from the st-group service carry the 'grp-' prefix; character
  // avatars are file names ending in .png, so the prefix is unambiguous.
  const isGroup = st.avatar.startsWith('grp-')
  const [chat, setChat] = useState<StWireChat | null>(null)
  const [characters, setCharacters] = useState<Array<{ avatar: string; name: string }>>([])
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([])
  const [sprites, setSprites] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [streamText, setStreamText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [regexScripts, setRegexScripts] = useState<StRegexScript[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── load + selection effects ────────────────────────────────────────

  useEffect(() => {
    api.listCharacters()
      .then((rows) => {
        setCharacters(rows.map((r) => ({ avatar: r.avatar, name: r.name })))
        if (st.avatar === '' && rows.length > 0) actions.setAvatar(rows[0]!.avatar)
      })
      .catch((e: unknown) => { setError(String(e)) })
    api.listGroups()
      .then((rows) => { setGroups(rows.map((r) => ({ id: r.id, name: r.name }))) })
      .catch((e: unknown) => { setError(String(e)) })
  }, [api, actions, st.avatar])

  /** Character avatar carrying a speaker name; undefined leaves the fallback image. */
  const avatarOfName = useCallback((name: string): string | undefined =>
    characters.find((c) => c.name === name)?.avatar, [characters])

  /** Adopt a stored chat's persona name when the snapshot still carries the default. */
  const adoptChatUserName = useCallback((loaded: StWireChat): void => {
    const stored = loaded.header.user_name
    if (stored !== '' && stored !== 'User' && (st.userName === 'User' || st.userName === '')) {
      actions.setUserName(stored)
    }
  }, [actions, st.userName])

  const loadChat = useCallback(async (): Promise<void> => {
    if (st.avatar === '') {
      setChat(null)
      return
    }
    setError('')
    try {
      // Character chats carry the card's first message; group chats start
      // empty and members speak only when addressed.
      let headerName: string
      let firstMes = ''
      let greetings: string[] = []
      if (isGroup) {
        headerName = (await api.getGroup(st.avatar)).name
      } else {
        const full = await api.getCharacter(st.avatar)
        const card = full.card.data as { first_mes?: string, alternate_greetings?: string[] }
        headerName = full.name
        firstMes = card.first_mes ?? ''
        greetings = Array.isArray(card.alternate_greetings) ? card.alternate_greetings : []
      }
      const rows = await api.listChats(st.avatar)
      if (rows.length === 0) {
        const { chatId } = await api.createChat(st.avatar, st.userName, headerName, firstMes)
        actions.setChatId(chatId)
        const created = await api.getChat(st.avatar, chatId)
        setChat(await seedGreetingSwipes(api, st.avatar, chatId, created, greetings))
        return
      }
      const row = st.chatId === ''
        ? rows[rows.length - 1]!
        : rows.find((r) => r.file_id === st.chatId) ?? rows[rows.length - 1]!
      actions.setChatId(row.file_id)
      const loaded = await api.getChat(st.avatar, row.file_id)
      adoptChatUserName(loaded)
      setChat(loaded)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [adoptChatUserName, api, actions, isGroup, st.avatar, st.chatId, st.userName])

  useEffect(() => { void loadChat() }, [loadChat])

  // Display-side regex scripts: fetched once and re-fetched when the regex
  // panel saves (it broadcasts 'st-regex-updated' on window, the browser's
  // cross-plugin channel since client bundles forbid cross-plugin imports).
  useEffect(() => {
    const load = (): void => { api.listRegex().then(setRegexScripts).catch(() => { setRegexScripts([]) }) }
    load()
    window.addEventListener('st-regex-updated', load)
    return () => { window.removeEventListener('st-regex-updated', load) }
  }, [api])

  // Expression sprites are optional: no `characters/sprites/<base>/` directory
  // means the character simply has none.
  useEffect(() => {
    if (isGroup || st.avatar === '') {
      setSprites([])
      return
    }
    api.listSprites(st.avatar).then(setSprites).catch(() => { setSprites([]) })
  }, [api, isGroup, st.avatar])

  /** ST's classic `[[expression]]` mark on the latest character row picks the sprite. */
  const currentExpression = useMemo((): string | null => {
    if (isGroup || sprites.length === 0) return null
    const last = [...(chat?.messages ?? [])].reverse().find((m) => !m.is_user)
    const mark = last?.mes.match(/\[\[([^\]]+)\]\]/)?.[1]
    return mark !== undefined && sprites.includes(mark) ? mark : sprites[0] ?? null
  }, [chat, isGroup, sprites])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat?.messages.length, streamText])

  // ── persistence helper ──────────────────────────────────────────────

  const persist = useCallback((next: StWireChat): void => {
    // ST's tainted flag: once any message is inserted/edited/deleted, the
    // chat is no longer "fresh" and the greeting should not be re-sent.
    const meta = (next.header.chat_metadata ?? {}) as Record<string, unknown>
    if (next.messages.length > 0 && !meta.tainted) {
      next = {
        ...next,
        header: { ...next.header, chat_metadata: { ...meta, tainted: true } },
      }
    }
    setChat(next)
    if (st.avatar !== '' && st.chatId !== '') {
      api.saveChat(st.avatar, st.chatId, next).catch((e: unknown) => { setError(String(e)) })
    }
  }, [api, st.avatar, st.chatId])

  // ── generation ──────────────────────────────────────────────────────

  /** Stream one reply over the trimmed history `messages`; returns the reply. */
  const streamReply = useCallback(async (
    messages: StWireMessage[],
    replyAs?: string,
    mode?: { impersonate?: boolean; continueGeneration?: boolean },
  ): Promise<string> => {
    const controller = new AbortController()
    abortRef.current = controller
    setGenerating(true)
    setStreamText('')
    let text = ''
    try {
      text = await api.generate(
        {
          avatar: st.avatar,
          chatId: st.chatId,
          ...(isGroup ? { group: true } : {}),
          ...(replyAs === undefined ? {} : { replyAs }),
          ...(st.worlds.length > 0 ? { world: st.worlds } : {}),
          ...(st.presetId === '' ? {} : { presetId: st.presetId }),
          ...(st.model === '' ? {} : { model: st.model }),
          ...(st.userName === '' ? {} : { userName: st.userName }),
          ...(st.persona === '' ? {} : { persona: st.persona }),
          ...(st.storyString === '' ? {} : { storyString: st.storyString }),
          ...(st.instructId === '' ? {} : { instructId: st.instructId }),
          ...(st.worldInfoDepth === undefined ? {} : { worldInfoDepth: st.worldInfoDepth }),
          ...(st.worldInfoBudget === undefined ? {} : { worldInfoBudget: st.worldInfoBudget }),
          ...(st.worldInfoRecursive === undefined ? {} : { worldInfoRecursive: st.worldInfoRecursive }),
          ...(st.worldInfoCaseSensitive === undefined ? {} : { worldInfoCaseSensitive: st.worldInfoCaseSensitive }),
          ...(st.worldInfoMatchWholeWords === undefined ? {} : { worldInfoMatchWholeWords: st.worldInfoMatchWholeWords }),
          ...(st.maxContextTokens === undefined ? {} : { maxContextTokens: st.maxContextTokens }),
          ...(mode?.impersonate === true ? { impersonate: true } : {}),
          ...(mode?.continueGeneration === true ? { continueGeneration: true } : {}),
          messages,
        },
        (delta) => {
          text += delta
          setStreamText(text)
        },
        controller.signal,
      )
    } catch (e: unknown) {
      // The user's own stop is not an error: ST's stopGeneration keeps the
      // streamed-so-far text as the reply instead of surfacing the abort
      // (the "signal is aborted without reason" DOMException). Server-side
      // failures still throw and reach the caller's error handler.
      if (!(e instanceof Error && e.name === 'AbortError')) throw e
    } finally {
      abortRef.current = null
      setGenerating(false)
      setStreamText('')
    }
    // After an abort this is the partial text accumulated by onDelta.
    return text
  }, [api, isGroup, st.avatar, st.chatId, st.instructId, st.maxContextTokens, st.model, st.persona, st.presetId, st.storyString, st.userName, st.worldInfoBudget, st.worldInfoCaseSensitive, st.worldInfoDepth, st.worldInfoMatchWholeWords, st.worldInfoRecursive, st.worlds])

  /** Resolve the next speaking group member; null when none is enabled. */
  const nextGroupSpeaker = useCallback(async (): Promise<{ id: string; name: string } | null> => {
    const last = [...(chat?.messages ?? [])].reverse().find((m) => !m.is_user)
    const lastSpeakerId = last === undefined ? undefined : avatarOfName(last.name)
    const id = await api.nextSpeaker(st.avatar, lastSpeakerId)
    if (id === null) return null
    const name = characters.find((c) => c.avatar === id)?.name ?? id
    return { id, name }
  }, [api, avatarOfName, characters, chat, st.avatar])

  /** Generate one group member's reply over `messages` and persist it under that member's name. */
  const appendGroupReply = useCallback(async (base: StWireChat): Promise<void> => {
    const speaker = await nextGroupSpeaker()
    if (speaker === null) {
      setError('群聊没有启用的成员')
      persist(base)
      return
    }
    const reply = await streamReply(base.messages, speaker.id)
    const member: StWireMessage = {
      name: speaker.name,
      is_user: false,
      send_date: new Date().toISOString(),
      mes: reply,
      extra: {},
      swipes: [reply],
      swipe_id: 0,
      swipe_info: [swipeInfo()],
    }
    persist({ ...base, messages: [...base.messages, member] })
  }, [nextGroupSpeaker, persist, streamReply])

  const handleSend = useCallback(async (): Promise<void> => {
    const text = input.trim()
    if (text === '' || chat === null || generating) return
    setInput('')
    const user = userMessage(st.userName, text)
    const withUser: StWireChat = { ...chat, messages: [...chat.messages, user] }
    persist(withUser)
    try {
      if (isGroup) {
        await appendGroupReply(withUser)
        return
      }
      const reply = await streamReply(withUser.messages)
      const assistant: StWireMessage = {
        name: chat.header.character_name,
        is_user: false,
        send_date: new Date().toISOString(),
        mes: reply,
        extra: {},
        swipes: [reply],
        swipe_id: 0,
        swipe_info: [swipeInfo()],
      }
      persist({ ...withUser, messages: [...withUser.messages, assistant] })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      persist(withUser)
    }
  }, [appendGroupReply, chat, generating, input, isGroup, persist, st.userName, streamReply])

  /** Group mode: trigger the next member's reply without a user row in between. */
  const handleMemberReply = useCallback(async (): Promise<void> => {
    if (chat === null || generating || !isGroup) return
    try {
      await appendGroupReply(chat)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [appendGroupReply, chat, generating, isGroup])

  const handleStop = useCallback((): void => {
    abortRef.current?.abort()
    abortRef.current = null
    setGenerating(false)
    setStreamText('')
  }, [])

  // ── per-message actions ─────────────────────────────────────────────

  const mutateMessage = useCallback((index: number, mutate: (m: StWireMessage) => StWireMessage): void => {
    if (chat === null) return
    const messages = [...chat.messages]
    messages[index] = mutate(messages[index]!)
    persist({ ...chat, messages })
  }, [chat, persist])

  const handleSwipe = useCallback((index: number, next: number): void => {
    mutateMessage(index, (m) => {
      const swipes = m.swipes ?? [m.mes]
      const swipe = Math.max(0, Math.min(next, swipes.length - 1))
      return { ...m, swipes, swipe_id: swipe, mes: swipes[swipe]! }
    })
  }, [mutateMessage])

  const handleNewSwipe = useCallback(async (index: number): Promise<void> => {
    if (chat === null || generating) return
    // Opening-message swipe cycles the card's greetings, ST's behavior: no model
    // call, the swipes already hold first_mes plus alternate_greetings.
    const row0 = chat.messages[index]!
    if (index === 0 && !row0.is_user && (row0.swipes?.length ?? 0) > 1) {
      handleSwipe(index, ((row0.swipe_id ?? 0) + 1) % row0.swipes!.length)
      return
    }
    try {
      // ST's swipe regeneration: the swiped row never reaches the model. In
      // group mode the swipe keeps the row's original speaker.
      const history = chat.messages.slice(0, index)
      const row = chat.messages[index]!
      const replyAs = isGroup && !row.is_user ? avatarOfName(row.name) : undefined
      const reply = await streamReply(history, replyAs)
      mutateMessage(index, (m) => {
        const swipes = [...(m.swipes ?? [m.mes]), reply]
        const swipe_info = [...(m.swipe_info ?? [swipeInfo()]), swipeInfo()]
        return { ...m, swipes, swipe_info, swipe_id: swipes.length - 1, mes: reply }
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [avatarOfName, chat, generating, handleSwipe, isGroup, mutateMessage, streamReply])

  const handleRegenerate = useCallback(async (): Promise<void> => {
    if (chat === null || generating) return
    const index = chat.messages.length - 1
    if (index < 0 || chat.messages[index]!.is_user) return
    await handleNewSwipe(index)
  }, [chat, generating, handleNewSwipe])

  /** ST's impersonate: the reply becomes the user's next message draft (script.js fills the send box). */
  const handleImpersonate = useCallback(async (): Promise<void> => {
    if (chat === null || generating) return
    try {
      const reply = await streamReply(chat.messages, undefined, { impersonate: true })
      setInput(reply)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [chat, generating, streamReply])

  /** ST's continue: the reply appends to the last assistant message (script.js's `lastMessage.mes += getMessage`). */
  const handleContinue = useCallback(async (): Promise<void> => {
    if (chat === null || generating) return
    const index = chat.messages.length - 1
    if (index < 0 || chat.messages[index]!.is_user) return
    try {
      const reply = await streamReply(chat.messages, undefined, { continueGeneration: true })
      mutateMessage(index, (m) => ({ ...m, mes: m.mes + reply }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [chat, generating, mutateMessage, streamReply])

  const handleDeleteMessage = useCallback((index: number): void => {
    if (chat === null) return
    persist({ ...chat, messages: chat.messages.filter((_, i) => i !== index) })
  }, [chat, persist])

  /** ST's deleteSwipe: remove one swipe variant while keeping the message. */
  const handleDeleteSwipe = useCallback((index: number, swipeId: number): void => {
    mutateMessage(index, (m) => {
      const swipes = m.swipes ?? [m.mes]
      if (swipes.length <= 1) return m // Can't delete the last swipe
      const newSwipes = swipes.filter((_, i) => i !== swipeId)
      const newSwipeInfo = (m.swipe_info ?? []).filter((_, i) => i !== swipeId)
      const currentId = m.swipe_id ?? 0
      const newId = swipeId < currentId
        ? currentId - 1
        : swipeId > currentId
          ? currentId
          : Math.min(swipeId, newSwipes.length - 1)
      return { ...m, swipes: newSwipes, swipe_info: newSwipeInfo, swipe_id: newId, mes: newSwipes[newId]! }
    })
  }, [mutateMessage])

  /** ST's "branch from here": freeze rows up to `index` into a new chat file and switch to it. */
  const handleBranch = useCallback(async (index: number): Promise<void> => {
    if (chat === null || st.avatar === '' || st.chatId === '') return
    setError('')
    try {
      const { chatId } = await api.checkpointChat(st.avatar, st.chatId, index)
      actions.setChatId(chatId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, actions, chat, st.avatar, st.chatId])

  /** ST's chat-scoped author's note: stored under chat_metadata.note_prompt and injected at note_depth. */
  const handleSaveNote = useCallback((): void => {
    if (chat === null) return
    persist({
      ...chat,
      header: {
        ...chat.header,
        chat_metadata: { ...chat.header.chat_metadata, note_prompt: noteDraft },
      },
    })
    setNoteOpen(false)
  }, [chat, noteDraft, persist])

  const handleNewChat = useCallback(async (): Promise<void> => {
    if (st.avatar === '' || chat === null) return
    // Group chats start empty; character chats seed the card's first message.
    let name: string
    let firstMes = ''
    let greetings: string[] = []
    if (isGroup) {
      name = (await api.getGroup(st.avatar)).name
    } else {
      const full = await api.getCharacter(st.avatar)
      const card = full.card.data as { first_mes?: string, alternate_greetings?: string[] }
      name = full.name
      firstMes = card.first_mes ?? ''
      greetings = Array.isArray(card.alternate_greetings) ? card.alternate_greetings : []
    }
    const { chatId } = await api.createChat(st.avatar, st.userName, name, firstMes)
    actions.setChatId(chatId)
    const created = await api.getChat(st.avatar, chatId)
    setChat(await seedGreetingSwipes(api, st.avatar, chatId, created, greetings))
  }, [api, actions, chat, isGroup, st.avatar, st.userName])

  // ── render ──────────────────────────────────────────────────────────

  const avatarUrl = api.avatarUrl(st.avatar || 'none.png')
  /** Display-side regex macros: the chat's names, the same values the host substitutes. */
  const regexMacros = useMemo(() => ({
    char: chat?.header.character_name ?? '',
    user: st.userName !== '' ? st.userName : chat?.header.user_name ?? '',
  }), [chat?.header.character_name, chat?.header.user_name, st.userName])
  /** One row's display text: display regex over the stored text, never persisted. */
  const displayMes = useCallback((m: StWireMessage): string =>
    regexScripts.length === 0 ? m.mes : displayRegex(regexScripts, m.mes, regexMacros)
  , [regexMacros, regexScripts])
  /** Group rows carry each member's own avatar; character rows share the card's. */
  const rowAvatarUrl = useCallback((m: StWireMessage): string =>
    api.avatarUrl((isGroup && !m.is_user ? avatarOfName(m.name) : undefined) ?? (st.avatar || 'none.png'))
  , [api, avatarOfName, isGroup, st.avatar])

  return (
    <div className={css.panel}>
      <div className={css.toolbar}>
        <select
          className={css.select}
          value={st.avatar}
          onChange={(e) => { actions.setAvatar(e.target.value) }}
        >
          <optgroup label="角色">
            {characters.map((c) => <option key={c.avatar} value={c.avatar}>{c.name}</option>)}
          </optgroup>
          {groups.length > 0 && (
            <optgroup label="群聊">
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </optgroup>
          )}
        </select>
        <button type="button" className={css.smallBtn} onClick={() => { void handleNewChat() }}>
          ＋ 新对话
        </button>
        {isGroup && (
          <button
            type="button" className={css.smallBtn} title="让下一位群成员发言"
            disabled={generating || chat === null}
            onClick={() => { void handleMemberReply() }}
          >
            🎤 成员发言
          </button>
        )}
        <div className={css.toolbarGap} />
        <button
          type="button" className={css.smallBtn} title="作者注释（随对话注入提示词）"
          disabled={chat === null}
          onClick={() => {
            setNoteDraft(String(chat?.header.chat_metadata.note_prompt ?? ''))
            setNoteOpen((v) => !v)
          }}
        >
          📝 注释
        </button>
        {currentExpression !== null && (
          <img
            className={css.spriteImg}
            src={api.spriteUrl(st.avatar, currentExpression)}
            alt={currentExpression} title={`表情：${currentExpression}`} draggable={false}
          />
        )}
        <button
          type="button" className={css.smallBtn} title="重新生成最后一条回复（作为一个新 swipe）"
          disabled={generating || chat === null}
          onClick={() => { void handleRegenerate() }}
        >
          ↻ 重新生成
        </button>
        <button
          type="button" className={css.smallBtn} title="以用户口吻代写下一条消息（填入输入框，不直接发送）"
          disabled={generating || chat === null}
          onClick={() => { void handleImpersonate() }}
        >
          ✍ 代写
        </button>
        <button
          type="button" className={css.smallBtn} title="续写最后一条回复（追加到末尾）"
          disabled={generating || chat === null || chat.messages.length === 0 || chat.messages[chat.messages.length - 1]!.is_user}
          onClick={() => { void handleContinue() }}
        >
          ⏩ 续写
        </button>
      </div>

      {noteOpen && chat !== null && (
        <div className={css.noteBar}>
          <textarea
            className={css.noteArea}
            value={noteDraft}
            placeholder="作者注释：固定注入到对话上下文的导演指令…"
            onChange={(e) => { setNoteDraft(e.target.value) }}
            rows={2}
          />
          <button type="button" className={css.smallBtn} onClick={handleSaveNote}>
            保存
          </button>
        </div>
      )}

      <div className={css.messages}>
        {chat?.messages.map((m, i) => (
          <MessageItem
            key={i}
            message={m}
            displayMes={regexScripts.length === 0 ? undefined : displayMes(m)}
            avatarUrl={rowAvatarUrl(m)}
            locked={generating}
            onSwipe={(next) => { handleSwipe(i, next) }}
            onNewSwipe={() => { void handleNewSwipe(i) }}
            onEdit={(text) => {
              mutateMessage(i, (msg) => {
                const swipes = hasSwipes(msg) ? [...(msg.swipes ?? [])] : undefined
                if (swipes !== undefined) {
                  const id = msg.swipe_id ?? 0
                  swipes[id] = text
                  return { ...msg, mes: text, swipes }
                }
                return { ...msg, mes: text }
              })
            }}
            onDelete={() => { handleDeleteMessage(i) }}
            onDeleteSwipe={() => { handleDeleteSwipe(i, m.swipe_id ?? 0) }}
            onBranch={() => { void handleBranch(i) }}
          />
        ))}
        {streamText !== '' && (
          <div className={css.rowChar}>
            <img className={css.avatar} src={avatarUrl} alt="" draggable={false} />
            <div className={css.bubble}>
              <div className={css.body}>
                {streamText.split(/\n{2,}/).map((para, i) =>
                  <p key={i}>{stripExpressionMarks(regexScripts.length === 0 ? para : displayRegex(regexScripts, para, regexMacros))}</p>
                )}
              </div>
            </div>
          </div>
        )}
        {error !== '' && <div className={css.error}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      <div className={css.composer}>
        <textarea
          className={css.input}
          value={input}
          placeholder={chat === null ? '请先选择角色…' : '输入消息…'}
          disabled={chat === null}
          onChange={(e) => { setInput(e.target.value) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
          rows={2}
        />
        {generating
          ? (
              <button type="button" className={css.sendBtn} onClick={handleStop}>
                ■ 停止
              </button>
            )
          : (
              <button
                type="button" className={css.sendBtn}
                disabled={input.trim() === '' || chat === null}
                onClick={() => { void handleSend() }}
              >
                ➤ 发送
              </button>
            )}
      </div>
    </div>
  )
}
