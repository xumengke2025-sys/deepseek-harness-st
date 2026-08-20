/**
 * The SillyTavern shell occupying the layout's 'conversation' seat while the
 * ST bundle is composed: a nav rail of registered panel rows plus the active
 * panel's surface.
 */
import type { StShellProps } from './contract.ts'
import css from './st-shell.module.css'

/**
 * The ST surface root.
 * @param props - child render share plus the {@link StFace} share.
 */
export function StShell(props: StShellProps) {
  const panel = props.useSt((s) => s.panel)
  return (
    <div className={css.shell}>
      <nav className={css.nav}>
        {props.renderSlot('st.nav', { panel, select: props.actions.setPanel })}
      </nav>
      <div className={css.surface}>
        {props.renderSlot('st.panel', {}, {
          entryKey: panel,
          fallback: <div className={css.missing}>Panel &ldquo;{panel}&rdquo; is not registered.</div>,
        })}
      </div>
    </div>
  )
}
