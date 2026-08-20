/**
 * The theme panel: one card per registry theme with color swatches; clicking
 * applies the theme immediately and persists the selection.
 */
import { useState } from 'react'
import type { StFaceProps } from '@deepseek-ai/dsh-client-ui-st-chat/client'
import { THEMES } from './themes.ts'
import { readStoredThemeId, selectTheme } from './dom.ts'
import css from './theme.module.css'

/** Swatch columns shown per card: background, bubbles, accent. */
const SWATCH_VARS = ['--dsh-st-bg', '--dsh-st-bubble-user', '--dsh-st-accent'] as const

/**
 * The ST theme surface.
 * @param _props - the {@link StFace} share; theme selection is local to this panel.
 */
export function ThemePanel(_props: StFaceProps) {
  const [active, setActive] = useState(readStoredThemeId() ?? THEMES[0]!.id)

  const choose = (id: string): void => {
    selectTheme(id)
    setActive(id)
  }

  return (
    <div className={css.panel}>
      <div className={css.hint}>选择主题后立即生效，并会在刷新后保留。</div>
      <div className={css.grid}>
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={theme.id === active ? css.cardActive : css.card}
            onClick={() => { choose(theme.id) }}
          >
            <div className={css.swatches}>
              {SWATCH_VARS.map((name) => (
                <span key={name} className={css.swatch} style={{ background: theme.vars[name] }} />
              ))}
            </div>
            <div className={css.label}>{theme.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
