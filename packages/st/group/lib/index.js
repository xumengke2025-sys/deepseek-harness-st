import { Service } from "@deepseek-ai/cordis";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
//#region lib/types/index.js
/**
* SillyTavern group chat management service.
*
* Groups allow multiple characters to participate in a single conversation
* with configurable activation strategies determining which character
* responds next.
*
* @module @deepseek-ai/dsh-st-group
*/
/**
* Group chat management service.
*
* Provides CRUD for multi-character groups and the activation strategy
* engine that determines which character responds next in a group chat.
*/
var StGroupService = class extends Service {
	constructor(ctx) {
		super(ctx, "stGroup");
	}
};
function generateGroupId() {
	return `grp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
var FileGroupProvider = class extends StGroupService {
	root;
	constructor(ctx, config) {
		super(ctx);
		this.root = resolve(config.root);
	}
	async ensureRoot() {
		if (!existsSync(this.root)) await mkdir(this.root, { recursive: true });
	}
	groupPath(id) {
		return join(this.root, `${id}.json`);
	}
	async list() {
		await this.ensureRoot();
		const files = await readdir(this.root);
		const groups = [];
		for (const f of files) {
			if (!f.endsWith(".json")) continue;
			try {
				groups.push(JSON.parse(await readFile(join(this.root, f), "utf-8")));
			} catch {}
		}
		return groups.sort((a, b) => {
			if (a.fav !== b.fav) return a.fav ? -1 : 1;
			return b.modify_date.localeCompare(a.modify_date);
		});
	}
	async get(id) {
		const path = this.groupPath(id);
		if (!existsSync(path)) return void 0;
		try {
			return JSON.parse(await readFile(path, "utf-8"));
		} catch {
			return;
		}
	}
	async create(input) {
		await this.ensureRoot();
		const id = generateGroupId();
		const now = (/* @__PURE__ */ new Date()).toISOString();
		const group = {
			id,
			name: input.name,
			members: input.members ?? [],
			...input.avatar_url !== void 0 ? { avatar_url: input.avatar_url } : {},
			allow_self_responses: input.allow_self_responses ?? false,
			activation_strategy: input.activation_strategy ?? 0,
			generation_mode: input.generation_mode ?? 0,
			disabled_members: input.disabled_members ?? [],
			fav: input.fav ?? false,
			...input.chat_id !== void 0 ? { chat_id: input.chat_id } : { chat_id: id },
			chats: input.chats ?? [input.chat_id ?? id],
			auto_mode_delay: input.auto_mode_delay ?? 5,
			generation_mode_join_prefix: input.generation_mode_join_prefix ?? "",
			generation_mode_join_suffix: input.generation_mode_join_suffix ?? "",
			create_date: now,
			modify_date: now,
			metadata: input.metadata ?? {}
		};
		await writeFile(this.groupPath(id), JSON.stringify(group, null, 4), "utf-8");
		return id;
	}
	async update(id, input) {
		const path = this.groupPath(id);
		const group = JSON.parse(await readFile(path, "utf-8"));
		Object.assign(group, {
			...input,
			modify_date: (/* @__PURE__ */ new Date()).toISOString()
		});
		await writeFile(path, JSON.stringify(group, null, 4), "utf-8");
	}
	async delete(id) {
		const path = this.groupPath(id);
		if (existsSync(path)) await unlink(path);
	}
	async selectNextSpeaker(groupId, lastSpeakerId, chatMessages) {
		const group = await this.get(groupId);
		if (!group) return void 0;
		const enabled = group.members.filter((m) => m.enabled && !group.disabled_members.includes(m.character_id));
		if (enabled.length === 0) return void 0;
		switch (group.activation_strategy) {
			case 0:
				if (!group.allow_self_responses && lastSpeakerId !== void 0) {
					const candidates = enabled.filter((m) => m.character_id !== lastSpeakerId);
					if (candidates.length > 0) return this.talkativenessPick(candidates);
				}
				return this.talkativenessPick(enabled);
			case 1: return enabled[(enabled.findIndex((m) => m.character_id === lastSpeakerId) + 1) % enabled.length].character_id;
			case 2: return enabled[Math.floor(Math.random() * enabled.length)].character_id;
			case 3:
				if (chatMessages !== void 0 && chatMessages.length > 0) {
					const spokenSinceUser = /* @__PURE__ */ new Set();
					for (let i = chatMessages.length - 1; i >= 0; i--) {
						const msg = chatMessages[i];
						if (msg.is_user) break;
						spokenSinceUser.add(msg.name);
					}
					const haveNotSpoken = enabled.filter((m) => !spokenSinceUser.has(m.character_id));
					const pool = haveNotSpoken.length > 0 ? haveNotSpoken : lastSpeakerId !== void 0 && enabled.length > 1 ? enabled.filter((m) => m.character_id !== lastSpeakerId) : enabled;
					return pool[Math.floor(Math.random() * pool.length)].character_id;
				}
				if (lastSpeakerId !== void 0 && enabled.length > 1) {
					const others = enabled.filter((m) => m.character_id !== lastSpeakerId);
					return others[Math.floor(Math.random() * others.length)].character_id;
				}
				return enabled[Math.floor(Math.random() * enabled.length)].character_id;
		}
	}
	/** Pick one member weighted by ST's talkativeness (0..1 → probability of activation). */
	talkativenessPick(members) {
		const shuffled = [...members].sort(() => Math.random() - .5);
		for (const m of shuffled) {
			const chance = m.weight > 0 ? m.weight / (m.weight + 1) : .5;
			if (Math.random() < chance) return m.character_id;
		}
		return shuffled[0].character_id;
	}
};
const name = "st-group-file";
//#endregion
export { StGroupService, FileGroupProvider as default, name };
