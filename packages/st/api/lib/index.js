import { bookFromCharacterBook, scanWorldInfo } from "@deepseek-ai/dsh-st-lorebook";
import { applyRegexScripts } from "@deepseek-ai/dsh-st-regex";
import { API_SOURCES, validateApiConfig } from "@deepseek-ai/dsh-st-api-config";
import { DEFAULT_CONTINUE_NUDGE_PROMPT, DEFAULT_IMPERSONATION_PROMPT } from "@deepseek-ai/dsh-st-generate";
//#region lib/types/index.js
const name = "st-api";
const inject = [
	"webServer",
	"llm",
	"stCharacter",
	"stChat",
	"stGroup",
	"stInstruct",
	"stLorebook",
	"stPersona",
	"stRegex",
	"stPreset",
	"stGenerate",
	"stVector",
	"stApiConfig"
];
/** Read and parse one JSON request body. */
function readJson(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (c) => chunks.push(c));
		req.on("end", () => {
			try {
				const text = Buffer.concat(chunks).toString("utf8");
				resolve(text.length === 0 ? {} : JSON.parse(text));
			} catch (error) {
				reject(error);
			}
		});
		req.on("error", reject);
	});
}
/** Send a JSON response. */
function sendJson(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"content-length": Buffer.byteLength(payload),
		"cache-control": "no-store"
	});
	res.end(payload);
}
/** Optional vector-search fields: only pass through present numbers. */
function searchOptions(body) {
	const opts = {};
	if (typeof body.threshold === "number") opts.threshold = body.threshold;
	if (typeof body.topK === "number") opts.topK = body.topK;
	return opts;
}
/** Cross-scan WI sticky/cooldown tracking, keyed `<world>#<uid>`; cooldown counts from deactivation. */
const wiTimedState = /* @__PURE__ */ new Map();
/** Config captured at apply time; the generate route reads deployment defaults from it. */
let activeConfig;
/** Every ST endpoint; keyed `<METHOD> <subpath>` with subpath relative to the prefix. */
const routes = {
	"POST characters/all": async (ctx, _req, res) => {
		sendJson(res, 200, await ctx.stCharacter.list());
	},
	"POST characters/get": async (ctx, req, res) => {
		const body = await readJson(req);
		const avatar = String(body.avatar ?? "");
		const full = await ctx.stCharacter.get(avatar);
		full === void 0 ? sendJson(res, 404, { error: "not found" }) : sendJson(res, 200, full);
	},
	"POST characters/create": async (ctx, req, res) => {
		sendJson(res, 200, { avatar: await ctx.stCharacter.create(await readJson(req)) });
	},
	"POST characters/import-png": async (ctx, req, res) => {
		const body = await readJson(req);
		const dataUrl = String(body.dataUrl ?? "");
		try {
			sendJson(res, 200, { avatar: await ctx.stCharacter.importPng(dataUrl) });
		} catch (error) {
			sendJson(res, 400, { error: error.message });
		}
	},
	"POST characters/edit": async (ctx, req, res) => {
		const body = await readJson(req);
		await ctx.stCharacter.edit(String(body.avatar ?? ""), body);
		sendJson(res, 200, { ok: true });
	},
	"POST characters/rename": async (ctx, req, res) => {
		const body = await readJson(req);
		sendJson(res, 200, { avatar: await ctx.stCharacter.rename(String(body.avatar ?? ""), String(body.newName ?? "")) });
	},
	"POST characters/delete": async (ctx, req, res) => {
		const body = await readJson(req);
		await ctx.stCharacter.delete(String(body.avatar ?? ""));
		sendJson(res, 200, { ok: true });
	},
	"POST characters/fav": async (ctx, req, res) => {
		const body = await readJson(req);
		await ctx.stCharacter.setFavourite(String(body.avatar ?? ""), body.fav === true);
		sendJson(res, 200, { ok: true });
	},
	"POST characters/export": async (ctx, req, res) => {
		const body = await readJson(req);
		const avatar = String(body.avatar ?? "");
		await ctx.stCharacter.get(avatar) === void 0 ? sendJson(res, 404, { error: "not found" }) : sendJson(res, 200, { png: await ctx.stCharacter.exportPng(avatar) });
	},
	"GET avatar": async (ctx, _req, res, params) => {
		const avatar = params.get("name") ?? "";
		const bytes = await ctx.stCharacter.avatarBytes(avatar);
		bytes === void 0 ? sendJson(res, 404, { error: "not found" }) : (res.writeHead(200, {
			"content-type": "image/png",
			"cache-control": "no-store"
		}), res.end(bytes));
	},
	"POST characters/sprites": async (ctx, req, res) => {
		const body = await readJson(req);
		sendJson(res, 200, await ctx.stCharacter.listSprites(String(body.avatar ?? "")));
	},
	"GET sprite": async (ctx, _req, res, params) => {
		const bytes = await ctx.stCharacter.spriteBytes(params.get("avatar") ?? "", params.get("expr") ?? "");
		bytes === void 0 ? sendJson(res, 404, { error: "not found" }) : (res.writeHead(200, {
			"content-type": "image/png",
			"cache-control": "no-store"
		}), res.end(bytes));
	},
	"POST chats/list": async (ctx, req, res) => {
		const body = await readJson(req);
		sendJson(res, 200, await ctx.stChat.list(String(body.avatar ?? "")));
	},
	"POST chats/get": async (ctx, req, res) => {
		const body = await readJson(req);
		const chat = await ctx.stChat.get(String(body.avatar ?? ""), String(body.chatId ?? ""));
		chat === void 0 ? sendJson(res, 404, { error: "not found" }) : sendJson(res, 200, chat);
	},
	"POST chats/create": async (ctx, req, res) => {
		const body = await readJson(req);
		sendJson(res, 200, { chatId: await ctx.stChat.create(String(body.avatar ?? ""), String(body.userName ?? "User"), String(body.characterName ?? ""), typeof body.firstMessage === "string" ? body.firstMessage : void 0) });
	},
	"POST chats/search": async (ctx, req, res) => {
		const body = await readJson(req);
		const query = String(body.query ?? "");
		if (query.length === 0) {
			sendJson(res, 400, { error: "query is required" });
			return;
		}
		sendJson(res, 200, { hits: await ctx.stChat.search(query) });
	},
	"POST chats/save": async (ctx, req, res) => {
		const body = await readJson(req);
		await ctx.stChat.save(String(body.avatar ?? ""), String(body.chatId ?? ""), body.chat);
		sendJson(res, 200, { ok: true });
	},
	"POST chats/delete": async (ctx, req, res) => {
		const body = await readJson(req);
		await ctx.stChat.delete(String(body.avatar ?? ""), String(body.chatId ?? ""));
		sendJson(res, 200, { ok: true });
	},
	"POST chats/export": async (ctx, req, res) => {
		const body = await readJson(req);
		const jsonl = await ctx.stChat.exportChat(String(body.avatar ?? ""), String(body.chatId ?? ""));
		if (jsonl === void 0) {
			sendJson(res, 404, { error: "not found" });
			return;
		}
		if (body.format === "text") {
			sendJson(res, 200, { text: jsonl.split("\n").filter((l) => l.trim().length > 0).slice(1).map((line) => {
				try {
					return JSON.parse(line);
				} catch {
					return null;
				}
			}).filter((m) => m !== null).filter((m) => !m.is_system).map((m) => `${String(m.name ?? "Unknown")}: ${String(m.mes ?? "")}`).join("\n\n") });
			return;
		}
		sendJson(res, 200, { jsonl });
	},
	"POST chats/import": async (ctx, req, res) => {
		const body = await readJson(req);
		sendJson(res, 200, { chatId: await ctx.stChat.importChat(String(body.avatar ?? ""), String(body.jsonl ?? "")) });
	},
	"POST chats/checkpoint": async (ctx, req, res) => {
		const body = await readJson(req);
		const upto = body.upto === void 0 ? void 0 : typeof body.upto === "number" && Number.isInteger(body.upto) && body.upto >= 0 ? body.upto : -1;
		const chat = await ctx.stChat.get(String(body.avatar ?? ""), String(body.chatId ?? ""));
		if (chat === void 0) {
			sendJson(res, 404, { error: "chat not found" });
			return;
		}
		if (upto === -1 || upto !== void 0 && upto >= chat.messages.length) {
			sendJson(res, 400, { error: "upto must be a non-negative integer index into the chat messages" });
			return;
		}
		sendJson(res, 200, { chatId: await ctx.stChat.checkpoint(String(body.avatar ?? ""), String(body.chatId ?? ""), upto) });
	},
	"POST groups/list": async (ctx, _req, res) => {
		sendJson(res, 200, await ctx.stGroup.list());
	},
	"POST groups/get": async (ctx, req, res) => {
		const body = await readJson(req);
		const group = await ctx.stGroup.get(String(body.id ?? ""));
		group === void 0 ? sendJson(res, 404, { error: "not found" }) : sendJson(res, 200, group);
	},
	"POST groups/create": async (ctx, req, res) => {
		const body = await readJson(req);
		if (typeof body.name !== "string" || body.name.length === 0) {
			sendJson(res, 400, { error: "name is required" });
			return;
		}
		const members = Array.isArray(body.members) ? body.members : void 0;
		const input = {
			name: body.name,
			...members === void 0 ? {} : { members }
		};
		sendJson(res, 200, { id: await ctx.stGroup.create(input) });
	},
	"POST groups/update": async (ctx, req, res) => {
		const body = await readJson(req);
		const input = body.input;
		if (input === void 0 || typeof input !== "object") {
			sendJson(res, 400, { error: "input (the group fields object) is required" });
			return;
		}
		await ctx.stGroup.update(String(body.id ?? ""), input);
		sendJson(res, 200, { ok: true });
	},
	"POST groups/delete": async (ctx, req, res) => {
		const body = await readJson(req);
		await ctx.stGroup.delete(String(body.id ?? ""));
		sendJson(res, 200, { ok: true });
	},
	"POST groups/next-speaker": async (ctx, req, res) => {
		const body = await readJson(req);
		const lastSpeakerId = typeof body.lastSpeakerId === "string" ? body.lastSpeakerId : void 0;
		let chatMessages;
		if (typeof body.avatar === "string" && typeof body.chatId === "string") {
			const chat = await ctx.stChat.get(body.avatar, body.chatId);
			if (chat !== void 0) chatMessages = chat.messages.map((m) => ({
				name: m.name,
				is_user: m.is_user
			}));
		}
		sendJson(res, 200, { character_id: await ctx.stGroup.selectNextSpeaker(String(body.id ?? ""), lastSpeakerId, chatMessages) ?? null });
	},
	"POST worldinfo/list": async (ctx, _req, res) => {
		sendJson(res, 200, await ctx.stLorebook.list());
	},
	"POST worldinfo/get": async (ctx, req, res) => {
		const body = await readJson(req);
		sendJson(res, 200, await ctx.stLorebook.getOrDummy(String(body.name ?? "")));
	},
	"POST worldinfo/save": async (ctx, req, res) => {
		const body = await readJson(req);
		if (body.file === void 0 || body.file === null || typeof body.file !== "object") {
			sendJson(res, 400, { error: "file (the World Info book object) is required" });
			return;
		}
		await ctx.stLorebook.save(String(body.name ?? ""), body.file);
		sendJson(res, 200, { ok: true });
	},
	"POST worldinfo/delete": async (ctx, req, res) => {
		const body = await readJson(req);
		await ctx.stLorebook.delete(String(body.name ?? ""));
		sendJson(res, 200, { ok: true });
	},
	"POST vector/index-world": async (ctx, req, res) => {
		const body = await readJson(req);
		const name = String(body.name ?? "");
		const file = await ctx.stLorebook.getOrDummy(name);
		sendJson(res, 200, { indexed: await ctx.stVector.indexWorld(name, file) });
	},
	"POST vector/forget-world": async (ctx, req, res) => {
		const body = await readJson(req);
		await ctx.stVector.forgetWorld(String(body.name ?? ""));
		sendJson(res, 200, { ok: true });
	},
	"POST vector/search": async (ctx, req, res) => {
		const body = await readJson(req);
		const query = String(body.query ?? "");
		if (query.length === 0) {
			sendJson(res, 400, { error: "query is required" });
			return;
		}
		sendJson(res, 200, await ctx.stVector.searchWorld(query, searchOptions(body)));
	},
	"POST vector/file/list": async (ctx, _req, res) => {
		sendJson(res, 200, { files: await ctx.stVector.listFiles() });
	},
	"POST vector/file/index": async (ctx, req, res) => {
		const body = await readJson(req);
		const name = String(body.name ?? "");
		const text = typeof body.text === "string" ? body.text : "";
		if (name.length === 0 || text.trim().length === 0) {
			sendJson(res, 400, { error: "name and text are required" });
			return;
		}
		sendJson(res, 200, { chunks: await ctx.stVector.indexFile(name, text) });
	},
	"POST vector/file/delete": async (ctx, req, res) => {
		const body = await readJson(req);
		await ctx.stVector.forgetFile(String(body.name ?? ""));
		sendJson(res, 200, { ok: true });
	},
	"POST vector/file/search": async (ctx, req, res) => {
		const body = await readJson(req);
		const query = String(body.query ?? "");
		if (query.length === 0) {
			sendJson(res, 400, { error: "query is required" });
			return;
		}
		sendJson(res, 200, await ctx.stVector.searchFiles(query, searchOptions(body)));
	},
	"POST regex/list": async (ctx, _req, res) => {
		sendJson(res, 200, await ctx.stRegex.list());
	},
	"POST regex/save": async (ctx, req, res) => {
		const script = (await readJson(req)).script;
		if (script === void 0 || typeof script !== "object" || typeof script.findRegex !== "string") {
			sendJson(res, 400, { error: "script (the regex script object) with findRegex is required" });
			return;
		}
		const scripts = await ctx.stRegex.list();
		const id = typeof script.id === "string" && script.id.length > 0 ? script.id : String(scripts.length + 1);
		const next = {
			...script,
			id
		};
		const at = scripts.findIndex((s) => s.id === id);
		if (at >= 0) scripts.splice(at, 1, next);
		else scripts.push(next);
		await ctx.stRegex.save(scripts);
		sendJson(res, 200, next);
	},
	"POST regex/delete": async (ctx, req, res) => {
		const body = await readJson(req);
		const id = String(body.id ?? "");
		const scripts = await ctx.stRegex.list();
		const next = scripts.filter((s) => s.id !== id);
		if (next.length === scripts.length) {
			sendJson(res, 404, { error: "not found" });
			return;
		}
		await ctx.stRegex.save(next);
		sendJson(res, 200, { ok: true });
	},
	"POST personas/list": async (ctx, _req, res) => {
		sendJson(res, 200, await ctx.stPersona.list());
	},
	"POST personas/save": async (ctx, req, res) => {
		const persona = (await readJson(req)).persona;
		if (persona === void 0 || typeof persona !== "object" || typeof persona.filename !== "string" || persona.filename.length === 0 || typeof persona.name !== "string") {
			sendJson(res, 400, { error: "persona (with filename and name) is required" });
			return;
		}
		try {
			sendJson(res, 200, await ctx.stPersona.save({
				filename: persona.filename,
				name: persona.name,
				description: typeof persona.description === "string" ? persona.description : ""
			}));
		} catch (error) {
			sendJson(res, 400, { error: error.message });
		}
	},
	"POST personas/delete": async (ctx, req, res) => {
		const body = await readJson(req);
		try {
			await ctx.stPersona.delete(String(body.filename ?? ""));
			sendJson(res, 200, { ok: true });
		} catch (error) {
			sendJson(res, 404, { error: error.message });
		}
	},
	"POST instructs/list": async (ctx, _req, res) => {
		sendJson(res, 200, await ctx.stInstruct.list());
	},
	"POST instructs/save": async (ctx, req, res) => {
		const instruct = (await readJson(req)).instruct;
		if (instruct === void 0 || typeof instruct !== "object" || typeof instruct.filename !== "string" || instruct.filename.length === 0 || typeof instruct.name !== "string" || instruct.template === void 0 || typeof instruct.template !== "object") {
			sendJson(res, 400, { error: "instruct (with filename, name, and template) is required" });
			return;
		}
		try {
			sendJson(res, 200, await ctx.stInstruct.save(instruct));
		} catch (error) {
			sendJson(res, 400, { error: error.message });
		}
	},
	"POST instructs/delete": async (ctx, req, res) => {
		const body = await readJson(req);
		try {
			await ctx.stInstruct.delete(String(body.filename ?? ""));
			sendJson(res, 200, { ok: true });
		} catch (error) {
			sendJson(res, 404, { error: error.message });
		}
	},
	"GET models": async (ctx, _req, res) => {
		sendJson(res, 200, await ctx.stGenerate.availableModels());
	},
	"POST api-config/get": async (ctx, _req, res) => {
		sendJson(res, 200, await ctx.stApiConfig.get());
	},
	"POST api-config/save": async (ctx, req, res) => {
		const config = (await readJson(req)).config;
		await ctx.stApiConfig.save(validateApiConfig(config));
		sendJson(res, 200, { ok: true });
	},
	"POST api-config/models": async (ctx, req, res) => {
		const body = await readJson(req);
		const source = String(body.source ?? "");
		if (!API_SOURCES.includes(source)) {
			sendJson(res, 400, { error: `api-config.source: must be one of ${API_SOURCES.join(", ")}` });
			return;
		}
		sendJson(res, 200, await ctx.stApiConfig.listModels(source));
	},
	"POST api-config/providers": async (ctx, _req, res) => {
		sendJson(res, 200, ctx.llm.listProviders().map((p) => ({
			id: p.id,
			name: p.name
		})));
	},
	"POST presets/list": async (ctx, _req, res) => {
		sendJson(res, 200, await ctx.stPreset.list());
	},
	"POST presets/get": async (ctx, req, res) => {
		const body = await readJson(req);
		const preset = await ctx.stPreset.get(String(body.id ?? ""));
		preset === void 0 ? sendJson(res, 404, { error: "not found" }) : sendJson(res, 200, preset);
	},
	"POST presets/create": async (ctx, req, res) => {
		const body = await readJson(req);
		sendJson(res, 200, { id: await ctx.stPreset.create(body) });
	},
	"POST presets/update": async (ctx, req, res) => {
		const body = await readJson(req);
		const input = body.input;
		if (input === void 0 || typeof input !== "object") {
			sendJson(res, 400, { error: "input (the preset fields object) is required" });
			return;
		}
		await ctx.stPreset.update(String(body.id ?? ""), input);
		sendJson(res, 200, { ok: true });
	},
	"POST presets/delete": async (ctx, req, res) => {
		const body = await readJson(req);
		await ctx.stPreset.delete(String(body.id ?? ""));
		sendJson(res, 200, { ok: true });
	},
	"POST presets/duplicate": async (ctx, req, res) => {
		const body = await readJson(req);
		sendJson(res, 200, { id: await ctx.stPreset.duplicate(String(body.id ?? "")) });
	},
	"POST presets/import": async (ctx, req, res) => {
		const body = await readJson(req);
		sendJson(res, 200, { id: await ctx.stPreset.importJson(String(body.json ?? "")) });
	},
	"POST presets/export": async (ctx, req, res) => {
		const body = await readJson(req);
		sendJson(res, 200, { json: await ctx.stPreset.exportJson(String(body.id ?? "")) });
	},
	"POST generate": async (ctx, req, res) => {
		const body = await readJson(req);
		const avatar = String(body.avatar ?? "");
		const chatId = String(body.chatId ?? "");
		const worldNames = Array.isArray(body.world) ? body.world.map(String).filter((w) => w.length > 0) : typeof body.world === "string" && body.world.length > 0 ? [body.world] : [];
		const model = typeof body.model === "string" ? body.model : void 0;
		const historyLimit = typeof body.historyLimit === "number" && body.historyLimit > 0 ? Math.floor(body.historyLimit) : void 0;
		const userNameOverride = typeof body.userName === "string" && body.userName.length > 0 ? body.userName : void 0;
		const personaDescription = typeof body.persona === "string" && body.persona.length > 0 ? body.persona : void 0;
		const contextTemplate = typeof body.storyString === "string" && body.storyString.length > 0 ? { storyString: body.storyString } : void 0;
		let instructTemplate;
		if (typeof body.instructId === "string" && body.instructId.length > 0) {
			const found = (await ctx.stInstruct.list()).find((t) => t.filename === body.instructId);
			if (found === void 0) {
				sendJson(res, 404, { error: "instruct not found" });
				return;
			}
			instructTemplate = found.template;
		}
		const override = Array.isArray(body.messages) ? body.messages : void 0;
		let sendIfEmpty = typeof body.sendIfEmpty === "string" && body.sendIfEmpty.length > 0 ? body.sendIfEmpty : void 0;
		let impersonationPrompt;
		if (body.impersonate === true) impersonationPrompt = typeof body.impersonationPrompt === "string" && body.impersonationPrompt.length > 0 ? body.impersonationPrompt : void 0;
		let continueNudgePrompt;
		if (body.continueGeneration === true) continueNudgePrompt = typeof body.continueNudgePrompt === "string" && body.continueNudgePrompt.length > 0 ? body.continueNudgePrompt : void 0;
		const replyAs = typeof body.replyAs === "string" && body.replyAs.length > 0 ? body.replyAs : void 0;
		let cardAvatar = avatar;
		let groupContext;
		if (body.group === true) {
			const group = await ctx.stGroup.get(avatar);
			if (group === void 0) {
				sendJson(res, 404, { error: "group not found" });
				return;
			}
			const member = replyAs !== void 0 ? group.members.find((m) => m.character_id === replyAs) : void 0;
			if (member === void 0 || !member.enabled) {
				sendJson(res, 400, { error: "replyAs must name an enabled member of the group" });
				return;
			}
			cardAvatar = member.character_id;
			const others = [];
			const otherNames = [];
			for (const other of group.members.filter((m) => m.enabled && m.character_id !== member.character_id)) {
				const card = await ctx.stCharacter.get(other.character_id);
				if (card === void 0) continue;
				otherNames.push(card.name);
				const intro = card.card.data.description.trim();
				others.push(intro.length > 0 ? `${card.name}: ${intro.slice(0, 200)}` : card.name);
			}
			groupContext = [
				`[This is a group conversation between {{char}}, ${otherNames.join(", ")}, and the user.`,
				"Write only {{char}}'s next reply; never speak for the other members or the user.",
				"Other members:",
				...others,
				"]"
			].join("\n");
		}
		const full = await ctx.stCharacter.get(cardAvatar);
		const chat = await ctx.stChat.get(avatar, chatId);
		if (!full || !chat) {
			sendJson(res, 404, { error: "character or chat not found" });
			return;
		}
		let temperature;
		let maxTokens;
		let topP;
		let topK;
		let minP;
		let frequencyPenalty;
		let presencePenalty;
		let repetitionPenalty;
		let seed;
		let stopSequences;
		let systemPromptOverride;
		let postHistoryOverride;
		let promptEntries;
		if (typeof body.presetId === "string" && body.presetId.length > 0) {
			const preset = await ctx.stPreset.get(body.presetId);
			if (preset === void 0) {
				sendJson(res, 404, { error: "preset not found" });
				return;
			}
			if (preset.generation.temp > 0) temperature = preset.generation.temp;
			if (preset.generation.max_tokens > 0) maxTokens = preset.generation.max_tokens;
			if (preset.generation.top_p > 0) topP = preset.generation.top_p;
			if (preset.generation.top_k > 0) topK = preset.generation.top_k;
			if (preset.generation.min_p > 0) minP = preset.generation.min_p;
			if (preset.generation.frequency_penalty !== 0) frequencyPenalty = preset.generation.frequency_penalty;
			if (preset.generation.presence_penalty !== 0) presencePenalty = preset.generation.presence_penalty;
			if (preset.generation.repetition_penalty !== 1) repetitionPenalty = preset.generation.repetition_penalty;
			if (preset.generation.seed !== 0) seed = preset.generation.seed;
			if (preset.generation.stop_sequences.length > 0) stopSequences = preset.generation.stop_sequences;
			systemPromptOverride = preset.mainPrompt.length > 0 ? preset.mainPrompt : void 0;
			postHistoryOverride = preset.jailbreakPrompt.length > 0 ? preset.jailbreakPrompt : void 0;
			const enabled = preset.promptOrder.entries.filter((e) => e.enabled && e.content.trim().length > 0);
			if (enabled.length > 0) promptEntries = enabled.map((e) => ({
				name: e.name,
				role: e.role,
				content: e.content,
				...e.depth === void 0 ? {} : { depth: e.depth }
			}));
			if (sendIfEmpty === void 0) {
				const ext = preset.extensions;
				if (typeof ext?.send_if_empty === "string" && ext.send_if_empty.length > 0) sendIfEmpty = ext.send_if_empty;
			}
			const ext = preset.extensions;
			if (impersonationPrompt === void 0 && typeof ext?.impersonation_prompt === "string" && ext.impersonation_prompt.length > 0) impersonationPrompt = ext.impersonation_prompt;
			if (continueNudgePrompt === void 0 && typeof ext?.continue_nudge_prompt === "string" && ext.continue_nudge_prompt.length > 0) continueNudgePrompt = ext.continue_nudge_prompt;
		}
		if (body.impersonate === true && impersonationPrompt === void 0) impersonationPrompt = DEFAULT_IMPERSONATION_PROMPT;
		if (body.continueGeneration === true && continueNudgePrompt === void 0) continueNudgePrompt = DEFAULT_CONTINUE_NUDGE_PROMPT;
		let maxContextTokens = typeof body.maxContextTokens === "number" && body.maxContextTokens > 0 ? Math.floor(body.maxContextTokens) : void 0;
		if (maxContextTokens === void 0 && typeof body.presetId === "string" && body.presetId.length > 0) {
			const presetMax = (await ctx.stPreset.get(body.presetId))?.extensions?.max_context;
			if (typeof presetMax === "number" && presetMax > 0) maxContextTokens = Math.floor(presetMax);
		}
		if (maxContextTokens === void 0) {
			const cfg = await ctx.stApiConfig.get();
			const sourceGroup = cfg[cfg.source];
			const sourceContext = typeof sourceGroup?.contextSize === "number" && sourceGroup.contextSize > 0 ? sourceGroup.contextSize : void 0;
			maxContextTokens = sourceContext === void 0 ? activeConfig?.defaultMaxContextTokens : Math.floor(sourceContext);
		}
		const wiBudgetPercent = typeof body.worldInfoBudget === "number" && body.worldInfoBudget >= 0 && body.worldInfoBudget <= 100 ? body.worldInfoBudget : 25;
		let worldInfo;
		const books = [];
		for (const name of worldNames) {
			const book = await ctx.stLorebook.get(name);
			if (book !== void 0) books.push({
				name,
				file: book
			});
		}
		const cardWorld = full.card.data.extensions.world;
		if (typeof cardWorld === "string" && cardWorld.length > 0 && !worldNames.includes(cardWorld)) {
			const book = await ctx.stLorebook.get(cardWorld);
			if (book !== void 0) books.push({
				name: cardWorld,
				file: book
			});
		}
		if (full.card.data.character_book !== void 0) books.push({
			name: full.card.data.character_book.name,
			file: bookFromCharacterBook(full.card.data.character_book)
		});
		if (books.length > 0) {
			let vectorHits;
			if (books.some(({ file }) => Object.values(file.entries).some((e) => e.vectorized))) vectorHits = new Map((await ctx.stVector.searchWorld(chat.messages.slice(-10).map((m) => m.mes).join("\n"), { topK: 5 })).map((hit) => [hit.key, hit.score]));
			const scanOptions = {
				timedState: wiTimedState,
				nowMs: Date.now()
			};
			if (vectorHits !== void 0) scanOptions.vectorHits = vectorHits;
			if (typeof body.worldInfoDepth === "number" && body.worldInfoDepth >= 1) scanOptions.scanDepthMessages = Math.floor(body.worldInfoDepth);
			if (typeof body.worldInfoCaseSensitive === "boolean") scanOptions.caseSensitive = body.worldInfoCaseSensitive;
			if (typeof body.worldInfoMatchWholeWords === "boolean") scanOptions.matchWholeWords = body.worldInfoMatchWholeWords;
			if (body.worldInfoRecursive === false) scanOptions.maxRecursionSteps = 0;
			if (maxContextTokens !== void 0) scanOptions.tokenBudget = Math.floor(maxContextTokens * wiBudgetPercent / 100);
			worldInfo = scanWorldInfo(books, {
				chatHistory: chat.messages.slice(-10).map((m) => m.mes),
				messageCount: chat.messages.length,
				characterDescription: full.card.data.description,
				characterPersonality: full.card.data.personality,
				characterDepthPrompt: full.card.data.extensions.depth_prompt.prompt,
				scenario: full.card.data.scenario
			}, scanOptions).map(({ entry }) => ({
				content: entry.content,
				position: entry.position,
				depth: entry.depth,
				role: entry.role
			}));
		}
		let dataBankContext;
		try {
			const bankQuery = chat.messages.slice(-5).map((m) => m.mes).join("\n");
			if (bankQuery.length > 0) {
				const bankHits = await ctx.stVector.searchFiles(bankQuery, {
					threshold: .05,
					topK: 5
				});
				if (bankHits.length > 0) dataBankContext = bankHits.map((h) => h.text).join("\n\n");
			}
		} catch {}
		const meta = chat.header.chat_metadata;
		const authorsNote = typeof meta.note_prompt === "string" && meta.note_prompt.length > 0 ? meta.note_prompt : void 0;
		const authorsNoteDepth = typeof meta.note_depth === "number" && meta.note_depth >= 0 ? meta.note_depth : void 0;
		const chatVariables = meta.variables !== null && typeof meta.variables === "object" ? structuredClone(meta.variables) : {};
		const variablesBefore = JSON.stringify(chatVariables);
		const regexScripts = await ctx.stRegex.list();
		const sourceMessages = override ?? chat.messages;
		const promptMessages = regexScripts.length === 0 ? sourceMessages : (() => {
			const macros = {
				char: full.card.data.name,
				user: userNameOverride ?? chat.header.user_name
			};
			return sourceMessages.map((m) => ({
				...m,
				mes: applyRegexScripts(regexScripts, m.mes, m.is_user ? "user_input" : "ai_output", macros)
			}));
		})();
		res.writeHead(200, {
			"content-type": "text/event-stream; charset=utf-8",
			"cache-control": "no-store",
			connection: "keep-alive"
		});
		const send = (event, data) => {
			res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
		};
		const disconnect = new AbortController();
		res.on("close", () => {
			if (!res.writableEnded) disconnect.abort();
		});
		try {
			let reply = await ctx.stGenerate.generateReply({
				card: full.card,
				messages: promptMessages,
				userName: userNameOverride ?? chat.header.user_name,
				...personaDescription === void 0 ? {} : { personaDescription },
				...contextTemplate === void 0 ? {} : { contextTemplate },
				...instructTemplate === void 0 ? {} : { instruct: instructTemplate },
				...groupContext === void 0 ? {} : { groupContext },
				...worldInfo === void 0 ? {} : { worldInfo },
				...dataBankContext === void 0 ? {} : { dataBankContext },
				...authorsNote === void 0 ? {} : { authorsNote },
				...authorsNoteDepth === void 0 ? {} : { authorsNoteDepth },
				...systemPromptOverride === void 0 ? {} : { systemPromptOverride },
				...postHistoryOverride === void 0 ? {} : { postHistoryOverride },
				...promptEntries === void 0 ? {} : { promptEntries },
				...temperature === void 0 ? {} : { temperature },
				...maxTokens === void 0 ? {} : { maxTokens },
				...topP === void 0 ? {} : { topP },
				...topK === void 0 ? {} : { topK },
				...minP === void 0 ? {} : { minP },
				...frequencyPenalty === void 0 ? {} : { frequencyPenalty },
				...presencePenalty === void 0 ? {} : { presencePenalty },
				...repetitionPenalty === void 0 ? {} : { repetitionPenalty },
				...seed === void 0 ? {} : { seed },
				...stopSequences === void 0 ? {} : { stopSequences },
				...sendIfEmpty === void 0 ? {} : { sendIfEmpty },
				...impersonationPrompt === void 0 ? {} : { impersonationPrompt },
				...continueNudgePrompt === void 0 ? {} : { continueNudgePrompt },
				...historyLimit === void 0 ? {} : { historyLimit },
				...maxContextTokens === void 0 ? {} : { maxContextTokens },
				...maxContextTokens === void 0 || maxTokens === void 0 ? {} : { maxResponseTokens: maxTokens },
				...model === void 0 ? {} : { model },
				signal: disconnect.signal,
				variables: chatVariables
			}, { onDelta: (text) => send("delta", { text }) });
			if (impersonationPrompt !== void 0) {
				const label = (userNameOverride ?? chat.header.user_name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				reply = reply.replace(new RegExp(`^${label}:\\s*`), "").trim();
			}
			send("done", { reply });
			if (JSON.stringify(chatVariables) !== variablesBefore) {
				chat.header.chat_metadata = {
					...chat.header.chat_metadata,
					variables: chatVariables
				};
				try {
					await ctx.stChat.save(avatar, chatId, chat);
				} catch {}
			}
		} catch (error) {
			send("error", { message: error.message });
		}
		res.end();
	}
};
function apply(ctx, config) {
	if (config.defaultMaxContextTokens !== void 0 && (!Number.isInteger(config.defaultMaxContextTokens) || config.defaultMaxContextTokens <= 0)) throw new Error("st-api: defaultMaxContextTokens must be a positive integer");
	activeConfig = config;
	const prefix = config.routePrefix.replace(/\/$/, "");
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: `${prefix}`,
		handler: async (req, res) => {
			const url = new URL(req.url ?? "/", "http://localhost");
			const sub = url.pathname.slice(prefix.length).replace(/^\//, "");
			const key = `${req.method ?? "GET"} ${sub.split("?")[0]}`;
			const route = routes[key];
			if (route === void 0) {
				sendJson(res, 404, { error: `no st route "${key}"` });
				return;
			}
			try {
				await route(ctx, req, res, url.searchParams);
			} catch (error) {
				if (!res.headersSent) sendJson(res, 500, { error: error.message });
				else res.end();
			}
		}
	}), "st-api: route table");
}
//#endregion
export { apply, inject, name };
