/**
 * Shared wire types and slot contracts for the SillyTavern surface.
 *
 * The HTTP shapes mirror the `@deepseek-ai/dsh-st-api` route table one-to-one
 * (the browser consumes JSON, so these are the wire view, not value imports of
 * the host packages — cross-plugin value imports are forbidden in client
 * bundles). The SlotMap rows here are declared by this package's
 * 'conversation' registration; other ST panel plugins register into them.
 */
import type { HostObservable, PropsRenderSlots, SlotInjectFace } from '@deepseek-ai/dsh-client-ui-slots'

// ── Wire types (mirror of the st-api JSON responses) ──────────────────────

/** ST's five Phase A API sources (mirror of `@deepseek-ai/dsh-st-api-config`). */
export type StApiSource = 'openai' | 'anthropic' | 'custom' | 'openrouter' | 'ollama'

/** OpenAI field group. */
export interface StApiSourceOpenAI {
  baseUrl?: string
  apiKeyEnv?: string
  model?: string
  streaming?: boolean
  contextSize?: number
}

/** Anthropic field group (Claude prefill supported). */
export interface StApiSourceAnthropic {
  baseUrl?: string
  apiKeyEnv?: string
  model?: string
  streaming?: boolean
  contextSize?: number
  assistantPrefill?: string
}

/** Custom (OpenAI-compatible) field group. baseUrl + model required. */
export interface StApiSourceCustom {
  baseUrl: string
  /** Registered llm provider id serving this source (e.g. an llm-pi-ai gateway route); absent uses the deployment default. */
  provider?: string
  apiKeyEnv?: string
  model: string
  streaming?: boolean
  contextSize?: number
}

/** OpenRouter field group. */
export interface StApiSourceOpenRouter {
  baseUrl?: string
  apiKeyEnv?: string
  model: string
  streaming?: boolean
  contextSize?: number
}

/** Ollama field group (no API key). */
export interface StApiSourceOllama {
  baseUrl?: string
  model: string
  streaming?: boolean
  contextSize?: number
}

/** Persisted API configuration (mirror of `api-config.json`). */
export interface StApiConfig {
  source: StApiSource
  openai?: StApiSourceOpenAI
  anthropic?: StApiSourceAnthropic
  custom?: StApiSourceCustom
  openrouter?: StApiSourceOpenRouter
  ollama?: StApiSourceOllama
}

/** One row of `POST characters/all`. */
export interface StCharacterRow {
  avatar: string
  name: string
  tags: string[]
  fav: boolean
  create_date?: string
  chat: string
  talkativeness: number
}

/** One JSONL message of a chat, ST's serialization shape. */
export interface StWireMessage {
  name: string
  is_user: boolean
  is_system?: boolean
  send_date: string
  mes: string
  extra: Record<string, unknown>
  swipes?: string[]
  swipe_id?: number
  swipe_info?: Array<Record<string, unknown>>
  [key: string]: unknown
}

/** Whole chat as served by `POST chats/get`. */
export interface StWireChat {
  header: { user_name: string; character_name: string; chat_metadata: Record<string, unknown>; create_date: string }
  messages: StWireMessage[]
}

/** One row of `POST chats/list` (ST's getChatInfo port). */
export interface StChatRow {
  file_id: string
  file_name: string
  file_size: string
  chat_items: number
  mes: string
  last_mes: string | number
}

/** One hit of `POST chats/search` (ST's searchMessage global search). */
export interface StChatSearchHit {
  chatId: string
  avatar: string
  /** Character name from the chat header. */
  characterName: string
  /** Index of the matching message in the chat. */
  messageIndex: number
  /** Text snippet around the match. */
  snippet: string
}

/** One model route row of `GET models`. */
export interface StModelRow {
  provider: string
  model: string
}

// ── Groups (wire mirror of the st-group service) ────────────────────────────

/**
 * How the next responding group member is selected.
 * Mirror of ST's `activation_strategy` numeric enum (0/1/2/3).
 */
export type StGroupActivation = 0 | 1 | 2 | 3
// 0 = Natural order (round-robin)
// 1 = List order (sequential by member list)
// 2 = Manual (user picks)
// 3 = Pooled order (random pool)

/**
 * Group generation handling mode.
 * Mirror of ST's `generation_mode` numeric enum (0/1/2).
 */
export type StGroupGenerationMode = 0 | 1 | 2
// 0 = Swap character cards
// 1 = Join character cards (exclude muted)
// 2 = Join character cards (include muted)

/** One group member configuration (mirror of ST's member shape). */
export interface StGroupMember {
  character_id: string
  enabled: boolean
  weight: number
}

/** Whole group as served by `POST groups/get` (mirror of ST's group JSON). */
export interface StGroup {
  id: string
  name: string
  members: StGroupMember[]
  avatar_url?: string
  allow_self_responses: boolean
  activation_strategy: StGroupActivation
  generation_mode: StGroupGenerationMode
  disabled_members: string[]
  fav: boolean
  chat_id?: string
  chats: string[]
  auto_mode_delay: number
  generation_mode_join_prefix: string
  generation_mode_join_suffix: string
  create_date: string
  modify_date: string
  metadata: Record<string, unknown>
}

/** `POST groups/create` request body. */
export interface StGroupInput {
  name: string
  members?: StGroupMember[]
  avatar_url?: string
  activation_strategy?: StGroupActivation
  generation_mode?: StGroupGenerationMode
  disabled_members?: string[]
  allow_self_responses?: boolean
  fav?: boolean
  chat_id?: string
  chats?: string[]
  auto_mode_delay?: number
  generation_mode_join_prefix?: string
  generation_mode_join_suffix?: string
}

// ── World Info (wire mirror of the st-lorebook service's ST shapes) ─────────

/** Secondary-key logic enum; ST's world_info_logic (0 AND_ANY, 1 NOT_ALL, 2 NOT_ANY, 3 AND_ALL). */
export type StWorldLogic = 0 | 1 | 2 | 3

/** A World Info entry — wire mirror of ST's WIEntry serialization. */
export interface StWorldEntry {
  uid: number
  key: string[]
  keysecondary: string[]
  comment: string
  content: string
  constant: boolean
  vectorized: boolean
  selective: boolean
  selectiveLogic: StWorldLogic
  addMemo: boolean
  order: number
  position: number
  disable: boolean
  ignoreBudget: boolean
  excludeRecursion: boolean
  preventRecursion: boolean
  matchPersonaDescription: boolean
  matchCharacterDescription: boolean
  matchCharacterPersonality: boolean
  matchCharacterDepthPrompt: boolean
  matchScenario: boolean
  matchCreatorNotes: boolean
  delayUntilRecursion: number
  probability: number
  useProbability: boolean
  depth: number
  outletName: string
  group: string
  groupOverride: boolean
  groupWeight: number
  scanDepth: number | null
  caseSensitive: boolean | null
  matchWholeWords: boolean | null
  useGroupScoring: boolean | null
  automationId: string
  role: number
  sticky: number | null
  cooldown: number | null
  delay: number | null
  displayIndex: number
  [key: string]: unknown
}

/** A World Info book — wire mirror of `worlds/<name>.json`. */
export interface StWorldFile {
  name?: string
  entries: Record<string, StWorldEntry>
  extensions?: Record<string, unknown>
}

/** Form fields of `POST characters/create` / `characters/edit` (ST's form shape). */
export interface StCharacterForm {
  ch_name: string
  description?: string
  personality?: string
  scenario?: string
  first_mes?: string
  mes_example?: string
  creator_notes?: string
  system_prompt?: string
  post_history_instructions?: string
  tags?: string | string[]
  creator?: string
  character_version?: string
  alternate_greetings?: string[] | string
  talkativeness?: string | number
  fav?: string | boolean
  world?: string
  depth_prompt_prompt?: string
  depth_prompt_depth?: number | string
  depth_prompt_role?: string
}

/** One row of `POST worldinfo/list` (ST's shallow WorldInfoFile row). */
export interface StWorldRow {
  file_id: string
  name: string
  extensions: Record<string, unknown>
}

/** One Data Bank similarity hit: `<doc>#<chunk>` key, cosine score, chunk text. */
export interface StBankHit {
  key: string
  score: number
  text: string
}

// ── Presets (wire mirror of the st-preset service's shapes) ────────────────

/** Generation parameter block of a preset (ST's GenerationParams). */
export interface StPresetGeneration {
  temp: number
  top_p: number
  top_k: number
  top_a: number
  min_p: number
  repetition_penalty: number
  repetition_penalty_range: number
  max_tokens: number
  min_tokens: number
  seed: number
  presence_penalty: number
  frequency_penalty: number
  stop_sequences: string[]
  stream: boolean
}

/** One prompt-manager entry in a preset's prompt_order (ST's prompts rows). */
export interface StPresetEntry {
  name: string
  enabled: boolean
  role: 'system' | 'user' | 'assistant'
  content: string
  /** Rows back from the newest history row; omitted injects per role default. */
  depth?: number
  /** ST's constant (always-inject) flag; stored for compatibility. */
  constant?: boolean
}

/** A chat-completion preset (ST's OpenAI Settings file). */
export interface StPreset {
  id: string
  name: string
  description: string
  apiSource: string
  generation: StPresetGeneration
  instruct: Record<string, unknown>
  promptOrder: { entries: StPresetEntry[] }
  mainPrompt: string
  nsfw: boolean
  jailbreakPrompt: string
  createDate: string
  modifyDate: string
  extensions: Record<string, unknown>
}

/** Input for `POST presets/create` / `presets/update`. */
export interface StPresetInput {
  name: string
  description?: string
  apiSource?: string
  generation?: Partial<StPresetGeneration>
  instruct?: Record<string, unknown>
  promptOrder?: { entries: StPresetEntry[] }
  mainPrompt?: string
  nsfw?: boolean
  jailbreakPrompt?: string
  extensions?: Record<string, unknown>
}

// ── Regex scripts (wire mirror of the st-regex service) ──────────────────────

/** ST's placement flags: 0 display (deprecated MD_DISPLAY), 1 user input, 2 AI output. */
export const ST_REGEX_PLACEMENT = { USER_INPUT: 1, DISPLAY: 0, AI_OUTPUT: 2 } as const

/** One find-replace script as ST persists it in `settings/regex.json`. */
export interface StRegexScript {
  id: string
  scriptName: string
  /** ECMAScript regex source applied globally. */
  findRegex: string
  /** Replacement text; `$1` backreferences work natively. */
  replaceString: string
  /** Substrings deleted from the replaced text. */
  trimStrings: string[]
  /** Placement flags (ST's placement array); empty falls back to the legacy booleans. */
  placement: number[]
  disabled: boolean
  /** Legacy display-only flag. */
  markdownOnly: boolean
  /** Legacy prompt-only flag. */
  promptOnly: boolean
  /** Substitute {{user}}/{{char}} in the replacement text. */
  substituteRegex: boolean
}

/** One named user persona as ST persists it in `personas/<name>.json`. */
export interface StPersonaRow {
  /** File name sans extension; also the persona's id. */
  filename: string
  /** Display name substituted for {{user}} when the persona is active. */
  name: string
  /** Persona description injected as persona_description. */
  description: string
}

/** ST instruct-mode wrapper sequences; the wire mirror of the server's template. */
export interface StInstructTemplate {
  systemSequence: string
  systemSequencePrefix: string
  systemSequenceSuffix: string
  inputSequence: string
  inputSuffix: string
  outputSequence: string
  outputSuffix: string
  firstOutputSequence: string
  firstOutputSuffix: string
  lastOutputSequence: string
  lastOutputSuffix: string
  stopSequence: string
  separatorSequence: string
  wrap: boolean
  trimSequences: boolean
}

/** One instruct template as ST persists it in `instructs/<name>.json`. */
export interface StInstructRow {
  /** File name sans extension; also the template's id. */
  filename: string
  /** Display name. */
  name: string
  /** Wrapper sequences the server serializes the prompt with when active. */
  template: StInstructTemplate
}

// ── Shared UI state ────────────────────────────────────────────────────────

/** Snapshot of the ST surface's cross-panel selections. */
export interface StUiSnapshot {
  /** Active `st.panel` dispatch key. */
  panel: string
  /** Active character avatar file name, or none selected. */
  avatar: string
  /** Active chat id (file name sans extension), or none. */
  chatId: string
  /** Persona name substituted for {{user}}. */
  userName: string
  /** Persona description injected above the character description (ST's persona_description). */
  persona: string
    /** Context-template story string driving the character block; empty uses the hardcoded layout. */
  storyString: string
  /** Active instruct template id; empty generates chat-style, ST's instruct mode off. */
  instructId: string
  /** World books active for generation, ST's world_info_selection; several at once. */
  worlds: string[]
  /** Active chat-completion preset id feeding generation overrides, or none. */
  presetId: string
  /** Active model id on its provider, or the server default. */
  model: string
  /** Persona description position (ST's persona_description_position). */
  personaPosition?: 0 | 2 | 3 | 4 | 9
  /** Persona depth value when position = 4 (In-chat @ Depth). */
  personaDepth?: number
  /** Persona depth role when position = 4 (ST's persona_depth_role). */
  personaDepthRole?: 0 | 1 | 2
  /** World Info scan depth in messages (ST's world_info_depth); absent uses the server default. */
  worldInfoDepth?: number
  /** World Info token budget as a percent of max context (ST's world_info_budget). */
  worldInfoBudget?: number
  /** Recursive World Info scanning (ST's world_info_recursive). */
  worldInfoRecursive?: boolean
  /** Case-sensitive World Info key matching (ST's world_info_case_sensitive). */
  worldInfoCaseSensitive?: boolean
  /** Whole-word World Info key matching (ST's world_info_match_whole_words). */
  worldInfoMatchWholeWords?: boolean
  /** Max context tokens for generation (ST's openai_max_context); absent defers to preset/config. */
  maxContextTokens?: number
}

/** Actions over {@link StUiSnapshot}; state moves only through these. */
export interface StUiActions {
  setPanel(panel: string): void
  setAvatar(avatar: string): void
  setChatId(chatId: string): void
  setUserName(name: string): void
  setPersona(persona: string): void
    setStoryString(storyString: string): void
      setInstructId(instructId: string): void
  /** Replace the active world-book set. */
  setWorlds(worlds: string[]): void
  setPresetId(presetId: string): void
  setModel(model: string): void
  setPersonaPosition(position: 0 | 2 | 3 | 4 | 9): void
  setPersonaDepth(depth: number): void
  setPersonaDepthRole(role: 0 | 1 | 2): void
  setWorldInfoDepth(depth: number): void
  setWorldInfoBudget(percent: number): void
  setWorldInfoRecursive(recursive: boolean): void
  setWorldInfoCaseSensitive(caseSensitive: boolean): void
  setWorldInfoMatchWholeWords(matchWholeWords: boolean): void
  setMaxContextTokens(tokens: number): void
}

/** The observable state source mounted under the `st` hooks seat. */
export type StUiSource = HostObservable<StUiSnapshot>

// ── Inject face (shell registration + st.panel slot level) ────────────────

/** The browser HTTP client over the st-api route table. */
export interface StApi {
  listCharacters(): Promise<StCharacterRow[]>
  getCharacter(avatar: string): Promise<{ avatar: string; name: string; card: { data: Record<string, unknown> } }>
  importCharacterPng(dataUrl: string): Promise<{ avatar: string }>
  /** Create a character from form fields; returns the new avatar file name. */
  createCharacter(form: StCharacterForm): Promise<{ avatar: string }>
  /** Rewrite a character card's form fields. */
  editCharacter(avatar: string, form: StCharacterForm): Promise<void>
  /** Rename a character's card (and chats directory); returns the new avatar. */
  renameCharacter(avatar: string, newName: string): Promise<{ avatar: string }>
  deleteCharacter(avatar: string): Promise<void>
  setFavourite(avatar: string, fav: boolean): Promise<void>
  /** Export a character as a PNG data URL with the embedded card. */
  exportCharacterPng(avatar: string): Promise<{ png: string }>
  avatarUrl(avatar: string): string
  /** List a character's expression-sprite names; empty when none exist. */
  listSprites(avatar: string): Promise<string[]>
  /** Image URL for one expression sprite. */
  spriteUrl(avatar: string, expression: string): string
  listChats(avatar: string): Promise<StChatRow[]>
  getChat(avatar: string, chatId: string): Promise<StWireChat>
  createChat(avatar: string, userName: string, characterName: string, firstMessage?: string): Promise<{ chatId: string }>
  saveChat(avatar: string, chatId: string, chat: StWireChat): Promise<void>
  deleteChat(avatar: string, chatId: string): Promise<void>
  /** Export a chat as raw jsonl (the `chats/export` default format). */
  exportChat(avatar: string, chatId: string): Promise<string>
  /** Export a chat as plain text (`chats/export` with format=text; system rows skipped). */
  exportChatText(avatar: string, chatId: string): Promise<string>
  importChat(avatar: string, jsonl: string): Promise<{ chatId: string }>
  /** Full-text search across all chats (ST's searchMessage global search). */
  searchChats(query: string): Promise<StChatSearchHit[]>
  /** Branch the chat (ST checkpoint): copy messages up to `upto` (inclusive; omitted copies all) into a new chat; the caller switches to it. */
  checkpointChat(avatar: string, chatId: string, upto?: number): Promise<{ chatId: string }>
  listWorlds(): Promise<StWorldRow[]>
  getWorld(name: string): Promise<StWorldFile>
  saveWorld(name: string, file: StWorldFile): Promise<void>
  deleteWorld(name: string): Promise<void>
  /** (Re)index the book's vectorized entries in the vector store (ST's Vector Storage). */
  indexWorld(name: string): Promise<{ indexed: number }>
  /** List indexed Data Bank document names (ST's Data Bank file list). */
  listBankFiles(): Promise<string[]>
  /** Chunk and index one document into the Data Bank store; returns the chunk count. */
  indexBankFile(name: string, text: string): Promise<{ chunks: number }>
  deleteBankFile(name: string): Promise<void>
  /** Similarity search over indexed Data Bank chunks. */
  searchBankFiles(query: string, options?: { threshold?: number; topK?: number }): Promise<StBankHit[]>
  listGroups(): Promise<StGroup[]>
  getGroup(id: string): Promise<StGroup>
  createGroup(input: StGroupInput): Promise<{ id: string }>
  updateGroup(id: string, input: Partial<StGroupInput>): Promise<void>
  deleteGroup(id: string): Promise<void>
  /** Resolve the next responding member's character avatar; null when the group has no enabled member. */
  nextSpeaker(id: string, lastSpeakerId?: string): Promise<string | null>
  listPresets(): Promise<StPreset[]>
  createPreset(input: StPresetInput): Promise<{ id: string }>
  updatePreset(id: string, input: Partial<StPresetInput>): Promise<void>
  deletePreset(id: string): Promise<void>
  duplicatePreset(id: string): Promise<{ id: string }>
  exportPreset(id: string): Promise<{ json: string }>
  /** Import a preset from its exported JSON; returns the stored preset id. */
  importPreset(json: string): Promise<{ id: string }>
  listRegex(): Promise<StRegexScript[]>
  /** Upsert one script (ST's saveRegex); returns the stored script with its id. */
  saveRegex(script: StRegexScript): Promise<StRegexScript>
  deleteRegex(id: string): Promise<void>
  /** Persona library (ST's `personas/` directory); the client binds the active one. */
  listPersonas(): Promise<StPersonaRow[]>
  savePersona(persona: StPersonaRow): Promise<StPersonaRow>
  deletePersona(filename: string): Promise<void>
  /** Instruct template library (ST's `instructs/` directory). */
  listInstructs(): Promise<StInstructRow[]>
  saveInstruct(instruct: StInstructRow): Promise<StInstructRow>
  deleteInstruct(filename: string): Promise<void>
  /** Read the current API configuration (source / endpoint / key / model). */
  getApiConfig(): Promise<StApiConfig>
  /** Persist a validated API configuration; throws on validation failure. */
  saveApiConfig(config: StApiConfig): Promise<void>
  /** List models available for one API source through its mapped llm provider. */
  listModelsBySource(source: StApiSource): Promise<StModelRow[]>
  /** Registered llm provider routes: the custom source's provider picker. */
  listProviders(): Promise<Array<{ id: string; name: string }>>
  listModels(): Promise<StModelRow[]>
  /** Stream one reply; deltas arrive as generated, the full text resolves. */
  generate(input: GenerateInput, onDelta: (text: string) => void, signal?: AbortSignal): Promise<string>
}

/** `POST generate` request body. */
export interface GenerateInput {
  avatar: string
  chatId: string
  /** Active world books; several at once, ST's world_info_selection. */
  world?: string | string[]
  model?: string
  /** Active chat-completion preset id; the server derives sampling overrides from it. */
  presetId?: string
  /** Recent-message cap for the model context; omitted sends all. */
  historyLimit?: number
  /** Persona name substituted for {{user}}; omitted falls back to the chat header. */
  userName?: string
  /** Persona description injected above the character description; omitted sends none. */
  persona?: string
  /** Context-template story string (ST's story_string); omitted uses the hardcoded layout. */
  storyString?: string
  /** Active instruct template id; omitted generates chat-style. */
  instructId?: string
  /** Group mode: the chat lives under a group id and `replyAs` names the speaking member. */
  group?: boolean
  /** Speaking member's character avatar in group mode. */
  replyAs?: string
  /** Trimmed history for swipe/regeneration; omitted sends the stored chat. */
  messages?: StWireMessage[]
  /** ST's send_if_empty: user nudge text inserted when the last history row is assistant. */
  sendIfEmpty?: string
  /** ST's impersonation: write the user's next message; the reply fills the input box, not the chat. */
  impersonate?: boolean
  /** ST's continue: extend the last assistant message; the nudge prompt rides after history. */
  continueGeneration?: boolean
  /** Max context tokens; the server trims oldest history to fit (ST's openai_max_context). */
  maxContextTokens?: number
  /** World Info scan depth in messages (ST's world_info_depth). */
  worldInfoDepth?: number
  /** World Info token budget as a percent of max context (ST's world_info_budget). */
  worldInfoBudget?: number
  /** Recursive World Info scanning (ST's world_info_recursive). */
  worldInfoRecursive?: boolean
  /** Case-sensitive World Info key matching (ST's world_info_case_sensitive). */
  worldInfoCaseSensitive?: boolean
  /** Whole-word World Info key matching (ST's world_info_match_whole_words). */
  worldInfoMatchWholeWords?: boolean
}

/** Registrant inject face: hooks compartment plus the API and action seats. */
export interface StFace {
  hooks: { st: StUiSource }
  api: StApi
  actions: StUiActions
}

/** Component-side view of {@link StFace}: the hooks compartment resolves to a selector hook. */
export type StFaceProps = SlotInjectFace<StFace>

/** Shell props: child render share plus the face share. */
export type StShellProps = PropsRenderSlots<'st.nav' | 'st.panel'> & StFaceProps

/** Owner share the shell passes every nav row; each row closes over its own panel key. */
export interface StNavOwnerProps {
  /** Currently dispatched panel key. */
  panel: string
  /** Switch the shell to a panel key. */
  select(panel: string): void
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /**
     * SillyTavern panel navigation rail: one row per registered panel
     * (Chat, Characters, Lorebooks, Regex, Settings). Declared by the ST shell's
     * 'conversation' registration in ui-st-chat.
     */
    'st.nav': { kind: 'list'; scope: 'root'; owner: StNavOwnerProps }
    /**
     * SillyTavern panel dispatcher: one keyed cell per panel surface. The
     * chat cell ships with the shell; Characters/Lorebooks/Settings cells
     * arrive from their own client plugins. Every entry receives the
     * slot-level {@link StFace} inject.
     */
    'st.panel': {
      kind: 'keyed'
      scope: 'root'
      inject: StFace
    }
  }
}
