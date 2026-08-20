/**
 * Browser assembly of the SillyTavern surface: the shell shadows the
 * 'conversation' seat while the ST bundle is composed (priority -1 beats
 * ui-conversation's 0), declares the ST nav/panel slots, and ships the chat
 * surface as the first panel.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { StFace, StNavOwnerProps } from './contract.ts'
import { createStUiState } from './state.ts'
import { stApi } from './api.ts'
import { StShell } from './StShell.tsx'
import { ChatPanel } from './ChatPanel.tsx'
import { ChatsPanel } from './ChatsPanel.tsx'
import { GroupsPanel } from './GroupsPanel.tsx'
import css from './st-shell.module.css'

// Type-only: pulls ui-layout's 'conversation' SlotMap declaration into scope.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'

/** Services required by the browser plugin. */
export const inject = ['slots']

/** The shipped nav row for the chat surface; the panel key is closed over. */
function ChatNavRow(props: StNavOwnerProps) {
  return (
    <button
      type="button"
      className={props.panel === 'chat' ? css.navBtnActive : css.navBtn}
      onClick={() => { props.select('chat') }}
    >
      💬 对话
    </button>
  )
}

/** The nav row for the chat-management surface. */
function ChatsNavRow(props: StNavOwnerProps) {
  return (
    <button
      type="button"
      className={props.panel === 'chats' ? css.navBtnActive : css.navBtn}
      onClick={() => { props.select('chats') }}
    >
      🗂 聊天
    </button>
  )
}

/** The nav row for the group-management surface. */
function GroupsNavRow(props: StNavOwnerProps) {
  return (
    <button
      type="button"
      className={props.panel === 'groups' ? css.navBtnActive : css.navBtn}
      onClick={() => { props.select('groups') }}
    >
      👪 群聊
    </button>
  )
}

/**
 * Mount the ST surface into the layout's conversation seat.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  const { source, actions } = createStUiState()
  const face: StFace = { hooks: { st: source }, api: stApi, actions }

  // ui-layout declares 'conversation' at its own load time; wait for it so
  // plugin load order cannot matter, and follow its declaration lifetime.
  ctx.slots.inject('conversation', () => {
    const disposeShell = ctx.slots.register({
      name: 'conversation',
      // Shadow ui-conversation's ConversationRoot (priority 0): lowest renders.
      priority: -1,
      children: {
        'st.nav': { kind: 'list', scope: 'root' },
        'st.panel': { kind: 'keyed', scope: 'root', inject: face },
      },
      inject: (): StFace => face,
    }, StShell)

    // The shell's registration declared both ST slots above; its own surface
    // registers into them in the same declaration lifetime.
    const disposeNav = ctx.slots.register({ name: 'st.nav', id: 'chat', order: 0 }, ChatNavRow)
    const disposePanel = ctx.slots.register({ name: 'st.panel', key: 'chat' }, ChatPanel)
    const disposeChatsNav = ctx.slots.register({ name: 'st.nav', id: 'chats', order: 5 }, ChatsNavRow)
    const disposeChatsPanel = ctx.slots.register({ name: 'st.panel', key: 'chats' }, ChatsPanel)
    const disposeGroupsNav = ctx.slots.register({ name: 'st.nav', id: 'groups', order: 12 }, GroupsNavRow)
    const disposeGroupsPanel = ctx.slots.register({ name: 'st.panel', key: 'groups' }, GroupsPanel)

    return [disposeGroupsPanel, disposeGroupsNav, disposeChatsPanel, disposeChatsNav, disposePanel, disposeNav, disposeShell]
  })
}
