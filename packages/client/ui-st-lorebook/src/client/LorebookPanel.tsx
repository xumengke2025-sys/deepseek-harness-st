/**
 * The World Info (lorebook) editor: book picker, entry list, and entry editor
 * over the st-lorebook service's HTTP table — ST's world-info screen layout.
 */
import { useCallback, useEffect, useState } from 'react'
import type { StFaceProps, StWorldEntry, StWorldFile } from '@deepseek-ai/dsh-client-ui-st-chat/client'
import css from './lorebook.module.css'

/** Chinese label per secondary-key logic value (ST's world_info_logic). */
const LOGIC_LABELS: Record<number, string> = {
  0: '任意副关键词 (AND_ANY)',
  1: '非全部 (NOT_ALL)',
  2: '均不含 (NOT_ANY)',
  3: '全部包含 (AND_ALL)',
}

/** Common insertion positions (ST's world_info_position subset). */
const POSITION_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: '角色定义之前 (before)' },
  { value: 1, label: '角色定义之后 (after)' },
  { value: 4, label: '按深度插入 (atDepth)' },
  { value: 7, label: '系统提示 (system)' },
  { value: 1000, label: '示例对话之前 (beforeChar)' },
  { value: 1001, label: '示例对话之后 (afterChar)' },
]

/** ST's newWorldInfoEntry template defaults (client mirror). */
function newEntry(uid: number, displayIndex: number): StWorldEntry {
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
  }
}

/** Comma-separated editing view of a keyword list. */
function joinKeys(keys: string[]): string {
  return keys.join(', ')
}

/** Parse a comma-separated input back into a keyword list. */
function splitKeys(text: string): string[] {
  return text.split(',').map((k) => k.trim()).filter((k) => k !== '')
}

/** Blank input means "not set": ST's sticky/cooldown editor shows empty for null. */
function msOfSeconds(text: string): number | null {
  const t = text.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n * 1000) : null
}

/** Seconds view of a millisecond field; null renders blank. */
function secondsOfMs(ms: number | null): string {
  return ms === null ? '' : String(ms / 1000)
}

/** Blank input means "not set" for a message-count field (delay / scanDepth). */
function countOrNull(text: string): number | null {
  const t = text.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? Math.floor(n) : null
}

function stringOfCount(v: number | null): string {
  return v === null ? '' : String(v)
}

/**
 * The ST lorebook surface.
 * @param props - the {@link StFace} share (state hook, api, actions).
 */
export function LorebookPanel({ useSt, api, actions }: StFaceProps) {
  const st = useSt((s) => s)
  const activeWorlds = st.worlds
  const [books, setBooks] = useState<string[]>([])
  const [book, setBook] = useState('')
  const [file, setFile] = useState<StWorldFile | null>(null)
  const [selUid, setSelUid] = useState<number | null>(null)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')

  const loadBooks = useCallback(async (): Promise<string[]> => {
    const rows = await api.listWorlds()
    const names = rows.map((r) => r.name)
    setBooks(names)
    return names
  }, [api])

  useEffect(() => {
    loadBooks()
      .then((list) => {
        if (list.length > 0 && book === '') setBook(list[0]!)
      })
      .catch((e: unknown) => { setError(String(e)) })
  }, [loadBooks, book])

  useEffect(() => {
    if (book === '') {
      setFile(null)
      setSelUid(null)
      return
    }
    setError('')
    api.getWorld(book)
      .then((f) => {
        setFile(f)
        setSelUid(null)
        setDirty(false)
      })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)) })
  }, [api, book])

  const entries = file === null ? [] : Object.values(file.entries).sort((a, b) => a.displayIndex - b.displayIndex)
  const selected = entries.find((e) => e.uid === selUid) ?? null

  /** Local edit: rewrite the selected entry in the file, mark dirty. */
  const patchEntry = useCallback((patch: Partial<StWorldEntry>): void => {
    if (selected === null) return
    setFile((prev) => prev === null ? prev : {
      ...prev,
      entries: { ...prev.entries, [String(selected.uid)]: { ...selected, ...patch } },
    })
    setDirty(true)
  }, [selected])

  const addEntry = useCallback((): void => {
    if (file === null) return
    const uid = entries.reduce((m, e) => Math.max(m, e.uid), -1) + 1
    const entry = newEntry(uid, entries.length)
    setFile({ ...file, entries: { ...file.entries, [String(uid)]: entry } })
    setSelUid(uid)
    setDirty(true)
  }, [file, entries])

  const removeEntry = useCallback((uid: number): void => {
    if (file === null) return
    const next = { ...file.entries }
    delete next[String(uid)]
    setFile({ ...file, entries: next })
    if (selUid === uid) setSelUid(null)
    setDirty(true)
  }, [file, selUid])

  const save = useCallback(async (): Promise<void> => {
    if (file === null || book === '') return
    setError('')
    try {
      await api.saveWorld(book, file)
      setDirty(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, book, file])

  const createBook = useCallback(async (): Promise<void> => {
    const name = window.prompt('新世界书名称')
    if (name === null || name.trim() === '') return
    try {
      await api.saveWorld(name.trim(), { entries: {} })
      const list = await loadBooks()
      setBook(name.trim())
      if (list.length === 0) void loadBooks()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, loadBooks])

  /** ST activates several books at once: the toggle adds/removes from the set. */
  const toggleActive = useCallback((name: string): void => {
    actions.setWorlds(activeWorlds.includes(name)
      ? activeWorlds.filter((w) => w !== name)
      : [...activeWorlds, name])
  }, [actions, activeWorlds])

  /** Flush pending edits, then (re)index the current book's vectorized entries. */
  const indexBook = useCallback(async (): Promise<void> => {
    if (file === null || book === '') return
    setError('')
    try {
      if (dirty) {
        await api.saveWorld(book, file)
        setDirty(false)
      }
      const { indexed } = await api.indexWorld(book)
      window.alert(`已为「${book}」建立向量索引：${indexed} 个向量检索条目`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, file, book, dirty])

  const deleteBook = useCallback(async (name: string): Promise<void> => {
    if (!window.confirm(`删除世界书「${name}」？此操作不可恢复。`)) return
    try {
      await api.deleteWorld(name)
      const list = await loadBooks()
      if (book === name) setBook(list[0] ?? '')
      if (activeWorlds.includes(name)) actions.setWorlds(activeWorlds.filter((w) => w !== name))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, loadBooks, book, activeWorlds, actions])

  return (
    <div className={css.panelColumn}>
      <div className={css.globalBar}>
        <span className={css.globalTitle}>全局设置（ST 的 world_info_*，作用于所有启用世界书的扫描）</span>
        <div className={css.row}>
          <label className={css.number}>
            扫描深度（消息）：{st.worldInfoDepth ?? 2}
            <input
              className={css.input} type="range" min={1} max={10} step={1}
              value={st.worldInfoDepth ?? 2}
              onChange={(e) => { actions.setWorldInfoDepth(Number(e.target.value)) }}
            />
          </label>
          <label className={css.number}>
            Token 预算（% 上下文）：{st.worldInfoBudget ?? 25}
            <input
              className={css.input} type="range" min={1} max={100} step={5}
              value={st.worldInfoBudget ?? 25}
              onChange={(e) => { actions.setWorldInfoBudget(Number(e.target.value)) }}
            />
          </label>
          <label className={css.check}>
            <input type="checkbox" checked={st.worldInfoCaseSensitive ?? false}
              onChange={(e) => { actions.setWorldInfoCaseSensitive(e.target.checked) }} />
            大小写敏感
          </label>
          <label className={css.check}>
            <input type="checkbox" checked={st.worldInfoMatchWholeWords ?? true}
              onChange={(e) => { actions.setWorldInfoMatchWholeWords(e.target.checked) }} />
            全词匹配
          </label>
          <label className={css.check}>
            <input type="checkbox" checked={st.worldInfoRecursive ?? true}
              onChange={(e) => { actions.setWorldInfoRecursive(e.target.checked) }} />
            递归扫描
          </label>
        </div>
      </div>

      <div className={css.main}>
      <div className={css.books}>
        <div className={css.booksHead}>
          <span>世界书</span>
          <button type="button" className={css.miniBtn} title="新建世界书" onClick={() => { void createBook() }}>＋</button>
        </div>
        {books.map((name) => {
          const active = activeWorlds.includes(name)
          return (
            <div key={name} className={name === book ? css.bookRowActive : css.bookRow}>
              <button type="button" className={css.bookBtn} onClick={() => { setBook(name) }}>
                {name}
                {active && <span className={css.activeTag}> ✦</span>}
              </button>
              <button
                type="button" className={css.miniBtn}
                title={active ? '取消启用' : '在对话中启用'}
                onClick={() => { toggleActive(name) }}
              >
                {active ? '✓' : '＋'}
              </button>
              <button type="button" className={css.miniBtn} title="删除世界书" onClick={() => { void deleteBook(name) }}>✕</button>
            </div>
          )
        })}
        {books.length === 0 && <div className={css.hint}>还没有世界书</div>}
      </div>

      <div className={css.entries}>
        <div className={css.entriesHead}>
          <span>{entries.length} 个条目</span>
          <span>
            <button
              type="button" className={css.miniBtn} disabled={file === null} title="为本书的向量检索条目建立/刷新向量索引"
              onClick={() => { void indexBook() }}
            >
              ⌗
            </button>
            {' '}
            <button type="button" className={css.miniBtn} disabled={file === null} title="新建条目" onClick={addEntry}>＋</button>
          </span>
        </div>
        <div className={css.entryList}>
          {entries.map((e) => (
            <div key={e.uid} className={e.uid === selUid ? css.entryRowActive : css.entryRow}>
              <button type="button" className={css.entryBtn} onClick={() => { setSelUid(e.uid) }}>
                {e.disable && <span className={css.offTag}>已停用 · </span>}
                {e.comment !== '' ? e.comment : e.content.slice(0, 24) || '(空条目)'}
              </button>
              <button type="button" className={css.miniBtn} title="删除条目" onClick={() => { removeEntry(e.uid) }}>✕</button>
            </div>
          ))}
          {file !== null && entries.length === 0 && <div className={css.hint}>还没有条目</div>}
        </div>
        {file !== null && (
          <div className={css.entriesFoot}>
            <button type="button" className={css.primaryBtn} disabled={!dirty} onClick={() => { void save() }}>
              {dirty ? '保存更改' : '已保存'}
            </button>
            <button
              type="button" className={css.toolBtn}
              onClick={() => { toggleActive(book) }}
            >
              {activeWorlds.includes(book) ? '✓ 对话中已启用' : '在对话中启用'}
            </button>
          </div>
        )}
      </div>

      <div className={css.editor}>
        {selected === null
          ? <div className={css.hint}>选择左侧条目进行编辑</div>
          : (
              <div className={css.form}>
                <label className={css.label}>
                  备注
                  <input className={css.input} value={selected.comment}
                    onChange={(e) => { patchEntry({ comment: e.target.value }) }} />
                </label>
                <label className={css.label}>
                  主关键词（逗号分隔）
                  <input className={css.input} value={joinKeys(selected.key)}
                    onChange={(e) => { patchEntry({ key: splitKeys(e.target.value) }) }} />
                </label>
                <label className={css.label}>
                  副关键词（逗号分隔）
                  <input className={css.input} value={joinKeys(selected.keysecondary)}
                    onChange={(e) => { patchEntry({ keysecondary: splitKeys(e.target.value) }) }} />
                </label>
                <label className={css.label}>
                  副关键词逻辑
                  <select className={css.input} value={selected.selectiveLogic}
                    onChange={(e) => { patchEntry({ selectiveLogic: Number(e.target.value) as StWorldEntry['selectiveLogic'] }) }}>
                    {Object.entries(LOGIC_LABELS).map(([v, label]) =>
                      <option key={v} value={v}>{label}</option>)}
                  </select>
                </label>
                <div className={css.row}>
                  <label className={css.label}>
                    大小写敏感
                    <select className={css.input} value={String(selected.caseSensitive ?? 'null')}
                      onChange={(e) => { patchEntry({ caseSensitive: e.target.value === 'null' ? null : e.target.value === 'true' }) }}>
                      <option value="null">沿用全局</option>
                      <option value="true">是</option>
                      <option value="false">否</option>
                    </select>
                  </label>
                  <label className={css.label}>
                    整词匹配
                    <select className={css.input} value={String(selected.matchWholeWords ?? 'null')}
                      onChange={(e) => { patchEntry({ matchWholeWords: e.target.value === 'null' ? null : e.target.value === 'true' }) }}>
                      <option value="null">沿用全局</option>
                      <option value="true">是</option>
                      <option value="false">否</option>
                    </select>
                  </label>
                  <label className={css.label}>
                    组评分
                    <select className={css.input} value={String(selected.useGroupScoring ?? 'null')}
                      onChange={(e) => { patchEntry({ useGroupScoring: e.target.value === 'null' ? null : e.target.value === 'true' }) }}>
                      <option value="null">沿用全局</option>
                      <option value="true">是</option>
                      <option value="false">否</option>
                    </select>
                  </label>
                </div>
                <label className={css.label}>
                  内容（触发后注入的文本）
                  <textarea className={css.textarea} rows={6} value={selected.content}
                    onChange={(e) => { patchEntry({ content: e.target.value }) }} />
                </label>
                <div className={css.row}>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.constant}
                      onChange={(e) => { patchEntry({ constant: e.target.checked }) }} />
                    常驻（无需关键词）
                  </label>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.disable}
                      onChange={(e) => { patchEntry({ disable: e.target.checked }) }} />
                    停用
                  </label>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.selective}
                      onChange={(e) => { patchEntry({ selective: e.target.checked }) }} />
                    选择性（Selective）
                  </label>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.useProbability}
                      onChange={(e) => { patchEntry({ useProbability: e.target.checked }) }} />
                    启用概率
                  </label>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.addMemo}
                      onChange={(e) => { patchEntry({ addMemo: e.target.checked }) }} />
                    添加 Memo
                  </label>
                </div>
                <div className={css.row}>
                  <label className={css.number}>
                    Automation ID
                    <input className={css.input} value={selected.automationId}
                      onChange={(e) => { patchEntry({ automationId: e.target.value }) }} />
                  </label>
                  <label className={css.number}>
                    Outlet Name
                    <input className={css.input} value={selected.outletName}
                      onChange={(e) => { patchEntry({ outletName: e.target.value }) }} />
                  </label>
                  <label className={css.number}>
                    Recursion Level
                    <input className={css.input} type="number" min={0} value={selected.delayUntilRecursion}
                      onChange={(e) => { patchEntry({ delayUntilRecursion: Number(e.target.value) }) }} />
                  </label>
                </div>
                <div className={css.row}>
                  <label className={css.number}>
                    顺序
                    <input className={css.input} type="number" value={selected.order}
                      onChange={(e) => { patchEntry({ order: Number(e.target.value) }) }} />
                  </label>
                  <label className={css.number}>
                    触发概率 %
                    <input className={css.input} type="number" min={0} max={100} value={selected.probability}
                      onChange={(e) => { patchEntry({ probability: Number(e.target.value) }) }} />
                  </label>
                </div>
                <label className={css.label}>
                  插入位置
                  <select className={css.input} value={selected.position}
                    onChange={(e) => { patchEntry({ position: Number(e.target.value) }) }}>
                    {POSITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <div className={css.row}>
                  <label className={css.number}>
                    分组（同名互斥）
                    <input className={css.input} value={selected.group}
                      onChange={(e) => { patchEntry({ group: e.target.value }) }} />
                  </label>
                  <label className={css.number}>
                    组权重
                    <input className={css.input} type="number" min={0} value={selected.groupWeight}
                      onChange={(e) => { patchEntry({ groupWeight: Number(e.target.value) }) }} />
                  </label>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.groupOverride}
                      onChange={(e) => { patchEntry({ groupOverride: e.target.checked }) }} />
                    组内覆盖
                  </label>
                </div>
                <div className={css.row}>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.excludeRecursion}
                      onChange={(e) => { patchEntry({ excludeRecursion: e.target.checked }) }} />
                    不可被递归激活
                  </label>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.preventRecursion}
                      onChange={(e) => { patchEntry({ preventRecursion: e.target.checked }) }} />
                    不向递归贡献内容
                  </label>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.ignoreBudget}
                      onChange={(e) => { patchEntry({ ignoreBudget: e.target.checked }) }} />
                    无视预算
                  </label>
                  <label className={css.check}
                    title="向量检索：条目不做关键词匹配，由向量存储按语义相似度激活（需先为本书建立向量索引）">
                    <input type="checkbox" checked={selected.vectorized}
                      onChange={(e) => { patchEntry({ vectorized: e.target.checked }) }} />
                    向量检索
                  </label>
                </div>
                <div className={css.row}>
                  <label className={css.number}>
                    Sticky（秒，留空关闭）
                    <input className={css.input} value={secondsOfMs(selected.sticky)}
                      onChange={(e) => { patchEntry({ sticky: msOfSeconds(e.target.value) }) }} />
                  </label>
                  <label className={css.number}>
                    Cooldown（秒，留空关闭）
                    <input className={css.input} value={secondsOfMs(selected.cooldown)}
                      onChange={(e) => { patchEntry({ cooldown: msOfSeconds(e.target.value) }) }} />
                  </label>
                </div>
                <div className={css.row}>
                  <label className={css.number}>
                    Delay（消息数，留空关闭）
                    <input className={css.input} value={stringOfCount(selected.delay)}
                      onChange={(e) => { patchEntry({ delay: countOrNull(e.target.value) }) }} />
                  </label>
                  <label className={css.number}>
                    扫描深度（消息，留空用全局）
                    <input className={css.input} value={stringOfCount(selected.scanDepth)}
                      onChange={(e) => { patchEntry({ scanDepth: countOrNull(e.target.value) }) }} />
                  </label>
                </div>
                <div className={css.row}>
                  <span className={css.label}>Additional Matching Sources（关键词同时扫描以下字段）</span>
                </div>
                <div className={css.row}>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.matchCharacterDescription}
                      onChange={(e) => { patchEntry({ matchCharacterDescription: e.target.checked }) }} />
                    角色描述
                  </label>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.matchCharacterPersonality}
                      onChange={(e) => { patchEntry({ matchCharacterPersonality: e.target.checked }) }} />
                    角色性格
                  </label>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.matchScenario}
                      onChange={(e) => { patchEntry({ matchScenario: e.target.checked }) }} />
                    场景
                  </label>
                </div>
                <div className={css.row}>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.matchPersonaDescription}
                      onChange={(e) => { patchEntry({ matchPersonaDescription: e.target.checked }) }} />
                    人物描述
                  </label>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.matchCharacterDepthPrompt}
                      onChange={(e) => { patchEntry({ matchCharacterDepthPrompt: e.target.checked }) }} />
                    角色 Note
                  </label>
                  <label className={css.check}>
                    <input type="checkbox" checked={selected.matchCreatorNotes}
                      onChange={(e) => { patchEntry({ matchCreatorNotes: e.target.checked }) }} />
                    作者注释
                  </label>
                </div>
              </div>
            )}
        {error !== '' && <div className={css.error}>{error}</div>}
      </div>
      </div>
    </div>
  )
}
