/**
 * The ST surface's cross-panel selection state: one observable source plus its
 * action set, created per plugin fiber in apply and handed to every ST slot
 * component through the {@link StFace} inject.
 */
import type { StUiActions, StUiSnapshot, StUiSource } from './contract.ts'

/** Initial snapshot; the chat panel is the default surface. */
const INITIAL: StUiSnapshot = {
  panel: 'chat',
  avatar: '',
  chatId: '',
  userName: 'User',
  persona: '',
  storyString: '',
  instructId: '',
  worlds: [],
  presetId: '',
  model: '',
}

/**
 * Create the shared state source with its action set.
 *
 * The snapshot persists to `localStorage` on every change and rehydrates at
 * creation, so the persona name, selected character, model, and panel survive
 * a page reload the way SillyTavern's settings.json does.
 * @returns the observable source and the action set writing through it.
 */
const STORAGE_KEY = 'dsh-st.ui'

/** Read the persisted snapshot; `undefined` keeps {@link INITIAL} when storage is unavailable or stale. */
function readStored(): StUiSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return INITIAL
    const parsed = JSON.parse(raw) as Partial<StUiSnapshot> & { world?: unknown }
    // Pre-multi-select snapshots carried a single `world` string
    const legacyWorld = typeof parsed.world === 'string' && parsed.world.length > 0 ? [parsed.world] : undefined
    const { world: _world, ...rest } = parsed
    const merged = { ...INITIAL, ...rest }
    if (legacyWorld !== undefined && (parsed.worlds === undefined || parsed.worlds.length === 0)) {
      merged.worlds = legacyWorld
    }
    return merged
  } catch {
    // Only swallow storage absence and unparsable legacy values: the source
    // falls back to the initial snapshot, which is always usable.
    return INITIAL
  }
}

export function createStUiState(): { source: StUiSource; actions: StUiActions } {
  let snapshot: StUiSnapshot = readStored()
  const listeners = new Set<() => void>()
  const emit = (): void => {
    for (const fn of [...listeners]) fn()
  }
  const patch = (next: Partial<StUiSnapshot>): void => {
    let changed = false
    for (const key of Object.keys(next) as Array<keyof StUiSnapshot>) {
      if (snapshot[key] !== next[key]) {
        changed = true
        break
      }
    }
    if (!changed) return
    snapshot = { ...snapshot, ...next }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      // Only swallow a full or denied quota: the in-memory snapshot stays
      // authoritative for this session and reload persistence is best-effort.
    }
    emit()
  }
  const source: StUiSource = {
    getSnapshot: () => snapshot,
    subscribe: (fn) => {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
  }
  const actions: StUiActions = {
    setPanel: (panel) => { patch({ panel }) },
    setAvatar: (avatar) => { patch({ avatar, chatId: '' }) },
    setChatId: (chatId) => { patch({ chatId }) },
    setUserName: (userName) => { patch({ userName }) },
    setPersona: (persona) => { patch({ persona }) },
    setStoryString: (storyString) => { patch({ storyString }) },
    setInstructId: (instructId) => { patch({ instructId }) },
    setWorlds: (worlds) => { patch({ worlds }) },
    setPresetId: (presetId) => { patch({ presetId }) },
    setModel: (model) => { patch({ model }) },
    setPersonaPosition: (personaPosition) => { patch({ personaPosition }) },
    setPersonaDepth: (personaDepth) => { patch({ personaDepth }) },
    setPersonaDepthRole: (personaDepthRole) => { patch({ personaDepthRole }) },
    setWorldInfoDepth: (worldInfoDepth) => { patch({ worldInfoDepth }) },
    setWorldInfoBudget: (worldInfoBudget) => { patch({ worldInfoBudget }) },
    setWorldInfoRecursive: (worldInfoRecursive) => { patch({ worldInfoRecursive }) },
    setWorldInfoCaseSensitive: (worldInfoCaseSensitive) => { patch({ worldInfoCaseSensitive }) },
    setWorldInfoMatchWholeWords: (worldInfoMatchWholeWords) => { patch({ worldInfoMatchWholeWords }) },
    setMaxContextTokens: (maxContextTokens) => { patch({ maxContextTokens }) },
  }
  return { source, actions }
}
