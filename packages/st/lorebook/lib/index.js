import { Service } from "@deepseek-ai/cordis";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join, parse, resolve } from "node:path";
import { existsSync } from "node:fs";
import { sanitizeFilename } from "@deepseek-ai/dsh-st-character";
//#region lib/types/index.js
/**
* SillyTavern World Info (lorebook) service — faithful port of ST's format
* and core activation engine.
*
* Files are `worlds/<name>.json` containing `{ name, entries: { [uid]: entry },
* extensions }`. Entry fields, defaults, and the selective-logic enum mirror
* ST's `newWorldInfoEntryDefinition` (public/scripts/world-info.js). The
* activation scan ports ST's checkWorldInfo core path: constant entries,
* primary/secondary key logic (AND_ANY / NOT_ALL / NOT_ANY / AND_ALL),
* recursive scanning, timed effects (sticky/cooldown/delay), probability,
* and token-budget insertion ordering.
*
* @module @deepseek-ai/dsh-st-lorebook
*/
/** Secondary-key logic enum; ST's world_info_logic. */
const world_info_logic = {
	AND_ANY: 0,
	NOT_ALL: 1,
	NOT_ANY: 2,
	AND_ALL: 3
};
/** Entry insertion position enum; ST's world_info_position. */
const world_info_position = {
	before: 0,
	after: 1,
	ANTop: 2,
	ANBottom: 3,
	atDepth: 4,
	EMTop: 5,
	EMBottom: 6,
	outlet: 7,
	sysTop: 800,
	sysBottom: 801,
	beforeChar: 1e3,
	afterChar: 1001,
	EMTopKmp: 1002,
	EMBottomKmp: 1003
};
/** ST's DEFAULT_DEPTH for entries. */
const DEFAULT_DEPTH = 4;
/** ST's DEFAULT_WEIGHT for grouped entries. */
const DEFAULT_WEIGHT = 100;
/** Create an entry with ST's template defaults. */
function newWorldInfoEntry() {
	return {
		uid: 0,
		key: [],
		keysecondary: [],
		comment: "",
		content: "",
		constant: false,
		vectorized: false,
		selective: true,
		selectiveLogic: world_info_logic.AND_ANY,
		addMemo: false,
		order: 100,
		position: world_info_position.before,
		disable: false,
		ignoreBudget: false,
		excludeRecursion: false,
		preventRecursion: false,
		matchPersonaDescription: false,
		matchCharacterDescription: false,
		matchCharacterPersonality: false,
		matchCharacterDepthPrompt: false,
		matchScenario: false,
		matchCreatorNotes: false,
		delayUntilRecursion: 0,
		probability: 100,
		useProbability: true,
		depth: 4,
		outletName: "",
		group: "",
		groupOverride: false,
		groupWeight: 100,
		scanDepth: null,
		caseSensitive: null,
		matchWholeWords: null,
		useGroupScoring: null,
		automationId: "",
		role: 0,
		sticky: null,
		cooldown: null,
		delay: null,
		displayIndex: 0
	};
}
function escapeRegex(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/** Word-boundary matcher, port of ST's matchKeys join for whole words. */
function containsKey(haystack, key, wholeWords, caseSensitive) {
	const needle = caseSensitive ? key : key.toLowerCase();
	const target = caseSensitive ? haystack : haystack.toLowerCase();
	if (!needle) return false;
	if (!wholeWords) return target.includes(needle);
	return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(needle)}(?:[^\\p{L}\\p{N}]|$)`, "u").test(target);
}
/**
* Pick one entry from a same-group clash (ST's in-group priority):
* a groupOverride entry claims the group; otherwise vector-scored members
* compete on their shared best similarity (ST's useGroupScoring: the group
* aggregates scores from vectorized hits), and only unscored clashes fall
* to the groupWeight-weighted roll. Weights below 1 are treated as 1 so
* every entry can win.
*/
function pickGroupWinner(list, random, scores) {
	const overrides = list.filter((i) => i.entry.groupOverride);
	if (overrides.length > 0) return overrides[0];
	const scored = list.map((item) => ({
		item,
		score: scores?.get(`${item.world}#${item.entry.uid}`)
	})).filter((s) => s.score !== void 0);
	if (scored.length > 0) {
		const best = Math.max(...scored.map((s) => s.score));
		const top = scored.filter((s) => s.score === best);
		return top[Math.floor(random() * top.length)].item;
	}
	const total = list.reduce((sum, i) => sum + Math.max(1, i.entry.groupWeight), 0);
	let roll = random() * total;
	for (const item of list) {
		roll -= Math.max(1, item.entry.groupWeight);
		if (roll <= 0) return item;
	}
	return list[list.length - 1];
}
/**
* Scan books against the chat context and return activated entries.
* Ports ST's primary path: constants first, key matching per message slice,
* secondary-key logic, recursion over activated content, probability roll,
* then sort by order for prompt assembly.
*/
function scanWorldInfo(books, texts, options = {}) {
	const random = options.random ?? Math.random;
	const scanDepthMessages = options.scanDepthMessages ?? 2;
	const caseSensitive = options.caseSensitive ?? false;
	const wholeWordsDefault = options.matchWholeWords ?? true;
	const maxRecursionSteps = options.maxRecursionSteps ?? 3;
	const nowMs = options.nowMs ?? Date.now();
	const timedState = options.timedState;
	const vectorHits = options.vectorHits;
	const tokenBudget = options.tokenBudget;
	const allEntries = [];
	for (const { name, file } of books) for (const entry of Object.values(file.entries)) allEntries.push({
		world: name,
		entry
	});
	const enabled = allEntries.filter(({ entry }) => !entry.disable);
	const activated = /* @__PURE__ */ new Map();
	const activationOrder = [];
	const matchesFor = (entry, text) => {
		const cs = entry.caseSensitive ?? caseSensitive;
		const ww = entry.matchWholeWords ?? wholeWordsDefault;
		const primaries = entry.key.filter((k) => k.trim().length > 0);
		if (!(entry.constant || primaries.length === 0 ? true : primaries.some((k) => containsKey(text, k, ww, cs)))) {
			const secondaries = entry.keysecondary.filter((k) => k.trim().length > 0);
			if (primaries.length === 0 && secondaries.length > 0) return secondaries.some((k) => containsKey(text, k, ww, cs));
			return false;
		}
		const secondaries = entry.keysecondary.filter((k) => k.trim().length > 0);
		if (secondaries.length === 0 || !entry.selective) return true;
		switch (entry.selectiveLogic) {
			case world_info_logic.AND_ANY: return secondaries.some((k) => containsKey(text, k, ww, cs));
			case world_info_logic.AND_ALL: return secondaries.every((k) => containsKey(text, k, ww, cs));
			case world_info_logic.NOT_ANY: return !secondaries.some((k) => containsKey(text, k, ww, cs));
			case world_info_logic.NOT_ALL: return !secondaries.every((k) => containsKey(text, k, ww, cs));
			default: return true;
		}
	};
	const auxiliaryText = (entry) => {
		const parts = [];
		if (entry.matchPersonaDescription && texts.personaDescription) parts.push(texts.personaDescription);
		if (entry.matchCharacterDescription && texts.characterDescription) parts.push(texts.characterDescription);
		if (entry.matchCharacterPersonality && texts.characterPersonality) parts.push(texts.characterPersonality);
		if (entry.matchCharacterDepthPrompt && texts.characterDepthPrompt) parts.push(texts.characterDepthPrompt);
		if (entry.matchScenario && texts.scenario) parts.push(texts.scenario);
		if (entry.matchCreatorNotes && texts.creatorNotes) parts.push(texts.creatorNotes);
		return parts.join("\n");
	};
	const tryActivate = (recursionStep, recursiveText) => {
		for (const item of enabled) {
			const { entry } = item;
			const key = `${item.world}#${entry.uid}`;
			if (activated.has(key)) continue;
			if (entry.delayUntilRecursion > recursionStep) continue;
			if (recursionStep > 0 && entry.excludeRecursion) continue;
			if (texts.messageCount !== void 0 && entry.delay !== null && texts.messageCount < entry.delay) continue;
			if (entry.vectorized && !entry.constant) {
				if (vectorHits?.get(key) !== void 0) {
					activated.set(key, item);
					activationOrder.push(key);
					timedState?.set(key, {
						at: nowMs,
						active: true
					});
				}
				continue;
			}
			const aux = auxiliaryText(entry);
			const chatWindow = texts.chatHistory.slice(-(entry.scanDepth ?? scanDepthMessages)).join("\n");
			const scanText = recursionStep === 0 ? chatWindow : `${chatWindow}\n${recursiveText}`;
			if (!(matchesFor(entry, scanText) || aux.length > 0 && matchesFor(entry, `${scanText}\n${aux}`))) continue;
			if (entry.useProbability && entry.probability < 100 && random() * 100 > entry.probability) continue;
			const last = timedState?.get(key);
			if (last !== void 0 && !last.active && entry.cooldown !== null && nowMs - last.at < entry.cooldown) continue;
			activated.set(key, item);
			activationOrder.push(key);
			timedState?.set(key, {
				at: nowMs,
				active: true
			});
		}
	};
	if (timedState !== void 0) for (const item of enabled) {
		const { entry } = item;
		if (entry.sticky === null) continue;
		const key = `${item.world}#${entry.uid}`;
		const last = timedState.get(key);
		if (last === void 0 || !last.active || nowMs - last.at >= entry.sticky) continue;
		activated.set(key, item);
		activationOrder.push(key);
		timedState.set(key, {
			at: nowMs,
			active: true
		});
	}
	tryActivate(0, "");
	for (let step = 1; step <= maxRecursionSteps; step++) {
		const prevCount = activated.size;
		const recursiveText = activationOrder.map((key) => activated.get(key).entry).filter((e) => !e.preventRecursion).map((e) => e.content).join("\n");
		tryActivate(step, recursiveText);
		if (activated.size === prevCount) break;
	}
	if (timedState !== void 0) {
		for (const [key, record] of timedState) if (record.active && !activated.has(key)) timedState.set(key, {
			at: nowMs,
			active: false
		});
	}
	{
		const byGroup = /* @__PURE__ */ new Map();
		for (const item of activated.values()) {
			const group = item.entry.group;
			if (group === "") continue;
			const list = byGroup.get(group) ?? [];
			list.push(item);
			byGroup.set(group, list);
		}
		let hasOverrideWinner = false;
		for (const [, list] of byGroup) {
			const winner = pickGroupWinner(list, random, vectorHits);
			if (winner.entry.groupOverride) hasOverrideWinner = true;
			for (const item of list) if (item !== winner) activated.delete(`${item.world}#${item.entry.uid}`);
		}
		if (hasOverrideWinner) {
			for (const [key, item] of activated) if (!item.entry.groupOverride) activated.delete(key);
		}
	}
	let result = [...activated.values()].sort((a, b) => {
		if (a.entry.order !== b.entry.order) return a.entry.order - b.entry.order;
		if (a.entry.position !== b.entry.position) return a.entry.position - b.entry.position;
		return a.entry.depth - b.entry.depth;
	});
	if (tokenBudget !== void 0) {
		let used = 0;
		result = result.filter(({ entry }) => {
			if (entry.ignoreBudget) return true;
			const cost = Math.ceil(entry.content.length / 4);
			if (used + cost > tokenBudget) return false;
			used += cost;
			return true;
		});
	}
	return result.map(({ world, entry }) => ({
		world,
		entry
	}));
}
/**
* Convert a chara_card_v2 embedded `character_book` to the standalone
* `worlds/*.json` scan format; ST's conversion in `convertCharacterBook`.
* @param book - the card's embedded book.
* @returns a book with the standalone entry shape, keyed by entry id.
*/
function bookFromCharacterBook(book) {
	const entries = {};
	book.entries.forEach((e, index) => {
		const base = newWorldInfoEntry();
		entries[String(e.id ?? index)] = {
			...base,
			uid: e.id ?? index,
			key: [...e.keys],
			keysecondary: e.secondary_keys === void 0 ? [] : [...e.secondary_keys],
			comment: e.comment,
			content: e.content,
			constant: e.constant,
			selective: e.selective,
			order: e.insertion_order,
			disable: !(e.enabled ?? true),
			caseSensitive: e.case_sensitive ?? null,
			position: e.position === "after_char" ? world_info_position.afterChar : world_info_position.beforeChar
		};
	});
	return {
		name: book.name,
		entries
	};
}
/**
* SillyTavern World Info file service. CRUD over `worlds/*.json` in the
* ST-compatible layout, plus the activation scan for prompt assembly.
*/
var StLorebookService = class extends Service {
	constructor(ctx) {
		super(ctx, "stLorebook");
	}
};
var StLorebookFileProvider = class extends StLorebookService {
	worldsDir;
	constructor(ctx, config) {
		super(ctx);
		this.worldsDir = resolve(config.dataRoot, "worlds");
	}
	path(name) {
		return join(this.worldsDir, `${sanitizeFilename(name)}.json`);
	}
	async ensureDir() {
		if (!existsSync(this.worldsDir)) await mkdir(this.worldsDir, { recursive: true });
	}
	async list() {
		if (!existsSync(this.worldsDir)) return [];
		const files = (await readdir(this.worldsDir)).filter((f) => f.toLowerCase().endsWith(".json")).sort((a, b) => a.localeCompare(b));
		const rows = [];
		for (const file of files) try {
			const parsed = JSON.parse(await readFile(join(this.worldsDir, file), "utf8"));
			const id = parse(file).name;
			rows.push({
				file_id: id,
				name: parsed.name || id,
				extensions: parsed.extensions && typeof parsed.extensions === "object" ? parsed.extensions : {}
			});
		} catch {}
		return rows;
	}
	async get(name) {
		if (!name) return void 0;
		const path = this.path(name);
		if (!existsSync(path)) return void 0;
		return JSON.parse(await readFile(path, "utf8"));
	}
	async getOrDummy(name) {
		return await this.get(name) ?? { entries: {} };
	}
	async save(name, file) {
		await this.ensureDir();
		await writeFile(this.path(name), JSON.stringify(file, null, 4), "utf8");
	}
	async delete(name) {
		const path = this.path(name);
		if (existsSync(path)) await unlink(path);
	}
	async import(name, json) {
		const parsed = JSON.parse(json);
		const stored = parsed.name || name;
		await this.save(stored, parsed);
		return stored;
	}
};
const name = "st-lorebook-file";
//#endregion
export { DEFAULT_DEPTH, DEFAULT_WEIGHT, StLorebookService, bookFromCharacterBook, StLorebookFileProvider as default, name, newWorldInfoEntry, scanWorldInfo, world_info_logic, world_info_position };
