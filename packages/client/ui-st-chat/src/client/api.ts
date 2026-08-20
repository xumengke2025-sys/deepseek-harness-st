/**
 * Browser HTTP client over the st-api route table (`/api/st/...`), same-origin
 * with the host webServer. Route names and body shapes mirror the server's
 * route table; SSE generation is parsed from the raw stream.
 */
import type { GenerateInput, StApi, StApiConfig, StBankHit, StChatRow, StChatSearchHit, StCharacterForm, StCharacterRow, StGroup, StInstructRow, StModelRow, StPersonaRow, StPreset, StPresetInput, StRegexScript, StWireChat, StWorldFile, StWorldRow } from './contract.ts'

/** Route prefix; matches st-api's default `routePrefix`. */
const PREFIX = '/api/st'

async function post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${PREFIX}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`st-api ${path}: ${res.status} ${detail}`)
  }
  return await res.json() as T
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${PREFIX}/${path}`)
  if (!res.ok) throw new Error(`st-api ${path}: ${res.status}`)
  return await res.json() as T
}

/** Read one SSE frame's `data:` payload lines joined; null when the frame carries none. */
function frameData(lines: string[]): string | null {
  const data = lines.filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart())
  return data.length === 0 ? null : data.join('\n')
}

/** Frame event name; SSE default is `message`. */
function frameEvent(lines: string[]): string {
  const event = lines.find((l) => l.startsWith('event:'))
  return event === undefined ? 'message' : event.slice(6).trim()
}

/**
 * Stream one reply from `POST generate`, dispatching each delta as it lands.
 * @param input - generation request body.
 * @param onDelta - receives each streamed text delta.
 * @returns the final full reply text (the `done` frame's payload).
 */
async function generate(input: GenerateInput, onDelta: (text: string) => void, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${PREFIX}/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
    ...(signal === undefined ? {} : { signal }),
  })
  if (!res.ok || res.body === null) {
    const detail = await res.text().catch(() => '')
    throw new Error(`st-api generate: ${res.status} ${detail}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let reply = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // Frames are blank-line separated; a trailing partial frame stays buffered.
    for (;;) {
      const index = buffer.indexOf('\n\n')
      if (index < 0) break
      const lines = buffer.slice(0, index).split('\n')
      buffer = buffer.slice(index + 2)
      const data = frameData(lines)
      if (data === null) continue
      switch (frameEvent(lines)) {
        case 'delta':
          onDelta((JSON.parse(data) as { text: string }).text)
          break
        case 'done':
          reply = (JSON.parse(data) as { reply: string }).reply
          break
        case 'error':
          throw new Error((JSON.parse(data) as { message: string }).message)
        default:
          break
      }
    }
  }
  return reply
}

/** The shared client instance; pure functions over fetch, no plugin state. */
export const stApi: StApi = {
  listCharacters: () => post<StCharacterRow[]>('characters/all'),
  getCharacter: (avatar) => post('characters/get', { avatar }),
  importCharacterPng: (dataUrl) => post('characters/import-png', { dataUrl }),
  createCharacter: (form: StCharacterForm) => post('characters/create', { ...form } as Record<string, unknown>),
  editCharacter: async (avatar, form) => { await post('characters/edit', { avatar, ...form } as Record<string, unknown>) },
  renameCharacter: (avatar, newName) => post('characters/rename', { avatar, newName }),
  deleteCharacter: async (avatar) => { await post('characters/delete', { avatar }) },
  setFavourite: async (avatar, fav) => { await post('characters/fav', { avatar, fav }) },
  exportCharacterPng: (avatar) => post<{ png: string }>('characters/export', { avatar }),
  avatarUrl: (avatar) => `${PREFIX}/avatar?name=${encodeURIComponent(avatar)}`,
  listSprites: (avatar) => post<string[]>('characters/sprites', { avatar }),
  spriteUrl: (avatar, expression) =>
    `${PREFIX}/sprite?avatar=${encodeURIComponent(avatar)}&expr=${encodeURIComponent(expression)}`,
  listChats: (avatar) => post<StChatRow[]>('chats/list', { avatar }),
  getChat: (avatar, chatId) => post<StWireChat>('chats/get', { avatar, chatId }),
  createChat: (avatar, userName, characterName, firstMessage) =>
    post<{ chatId: string }>('chats/create', { avatar, userName, characterName, ...(firstMessage === undefined ? {} : { firstMessage }) }),
  saveChat: async (avatar, chatId, chat) => { await post('chats/save', { avatar, chatId, chat }) },
  deleteChat: async (avatar, chatId) => { await post('chats/delete', { avatar, chatId }) },
  exportChat: async (avatar, chatId) => (await post<{ jsonl: string }>('chats/export', { avatar, chatId })).jsonl,
  exportChatText: async (avatar, chatId) => (await post<{ text: string }>('chats/export', { avatar, chatId, format: 'text' })).text,
  importChat: (avatar, jsonl) => post<{ chatId: string }>('chats/import', { avatar, jsonl }),
  searchChats: (query) => post<{ hits: StChatSearchHit[] }>('chats/search', { query }).then((r) => r.hits),
  checkpointChat: (avatar, chatId, upto) => post<{ chatId: string }>('chats/checkpoint', { avatar, chatId, ...(upto === undefined ? {} : { upto }) }),
  listWorlds: () => post<StWorldRow[]>('worldinfo/list'),
  getWorld: (name) => post<StWorldFile>('worldinfo/get', { name }),
  saveWorld: async (name, file) => { await post('worldinfo/save', { name, file }) },
  deleteWorld: async (name) => { await post('worldinfo/delete', { name }) },
  indexWorld: (name) => post<{ indexed: number }>('vector/index-world', { name }),
  listBankFiles: async () => (await post<{ files: string[] }>('vector/file/list')).files,
  indexBankFile: (name, text) => post<{ chunks: number }>('vector/file/index', { name, text }),
  deleteBankFile: async (name) => { await post('vector/file/delete', { name }) },
  searchBankFiles: (query, options) =>
    post<StBankHit[]>('vector/file/search', { query, ...(options === undefined ? {} : { ...options }) }),
  listGroups: () => post<StGroup[]>('groups/list'),
  getGroup: (id) => post('groups/get', { id }),
  createGroup: (input) => post<{ id: string }>('groups/create', { ...input } as Record<string, unknown>),
  updateGroup: async (id, input) => { await post('groups/update', { id, input: { ...input } as Record<string, unknown> }) },
  deleteGroup: async (id) => { await post('groups/delete', { id }) },
  nextSpeaker: async (id, lastSpeakerId) =>
    (await post<{ character_id: string | null }>('groups/next-speaker', { id, ...(lastSpeakerId === undefined ? {} : { lastSpeakerId }) })).character_id,
  listPresets: () => post<StPreset[]>('presets/list'),
  createPreset: (input: StPresetInput) => post<{ id: string }>('presets/create', { ...input } as Record<string, unknown>),
  updatePreset: async (id, input) => { await post('presets/update', { id, input: { ...input } as Record<string, unknown> }) },
  deletePreset: async (id) => { await post('presets/delete', { id }) },
  duplicatePreset: (id) => post<{ id: string }>('presets/duplicate', { id }),
  exportPreset: (id) => post<{ json: string }>('presets/export', { id }),
  importPreset: (json) => post<{ id: string }>('presets/import', { json }),
  listRegex: () => post<StRegexScript[]>('regex/list'),
  saveRegex: (script) => post<StRegexScript>('regex/save', { script }),
  deleteRegex: async (id) => { await post('regex/delete', { id }) },
  listPersonas: () => post<StPersonaRow[]>('personas/list'),
  savePersona: (persona) => post<StPersonaRow>('personas/save', { persona }),
  deletePersona: async (filename) => { await post('personas/delete', { filename }) },
  listInstructs: () => post<StInstructRow[]>('instructs/list'),
  saveInstruct: (instruct) => post<StInstructRow>('instructs/save', { instruct }),
  deleteInstruct: async (filename) => { await post('instructs/delete', { filename }) },
  getApiConfig: () => post<StApiConfig>('api-config/get'),
  saveApiConfig: async (config) => { await post('api-config/save', { config }) },
  listModelsBySource: (source) => post<StModelRow[]>('api-config/models', { source }),
  listProviders: () => post<Array<{ id: string; name: string }>>('api-config/providers'),
  listModels: () => get<StModelRow[]>('models'),
  generate,
}
