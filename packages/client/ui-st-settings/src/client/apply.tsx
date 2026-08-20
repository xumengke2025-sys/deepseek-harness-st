/**
 * Browser assembly of the settings surface: one nav row plus the panel cell
 * in the ST shell's slots, both after ui-st-chat declares them.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { StNavOwnerProps } from '@deepseek-ai/dsh-client-ui-st-chat/client'
import { SettingsPanel } from './SettingsPanel.tsx'
import css from './settings.module.css'

// Type-only: pulls the ST slots' SlotMap declarations (declared by ui-st-chat's
// shell) into scope without a cross-plugin value import.
import type {} from '@deepseek-ai/dsh-client-ui-st-chat/client'
// Type-only: pulls the runtime's Context merge (ctx.slots) into scope, the
// same chain ui-layout's own client entry establishes for the shell.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'

/** Services required by the browser plugin. */
export const inject = ['slots']

/** The nav row for the settings surface; the panel key is closed over. */
function SettingsNavRow(props: StNavOwnerProps) {
  return (
    <button
      type="button"
      className={props.panel === 'settings' ? css.navBtnActive : css.navBtn}
      onClick={() => { props.select('settings') }}
    >
      ⚙️ 设置
    </button>
  )
}

/**
 * Mount the settings surface into the ST shell's nav and panel slots.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  // ui-st-chat's shell declares 'st.nav'/'st.panel' at its own load time; wait
  // for it so plugin load order cannot matter.
  ctx.slots.inject('st.panel', () => {
    const disposePanel = ctx.slots.register({ name: 'st.panel', key: 'settings' }, SettingsPanel)
    const disposeNav = ctx.slots.register({ name: 'st.nav', id: 'settings', order: 30 }, SettingsNavRow)
    return [disposeNav, disposePanel]
  })
}
