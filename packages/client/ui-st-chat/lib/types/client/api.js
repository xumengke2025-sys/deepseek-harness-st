/** Route prefix; matches st-api's default `routePrefix`. */
const PREFIX = '/api/st';
async function post(path, body = {}) {
    const res = await fetch(`${PREFIX}/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`st-api ${path}: ${res.status} ${detail}`);
    }
    return await res.json();
}
async function get(path) {
    const res = await fetch(`${PREFIX}/${path}`);
    if (!res.ok)
        throw new Error(`st-api ${path}: ${res.status}`);
    return await res.json();
}
/** Read one SSE frame's `data:` payload lines joined; null when the frame carries none. */
function frameData(lines) {
    const data = lines.filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart());
    return data.length === 0 ? null : data.join('\n');
}
/** Frame event name; SSE default is `message`. */
function frameEvent(lines) {
    const event = lines.find((l) => l.startsWith('event:'));
    return event === undefined ? 'message' : event.slice(6).trim();
}
/**
 * Stream one reply from `POST generate`, dispatching each delta as it lands.
 * @param input - generation request body.
 * @param onDelta - receives each streamed text delta.
 * @returns the final full reply text (the `done` frame's payload).
 */
async function generate(input, onDelta, signal) {
    const res = await fetch(`${PREFIX}/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        ...(signal === undefined ? {} : { signal }),
    });
    if (!res.ok || res.body === null) {
        const detail = await res.text().catch(() => '');
        throw new Error(`st-api generate: ${res.status} ${detail}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let reply = '';
    for (;;) {
        const { done, value } = await reader.read();
        if (done)
            break;
        buffer += decoder.decode(value, { stream: true });
        // Frames are blank-line separated; a trailing partial frame stays buffered.
        for (;;) {
            const index = buffer.indexOf('\n\n');
            if (index < 0)
                break;
            const lines = buffer.slice(0, index).split('\n');
            buffer = buffer.slice(index + 2);
            const data = frameData(lines);
            if (data === null)
                continue;
            switch (frameEvent(lines)) {
                case 'delta':
                    onDelta(JSON.parse(data).text);
                    break;
                case 'done':
                    reply = JSON.parse(data).reply;
                    break;
                case 'error':
                    throw new Error(JSON.parse(data).message);
                default:
                    break;
            }
        }
    }
    return reply;
}
/** The shared client instance; pure functions over fetch, no plugin state. */
export const stApi = {
    listCharacters: () => post('characters/all'),
    getCharacter: (avatar) => post('characters/get', { avatar }),
    importCharacterPng: (dataUrl) => post('characters/import-png', { dataUrl }),
    createCharacter: (form) => post('characters/create', { ...form }),
    editCharacter: async (avatar, form) => { await post('characters/edit', { avatar, ...form }); },
    renameCharacter: (avatar, newName) => post('characters/rename', { avatar, newName }),
    deleteCharacter: async (avatar) => { await post('characters/delete', { avatar }); },
    setFavourite: async (avatar, fav) => { await post('characters/fav', { avatar, fav }); },
    exportCharacterPng: (avatar) => post('characters/export', { avatar }),
    avatarUrl: (avatar) => `${PREFIX}/avatar?name=${encodeURIComponent(avatar)}`,
    listSprites: (avatar) => post('characters/sprites', { avatar }),
    spriteUrl: (avatar, expression) => `${PREFIX}/sprite?avatar=${encodeURIComponent(avatar)}&expr=${encodeURIComponent(expression)}`,
    listChats: (avatar) => post('chats/list', { avatar }),
    getChat: (avatar, chatId) => post('chats/get', { avatar, chatId }),
    createChat: (avatar, userName, characterName, firstMessage) => post('chats/create', { avatar, userName, characterName, ...(firstMessage === undefined ? {} : { firstMessage }) }),
    saveChat: async (avatar, chatId, chat) => { await post('chats/save', { avatar, chatId, chat }); },
    deleteChat: async (avatar, chatId) => { await post('chats/delete', { avatar, chatId }); },
    exportChat: async (avatar, chatId) => (await post('chats/export', { avatar, chatId })).jsonl,
    exportChatText: async (avatar, chatId) => (await post('chats/export', { avatar, chatId, format: 'text' })).text,
    importChat: (avatar, jsonl) => post('chats/import', { avatar, jsonl }),
    searchChats: (query) => post('chats/search', { query }).then((r) => r.hits),
    checkpointChat: (avatar, chatId, upto) => post('chats/checkpoint', { avatar, chatId, ...(upto === undefined ? {} : { upto }) }),
    listWorlds: () => post('worldinfo/list'),
    getWorld: (name) => post('worldinfo/get', { name }),
    saveWorld: async (name, file) => { await post('worldinfo/save', { name, file }); },
    deleteWorld: async (name) => { await post('worldinfo/delete', { name }); },
    indexWorld: (name) => post('vector/index-world', { name }),
    listBankFiles: async () => (await post('vector/file/list')).files,
    indexBankFile: (name, text) => post('vector/file/index', { name, text }),
    deleteBankFile: async (name) => { await post('vector/file/delete', { name }); },
    searchBankFiles: (query, options) => post('vector/file/search', { query, ...(options === undefined ? {} : { ...options }) }),
    listGroups: () => post('groups/list'),
    getGroup: (id) => post('groups/get', { id }),
    createGroup: (input) => post('groups/create', { ...input }),
    updateGroup: async (id, input) => { await post('groups/update', { id, input: { ...input } }); },
    deleteGroup: async (id) => { await post('groups/delete', { id }); },
    nextSpeaker: async (id, lastSpeakerId) => (await post('groups/next-speaker', { id, ...(lastSpeakerId === undefined ? {} : { lastSpeakerId }) })).character_id,
    listPresets: () => post('presets/list'),
    createPreset: (input) => post('presets/create', { ...input }),
    updatePreset: async (id, input) => { await post('presets/update', { id, input: { ...input } }); },
    deletePreset: async (id) => { await post('presets/delete', { id }); },
    duplicatePreset: (id) => post('presets/duplicate', { id }),
    exportPreset: (id) => post('presets/export', { id }),
    importPreset: (json) => post('presets/import', { json }),
    listRegex: () => post('regex/list'),
    saveRegex: (script) => post('regex/save', { script }),
    deleteRegex: async (id) => { await post('regex/delete', { id }); },
    listPersonas: () => post('personas/list'),
    savePersona: (persona) => post('personas/save', { persona }),
    deletePersona: async (filename) => { await post('personas/delete', { filename }); },
    listInstructs: () => post('instructs/list'),
    saveInstruct: (instruct) => post('instructs/save', { instruct }),
    deleteInstruct: async (filename) => { await post('instructs/delete', { filename }); },
    getApiConfig: () => post('api-config/get'),
    saveApiConfig: async (config) => { await post('api-config/save', { config }); },
    listModelsBySource: (source) => post('api-config/models', { source }),
    listProviders: () => post('api-config/providers'),
    listModels: () => get('models'),
    generate,
};
//# sourceMappingURL=api.js.map