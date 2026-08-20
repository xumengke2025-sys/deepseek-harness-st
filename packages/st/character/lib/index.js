import { Service } from "@deepseek-ai/cordis";
import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { join, parse, resolve } from "node:path";
import { existsSync } from "node:fs";
//#region lib/types/index.js
/**
* SillyTavern character card service — faithful port of ST's character model.
*
* Characters are stored exactly as SillyTavern stores them: one PNG file per
* character in `characters/`, where the avatar image IS the card. Card JSON
* lives in PNG `tEXt` chunks (`chara` = V2 spec, `ccv3` = V3 spec, V3 wins),
* base64-encoded. Top-level V1 fields and `data.*` V2 fields are both kept
* and synchronized, mirroring `charaFormatData` / `readFromV2` in
* ST's src/endpoints/characters.js.
*
* @module @deepseek-ai/dsh-st-character
*/
/** Avatar render width; ST's AVATAR_WIDTH. */
const AVATAR_WIDTH = 512;
/** Avatar render height; ST's AVATAR_HEIGHT. */
const AVATAR_HEIGHT = 768;
/**
* ST's humanizedDateTime: `YYYY-MM-DD@HHhMMmSSsmmmms`.
* @param timestamp - epoch millis; defaults to now.
* @returns the ST-format timestamp used in chat filenames.
*/
function humanizedDateTime(timestamp = Date.now()) {
	const date = new Date(timestamp);
	const dt = {
		year: String(date.getFullYear()),
		month: String(date.getMonth() + 1),
		day: String(date.getDate()),
		hour: String(date.getHours()),
		minute: String(date.getMinutes()),
		second: String(date.getSeconds()),
		millisecond: String(date.getMilliseconds())
	};
	for (const key in dt) {
		const padLength = key === "millisecond" ? 3 : 2;
		dt[key] = (dt[key] ?? "").padStart(padLength, "0");
	}
	return `${dt.year}-${dt.month}-${dt.day}@${dt.hour}h${dt.minute}m${dt.second}s${dt.millisecond}ms`;
}
/**
* Port of sanitize-filename's observable behavior for the characters surface:
* ST passes card names through it before using them as filenames.
*/
function sanitizeFilename(name) {
	return name.replace(/[\\\/:\*\?"<>|\x00-\x1f]/g, "").replace(/con|prn|aux|nul/i, "").replace(/[. ]+$/, "").replace(/^(?:[a-zA-Z]:)?$/, "") || "unnamed";
}
/** Get a unique filename (base, ext) when `base.ext` already exists. ST's getUniqueName. */
function getUniqueName(baseName, exists, startIndex = 1, maxTries = 1e3) {
	if (!exists(baseName)) return baseName;
	for (let i = startIndex; i < startIndex + maxTries; i++) {
		const candidate = `${baseName} (${i})`;
		if (!exists(candidate)) return candidate;
	}
	throw new Error(`Could not find a unique name for ${baseName}`);
}
/** Extract all chunks from a PNG buffer; throws on bad signature. */
function extractChunks(png) {
	const PNG_SIG = [
		137,
		80,
		78,
		71,
		13,
		10,
		26,
		10
	];
	for (let i = 0; i < 8; i++) if (png[i] !== PNG_SIG[i]) throw new Error("Invalid PNG signature");
	const chunks = [];
	let offset = 8;
	while (offset < png.length) {
		if (offset + 8 > png.length) break;
		const length = png.readUInt32BE(offset);
		const name = png.toString("ascii", offset + 4, offset + 8);
		const data = new Uint8Array(png.subarray(offset + 8, offset + 8 + length));
		chunks.push({
			name,
			data
		});
		offset += 12 + length;
		if (name === "IEND") break;
	}
	return chunks;
}
/** CRC-32 over a chunk (type + data), per PNG spec. */
function chunkCrc(type, data) {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
		table[n] = c >>> 0;
	}
	let crc = 4294967295;
	const input = Buffer.concat([type, data]);
	for (let i = 0; i < input.length; i++) {
		const byte = input[i] ?? 0;
		crc = (table[(crc ^ byte) >>> 0] ?? 0) ^ crc >>> 8;
	}
	return (crc ^ 4294967295) >>> 0;
}
/** Re-encode chunks back into a PNG buffer. */
function encodeChunks(chunks) {
	const parts = [Buffer.from([
		137,
		80,
		78,
		71,
		13,
		10,
		26,
		10
	])];
	for (const chunk of chunks) {
		const len = Buffer.alloc(4);
		len.writeUInt32BE(chunk.data.length, 0);
		const type = Buffer.from(chunk.name, "ascii");
		const data = Buffer.from(chunk.data);
		const crc = Buffer.alloc(4);
		crc.writeUInt32BE(chunkCrc(type, data), 0);
		parts.push(len, type, data, crc);
	}
	return Buffer.concat(parts);
}
/** Decode a tEXt chunk payload into {keyword, text} (latin1 text, ST-compatible). */
function decodeTextChunk(data) {
	const buf = Buffer.from(data);
	const nullIdx = buf.indexOf(0);
	if (nullIdx === -1) return {
		keyword: "",
		text: ""
	};
	return {
		keyword: buf.toString("latin1", 0, nullIdx),
		text: buf.toString("latin1", nullIdx + 1)
	};
}
/** Encode keyword+text into a tEXt chunk payload. */
function encodeTextChunk(keyword, text) {
	return new Uint8Array(Buffer.concat([
		Buffer.from(keyword, "latin1"),
		Buffer.from([0]),
		Buffer.from(text, "latin1")
	]));
}
/**
* Read card JSON from a PNG buffer. V3 (`ccv3`) wins over V2 (`chara`),
* mirroring ST's character-card-parser read().
* @throws when the PNG carries no card metadata.
*/
function readCardFromPng(png) {
	const textChunks = extractChunks(png).filter((c) => c.name === "tEXt").map((c) => decodeTextChunk(c.data));
	const ccv3 = textChunks.find((t) => t.keyword.toLowerCase() === "ccv3");
	if (ccv3) return Buffer.from(ccv3.text, "base64").toString("utf8");
	const chara = textChunks.find((t) => t.keyword.toLowerCase() === "chara");
	if (chara) return Buffer.from(chara.text, "base64").toString("utf8");
	throw new Error("Selected character has no embedded metadata: not a valid SillyTavern card");
}
/**
* Write card JSON into a PNG buffer as `chara` (V2) + `ccv3` (V3) tEXt
* chunks inserted before IEND, removing any prior card chunks — the exact
* behavior of ST's character-card-parser write().
*/
function writeCardToPng(png, cardJson) {
	const chunks = extractChunks(png).filter((c) => {
		if (c.name !== "tEXt") return true;
		const { keyword } = decodeTextChunk(c.data);
		const k = keyword.toLowerCase();
		return k !== "chara" && k !== "ccv3";
	});
	const base64V2 = Buffer.from(cardJson, "utf8").toString("base64");
	chunks.splice(-1, 0, {
		name: "tEXt",
		data: encodeTextChunk("chara", base64V2)
	});
	try {
		const v3 = JSON.parse(cardJson);
		v3.spec = "chara_card_v3";
		v3.spec_version = "3.0";
		const base64V3 = Buffer.from(JSON.stringify(v3), "utf8").toString("base64");
		chunks.splice(-1, 0, {
			name: "tEXt",
			data: encodeTextChunk("ccv3", base64V3)
		});
	} catch {}
	return encodeChunks(chunks);
}
/**
* Build a blank V2 card, mirroring charaFormatData's defaults for a
* newly-created character.
*/
function createBlankCard(name) {
	return {
		name,
		description: "",
		personality: "",
		scenario: "",
		first_mes: "",
		mes_example: "",
		creatorcomment: "",
		avatar: "none",
		chat: `${name} - ${humanizedDateTime()}`,
		talkativeness: .5,
		fav: false,
		tags: [],
		spec: "chara_card_v2",
		spec_version: "2.0",
		create_date: (/* @__PURE__ */ new Date()).toISOString(),
		data: {
			name,
			description: "",
			personality: "",
			scenario: "",
			first_mes: "",
			mes_example: "",
			creator_notes: "",
			system_prompt: "",
			post_history_instructions: "",
			alternate_greetings: [],
			tags: [],
			creator: "",
			character_version: "",
			extensions: {
				talkativeness: .5,
				fav: false,
				world: "",
				depth_prompt: {
					prompt: "",
					depth: 4,
					role: "system"
				}
			}
		}
	};
}
/**
* Normalize any incoming card object to the synchronized V1+V2 shape.
* Port of getCharaCardV2: cards without a `spec` go through convertToV2;
* cards with a spec go through readFromV2 field reconciliation.
*/
function normalizeCard(raw) {
	if (raw.spec === void 0) return convertV1ToV2(raw);
	return readFromV2(raw);
}
/** Port of readFromV2: pull V1 top-level fields from data.*, with ST defaults. */
function readFromV2(char) {
	if (char.data === void 0) return char;
	delete char.json_data;
	char.name = char.data.name ?? char.name;
	char.description = char.data.description ?? "";
	char.personality = char.data.personality ?? "";
	char.scenario = char.data.scenario ?? "";
	char.first_mes = char.data.first_mes ?? "";
	char.mes_example = char.data.mes_example ?? "";
	char.talkativeness = char.data.extensions?.talkativeness ?? .5;
	char.fav = char.data.extensions?.fav ?? false;
	char.tags = char.data.tags ?? [];
	const ext = char.data.extensions;
	char.data.extensions = {
		...ext,
		talkativeness: typeof ext?.talkativeness === "number" ? ext.talkativeness : .5,
		fav: ext?.fav === true,
		world: typeof ext?.world === "string" ? ext.world : "",
		depth_prompt: isDepthPrompt(ext?.depth_prompt) ? ext.depth_prompt : {
			prompt: "",
			depth: 4,
			role: "system"
		}
	};
	if (typeof char.chat !== "string" || char.chat.length === 0) char.chat = `${char.name} - ${humanizedDateTime()}`;
	return char;
}
/** Whether a value is a usable depth_prompt block (ST's shape check on read). */
function isDepthPrompt(value) {
	if (typeof value !== "object" || value === null) return false;
	const v = value;
	return typeof v.prompt === "string" && typeof v.depth === "number" && (v.role === "system" || v.role === "user" || v.role === "assistant");
}
/** Port of convertToV2: lift V1 fields into the V2 envelope. */
function convertV1ToV2(raw) {
	const name = String(raw.name ?? "Unnamed");
	const card = createBlankCard(name);
	card.description = String(raw.description ?? "");
	card.personality = String(raw.personality ?? "");
	card.scenario = String(raw.scenario ?? "");
	card.first_mes = String(raw.first_mes ?? "");
	card.mes_example = String(raw.mes_example ?? "");
	card.creatorcomment = String(raw.creatorcomment ?? raw.creator_notes ?? "");
	card.chat = typeof raw.chat === "string" ? raw.chat : `${name} - ${humanizedDateTime()}`;
	card.create_date = typeof raw.create_date === "string" ? raw.create_date : (/* @__PURE__ */ new Date()).toISOString();
	card.data.description = card.description;
	card.data.personality = card.personality;
	card.data.scenario = card.scenario;
	card.data.first_mes = card.first_mes;
	card.data.mes_example = card.mes_example;
	card.data.creator_notes = card.creatorcomment;
	for (const [k, v] of Object.entries(raw)) if (!(k in card)) card[k] = v;
	return card;
}
/**
* SillyTavern character management service.
*
* A character is a PNG file: the image is the avatar, and the card JSON rides
* in the PNG metadata. All operations keep the on-disk format byte-compatible
* with SillyTavern, so a `characters/` directory is interchangeable between
* the two applications.
*/
var StCharacterService = class extends Service {
	constructor(ctx) {
		super(ctx, "stCharacter");
	}
};
var StCharacterFileProvider = class extends StCharacterService {
	charactersDir;
	constructor(ctx, config) {
		super(ctx);
		this.charactersDir = resolve(config.dataRoot, "characters");
	}
	avatarPath(avatar) {
		const base = sanitizeFilename(parse(avatar).name);
		return join(this.charactersDir, `${base}.png`);
	}
	async ensureDir() {
		if (!existsSync(this.charactersDir)) await mkdir(this.charactersDir, { recursive: true });
	}
	async readCard(avatar) {
		const path = this.avatarPath(avatar);
		if (!existsSync(path)) return void 0;
		const cardJson = readCardFromPng(await readFile(path));
		const card = normalizeCard(JSON.parse(cardJson));
		return {
			avatar: parse(path).base,
			name: card.name,
			tags: card.tags ?? [],
			fav: card.fav ?? false,
			...card.create_date === void 0 ? {} : { create_date: card.create_date },
			chat: card.chat,
			talkativeness: Number(card.talkativeness) || .5,
			card
		};
	}
	async writeCard(card, avatar) {
		await this.ensureDir();
		const path = this.avatarPath(avatar);
		const base = parse(path).name;
		let png;
		if (existsSync(path)) png = await readFile(path);
		else png = await readFile(resolve(this.charactersDir, "../default-user/User Avatars/user-default.png")).catch(() => blankPng());
		const out = writeCardToPng(png, JSON.stringify(card));
		await writeFile(join(this.charactersDir, `${base}.png`), out);
	}
	async list() {
		await this.ensureDir();
		const files = (await readdir(this.charactersDir)).filter((f) => f.toLowerCase().endsWith(".png")).sort((a, b) => a.localeCompare(b));
		const rows = [];
		for (const file of files) try {
			const png = await readFile(join(this.charactersDir, file));
			const card = normalizeCard(JSON.parse(readCardFromPng(png)));
			rows.push({
				avatar: file,
				name: card.name,
				tags: card.tags ?? [],
				fav: card.fav ?? false,
				...card.create_date === void 0 ? {} : { create_date: card.create_date },
				chat: card.chat,
				talkativeness: Number(card.talkativeness) || .5
			});
		} catch {}
		return rows;
	}
	async get(avatar) {
		return this.readCard(avatar);
	}
	applyForm(card, data) {
		card.name = data.ch_name;
		card.description = data.description ?? "";
		card.personality = data.personality ?? "";
		card.scenario = data.scenario ?? "";
		card.first_mes = data.first_mes ?? "";
		card.mes_example = data.mes_example ?? "";
		card.creatorcomment = data.creator_notes ?? "";
		card.talkativeness = data.talkativeness ?? .5;
		card.fav = data.fav === "true" || data.fav === true;
		const tags = typeof data.tags === "string" ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : data.tags ?? [];
		card.tags = tags;
		const greetings = Array.isArray(data.alternate_greetings) ? data.alternate_greetings : typeof data.alternate_greetings === "string" ? [data.alternate_greetings] : [];
		card.data.name = card.name;
		card.data.description = card.description;
		card.data.personality = card.personality;
		card.data.scenario = card.scenario;
		card.data.first_mes = card.first_mes;
		card.data.mes_example = card.mes_example;
		card.data.creator_notes = card.creatorcomment;
		card.data.system_prompt = data.system_prompt ?? "";
		card.data.post_history_instructions = data.post_history_instructions ?? "";
		card.data.tags = tags;
		card.data.creator = data.creator ?? "";
		card.data.character_version = data.character_version ?? "";
		card.data.alternate_greetings = greetings;
		card.data.extensions.talkativeness = Number(card.talkativeness) || .5;
		card.data.extensions.fav = card.fav;
		card.data.extensions.world = data.world ?? "";
		const depth = Number(data.depth_prompt_depth);
		card.data.extensions.depth_prompt = {
			prompt: data.depth_prompt_prompt ?? "",
			depth: Number.isNaN(depth) ? 4 : depth,
			role: data.depth_prompt_role ?? "system"
		};
	}
	async create(data) {
		await this.ensureDir();
		const name = getUniqueName(sanitizeFilename(data.ch_name), (n) => existsSync(join(this.charactersDir, `${n}.png`)));
		const card = createBlankCard(name);
		this.applyForm(card, {
			...data,
			ch_name: name
		});
		card.chat = `${name} - ${humanizedDateTime()}`;
		await this.writeCard(card, name);
		return `${name}.png`;
	}
	async importPng(dataUrl) {
		const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
		const png = Buffer.from(base64, "base64");
		const cardJson = readCardFromPng(png);
		const card = normalizeCard(JSON.parse(cardJson));
		const name = getUniqueName(sanitizeFilename(card.name), (n) => existsSync(join(this.charactersDir, `${n}.png`)));
		card.name = name;
		card.data.name = name;
		await this.ensureDir();
		await writeFile(join(this.charactersDir, `${name}.png`), writeCardToPng(png, JSON.stringify(card)));
		return `${name}.png`;
	}
	async importJson(json) {
		const card = normalizeCard(JSON.parse(json));
		const name = getUniqueName(sanitizeFilename(card.name), (n) => existsSync(join(this.charactersDir, `${n}.png`)));
		card.name = name;
		card.data.name = name;
		await this.writeCard(card, name);
		return `${name}.png`;
	}
	async edit(avatar, data) {
		const full = await this.readCard(avatar);
		if (!full) throw new Error(`Character ${avatar} not found`);
		this.applyForm(full.card, data);
		await this.writeCard(full.card, parse(avatar).name);
	}
	async editAvatar(avatar, dataUrl) {
		const full = await this.readCard(avatar);
		if (!full) throw new Error(`Character ${avatar} not found`);
		const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
		const png = Buffer.from(base64, "base64");
		await this.ensureDir();
		await writeFile(this.avatarPath(avatar), writeCardToPng(png, JSON.stringify(full.card)));
	}
	async rename(avatar, newName) {
		const full = await this.readCard(avatar);
		if (!full) throw new Error(`Character ${avatar} not found`);
		const name = getUniqueName(sanitizeFilename(newName), (n) => existsSync(join(this.charactersDir, `${n}.png`)));
		full.card.name = name;
		full.card.data.name = name;
		full.card.avatar = "none";
		const oldPath = this.avatarPath(avatar);
		await writeFile(join(this.charactersDir, `${name}.png`), writeCardToPng(await readFile(oldPath), JSON.stringify(full.card)));
		await unlink(oldPath);
		const chatsOld = resolve(this.charactersDir, "../chats", parse(avatar).name);
		const chatsNew = resolve(this.charactersDir, "../chats", name);
		if (existsSync(chatsOld) && !existsSync(chatsNew)) await rename(chatsOld, chatsNew);
		return `${name}.png`;
	}
	async delete(avatar) {
		const path = this.avatarPath(avatar);
		if (existsSync(path)) await unlink(path);
		const chatsDir = resolve(this.charactersDir, "../chats", parse(avatar).name);
		if (existsSync(chatsDir)) {
			const { rm } = await import("node:fs/promises");
			await rm(chatsDir, {
				recursive: true,
				force: true
			});
		}
	}
	async exportPng(avatar) {
		return `data:image/png;base64,${(await readFile(this.avatarPath(avatar))).toString("base64")}`;
	}
	async setFavourite(avatar, fav) {
		const full = await this.readCard(avatar);
		if (!full) throw new Error(`Character ${avatar} not found`);
		full.card.fav = fav;
		full.card.data.extensions.fav = fav;
		await this.writeCard(full.card, parse(avatar).name);
	}
	async avatarBytes(avatar) {
		const path = this.avatarPath(avatar);
		return existsSync(path) ? readFile(path) : void 0;
	}
	async listSprites(avatar) {
		const dir = this.spriteDir(avatar);
		if (!existsSync(dir)) return [];
		return (await readdir(dir)).filter((f) => f.toLowerCase().endsWith(".png")).map((f) => f.slice(0, -4)).sort((a, b) => a.localeCompare(b));
	}
	async spriteBytes(avatar, expression) {
		const path = join(this.spriteDir(avatar), `${sanitizeFilename(parse(expression).name)}.png`);
		return existsSync(path) ? readFile(path) : void 0;
	}
	spriteDir(avatar) {
		return join(this.charactersDir, "sprites", sanitizeFilename(parse(avatar).name));
	}
};
/** Minimal 1×1 transparent PNG used when no default avatar exists. */
function blankPng() {
	return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNl7BcQAAAABJRU5ErkJggg==", "base64");
}
const name = "st-character-file";
//#endregion
export { AVATAR_HEIGHT, AVATAR_WIDTH, StCharacterService, createBlankCard, StCharacterFileProvider as default, getUniqueName, humanizedDateTime, name, normalizeCard, readCardFromPng, sanitizeFilename, writeCardToPng };
