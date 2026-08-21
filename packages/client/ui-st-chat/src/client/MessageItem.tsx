/**
 * One chat message row: avatar, name, body (editable), and ST swipe
 * navigation when alternates exist.
 */
import { useEffect, useRef, useState } from 'react'
import type { StWireMessage } from './contract.ts'
import { speak, stripExpressionMarks } from './tts.ts'
import css from './chat.module.css'

/** Owner share passed by the chat panel to each message row. */
export interface MessageItemProps {
  message: StWireMessage
  /** Display text after regex scripts; omitted renders the stored text. Editing always edits the stored text. */
  displayMes?: string | undefined
  /** Character avatar image URL for non-user rows. */
  avatarUrl: string
  /** Switch this row to swipe alternate `index` (ST: arrows move swipe_id). */
  onSwipe(index: number): void
  /** Request a fresh alternate past the last swipe (ST: swipe-right at the end). */
  onNewSwipe(): void
  onEdit(text: string): void
  onDelete(): void
  /** Delete the current swipe variant (keeping the message); omitted disables the button. */
  onDeleteSwipe?(): void
  /** Branch the chat at this row into a new chat file (ST: "Branch from here"); omitted hides the button. */
  onBranch?(): void
  /** Edit lock while a generation streams. */
  locked: boolean
}

/** ST's swipe floor: swipe_id 0 is the first alternate. */
function swipeId(message: StWireMessage): number {
  return message.swipe_id ?? 0
}

/** One rendered slice of a message body: plain text or a sandboxed HTML block. */
type BodySegment = { kind: 'text'; text: string } | { kind: 'html'; html: string }

/**
 * Split a message body into text and HTML segments: ST's card-magic convention
 * embeds rich widgets as ```html fenced blocks (Tavern Helper cards), which
 * render in a sandboxed iframe instead of the text flow.
 */
function bodySegments(text: string): BodySegment[] {
  const segments: BodySegment[] = []
  const rest = stripExpressionMarks(text)
  const fence = /```html\s*\n?([\s\S]*?)```/g
  let cursor = 0
  for (const match of rest.matchAll(fence)) {
    const start = match.index ?? 0
    if (start > cursor) segments.push({ kind: 'text', text: rest.slice(cursor, start) })
    segments.push({ kind: 'html', html: match[1] ?? '' })
    cursor = start + match[0].length
  }
  if (cursor < rest.length) segments.push({ kind: 'text', text: rest.slice(cursor) })
  return segments
}

/** Render markdown-lite: paragraphs and line breaks only; full rendering lands with the theme pass. */
function bodyLines(text: string): string[] {
  return text.split(/\n{2,}/)
}

/**
 * One message row with edit-in-place and swipe controls.
 * @param props - row owner share.
 */
export function MessageItem(props: MessageItemProps) {
  const { message } = props
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) return
    setDraft(message.mes)
    areaRef.current?.focus()
  }, [editing, message.mes])

  const swipes = message.swipes
  const id = swipeId(message)
  const hasSwipes = swipes !== undefined && swipes.length > 1

  return (
    <div className={message.is_user ? css.rowUser : css.rowChar}>
      {!message.is_user && (
        <img className={css.avatar} src={props.avatarUrl} alt={message.name} draggable={false} />
      )}
      <div className={css.bubble}>
        <div className={css.meta}>
          <span className={css.name}>{message.name}</span>
          {!props.locked && (
            <span className={css.tools}>
              <button
                type="button" className={css.toolBtn} title="编辑"
                onClick={() => { setEditing((v) => !v) }}
              >
                ✎
              </button>
              <button
                type="button" className={css.toolBtn} title="朗读"
                onClick={() => { speak(message.mes) }}
              >
                🔊
              </button>
              {props.onBranch !== undefined && (
                <button
                  type="button" className={css.toolBtn} title="从此处分支（保存为新聊天）"
                  onClick={props.onBranch}
                >
                  🎋
                </button>
              )}
              <button type="button" className={css.toolBtn} title="删除" onClick={props.onDelete}>
                🗑
              </button>
            </span>
          )}
        </div>
        {editing
          ? (
              <div className={css.editBox}>
                <textarea
                  ref={areaRef}
                  className={css.editArea}
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value) }}
                  rows={Math.max(3, draft.split('\n').length)}
                />
                <div className={css.editActions}>
                  <button
                    type="button" className={css.smallBtn}
                    onClick={() => { props.onEdit(draft); setEditing(false) }}
                  >
                    保存
                  </button>
                  <button type="button" className={css.smallBtn} onClick={() => { setEditing(false) }}>
                    取消
                  </button>
                </div>
              </div>
            )
          : (
              <div className={css.body}>
                {bodySegments(props.displayMes ?? message.mes).map((seg, i) => seg.kind === 'html'
                  ? (
                      <iframe
                        key={i}
                        className={css.htmlFrame}
                        sandbox="allow-scripts"
                        srcDoc={seg.html}
                        title={`富内容卡片 ${String(i + 1)}`}
                      />
                    )
                  : bodyLines(seg.text).map((para, j) => <p key={`${String(i)}-${String(j)}`}>{para}</p>))}
              </div>
            )}
        {hasSwipes && !editing && (
          <div className={css.swipeBar}>
            <button
              type="button" className={css.swipeBtn} title="上一个候选回复"
              disabled={id === 0}
              onClick={() => { props.onSwipe(id - 1) }}
            >
              ◀
            </button>
            <span className={css.swipeCount}>{id + 1} / {swipes.length}</span>
            <button
              type="button" className={css.swipeBtn} title="下一个候选回复（末尾时生成新的）"
              onClick={() => {
                if (id < swipes.length - 1) props.onSwipe(id + 1)
                else props.onNewSwipe()
              }}
            >
              ▶
            </button>
            {props.onDeleteSwipe !== undefined && swipes.length > 1 && (
              <button
                type="button" className={css.swipeBtn} title="删除当前候选回复"
                onClick={props.onDeleteSwipe}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
