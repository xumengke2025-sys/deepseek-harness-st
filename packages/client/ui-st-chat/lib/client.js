window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-st-chat",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region src/client/state.ts
		/** Initial snapshot; the chat panel is the default surface. */
		const INITIAL = {
			panel: "chat",
			avatar: "",
			chatId: "",
			userName: "User",
			persona: "",
			storyString: "",
			instructId: "",
			worlds: [],
			presetId: "",
			model: ""
		};
		/**
		* Create the shared state source with its action set.
		*
		* The snapshot persists to `localStorage` on every change and rehydrates at
		* creation, so the persona name, selected character, model, and panel survive
		* a page reload the way SillyTavern's settings.json does.
		* @returns the observable source and the action set writing through it.
		*/
		const STORAGE_KEY = "dsh-st.ui";
		/** Read the persisted snapshot; `undefined` keeps {@link INITIAL} when storage is unavailable or stale. */
		function readStored() {
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (raw === null) return INITIAL;
				const parsed = JSON.parse(raw);
				const legacyWorld = typeof parsed.world === "string" && parsed.world.length > 0 ? [parsed.world] : void 0;
				const { world: _world, ...rest } = parsed;
				const merged = {
					...INITIAL,
					...rest
				};
				if (legacyWorld !== void 0 && (parsed.worlds === void 0 || parsed.worlds.length === 0)) merged.worlds = legacyWorld;
				return merged;
			} catch {
				return INITIAL;
			}
		}
		function createStUiState() {
			let snapshot = readStored();
			const listeners = /* @__PURE__ */ new Set();
			const emit = () => {
				for (const fn of [...listeners]) fn();
			};
			const patch = (next) => {
				let changed = false;
				for (const key of Object.keys(next)) if (snapshot[key] !== next[key]) {
					changed = true;
					break;
				}
				if (!changed) return;
				snapshot = {
					...snapshot,
					...next
				};
				try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
				} catch {}
				emit();
			};
			return {
				source: {
					getSnapshot: () => snapshot,
					subscribe: (fn) => {
						listeners.add(fn);
						return () => {
							listeners.delete(fn);
						};
					}
				},
				actions: {
					setPanel: (panel) => {
						patch({ panel });
					},
					setAvatar: (avatar) => {
						patch({
							avatar,
							chatId: ""
						});
					},
					setChatId: (chatId) => {
						patch({ chatId });
					},
					setUserName: (userName) => {
						patch({ userName });
					},
					setPersona: (persona) => {
						patch({ persona });
					},
					setStoryString: (storyString) => {
						patch({ storyString });
					},
					setInstructId: (instructId) => {
						patch({ instructId });
					},
					setWorlds: (worlds) => {
						patch({ worlds });
					},
					setPresetId: (presetId) => {
						patch({ presetId });
					},
					setModel: (model) => {
						patch({ model });
					},
					setPersonaPosition: (personaPosition) => {
						patch({ personaPosition });
					},
					setPersonaDepth: (personaDepth) => {
						patch({ personaDepth });
					},
					setPersonaDepthRole: (personaDepthRole) => {
						patch({ personaDepthRole });
					},
					setWorldInfoDepth: (worldInfoDepth) => {
						patch({ worldInfoDepth });
					},
					setWorldInfoBudget: (worldInfoBudget) => {
						patch({ worldInfoBudget });
					},
					setWorldInfoRecursive: (worldInfoRecursive) => {
						patch({ worldInfoRecursive });
					},
					setWorldInfoCaseSensitive: (worldInfoCaseSensitive) => {
						patch({ worldInfoCaseSensitive });
					},
					setWorldInfoMatchWholeWords: (worldInfoMatchWholeWords) => {
						patch({ worldInfoMatchWholeWords });
					},
					setMaxContextTokens: (maxContextTokens) => {
						patch({ maxContextTokens });
					}
				}
			};
		}
		//#endregion
		//#region src/client/api.ts
		/** Route prefix; matches st-api's default `routePrefix`. */
		const PREFIX = "/api/st";
		async function post(path, body = {}) {
			const res = await fetch(`${PREFIX}/${path}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const detail = await res.text().catch(() => "");
				throw new Error(`st-api ${path}: ${res.status} ${detail}`);
			}
			return await res.json();
		}
		async function get(path) {
			const res = await fetch(`${PREFIX}/${path}`);
			if (!res.ok) throw new Error(`st-api ${path}: ${res.status}`);
			return await res.json();
		}
		/** Read one SSE frame's `data:` payload lines joined; null when the frame carries none. */
		function frameData(lines) {
			const data = lines.filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart());
			return data.length === 0 ? null : data.join("\n");
		}
		/** Frame event name; SSE default is `message`. */
		function frameEvent(lines) {
			const event = lines.find((l) => l.startsWith("event:"));
			return event === void 0 ? "message" : event.slice(6).trim();
		}
		/**
		* Stream one reply from `POST generate`, dispatching each delta as it lands.
		* @param input - generation request body.
		* @param onDelta - receives each streamed text delta.
		* @returns the final full reply text (the `done` frame's payload).
		*/
		async function generate(input, onDelta, signal) {
			const res = await fetch(`${PREFIX}/generate`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(input),
				...signal === void 0 ? {} : { signal }
			});
			if (!res.ok || res.body === null) {
				const detail = await res.text().catch(() => "");
				throw new Error(`st-api generate: ${res.status} ${detail}`);
			}
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			let reply = "";
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				for (;;) {
					const index = buffer.indexOf("\n\n");
					if (index < 0) break;
					const lines = buffer.slice(0, index).split("\n");
					buffer = buffer.slice(index + 2);
					const data = frameData(lines);
					if (data === null) continue;
					switch (frameEvent(lines)) {
						case "delta":
							onDelta(JSON.parse(data).text);
							break;
						case "done":
							reply = JSON.parse(data).reply;
							break;
						case "error": throw new Error(JSON.parse(data).message);
						default: break;
					}
				}
			}
			return reply;
		}
		/** The shared client instance; pure functions over fetch, no plugin state. */
		const stApi = {
			listCharacters: () => post("characters/all"),
			getCharacter: (avatar) => post("characters/get", { avatar }),
			importCharacterPng: (dataUrl) => post("characters/import-png", { dataUrl }),
			createCharacter: (form) => post("characters/create", { ...form }),
			editCharacter: async (avatar, form) => {
				await post("characters/edit", {
					avatar,
					...form
				});
			},
			renameCharacter: (avatar, newName) => post("characters/rename", {
				avatar,
				newName
			}),
			deleteCharacter: async (avatar) => {
				await post("characters/delete", { avatar });
			},
			setFavourite: async (avatar, fav) => {
				await post("characters/fav", {
					avatar,
					fav
				});
			},
			exportCharacterPng: (avatar) => post("characters/export", { avatar }),
			avatarUrl: (avatar) => `${PREFIX}/avatar?name=${encodeURIComponent(avatar)}`,
			listSprites: (avatar) => post("characters/sprites", { avatar }),
			spriteUrl: (avatar, expression) => `${PREFIX}/sprite?avatar=${encodeURIComponent(avatar)}&expr=${encodeURIComponent(expression)}`,
			listChats: (avatar) => post("chats/list", { avatar }),
			getChat: (avatar, chatId) => post("chats/get", {
				avatar,
				chatId
			}),
			createChat: (avatar, userName, characterName, firstMessage) => post("chats/create", {
				avatar,
				userName,
				characterName,
				...firstMessage === void 0 ? {} : { firstMessage }
			}),
			saveChat: async (avatar, chatId, chat) => {
				await post("chats/save", {
					avatar,
					chatId,
					chat
				});
			},
			deleteChat: async (avatar, chatId) => {
				await post("chats/delete", {
					avatar,
					chatId
				});
			},
			exportChat: async (avatar, chatId) => (await post("chats/export", {
				avatar,
				chatId
			})).jsonl,
			exportChatText: async (avatar, chatId) => (await post("chats/export", {
				avatar,
				chatId,
				format: "text"
			})).text,
			importChat: (avatar, jsonl) => post("chats/import", {
				avatar,
				jsonl
			}),
			searchChats: (query) => post("chats/search", { query }).then((r) => r.hits),
			checkpointChat: (avatar, chatId, upto) => post("chats/checkpoint", {
				avatar,
				chatId,
				...upto === void 0 ? {} : { upto }
			}),
			listWorlds: () => post("worldinfo/list"),
			getWorld: (name) => post("worldinfo/get", { name }),
			saveWorld: async (name, file) => {
				await post("worldinfo/save", {
					name,
					file
				});
			},
			deleteWorld: async (name) => {
				await post("worldinfo/delete", { name });
			},
			indexWorld: (name) => post("vector/index-world", { name }),
			listBankFiles: async () => (await post("vector/file/list")).files,
			indexBankFile: (name, text) => post("vector/file/index", {
				name,
				text
			}),
			deleteBankFile: async (name) => {
				await post("vector/file/delete", { name });
			},
			searchBankFiles: (query, options) => post("vector/file/search", {
				query,
				...options === void 0 ? {} : { ...options }
			}),
			listGroups: () => post("groups/list"),
			getGroup: (id) => post("groups/get", { id }),
			createGroup: (input) => post("groups/create", { ...input }),
			updateGroup: async (id, input) => {
				await post("groups/update", {
					id,
					input: { ...input }
				});
			},
			deleteGroup: async (id) => {
				await post("groups/delete", { id });
			},
			nextSpeaker: async (id, lastSpeakerId) => (await post("groups/next-speaker", {
				id,
				...lastSpeakerId === void 0 ? {} : { lastSpeakerId }
			})).character_id,
			listPresets: () => post("presets/list"),
			createPreset: (input) => post("presets/create", { ...input }),
			updatePreset: async (id, input) => {
				await post("presets/update", {
					id,
					input: { ...input }
				});
			},
			deletePreset: async (id) => {
				await post("presets/delete", { id });
			},
			duplicatePreset: (id) => post("presets/duplicate", { id }),
			exportPreset: (id) => post("presets/export", { id }),
			importPreset: (json) => post("presets/import", { json }),
			listRegex: () => post("regex/list"),
			saveRegex: (script) => post("regex/save", { script }),
			deleteRegex: async (id) => {
				await post("regex/delete", { id });
			},
			listPersonas: () => post("personas/list"),
			savePersona: (persona) => post("personas/save", { persona }),
			deletePersona: async (filename) => {
				await post("personas/delete", { filename });
			},
			listInstructs: () => post("instructs/list"),
			saveInstruct: (instruct) => post("instructs/save", { instruct }),
			deleteInstruct: async (filename) => {
				await post("instructs/delete", { filename });
			},
			getApiConfig: () => post("api-config/get"),
			saveApiConfig: async (config) => {
				await post("api-config/save", { config });
			},
			listModelsBySource: (source) => post("api-config/models", { source }),
			listProviders: () => post("api-config/providers"),
			listModels: () => get("models"),
			generate
		};
		//#endregion
		//#region \0dsh-css:D:\deepseek harness\packages\client\ui-st-chat\src\client\st-shell.module.css.mjs
		const css$3 = ".QUvU8G_shell{background:var(--dsh-st-bg,#1a1a2e);width:100%;height:100%;min-height:0;color:var(--dsh-st-fg,#e8e8f0);display:flex}.QUvU8G_nav{border-right:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);flex-direction:column;flex:none;gap:4px;width:168px;padding:12px 8px;display:flex}.QUvU8G_navBtn,.QUvU8G_navBtnActive{text-align:left;font:inherit;cursor:pointer;color:inherit;border:none;border-radius:8px;padding:8px 12px;display:block}.QUvU8G_navBtn{background:0 0}.QUvU8G_navBtn:hover{background:var(--dsh-st-hover,#26264a)}.QUvU8G_navBtnActive{background:var(--dsh-st-accent-dim,#37376b)}.QUvU8G_surface{flex:1;min-width:0;min-height:0;display:flex}.QUvU8G_missing{opacity:.7;margin:auto}";
		const tagId$3 = "@deepseek-ai/dsh-client-ui-st-chat/st-shell.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-st-chat";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var st_shell_module_css_default = {
			"missing": "QUvU8G_missing",
			"navBtnActive": "QUvU8G_navBtnActive",
			"surface": "QUvU8G_surface",
			"shell": "QUvU8G_shell",
			"nav": "QUvU8G_nav",
			"navBtn": "QUvU8G_navBtn"
		};
		//#endregion
		//#region src/client/StShell.tsx
		/**
		* The ST surface root.
		* @param props - child render share plus the {@link StFace} share.
		*/
		function StShell(props) {
			const panel = props.useSt((s) => s.panel);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: st_shell_module_css_default.shell,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
					className: st_shell_module_css_default.nav,
					children: props.renderSlot("st.nav", {
						panel,
						select: props.actions.setPanel
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: st_shell_module_css_default.surface,
					children: props.renderSlot("st.panel", {}, {
						entryKey: panel,
						fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: st_shell_module_css_default.missing,
							children: [
								"Panel “",
								panel,
								"” is not registered."
							]
						})
					})
				})]
			});
		}
		//#endregion
		//#region src/client/tts.ts
		/**
		* Browser-native text-to-speech for chat messages (ST's "message voice"
		* affordance without external TTS providers).
		*/
		/** Remove `[[expression]]` sprite marks the renderer hides from message text. */
		function stripExpressionMarks(text) {
			return text.replace(/\[\[[^\]]+\]\]/g, "");
		}
		/** Strip expression marks, emphasis asterisks, and line breaks to plain speech text. */
		function speechText(raw) {
			return stripExpressionMarks(raw).replace(/\*[^*]*\*/g, " ").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
		}
		/**
		* Speak one message aloud, replacing any utterance already queued.
		* @param raw - the stored message text.
		*/
		function speak(raw) {
			if (typeof speechSynthesis === "undefined") return;
			speechSynthesis.cancel();
			const text = speechText(raw);
			if (text === "") return;
			const utter = new SpeechSynthesisUtterance(text);
			utter.lang = "zh-CN";
			speechSynthesis.speak(utter);
		}
		//#endregion
		//#region \0dsh-css:D:\deepseek harness\packages\client\ui-st-chat\src\client\chat.module.css.mjs
		const css$2 = ".V06-Ya_panel{flex-direction:column;flex:1;min-width:0;min-height:0;display:flex}.V06-Ya_toolbar{border-bottom:1px solid var(--dsh-st-border,#2e2e48);align-items:center;gap:8px;padding:8px 12px;display:flex}.V06-Ya_toolbarGap{flex:1}.V06-Ya_spriteImg{object-fit:contain;background:var(--dsh-st-nav-bg,#16162a);border-radius:6px;width:36px;height:36px}.V06-Ya_noteBar{border-bottom:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);align-items:flex-end;gap:8px;padding:6px 12px;display:flex}.V06-Ya_noteArea{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-bg,#0d0d1c);color:inherit;font:inherit;resize:vertical;border-radius:6px;flex:1;padding:6px 8px}.V06-Ya_select{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);max-width:240px;color:inherit;font:inherit;border-radius:6px;padding:4px 8px}.V06-Ya_smallBtn{border:1px solid var(--dsh-st-border,#2e2e48);color:inherit;font:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:4px 10px}.V06-Ya_smallBtn:disabled{opacity:.45;cursor:default}.V06-Ya_messages{flex-direction:column;flex:1;gap:14px;min-height:0;padding:16px;display:flex;overflow-y:auto}.V06-Ya_rowUser,.V06-Ya_rowChar{gap:10px;max-width:86%;display:flex}.V06-Ya_rowUser{flex-direction:row-reverse;align-self:flex-end}.V06-Ya_rowChar{align-self:flex-start}.V06-Ya_avatar{object-fit:cover;border-radius:6px;flex:none;width:44px;height:66px}.V06-Ya_bubble{background:var(--dsh-st-bubble,#23233d);border-radius:10px;min-width:0;padding:8px 12px}.V06-Ya_rowUser .V06-Ya_bubble{background:var(--dsh-st-bubble-user,#2c2a52)}.V06-Ya_meta{align-items:center;gap:8px;margin-bottom:2px;display:flex}.V06-Ya_name{opacity:.75;font-size:.85em}.V06-Ya_tools{gap:2px;display:none}.V06-Ya_meta:hover .V06-Ya_tools{display:inline-flex}.V06-Ya_toolBtn{color:inherit;cursor:pointer;opacity:.7;background:0 0;border:none;padding:0 4px}.V06-Ya_body p{white-space:pre-wrap;overflow-wrap:anywhere;margin:.35em 0}.V06-Ya_editBox{flex-direction:column;gap:6px;display:flex}.V06-Ya_editArea{box-sizing:border-box;border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);width:100%;color:inherit;font:inherit;resize:vertical;border-radius:6px;padding:6px}.V06-Ya_editActions{gap:6px;display:flex}.V06-Ya_swipeBar{border-top:1px dashed var(--dsh-st-border,#2e2e48);align-items:center;gap:8px;margin-top:6px;padding-top:4px;display:flex}.V06-Ya_swipeBtn{color:inherit;cursor:pointer;background:0 0;border:none;padding:0 6px}.V06-Ya_swipeBtn:disabled{opacity:.3;cursor:default}.V06-Ya_swipeCount{opacity:.7;font-size:.8em}.V06-Ya_error{color:#ffd7de;background:#5c1f2e;border-radius:6px;align-self:center;padding:6px 12px;font-size:.85em}.V06-Ya_composer{border-top:1px solid var(--dsh-st-border,#2e2e48);align-items:flex-end;gap:8px;padding:10px 12px;display:flex}.V06-Ya_input{resize:none;border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);color:inherit;font:inherit;border-radius:8px;flex:1;padding:8px 10px}.V06-Ya_input:disabled{opacity:.5}.V06-Ya_sendBtn{background:var(--dsh-st-accent,#4a4a9c);color:#fff;font:inherit;cursor:pointer;border:none;border-radius:8px;flex:none;padding:8px 16px}.V06-Ya_sendBtn:disabled{opacity:.45;cursor:default}";
		const tagId$2 = "@deepseek-ai/dsh-client-ui-st-chat/chat.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-st-chat";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var chat_module_css_default = {
			"toolbar": "V06-Ya_toolbar",
			"rowChar": "V06-Ya_rowChar",
			"spriteImg": "V06-Ya_spriteImg",
			"tools": "V06-Ya_tools",
			"noteBar": "V06-Ya_noteBar",
			"body": "V06-Ya_body",
			"editActions": "V06-Ya_editActions",
			"avatar": "V06-Ya_avatar",
			"swipeBar": "V06-Ya_swipeBar",
			"error": "V06-Ya_error",
			"composer": "V06-Ya_composer",
			"rowUser": "V06-Ya_rowUser",
			"name": "V06-Ya_name",
			"smallBtn": "V06-Ya_smallBtn",
			"bubble": "V06-Ya_bubble",
			"meta": "V06-Ya_meta",
			"noteArea": "V06-Ya_noteArea",
			"select": "V06-Ya_select",
			"editBox": "V06-Ya_editBox",
			"input": "V06-Ya_input",
			"messages": "V06-Ya_messages",
			"editArea": "V06-Ya_editArea",
			"swipeBtn": "V06-Ya_swipeBtn",
			"sendBtn": "V06-Ya_sendBtn",
			"toolBtn": "V06-Ya_toolBtn",
			"toolbarGap": "V06-Ya_toolbarGap",
			"swipeCount": "V06-Ya_swipeCount",
			"panel": "V06-Ya_panel"
		};
		//#endregion
		//#region src/client/MessageItem.tsx
		/**
		* One chat message row: avatar, name, body (editable), and ST swipe
		* navigation when alternates exist.
		*/
		/** ST's swipe floor: swipe_id 0 is the first alternate. */
		function swipeId(message) {
			return message.swipe_id ?? 0;
		}
		/** Render markdown-lite: paragraphs and line breaks only; full rendering lands with the theme pass. */
		function bodyLines(text) {
			return stripExpressionMarks(text).split(/\n{2,}/);
		}
		/**
		* One message row with edit-in-place and swipe controls.
		* @param props - row owner share.
		*/
		function MessageItem(props) {
			const { message } = props;
			const [editing, setEditing] = (0, react.useState)(false);
			const [draft, setDraft] = (0, react.useState)("");
			const areaRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!editing) return;
				setDraft(message.mes);
				areaRef.current?.focus();
			}, [editing, message.mes]);
			const swipes = message.swipes;
			const id = swipeId(message);
			const hasSwipes = swipes !== void 0 && swipes.length > 1;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: message.is_user ? chat_module_css_default.rowUser : chat_module_css_default.rowChar,
				children: [!message.is_user && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					className: chat_module_css_default.avatar,
					src: props.avatarUrl,
					alt: message.name,
					draggable: false
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: chat_module_css_default.bubble,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: chat_module_css_default.meta,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: chat_module_css_default.name,
								children: message.name
							}), !props.locked && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: chat_module_css_default.tools,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: chat_module_css_default.toolBtn,
										title: "编辑",
										onClick: () => {
											setEditing((v) => !v);
										},
										children: "✎"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: chat_module_css_default.toolBtn,
										title: "朗读",
										onClick: () => {
											speak(message.mes);
										},
										children: "🔊"
									}),
									props.onBranch !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: chat_module_css_default.toolBtn,
										title: "从此处分支（保存为新聊天）",
										onClick: props.onBranch,
										children: "🎋"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: chat_module_css_default.toolBtn,
										title: "删除",
										onClick: props.onDelete,
										children: "🗑"
									})
								]
							})]
						}),
						editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: chat_module_css_default.editBox,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								ref: areaRef,
								className: chat_module_css_default.editArea,
								value: draft,
								onChange: (e) => {
									setDraft(e.target.value);
								},
								rows: Math.max(3, draft.split("\n").length)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: chat_module_css_default.editActions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: chat_module_css_default.smallBtn,
									onClick: () => {
										props.onEdit(draft);
										setEditing(false);
									},
									children: "保存"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: chat_module_css_default.smallBtn,
									onClick: () => {
										setEditing(false);
									},
									children: "取消"
								})]
							})]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: chat_module_css_default.body,
							children: bodyLines(props.displayMes ?? message.mes).map((para, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: para }, i))
						}),
						hasSwipes && !editing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: chat_module_css_default.swipeBar,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: chat_module_css_default.swipeBtn,
									title: "上一个候选回复",
									disabled: id === 0,
									onClick: () => {
										props.onSwipe(id - 1);
									},
									children: "◀"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: chat_module_css_default.swipeCount,
									children: [
										id + 1,
										" / ",
										swipes.length
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: chat_module_css_default.swipeBtn,
									title: "下一个候选回复（末尾时生成新的）",
									onClick: () => {
										if (id < swipes.length - 1) props.onSwipe(id + 1);
										else props.onNewSwipe();
									},
									children: "▶"
								}),
								props.onDeleteSwipe !== void 0 && swipes.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: chat_module_css_default.swipeBtn,
									title: "删除当前候选回复",
									onClick: props.onDeleteSwipe,
									children: "✕"
								})
							]
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/contract.ts
		/** ST's placement flags: 0 display (deprecated MD_DISPLAY), 1 user input, 2 AI output. */
		const ST_REGEX_PLACEMENT = {
			USER_INPUT: 1,
			DISPLAY: 0,
			AI_OUTPUT: 2
		};
		//#endregion
		//#region src/client/regex.ts
		/** The targets a script runs on, resolving ST's placement array vs legacy booleans. */
		function scriptRunsOnDisplay(script) {
			if (script.placement.length > 0) return script.placement.includes(ST_REGEX_PLACEMENT.DISPLAY);
			return script.markdownOnly || !script.promptOnly;
		}
		/**
		* Apply every enabled display-targeting script to one rendered text.
		* @param scripts - all stored scripts, in file order.
		* @param text - the stored message text.
		* @param macros - {{user}}/{{char}} values; required only when a script substitutes.
		* @returns the display text; the stored text is never rewritten.
		*/
		function displayRegex(scripts, text, macros = {
			char: "",
			user: ""
		}) {
			let out = text;
			for (const script of scripts) {
				if (script.disabled || !scriptRunsOnDisplay(script)) continue;
				let replacement = script.replaceString;
				if (script.substituteRegex) replacement = replacement.replace(/\{\{char\}\}/gi, macros.char).replace(/\{\{user\}\}/gi, macros.user);
				try {
					out = out.replace(new RegExp(script.findRegex, "g"), replacement);
				} catch {}
				for (const trim of script.trimStrings) out = out.split(trim).join("");
			}
			return out;
		}
		//#endregion
		//#region src/client/ChatPanel.tsx
		/**
		* The chat panel: character selection, message flow with swipes, and the
		* composer driving SSE generation. Chat-file writes are client-driven (ST's
		* architecture: the server streams, the client owns the JSONL).
		*/
		/** Whether a row shows swipe affordances. */
		function hasSwipes(message) {
			return (message.swipes?.length ?? 0) > 1;
		}
		/** ST's per-swipe metadata: send_date plus generation timing. */
		function swipeInfo() {
			const now = (/* @__PURE__ */ new Date()).toISOString();
			return {
				send_date: now,
				gen_started: now,
				gen_finished: now,
				extra: {}
			};
		}
		/** ST's message construction for a fresh user row. */
		function userMessage(name, text) {
			return {
				name,
				is_user: true,
				send_date: (/* @__PURE__ */ new Date()).toISOString(),
				mes: text,
				extra: {}
			};
		}
		/**
		* Seed a fresh chat's opening row with the card's greeting swipes
		* (first_mes plus alternate_greetings); persists and returns the updated chat.
		* @param api - the ST HTTP client.
		* @param avatar - character avatar file name.
		* @param chatId - the freshly created chat id.
		* @param chat - the chat as served, opening row already seeded with first_mes.
		* @param greetings - the card's alternate greetings; empty list returns the chat unchanged.
		* @returns the chat with greeting swipes in place.
		*/
		async function seedGreetingSwipes(api, avatar, chatId, chat, greetings) {
			const first = chat.messages[0];
			if (greetings.length === 0 || first === void 0 || first.is_user) return chat;
			const swipes = [first.mes, ...greetings];
			const seeded = {
				...chat,
				messages: [{
					...first,
					swipes,
					swipe_id: 0
				}, ...chat.messages.slice(1)]
			};
			await api.saveChat(avatar, chatId, seeded);
			return seeded;
		}
		/**
		* The ST chat surface.
		* @param props - the {@link StFace} share (state hook, api, actions).
		*/
		function ChatPanel({ useSt, api, actions }) {
			const st = useSt((s) => s);
			const isGroup = st.avatar.startsWith("grp-");
			const [chat, setChat] = (0, react.useState)(null);
			const [characters, setCharacters] = (0, react.useState)([]);
			const [groups, setGroups] = (0, react.useState)([]);
			const [sprites, setSprites] = (0, react.useState)([]);
			const [input, setInput] = (0, react.useState)("");
			const [streamText, setStreamText] = (0, react.useState)("");
			const [generating, setGenerating] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const [noteOpen, setNoteOpen] = (0, react.useState)(false);
			const [noteDraft, setNoteDraft] = (0, react.useState)("");
			const [regexScripts, setRegexScripts] = (0, react.useState)([]);
			const abortRef = (0, react.useRef)(null);
			const bottomRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				api.listCharacters().then((rows) => {
					setCharacters(rows.map((r) => ({
						avatar: r.avatar,
						name: r.name
					})));
					if (st.avatar === "" && rows.length > 0) actions.setAvatar(rows[0].avatar);
				}).catch((e) => {
					setError(String(e));
				});
				api.listGroups().then((rows) => {
					setGroups(rows.map((r) => ({
						id: r.id,
						name: r.name
					})));
				}).catch((e) => {
					setError(String(e));
				});
			}, [
				api,
				actions,
				st.avatar
			]);
			/** Character avatar carrying a speaker name; undefined leaves the fallback image. */
			const avatarOfName = (0, react.useCallback)((name) => characters.find((c) => c.name === name)?.avatar, [characters]);
			/** Adopt a stored chat's persona name when the snapshot still carries the default. */
			const adoptChatUserName = (0, react.useCallback)((loaded) => {
				const stored = loaded.header.user_name;
				if (stored !== "" && stored !== "User" && (st.userName === "User" || st.userName === "")) actions.setUserName(stored);
			}, [actions, st.userName]);
			const loadChat = (0, react.useCallback)(async () => {
				if (st.avatar === "") {
					setChat(null);
					return;
				}
				setError("");
				try {
					let headerName;
					let firstMes = "";
					let greetings = [];
					if (isGroup) headerName = (await api.getGroup(st.avatar)).name;
					else {
						const full = await api.getCharacter(st.avatar);
						const card = full.card.data;
						headerName = full.name;
						firstMes = card.first_mes ?? "";
						greetings = Array.isArray(card.alternate_greetings) ? card.alternate_greetings : [];
					}
					const rows = await api.listChats(st.avatar);
					if (rows.length === 0) {
						const { chatId } = await api.createChat(st.avatar, st.userName, headerName, firstMes);
						actions.setChatId(chatId);
						const created = await api.getChat(st.avatar, chatId);
						setChat(await seedGreetingSwipes(api, st.avatar, chatId, created, greetings));
						return;
					}
					const row = st.chatId === "" ? rows[rows.length - 1] : rows.find((r) => r.file_id === st.chatId) ?? rows[rows.length - 1];
					actions.setChatId(row.file_id);
					const loaded = await api.getChat(st.avatar, row.file_id);
					adoptChatUserName(loaded);
					setChat(loaded);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				adoptChatUserName,
				api,
				actions,
				isGroup,
				st.avatar,
				st.chatId,
				st.userName
			]);
			(0, react.useEffect)(() => {
				loadChat();
			}, [loadChat]);
			(0, react.useEffect)(() => {
				const load = () => {
					api.listRegex().then(setRegexScripts).catch(() => {
						setRegexScripts([]);
					});
				};
				load();
				window.addEventListener("st-regex-updated", load);
				return () => {
					window.removeEventListener("st-regex-updated", load);
				};
			}, [api]);
			(0, react.useEffect)(() => {
				if (isGroup || st.avatar === "") {
					setSprites([]);
					return;
				}
				api.listSprites(st.avatar).then(setSprites).catch(() => {
					setSprites([]);
				});
			}, [
				api,
				isGroup,
				st.avatar
			]);
			/** ST's classic `[[expression]]` mark on the latest character row picks the sprite. */
			const currentExpression = (0, react.useMemo)(() => {
				if (isGroup || sprites.length === 0) return null;
				const mark = [...chat?.messages ?? []].reverse().find((m) => !m.is_user)?.mes.match(/\[\[([^\]]+)\]\]/)?.[1];
				return mark !== void 0 && sprites.includes(mark) ? mark : sprites[0] ?? null;
			}, [
				chat,
				isGroup,
				sprites
			]);
			(0, react.useEffect)(() => {
				bottomRef.current?.scrollIntoView({ behavior: "smooth" });
			}, [chat?.messages.length, streamText]);
			const persist = (0, react.useCallback)((next) => {
				const meta = next.header.chat_metadata ?? {};
				if (next.messages.length > 0 && !meta.tainted) next = {
					...next,
					header: {
						...next.header,
						chat_metadata: {
							...meta,
							tainted: true
						}
					}
				};
				setChat(next);
				if (st.avatar !== "" && st.chatId !== "") api.saveChat(st.avatar, st.chatId, next).catch((e) => {
					setError(String(e));
				});
			}, [
				api,
				st.avatar,
				st.chatId
			]);
			/** Stream one reply over the trimmed history `messages`; returns the reply. */
			const streamReply = (0, react.useCallback)(async (messages, replyAs, mode) => {
				const controller = new AbortController();
				abortRef.current = controller;
				setGenerating(true);
				setStreamText("");
				let text = "";
				try {
					text = await api.generate({
						avatar: st.avatar,
						chatId: st.chatId,
						...isGroup ? { group: true } : {},
						...replyAs === void 0 ? {} : { replyAs },
						...st.worlds.length > 0 ? { world: st.worlds } : {},
						...st.presetId === "" ? {} : { presetId: st.presetId },
						...st.model === "" ? {} : { model: st.model },
						...st.userName === "" ? {} : { userName: st.userName },
						...st.persona === "" ? {} : { persona: st.persona },
						...st.storyString === "" ? {} : { storyString: st.storyString },
						...st.instructId === "" ? {} : { instructId: st.instructId },
						...st.worldInfoDepth === void 0 ? {} : { worldInfoDepth: st.worldInfoDepth },
						...st.worldInfoBudget === void 0 ? {} : { worldInfoBudget: st.worldInfoBudget },
						...st.worldInfoRecursive === void 0 ? {} : { worldInfoRecursive: st.worldInfoRecursive },
						...st.worldInfoCaseSensitive === void 0 ? {} : { worldInfoCaseSensitive: st.worldInfoCaseSensitive },
						...st.worldInfoMatchWholeWords === void 0 ? {} : { worldInfoMatchWholeWords: st.worldInfoMatchWholeWords },
						...st.maxContextTokens === void 0 ? {} : { maxContextTokens: st.maxContextTokens },
						...mode?.impersonate === true ? { impersonate: true } : {},
						...mode?.continueGeneration === true ? { continueGeneration: true } : {},
						messages
					}, (delta) => {
						text += delta;
						setStreamText(text);
					}, controller.signal);
				} catch (e) {
					if (!(e instanceof Error && e.name === "AbortError")) throw e;
				} finally {
					abortRef.current = null;
					setGenerating(false);
					setStreamText("");
				}
				return text;
			}, [
				api,
				isGroup,
				st.avatar,
				st.chatId,
				st.instructId,
				st.maxContextTokens,
				st.model,
				st.persona,
				st.presetId,
				st.storyString,
				st.userName,
				st.worldInfoBudget,
				st.worldInfoCaseSensitive,
				st.worldInfoDepth,
				st.worldInfoMatchWholeWords,
				st.worldInfoRecursive,
				st.worlds
			]);
			/** Resolve the next speaking group member; null when none is enabled. */
			const nextGroupSpeaker = (0, react.useCallback)(async () => {
				const last = [...chat?.messages ?? []].reverse().find((m) => !m.is_user);
				const lastSpeakerId = last === void 0 ? void 0 : avatarOfName(last.name);
				const id = await api.nextSpeaker(st.avatar, lastSpeakerId);
				if (id === null) return null;
				return {
					id,
					name: characters.find((c) => c.avatar === id)?.name ?? id
				};
			}, [
				api,
				avatarOfName,
				characters,
				chat,
				st.avatar
			]);
			/** Generate one group member's reply over `messages` and persist it under that member's name. */
			const appendGroupReply = (0, react.useCallback)(async (base) => {
				const speaker = await nextGroupSpeaker();
				if (speaker === null) {
					setError("群聊没有启用的成员");
					persist(base);
					return;
				}
				const reply = await streamReply(base.messages, speaker.id);
				const member = {
					name: speaker.name,
					is_user: false,
					send_date: (/* @__PURE__ */ new Date()).toISOString(),
					mes: reply,
					extra: {},
					swipes: [reply],
					swipe_id: 0,
					swipe_info: [swipeInfo()]
				};
				persist({
					...base,
					messages: [...base.messages, member]
				});
			}, [
				nextGroupSpeaker,
				persist,
				streamReply
			]);
			const handleSend = (0, react.useCallback)(async () => {
				const text = input.trim();
				if (text === "" || chat === null || generating) return;
				setInput("");
				const user = userMessage(st.userName, text);
				const withUser = {
					...chat,
					messages: [...chat.messages, user]
				};
				persist(withUser);
				try {
					if (isGroup) {
						await appendGroupReply(withUser);
						return;
					}
					const reply = await streamReply(withUser.messages);
					const assistant = {
						name: chat.header.character_name,
						is_user: false,
						send_date: (/* @__PURE__ */ new Date()).toISOString(),
						mes: reply,
						extra: {},
						swipes: [reply],
						swipe_id: 0,
						swipe_info: [swipeInfo()]
					};
					persist({
						...withUser,
						messages: [...withUser.messages, assistant]
					});
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
					persist(withUser);
				}
			}, [
				appendGroupReply,
				chat,
				generating,
				input,
				isGroup,
				persist,
				st.userName,
				streamReply
			]);
			/** Group mode: trigger the next member's reply without a user row in between. */
			const handleMemberReply = (0, react.useCallback)(async () => {
				if (chat === null || generating || !isGroup) return;
				try {
					await appendGroupReply(chat);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				appendGroupReply,
				chat,
				generating,
				isGroup
			]);
			const handleStop = (0, react.useCallback)(() => {
				abortRef.current?.abort();
				abortRef.current = null;
				setGenerating(false);
				setStreamText("");
			}, []);
			const mutateMessage = (0, react.useCallback)((index, mutate) => {
				if (chat === null) return;
				const messages = [...chat.messages];
				messages[index] = mutate(messages[index]);
				persist({
					...chat,
					messages
				});
			}, [chat, persist]);
			const handleSwipe = (0, react.useCallback)((index, next) => {
				mutateMessage(index, (m) => {
					const swipes = m.swipes ?? [m.mes];
					const swipe = Math.max(0, Math.min(next, swipes.length - 1));
					return {
						...m,
						swipes,
						swipe_id: swipe,
						mes: swipes[swipe]
					};
				});
			}, [mutateMessage]);
			const handleNewSwipe = (0, react.useCallback)(async (index) => {
				if (chat === null || generating) return;
				const row0 = chat.messages[index];
				if (index === 0 && !row0.is_user && (row0.swipes?.length ?? 0) > 1) {
					handleSwipe(index, ((row0.swipe_id ?? 0) + 1) % row0.swipes.length);
					return;
				}
				try {
					const history = chat.messages.slice(0, index);
					const row = chat.messages[index];
					const reply = await streamReply(history, isGroup && !row.is_user ? avatarOfName(row.name) : void 0);
					mutateMessage(index, (m) => {
						const swipes = [...m.swipes ?? [m.mes], reply];
						const swipe_info = [...m.swipe_info ?? [swipeInfo()], swipeInfo()];
						return {
							...m,
							swipes,
							swipe_info,
							swipe_id: swipes.length - 1,
							mes: reply
						};
					});
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				avatarOfName,
				chat,
				generating,
				handleSwipe,
				isGroup,
				mutateMessage,
				streamReply
			]);
			const handleRegenerate = (0, react.useCallback)(async () => {
				if (chat === null || generating) return;
				const index = chat.messages.length - 1;
				if (index < 0 || chat.messages[index].is_user) return;
				await handleNewSwipe(index);
			}, [
				chat,
				generating,
				handleNewSwipe
			]);
			/** ST's impersonate: the reply becomes the user's next message draft (script.js fills the send box). */
			const handleImpersonate = (0, react.useCallback)(async () => {
				if (chat === null || generating) return;
				try {
					setInput(await streamReply(chat.messages, void 0, { impersonate: true }));
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				chat,
				generating,
				streamReply
			]);
			/** ST's continue: the reply appends to the last assistant message (script.js's `lastMessage.mes += getMessage`). */
			const handleContinue = (0, react.useCallback)(async () => {
				if (chat === null || generating) return;
				const index = chat.messages.length - 1;
				if (index < 0 || chat.messages[index].is_user) return;
				try {
					const reply = await streamReply(chat.messages, void 0, { continueGeneration: true });
					mutateMessage(index, (m) => ({
						...m,
						mes: m.mes + reply
					}));
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				chat,
				generating,
				mutateMessage,
				streamReply
			]);
			const handleDeleteMessage = (0, react.useCallback)((index) => {
				if (chat === null) return;
				persist({
					...chat,
					messages: chat.messages.filter((_, i) => i !== index)
				});
			}, [chat, persist]);
			/** ST's deleteSwipe: remove one swipe variant while keeping the message. */
			const handleDeleteSwipe = (0, react.useCallback)((index, swipeId) => {
				mutateMessage(index, (m) => {
					const swipes = m.swipes ?? [m.mes];
					if (swipes.length <= 1) return m;
					const newSwipes = swipes.filter((_, i) => i !== swipeId);
					const newSwipeInfo = (m.swipe_info ?? []).filter((_, i) => i !== swipeId);
					const currentId = m.swipe_id ?? 0;
					const newId = swipeId < currentId ? currentId - 1 : swipeId > currentId ? currentId : Math.min(swipeId, newSwipes.length - 1);
					return {
						...m,
						swipes: newSwipes,
						swipe_info: newSwipeInfo,
						swipe_id: newId,
						mes: newSwipes[newId]
					};
				});
			}, [mutateMessage]);
			/** ST's "branch from here": freeze rows up to `index` into a new chat file and switch to it. */
			const handleBranch = (0, react.useCallback)(async (index) => {
				if (chat === null || st.avatar === "" || st.chatId === "") return;
				setError("");
				try {
					const { chatId } = await api.checkpointChat(st.avatar, st.chatId, index);
					actions.setChatId(chatId);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				api,
				actions,
				chat,
				st.avatar,
				st.chatId
			]);
			/** ST's chat-scoped author's note: stored under chat_metadata.note_prompt and injected at note_depth. */
			const handleSaveNote = (0, react.useCallback)(() => {
				if (chat === null) return;
				persist({
					...chat,
					header: {
						...chat.header,
						chat_metadata: {
							...chat.header.chat_metadata,
							note_prompt: noteDraft
						}
					}
				});
				setNoteOpen(false);
			}, [
				chat,
				noteDraft,
				persist
			]);
			const handleNewChat = (0, react.useCallback)(async () => {
				if (st.avatar === "" || chat === null) return;
				let name;
				let firstMes = "";
				let greetings = [];
				if (isGroup) name = (await api.getGroup(st.avatar)).name;
				else {
					const full = await api.getCharacter(st.avatar);
					const card = full.card.data;
					name = full.name;
					firstMes = card.first_mes ?? "";
					greetings = Array.isArray(card.alternate_greetings) ? card.alternate_greetings : [];
				}
				const { chatId } = await api.createChat(st.avatar, st.userName, name, firstMes);
				actions.setChatId(chatId);
				const created = await api.getChat(st.avatar, chatId);
				setChat(await seedGreetingSwipes(api, st.avatar, chatId, created, greetings));
			}, [
				api,
				actions,
				chat,
				isGroup,
				st.avatar,
				st.userName
			]);
			const avatarUrl = api.avatarUrl(st.avatar || "none.png");
			/** Display-side regex macros: the chat's names, the same values the host substitutes. */
			const regexMacros = (0, react.useMemo)(() => ({
				char: chat?.header.character_name ?? "",
				user: st.userName !== "" ? st.userName : chat?.header.user_name ?? ""
			}), [
				chat?.header.character_name,
				chat?.header.user_name,
				st.userName
			]);
			/** One row's display text: display regex over the stored text, never persisted. */
			const displayMes = (0, react.useCallback)((m) => regexScripts.length === 0 ? m.mes : displayRegex(regexScripts, m.mes, regexMacros), [regexMacros, regexScripts]);
			/** Group rows carry each member's own avatar; character rows share the card's. */
			const rowAvatarUrl = (0, react.useCallback)((m) => api.avatarUrl((isGroup && !m.is_user ? avatarOfName(m.name) : void 0) ?? (st.avatar || "none.png")), [
				api,
				avatarOfName,
				isGroup,
				st.avatar
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: chat_module_css_default.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: chat_module_css_default.toolbar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: chat_module_css_default.select,
								value: st.avatar,
								onChange: (e) => {
									actions.setAvatar(e.target.value);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("optgroup", {
									label: "角色",
									children: characters.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: c.avatar,
										children: c.name
									}, c.avatar))
								}), groups.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("optgroup", {
									label: "群聊",
									children: groups.map((g) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: g.id,
										children: g.name
									}, g.id))
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: chat_module_css_default.smallBtn,
								onClick: () => {
									handleNewChat();
								},
								children: "＋ 新对话"
							}),
							isGroup && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: chat_module_css_default.smallBtn,
								title: "让下一位群成员发言",
								disabled: generating || chat === null,
								onClick: () => {
									handleMemberReply();
								},
								children: "🎤 成员发言"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: chat_module_css_default.toolbarGap }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: chat_module_css_default.smallBtn,
								title: "作者注释（随对话注入提示词）",
								disabled: chat === null,
								onClick: () => {
									setNoteDraft(String(chat?.header.chat_metadata.note_prompt ?? ""));
									setNoteOpen((v) => !v);
								},
								children: "📝 注释"
							}),
							currentExpression !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								className: chat_module_css_default.spriteImg,
								src: api.spriteUrl(st.avatar, currentExpression),
								alt: currentExpression,
								title: `表情：${currentExpression}`,
								draggable: false
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: chat_module_css_default.smallBtn,
								title: "重新生成最后一条回复（作为一个新 swipe）",
								disabled: generating || chat === null,
								onClick: () => {
									handleRegenerate();
								},
								children: "↻ 重新生成"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: chat_module_css_default.smallBtn,
								title: "以用户口吻代写下一条消息（填入输入框，不直接发送）",
								disabled: generating || chat === null,
								onClick: () => {
									handleImpersonate();
								},
								children: "✍ 代写"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: chat_module_css_default.smallBtn,
								title: "续写最后一条回复（追加到末尾）",
								disabled: generating || chat === null || chat.messages.length === 0 || chat.messages[chat.messages.length - 1].is_user,
								onClick: () => {
									handleContinue();
								},
								children: "⏩ 续写"
							})
						]
					}),
					noteOpen && chat !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: chat_module_css_default.noteBar,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: chat_module_css_default.noteArea,
							value: noteDraft,
							placeholder: "作者注释：固定注入到对话上下文的导演指令…",
							onChange: (e) => {
								setNoteDraft(e.target.value);
							},
							rows: 2
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: chat_module_css_default.smallBtn,
							onClick: handleSaveNote,
							children: "保存"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: chat_module_css_default.messages,
						children: [
							chat?.messages.map((m, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MessageItem, {
								message: m,
								displayMes: regexScripts.length === 0 ? void 0 : displayMes(m),
								avatarUrl: rowAvatarUrl(m),
								locked: generating,
								onSwipe: (next) => {
									handleSwipe(i, next);
								},
								onNewSwipe: () => {
									handleNewSwipe(i);
								},
								onEdit: (text) => {
									mutateMessage(i, (msg) => {
										const swipes = hasSwipes(msg) ? [...msg.swipes ?? []] : void 0;
										if (swipes !== void 0) {
											const id = msg.swipe_id ?? 0;
											swipes[id] = text;
											return {
												...msg,
												mes: text,
												swipes
											};
										}
										return {
											...msg,
											mes: text
										};
									});
								},
								onDelete: () => {
									handleDeleteMessage(i);
								},
								onDeleteSwipe: () => {
									handleDeleteSwipe(i, m.swipe_id ?? 0);
								},
								onBranch: () => {
									handleBranch(i);
								}
							}, i)),
							streamText !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: chat_module_css_default.rowChar,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
									className: chat_module_css_default.avatar,
									src: avatarUrl,
									alt: "",
									draggable: false
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: chat_module_css_default.bubble,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: chat_module_css_default.body,
										children: streamText.split(/\n{2,}/).map((para, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: stripExpressionMarks(regexScripts.length === 0 ? para : displayRegex(regexScripts, para, regexMacros)) }, i))
									})
								})]
							}),
							error !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: chat_module_css_default.error,
								children: error
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { ref: bottomRef })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: chat_module_css_default.composer,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: chat_module_css_default.input,
							value: input,
							placeholder: chat === null ? "请先选择角色…" : "输入消息…",
							disabled: chat === null,
							onChange: (e) => {
								setInput(e.target.value);
							},
							onKeyDown: (e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSend();
								}
							},
							rows: 2
						}), generating ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: chat_module_css_default.sendBtn,
							onClick: handleStop,
							children: "■ 停止"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: chat_module_css_default.sendBtn,
							disabled: input.trim() === "" || chat === null,
							onClick: () => {
								handleSend();
							},
							children: "➤ 发送"
						})]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:D:\deepseek harness\packages\client\ui-st-chat\src\client\chats.module.css.mjs
		const css$1 = "._0WBYIq_panel{background:var(--dsh-st-bg,#1a1a2e);min-width:0;min-height:0;color:var(--dsh-st-fg,#e8e8f0);flex-direction:column;flex:1;display:flex}._0WBYIq_toolbar{border-bottom:1px solid var(--dsh-st-border,#2e2e48);align-items:center;gap:8px;padding:10px 16px;display:flex}._0WBYIq_count{opacity:.85;margin-right:auto}._0WBYIq_toolBtn,._0WBYIq_toolBtnDisabled{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);font:inherit;cursor:pointer;color:inherit;border-radius:8px;padding:5px 12px;display:inline-block}._0WBYIq_toolBtn:hover{background:var(--dsh-st-hover,#26264a)}._0WBYIq_toolBtnDisabled,._0WBYIq_toolBtn:disabled{opacity:.45;cursor:not-allowed}._0WBYIq_searchBar{border-bottom:1px solid var(--dsh-st-border,#2e2e48);align-items:center;gap:8px;padding:8px 16px;display:flex}._0WBYIq_searchInput{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);min-width:0;color:inherit;font:inherit;border-radius:8px;flex:1;padding:5px 10px}._0WBYIq_fileInput{display:none}._0WBYIq_error{color:#f0b8c8;background:#2e1a24;border:1px solid #7a2e3f;border-radius:8px;margin:8px 16px;padding:8px 12px}._0WBYIq_list{flex-direction:column;flex:1;gap:6px;min-height:0;padding:8px;display:flex;overflow-y:auto}._0WBYIq_row,._0WBYIq_rowActive{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);cursor:pointer;border-radius:10px;align-items:center;gap:8px;padding:10px 12px;display:flex}._0WBYIq_row:hover{background:var(--dsh-st-hover,#26264a)}._0WBYIq_rowActive{background:var(--dsh-st-accent-dim,#37376b)}._0WBYIq_rowMain{flex:1;min-width:0}._0WBYIq_rowName{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}._0WBYIq_rowMeta{opacity:.65;font-size:12px}._0WBYIq_rowActions{gap:4px;display:flex}._0WBYIq_miniBtn{border:1px solid var(--dsh-st-border,#2e2e48);font:inherit;cursor:pointer;color:inherit;background:0 0;border-radius:6px;padding:3px 8px}._0WBYIq_miniBtn:hover{background:var(--dsh-st-hover,#26264a)}._0WBYIq_empty{opacity:.7;margin:auto}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-st-chat/chats.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-st-chat";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var chats_module_css_default = {
			"searchBar": "_0WBYIq_searchBar",
			"fileInput": "_0WBYIq_fileInput",
			"toolbar": "_0WBYIq_toolbar",
			"error": "_0WBYIq_error",
			"toolBtn": "_0WBYIq_toolBtn",
			"count": "_0WBYIq_count",
			"list": "_0WBYIq_list",
			"rowActions": "_0WBYIq_rowActions",
			"rowName": "_0WBYIq_rowName",
			"miniBtn": "_0WBYIq_miniBtn",
			"empty": "_0WBYIq_empty",
			"panel": "_0WBYIq_panel",
			"toolBtnDisabled": "_0WBYIq_toolBtnDisabled",
			"rowMeta": "_0WBYIq_rowMeta",
			"rowActive": "_0WBYIq_rowActive",
			"row": "_0WBYIq_row",
			"rowMain": "_0WBYIq_rowMain",
			"searchInput": "_0WBYIq_searchInput"
		};
		//#endregion
		//#region src/client/ChatsPanel.tsx
		/**
		* The chats panel: past-chat management for the selected character — switch,
		* start a new chat, delete, and jsonl/text export/import, plus ST's global
		* message search — mirroring ST's chat file drawer and searchMessage.
		*/
		/**
		* The ST chat-management surface.
		* @param props - the {@link StFace} share (state hook, api, actions).
		*/
		function ChatsPanel({ useSt, api, actions }) {
			const avatar = useSt((s) => s.avatar);
			const chatId = useSt((s) => s.chatId);
			const userName = useSt((s) => s.userName);
			const [rows, setRows] = (0, react.useState)([]);
			const [characterName, setCharacterName] = (0, react.useState)("");
			const [error, setError] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [query, setQuery] = (0, react.useState)("");
			const [hits, setHits] = (0, react.useState)([]);
			const refresh = (0, react.useCallback)(async () => {
				if (avatar === "") {
					setRows([]);
					return;
				}
				setError("");
				try {
					const [list, full] = await Promise.all([api.listChats(avatar), api.getCharacter(avatar)]);
					setRows(list);
					setCharacterName(full.name);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api, avatar]);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			const runSearch = (0, react.useCallback)(async (text) => {
				if (text.trim() === "") {
					setHits([]);
					return;
				}
				setError("");
				try {
					setHits(await api.searchChats(text.trim()));
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api]);
			/** ST's search hit opens its chat: switch avatar + chat, then the chat panel. */
			const openHit = (0, react.useCallback)((hit) => {
				actions.setAvatar(hit.avatar);
				actions.setChatId(hit.chatId);
				actions.setPanel("chat");
			}, [actions]);
			const open = (0, react.useCallback)((row) => {
				actions.setChatId(row.file_id);
				actions.setPanel("chat");
			}, [actions]);
			/** Start a fresh chat seeded with the card's first message, ST's "Start new chat". */
			const startNew = (0, react.useCallback)(async () => {
				if (avatar === "") return;
				setBusy(true);
				try {
					const full = await api.getCharacter(avatar);
					const card = full.card.data;
					const { chatId: created } = await api.createChat(avatar, userName, full.name, card.first_mes ?? "");
					actions.setChatId(created);
					setRows(await api.listChats(avatar));
					actions.setPanel("chat");
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, [
				actions,
				api,
				avatar,
				userName
			]);
			const remove = (0, react.useCallback)(async (row) => {
				if (!window.confirm(`删除聊天 ${row.file_name}？此操作不可撤销。`)) return;
				setBusy(true);
				try {
					await api.deleteChat(avatar, row.file_id);
					if (row.file_id === chatId) actions.setChatId("");
					setRows(await api.listChats(avatar));
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, [
				actions,
				api,
				avatar,
				chatId
			]);
			const exportOne = (0, react.useCallback)(async (row, format) => {
				try {
					const content = format === "jsonl" ? await api.exportChat(avatar, row.file_id) : await api.exportChatText(avatar, row.file_id);
					const base = row.file_name.endsWith(".jsonl") ? row.file_name.slice(0, -6) : row.file_name;
					const url = URL.createObjectURL(new Blob([content], { type: format === "jsonl" ? "application/jsonl" : "text/plain" }));
					const a = document.createElement("a");
					a.href = url;
					a.download = `${base}.${format === "jsonl" ? "jsonl" : "txt"}`;
					a.click();
					URL.revokeObjectURL(url);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api, avatar]);
			const importFile = (0, react.useCallback)(async (file) => {
				setBusy(true);
				try {
					const jsonl = await file.text();
					const { chatId: imported } = await api.importChat(avatar, jsonl);
					setRows(await api.listChats(avatar));
					actions.setChatId(imported);
					actions.setPanel("chat");
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, [
				actions,
				api,
				avatar
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: chats_module_css_default.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: chats_module_css_default.toolbar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: chats_module_css_default.count,
								children: characterName === "" ? "未选择角色" : `${characterName} · ${rows.length} 个聊天`
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: chats_module_css_default.toolBtn,
								onClick: () => {
									refresh();
								},
								disabled: busy || avatar === "",
								children: "⟳ 刷新"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: chats_module_css_default.toolBtn,
								onClick: () => {
									startNew();
								},
								disabled: busy || avatar === "",
								children: "＋ 新聊天"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: avatar === "" ? chats_module_css_default.toolBtnDisabled : chats_module_css_default.toolBtn,
								children: ["📥 导入 jsonl", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "file",
									accept: ".jsonl,application/jsonl",
									className: chats_module_css_default.fileInput,
									disabled: avatar === "",
									onChange: (e) => {
										const file = e.target.files?.[0];
										if (file !== void 0) importFile(file);
										e.target.value = "";
									}
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: chats_module_css_default.searchBar,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: chats_module_css_default.searchInput,
							type: "search",
							placeholder: "🔍 搜索所有聊天的消息…",
							value: query,
							onChange: (e) => {
								setQuery(e.target.value);
							},
							onKeyDown: (e) => {
								if (e.key === "Enter") runSearch(query);
							}
						}), query.trim() !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: chats_module_css_default.toolBtn,
							onClick: () => {
								setQuery("");
								setHits([]);
							},
							children: "清除"
						})]
					}),
					error !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: chats_module_css_default.error,
						children: error
					}),
					query.trim() !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: chats_module_css_default.list,
						children: [hits.map((hit) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: chats_module_css_default.row,
							onClick: () => {
								openHit(hit);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: chats_module_css_default.rowMain,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: chats_module_css_default.rowName,
									children: [
										hit.characterName,
										" · ",
										hit.chatId
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: chats_module_css_default.rowMeta,
									children: hit.snippet
								})]
							})
						}, `${hit.avatar}/${hit.chatId}/${hit.messageIndex}`)), hits.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: chats_module_css_default.empty,
							children: "没有匹配的消息"
						})]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: chats_module_css_default.list,
						children: [rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: row.file_id === chatId ? chats_module_css_default.rowActive : chats_module_css_default.row,
							onClick: () => {
								open(row);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: chats_module_css_default.rowMain,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: chats_module_css_default.rowName,
									title: row.file_name,
									children: row.file_name
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: chats_module_css_default.rowMeta,
									children: [
										row.chat_items,
										" 条消息 · ",
										row.file_size
									]
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: chats_module_css_default.rowActions,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: chats_module_css_default.miniBtn,
										title: "导出纯文本",
										onClick: (e) => {
											e.stopPropagation();
											exportOne(row, "text");
										},
										children: "📄"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: chats_module_css_default.miniBtn,
										title: "导出 jsonl",
										onClick: (e) => {
											e.stopPropagation();
											exportOne(row, "jsonl");
										},
										children: "⭳"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: chats_module_css_default.miniBtn,
										title: "删除",
										onClick: (e) => {
											e.stopPropagation();
											remove(row);
										},
										children: "✕"
									})
								]
							})]
						}, row.file_id)), avatar !== "" && rows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: chats_module_css_default.empty,
							children: "还没有聊天——新建一个吧。"
						})]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:D:\deepseek harness\packages\client\ui-st-chat\src\client\groups.module.css.mjs
		const css = ".KuIrdq_panel{background:var(--dsh-st-bg,#1a1a2e);min-width:0;min-height:0;color:var(--dsh-st-fg,#e8e8f0);flex-direction:column;flex:1;display:flex}.KuIrdq_toolbar{border-bottom:1px solid var(--dsh-st-border,#2e2e48);align-items:center;gap:8px;padding:10px 16px;display:flex}.KuIrdq_count{opacity:.85;margin-right:auto}.KuIrdq_toolBtn{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);font:inherit;cursor:pointer;color:inherit;border-radius:8px;padding:5px 12px}.KuIrdq_toolBtn:hover{background:var(--dsh-st-hover,#26264a)}.KuIrdq_toolBtn:disabled{opacity:.45;cursor:not-allowed}.KuIrdq_form{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);border-radius:10px;flex-direction:column;gap:10px;margin:10px 16px;padding:12px;display:flex}.KuIrdq_input{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-bg,#1a1a2e);font:inherit;color:inherit;border-radius:8px;padding:6px 10px}.KuIrdq_picker{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:4px 12px;display:grid}.KuIrdq_pickRow{align-items:center;gap:6px;font-size:.9em;display:flex}.KuIrdq_primaryBtn{background:var(--dsh-st-accent,#4a4a9c);font:inherit;cursor:pointer;color:inherit;border:none;border-radius:8px;align-self:flex-start;padding:6px 16px}.KuIrdq_primaryBtn:disabled{opacity:.5;cursor:not-allowed}.KuIrdq_error{color:#f0b8c8;background:#2e1a24;border:1px solid #7a2e3f;border-radius:8px;margin:8px 16px;padding:8px 12px}.KuIrdq_list{flex-direction:column;flex:1;gap:10px;min-height:0;padding:8px 16px;display:flex;overflow-y:auto}.KuIrdq_card,.KuIrdq_cardActive{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);border-radius:10px;flex-direction:column;gap:8px;padding:12px;display:flex}.KuIrdq_cardActive{border-color:var(--dsh-st-accent,#4a4a9c)}.KuIrdq_cardHead{align-items:center;gap:8px;display:flex}.KuIrdq_cardName{text-overflow:ellipsis;white-space:nowrap;font-weight:600;overflow:hidden}.KuIrdq_select{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-bg,#1a1a2e);font:inherit;color:inherit;border-radius:8px;padding:4px 8px}.KuIrdq_miniBtn{border:1px solid var(--dsh-st-border,#2e2e48);font:inherit;cursor:pointer;color:inherit;background:0 0;border-radius:6px;padding:3px 8px}.KuIrdq_miniBtn:hover{background:var(--dsh-st-hover,#26264a)}.KuIrdq_members{flex-direction:column;gap:4px;display:flex}.KuIrdq_member{align-items:center;gap:12px;font-size:.9em;display:flex}.KuIrdq_memberName{text-overflow:ellipsis;white-space:nowrap;flex:1;align-items:center;gap:6px;min-width:0;display:flex;overflow:hidden}.KuIrdq_weight{opacity:.85;align-items:center;gap:4px;display:flex}.KuIrdq_weight input{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-bg,#1a1a2e);width:56px;font:inherit;color:inherit;border-radius:6px;padding:3px 6px}.KuIrdq_empty{opacity:.7;margin:auto}";
		const tagId = "@deepseek-ai/dsh-client-ui-st-chat/groups.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-st-chat";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var groups_module_css_default = {
			"member": "KuIrdq_member",
			"empty": "KuIrdq_empty",
			"toolbar": "KuIrdq_toolbar",
			"form": "KuIrdq_form",
			"input": "KuIrdq_input",
			"cardName": "KuIrdq_cardName",
			"members": "KuIrdq_members",
			"pickRow": "KuIrdq_pickRow",
			"cardHead": "KuIrdq_cardHead",
			"error": "KuIrdq_error",
			"list": "KuIrdq_list",
			"card": "KuIrdq_card",
			"toolBtn": "KuIrdq_toolBtn",
			"select": "KuIrdq_select",
			"miniBtn": "KuIrdq_miniBtn",
			"memberName": "KuIrdq_memberName",
			"weight": "KuIrdq_weight",
			"primaryBtn": "KuIrdq_primaryBtn",
			"panel": "KuIrdq_panel",
			"cardActive": "KuIrdq_cardActive",
			"picker": "KuIrdq_picker",
			"count": "KuIrdq_count"
		};
		//#endregion
		//#region src/client/GroupsPanel.tsx
		/**
		* The groups panel: multi-character group management — create groups, pick
		* members from the character roster, toggle/weight members, choose the
		* activation strategy, and start a group chat, mirroring ST's group editor.
		*/
		const ACTIVATIONS = [
			{
				value: 0,
				label: "自然顺序"
			},
			{
				value: 1,
				label: "列表顺序"
			},
			{
				value: 2,
				label: "手动选择"
			},
			{
				value: 3,
				label: "随机池"
			}
		];
		/**
		* The ST group-management surface.
		* @param props - the {@link StFace} share (state hook, api, actions).
		*/
		function GroupsPanel({ useSt, api, actions }) {
			const avatar = useSt((s) => s.avatar);
			const [groups, setGroups] = (0, react.useState)([]);
			const [characters, setCharacters] = (0, react.useState)([]);
			const [error, setError] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [showForm, setShowForm] = (0, react.useState)(false);
			const [name, setName] = (0, react.useState)("");
			const [picked, setPicked] = (0, react.useState)([]);
			const refresh = (0, react.useCallback)(async () => {
				setError("");
				try {
					const [groupRows, characterRows] = await Promise.all([api.listGroups(), api.listCharacters()]);
					setGroups(groupRows);
					setCharacters(characterRows);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api]);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			const submitCreate = (0, react.useCallback)(async () => {
				if (name.trim() === "") {
					setError("请输入群聊名称");
					return;
				}
				if (picked.length < 2) {
					setError("群聊至少需要 2 名成员");
					return;
				}
				setBusy(true);
				try {
					const { id } = await api.createGroup({
						name: name.trim(),
						members: picked.map((characterId) => ({
							character_id: characterId,
							enabled: true,
							weight: 100
						})),
						activation_strategy: 0
					});
					setName("");
					setPicked([]);
					setShowForm(false);
					setGroups(await api.listGroups());
					actions.setAvatar(id);
					actions.setChatId("");
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, [
				actions,
				api,
				name,
				picked
			]);
			const patchGroup = (0, react.useCallback)(async (group, patch) => {
				setGroups((rows) => rows.map((g) => g.id === group.id ? {
					...g,
					...patch
				} : g));
				try {
					await api.updateGroup(group.id, patch);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
					await refresh();
				}
			}, [api, refresh]);
			const patchMember = (0, react.useCallback)((group, characterId, patch) => {
				patchGroup(group, { members: group.members.map((m) => m.character_id === characterId ? {
					...m,
					...patch
				} : m) });
			}, [patchGroup]);
			const togglePick = (0, react.useCallback)((characterAvatar) => {
				setPicked((rows) => rows.includes(characterAvatar) ? rows.filter((a) => a !== characterAvatar) : [...rows, characterAvatar]);
			}, []);
			const startChat = (0, react.useCallback)(async (group) => {
				actions.setAvatar(group.id);
				actions.setChatId("");
				actions.setPanel("chat");
			}, [actions]);
			const remove = (0, react.useCallback)(async (group) => {
				if (!window.confirm(`删除群聊 ${group.name}？（聊天记录保留在磁盘上）`)) return;
				try {
					await api.deleteGroup(group.id);
					if (group.id === avatar) actions.setAvatar("");
					await refresh();
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				actions,
				api,
				avatar,
				refresh
			]);
			const nameOf = (0, react.useCallback)((characterId) => characters.find((c) => c.avatar === characterId)?.name ?? characterId, [characters]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: groups_module_css_default.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: groups_module_css_default.toolbar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: groups_module_css_default.count,
								children: [groups.length, " 个群聊"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: groups_module_css_default.toolBtn,
								onClick: () => {
									refresh();
								},
								disabled: busy,
								children: "⟳ 刷新"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: groups_module_css_default.toolBtn,
								onClick: () => {
									setShowForm(!showForm);
								},
								children: "＋ 新建群聊"
							})
						]
					}),
					showForm && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: groups_module_css_default.form,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: groups_module_css_default.input,
								placeholder: "群聊名称",
								value: name,
								onChange: (e) => {
									setName(e.target.value);
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: groups_module_css_default.picker,
								children: characters.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: groups_module_css_default.pickRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: picked.includes(c.avatar),
										onChange: () => {
											togglePick(c.avatar);
										}
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: c.name })]
								}, c.avatar))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: groups_module_css_default.primaryBtn,
								onClick: () => {
									submitCreate();
								},
								disabled: busy,
								children: [
									"创建（",
									picked.length,
									" 名成员）"
								]
							})
						]
					}),
					error !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: groups_module_css_default.error,
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: groups_module_css_default.list,
						children: [groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: group.id === avatar ? groups_module_css_default.cardActive : groups_module_css_default.card,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: groups_module_css_default.cardHead,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: groups_module_css_default.cardName,
										title: group.id,
										children: group.name
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
										className: groups_module_css_default.select,
										value: group.activation_strategy,
										onChange: (e) => {
											patchGroup(group, { activation_strategy: Number(e.target.value) });
										},
										children: ACTIVATIONS.map((a) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: a.value,
											children: a.label
										}, a.value))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: groups_module_css_default.toolBtn,
										onClick: () => {
											startChat(group);
										},
										children: "💬 进入聊天"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: groups_module_css_default.miniBtn,
										title: "删除",
										onClick: () => {
											remove(group);
										},
										children: "✕"
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: groups_module_css_default.members,
								children: group.members.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: groups_module_css_default.member,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: groups_module_css_default.memberName,
										title: m.character_id,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: m.enabled,
											onChange: () => {
												patchMember(group, m.character_id, { enabled: !m.enabled });
											}
										}), nameOf(m.character_id)]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: groups_module_css_default.weight,
										children: ["权重", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "number",
											min: 0,
											max: 100,
											value: m.weight,
											onChange: (e) => {
												patchMember(group, m.character_id, { weight: Number(e.target.value) });
											}
										})]
									})]
								}, m.character_id))
							})]
						}, group.id)), groups.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: groups_module_css_default.empty,
							children: "还没有群聊——新建一个，把多个角色拉进同一场对话。"
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/apply.tsx
		/** Services required by the browser plugin. */
		const inject = ["slots"];
		/** The shipped nav row for the chat surface; the panel key is closed over. */
		function ChatNavRow(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: props.panel === "chat" ? st_shell_module_css_default.navBtnActive : st_shell_module_css_default.navBtn,
				onClick: () => {
					props.select("chat");
				},
				children: "💬 对话"
			});
		}
		/** The nav row for the chat-management surface. */
		function ChatsNavRow(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: props.panel === "chats" ? st_shell_module_css_default.navBtnActive : st_shell_module_css_default.navBtn,
				onClick: () => {
					props.select("chats");
				},
				children: "🗂 聊天"
			});
		}
		/** The nav row for the group-management surface. */
		function GroupsNavRow(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: props.panel === "groups" ? st_shell_module_css_default.navBtnActive : st_shell_module_css_default.navBtn,
				onClick: () => {
					props.select("groups");
				},
				children: "👪 群聊"
			});
		}
		/**
		* Mount the ST surface into the layout's conversation seat.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const { source, actions } = createStUiState();
			const face = {
				hooks: { st: source },
				api: stApi,
				actions
			};
			ctx.slots.inject("conversation", () => {
				const disposeShell = ctx.slots.register({
					name: "conversation",
					priority: -1,
					children: {
						"st.nav": {
							kind: "list",
							scope: "root"
						},
						"st.panel": {
							kind: "keyed",
							scope: "root",
							inject: face
						}
					},
					inject: () => face
				}, StShell);
				const disposeNav = ctx.slots.register({
					name: "st.nav",
					id: "chat",
					order: 0
				}, ChatNavRow);
				const disposePanel = ctx.slots.register({
					name: "st.panel",
					key: "chat"
				}, ChatPanel);
				const disposeChatsNav = ctx.slots.register({
					name: "st.nav",
					id: "chats",
					order: 5
				}, ChatsNavRow);
				const disposeChatsPanel = ctx.slots.register({
					name: "st.panel",
					key: "chats"
				}, ChatsPanel);
				const disposeGroupsNav = ctx.slots.register({
					name: "st.nav",
					id: "groups",
					order: 12
				}, GroupsNavRow);
				return [
					ctx.slots.register({
						name: "st.panel",
						key: "groups"
					}, GroupsPanel),
					disposeGroupsNav,
					disposeChatsPanel,
					disposeChatsNav,
					disposePanel,
					disposeNav,
					disposeShell
				];
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map