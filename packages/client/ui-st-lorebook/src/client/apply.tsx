/**
 * Browser assembly of the lorebook and Data Bank surfaces: nav rows plus the
 * panel cells in the ST shell's slots, both after ui-st-chat declares them.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { StNavOwnerProps } from '@deepseek-ai/dsh-client-ui-st-chat/client'
import { DataBankPanel } from './DataBankPanel.tsx'
import { LorebookPanel } from './LorebookPanel.tsx'
import css from './lorebook.module.css'

// Type-only: pulls the ST slots' SlotMap declarations (declared by ui-st-chat's
// shell) into scope without a cross-plugin value import.
import type {} from '@deepseek-ai/dsh-client-ui-st-chat/client'
// Type-only: pulls the runtime's Context merge (ctx.slots) into scope, the
// same chain ui-layout's own client entry establishes for the shell.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'

/** Services required by the browser plugin. */
export const inject = ['slots']

/** The nav row for the lorebook surface; the panel key is closed over. */
function LorebookNavRow(props: StNavOwnerProps) {
  return (
    <button
      type="button"
      className={props.panel === 'lorebook' ? css.navBtnActive : css.navBtn}
      onClick={() => { props.select('lorebook') }}
    >
      📚 世界书
    </button>
  )
}

/** The nav row for the Data Bank surface. */
function DataBankNavRow(props: StNavOwnerProps) {
  return (
    <button
      type="button"
      className={props.panel === 'databank' ? css.navBtnActive : css.navBtn}
      onClick={() => { props.select('databank') }}
    >
      🏦 数据银行
    </button>
  )
}

/**
 * Mount the lorebook and Data Bank surfaces into the ST shell's nav and panel
 * slots.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  // ui-st-chat's shell declares 'st.nav'/'st.panel' at its own load time; wait
  // for it so plugin load order cannot matter.
  ctx.slots.inject('st.panel', () => {
    const disposeLore = ctx.slots.register({ name: 'st.panel', key: 'lorebook' }, LorebookPanel)
    const disposeLoreNav = ctx.slots.register({ name: 'st.nav', id: 'lorebook', order: 20 }, LorebookNavRow)
    const disposeBank = ctx.slots.register({ name: 'st.panel', key: 'databank' }, DataBankPanel)
    const disposeBankNav = ctx.slots.register({ name: 'st.nav', id: 'databank', order: 25 }, DataBankNavRow)
    return [disposeLoreNav, disposeLore, disposeBankNav, disposeBank]
  })
}
