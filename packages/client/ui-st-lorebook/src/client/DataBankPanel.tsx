/**
 * The Data Bank panel: paste documents into the vector store, list indexed
 * files, delete them, and test similarity retrieval — ST's Data Bank screen
 * over the st-api vector file routes.
 */
import { useCallback, useEffect, useState } from 'react'
import type { StBankHit, StFaceProps } from '@deepseek-ai/dsh-client-ui-st-chat/client'
import css from './lorebook.module.css'

/**
 * The Data Bank management surface.
 * @param props - the {@link StFace} share (api).
 */
export function DataBankPanel({ api }: StFaceProps) {
  const [files, setFiles] = useState<string[]>([])
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<StBankHit[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback((): void => {
    api.listBankFiles().then(setFiles).catch((e: unknown) => { setError(String(e)) })
  }, [api])

  useEffect(load, [load])

  /** Chunk and index the form's document, then refresh the file list. */
  const handleIndex = useCallback(async (): Promise<void> => {
    if (name.trim() === '' || text.trim() === '') {
      setError('文件名与正文不能为空')
      return
    }
    setBusy(true)
    setError('')
    try {
      const doc = name.trim()
      const { chunks } = await api.indexBankFile(doc, text)
      window.alert(`已索引「${doc}」：${chunks} 个分块`)
      setName('')
      setText('')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [api, name, text, load])

  const handleDelete = useCallback(async (file: string): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      await api.deleteBankFile(file)
      if (hits !== null) setHits(hits.filter((h) => !h.key.startsWith(`${file}#`)))
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [api, hits, load])

  /** Run one similarity query over the indexed chunks. */
  const handleSearch = useCallback(async (): Promise<void> => {
    if (query.trim() === '') {
      setError('检索词不能为空')
      return
    }
    setBusy(true)
    setError('')
    try {
      setHits(await api.searchBankFiles(query))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [api, query])

  return (
    <div className={css.panel}>
      <div className={css.books}>
        <div className={css.booksHead}>
          <span>文档（{files.length}）</span>
        </div>
        {files.map((f) => (
          <div key={f} className={css.bookRow}>
            <span className={css.bookBtn}>{f}</span>
            <button
              type="button" className={css.toolBtn} title="删除索引"
              disabled={busy}
              onClick={() => { void handleDelete(f) }}
            >
              ✕
            </button>
          </div>
        ))}
        {files.length === 0 && <p className={css.hint}>暂无文档。粘贴正文建立第一个索引。</p>}
      </div>

      <div className={css.editor}>
        <form
          className={css.form}
          onSubmit={(e) => { e.preventDefault(); void handleIndex() }}
        >
          <label className={css.label}>
            文件名
            <input
              className={css.input}
              value={name}
              placeholder="例如：世界设定集"
              onChange={(e) => { setName(e.target.value) }}
            />
          </label>
          <label className={css.label}>
            正文（分块后建立向量索引）
            <textarea
              className={css.textarea}
              rows={8}
              value={text}
              onChange={(e) => { setText(e.target.value) }}
            />
          </label>
          <div className={css.row}>
            <button type="submit" className={css.primaryBtn} disabled={busy}>
              建立索引
            </button>
          </div>
        </form>

        <form
          className={css.form}
          onSubmit={(e) => { e.preventDefault(); void handleSearch() }}
        >
          <label className={css.label}>
            检索测试
            <div className={css.row}>
              <input
                className={css.input}
                value={query}
                placeholder="输入检索词，按相似度返回分块"
                onChange={(e) => { setQuery(e.target.value) }}
              />
              <button type="submit" className={css.miniBtn} disabled={busy}>
                检索
              </button>
            </div>
          </label>
          {hits !== null && (
            <div className={css.hitList}>
              {hits.map((h) => (
                <div key={h.key} className={css.hit}>
                  <span className={css.hitMeta}>{h.key} · {h.score.toFixed(3)}</span>
                  <span>{h.text.slice(0, 200)}{h.text.length > 200 ? '…' : ''}</span>
                </div>
              ))}
              {hits.length === 0 && <p className={css.hint}>无命中。</p>}
            </div>
          )}
        </form>
      </div>
      {error !== '' && <div className={css.error}>{error}</div>}
    </div>
  )
}
