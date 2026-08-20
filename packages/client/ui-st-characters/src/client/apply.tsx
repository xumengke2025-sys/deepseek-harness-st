/**
 * Browser assembly of the characters surface: one nav row plus the panel cell
 * in the ST shell's slots, both after ui-st-chat declares them.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { StNavOwnerProps } from '@deepseek-ai/dsh-client-ui-st-chat/client'
import { CharactersPanel } from './CharactersPanel.tsx'
import css from './characters.module.css'

// Type-only: pulls the ST slots' SlotMap declarations (declared by ui-st-chat's
// shell) into scope without a cross-plugin value import.
import type {} from '@deepseek-ai/dsh-client-ui-st-chat/client'
// Type-only: pulls the runtime's Context merge (ctx.slots) into scope, the
// same chain ui-layout's own client entry establishes for the shell.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'

/** Services required by the browser plugin. */
export const inject = ['slots']

/** The nav row for the characters surface; the panel key is closed over. */
function CharactersNavRow(props: StNavOwnerProps) {
  return (
    <button
      type="button"
      className={props.panel === 'characters' ? css.navBtnActive : css.navBtn}
      onClick={() => { props.select('characters') }}
    >
      👥 角色卡
    </button>
  )
}

/**
 * Mount the characters surface into the ST shell's nav and panel slots.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  // ui-st-chat's shell declares 'st.nav'/'st.panel' at its own load time; wait
  // for it so plugin load order cannot matter.
  ctx.slots.inject('st.panel', () => {
    const disposePanel = ctx.slots.register({ name: 'st.panel', key: 'characters' }, CharactersPanel)
    const disposeNav = ctx.slots.register({ name: 'st.nav', id: 'characters', order: 10 }, CharactersNavRow)
    return [disposeNav, disposePanel]
  })
}
