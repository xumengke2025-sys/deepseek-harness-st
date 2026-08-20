/**
 * The regex-script panel: list, edit, create, enable, and delete find-replace
 * scripts over the st-api regex routes. Saves broadcast 'st-regex-updated' on
 * window so the chat surface re-fetches its display-side copy.
 */
import { useCallback, useEffect, useState } from 'react'
import type { StFaceProps, StRegexScript } from '@deepseek-ai/dsh-client-ui-st-chat/client'
import css from './regex.module.css'

/** ST's placement flags, mirrored locally: cross-plugin value imports are forbidden in client bundles. */
const PLACEMENT = { USER_INPUT: 1, DISPLAY: 0, AI_OUTPUT: 2 } as const

/** A fresh script skeleton for the editor, ST's defaults. */
function blankScript(): StRegexScript {
  return {
    id: '', scriptName: '新建脚本', findRegex: '', replaceString: '', trimStrings: [],
    placement: [PLACEMENT.DISPLAY], disabled: false,
    markdownOnly: false, promptOnly: false, substituteRegex: false,
  }
}

/** One placement flag's label. */
const PLACEMENTS: Array<{ flag: number, label: string }> = [
  { flag: PLACEMENT.USER_INPUT, label: '用户输入' },
  { flag: PLACEMENT.DISPLAY, label: '显示' },
  { flag: PLACEMENT.AI_OUTPUT, label: 'AI 输出' },
]

/**
 * The regex-script management surface.
 * @param props - the {@link StFace} share (api, actions).
 */
export function RegexPanel({ api }: StFaceProps) {
  const [scripts, setScripts] = useState<StRegexScript[]>([])
  const [editing, setEditing] = useState<StRegexScript | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback((): void => {
    api.listRegex().then(setScripts).catch((e: unknown) => { setError(String(e)) })
  }, [api])

  useEffect(load, [load])

  /** Persist the editor's script, then tell the chat surface to refetch. */
  const handleSave = useCallback(async (): Promise<void> => {
    if (editing === null) return
    if (editing.findRegex === '') {
      setError('查找正则不能为空')
      return
    }
    setBusy(true)
    setError('')
    try {
      // An invalid pattern must not reach storage; ST validates per script.
      new RegExp(editing.findRegex)
      const saved = await api.saveRegex(editing)
      setEditing(saved)
      window.dispatchEvent(new CustomEvent('st-regex-updated'))
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [api, editing, load])

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      await api.deleteRegex(id)
      if (editing?.id === id) setEditing(null)
      window.dispatchEvent(new CustomEvent('st-regex-updated'))
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [api, editing?.id, load])

  /** Toggle one placement flag in the editor. */
  const togglePlacement = (flag: number): void => {
    setEditing((cur) => cur === null ? null : {
      ...cur,
      placement: cur.placement.includes(flag)
        ? cur.placement.filter((p) => p !== flag)
        : [...cur.placement, flag],
    })
  }

  return (
    <div className={css.panel}>
      <div className={css.head}>
        <span className={css.title}>正则脚本</span>
        <button
          type="button" className={css.smallBtn}
          disabled={busy}
          onClick={() => { setEditing(blankScript()); setError('') }}
        >
          ＋ 新建
        </button>
      </div>
      <p className={css.hint}>
        查找替换脚本：按作用位置改写入提示词或仅显示的文本。存储在 settings/regex.json，与 SillyTavern 兼容。
      </p>

      <div className={css.list}>
        {scripts.map((s) => (
          <div key={s.id} className={s.id === editing?.id ? css.itemActive : css.item}>
            <button
              type="button" className={css.itemMain}
              onClick={() => { setEditing({ ...s }); setError('') }}
            >
              <span className={s.disabled ? css.nameOff : css.name}>{s.scriptName}</span>
              <span className={css.rule}>{s.findRegex} → {s.replaceString === '' ? '(删除)' : s.replaceString}</span>
            </button>
            <button
              type="button" className={css.toolBtn}
              title={s.disabled ? '启用' : '停用'}
              onClick={() => { setEditing({ ...s, disabled: !s.disabled }) }}
            >
              {s.disabled ? '⏸' : '▶'}
            </button>
            <button type="button" className={css.toolBtn} title="删除" onClick={() => { void handleDelete(s.id) }}>
              ✕
            </button>
          </div>
        ))}
        {scripts.length === 0 && <p className={css.hint}>暂无脚本。</p>}
      </div>

      {editing !== null && (
        <div className={css.editor}>
          <label className={css.label}>
            名称
            <input
              className={css.input}
              value={editing.scriptName}
              onChange={(e) => { setEditing({ ...editing, scriptName: e.target.value }) }}
            />
          </label>
          <label className={css.label}>
            查找正则（全局匹配）
            <input
              className={css.input}
              value={editing.findRegex}
              placeholder={'例如 \\*\\*(.+?)\\*\\*'}
              onChange={(e) => { setEditing({ ...editing, findRegex: e.target.value }) }}
            />
          </label>
          <label className={css.label}>
            替换为（支持 $1 反向引用、{'{{char}}/{{user}}'}）
            <input
              className={css.input}
              value={editing.replaceString}
              onChange={(e) => { setEditing({ ...editing, replaceString: e.target.value }) }}
            />
          </label>
          <label className={css.label}>
            移除片段（每行一个，替换后删除）
            <textarea
              className={css.area}
              rows={2}
              value={editing.trimStrings.join('\n')}
              onChange={(e) => {
                setEditing({ ...editing, trimStrings: e.target.value.split('\n').filter((t) => t !== '') })
              }}
            />
          </label>
          <div className={css.label}>
            作用位置
            <div className={css.row}>
              {PLACEMENTS.map(({ flag, label }) => (
                <label key={flag} className={css.check}>
                  <input
                    type="checkbox"
                    checked={editing.placement.includes(flag)}
                    onChange={() => { togglePlacement(flag) }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className={css.row}>
            <label className={css.check}>
              <input
                type="checkbox"
                checked={editing.substituteRegex}
                onChange={(e) => { setEditing({ ...editing, substituteRegex: e.target.checked }) }}
              />
              替换文本中代入 {'{{char}}/{{user}}'}
            </label>
            <label className={css.check}>
              <input
                type="checkbox"
                checked={editing.disabled}
                onChange={(e) => { setEditing({ ...editing, disabled: e.target.checked }) }}
              />
              停用
            </label>
          </div>
          <div className={css.row}>
            <button type="button" className={css.smallBtn} disabled={busy} onClick={() => { void handleSave() }}>
              保存
            </button>
            <button type="button" className={css.smallBtn} onClick={() => { setEditing(null) }}>
              关闭
            </button>
          </div>
        </div>
      )}
      {error !== '' && <div className={css.error}>{error}</div>}
    </div>
  )
}
