window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-st-lorebook",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:D:\deepseek harness\packages\client\ui-st-lorebook\src\client\lorebook.module.css.mjs
		const css = ".NriOdW_panel{background:var(--dsh-st-bg,#1a1a2e);min-width:0;min-height:0;color:var(--dsh-st-fg,#e8e8f0);flex:1;display:flex}.NriOdW_globalBar{border-bottom:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);flex-direction:column;gap:6px;padding:10px 16px;display:flex}.NriOdW_globalTitle{opacity:.8;font-size:12px}.NriOdW_books{border-right:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);flex-direction:column;flex:none;width:180px;display:flex}.NriOdW_booksHead,.NriOdW_entriesHead,.NriOdW_entriesFoot{align-items:center;gap:8px;padding:10px 12px;display:flex}.NriOdW_booksHead span,.NriOdW_entriesHead span{opacity:.7;margin-right:auto}.NriOdW_bookRow,.NriOdW_bookRowActive,.NriOdW_entryRow,.NriOdW_entryRowActive{align-items:center;gap:4px;padding:2px 8px;display:flex}.NriOdW_bookBtn,.NriOdW_entryBtn{text-align:left;min-width:0;font:inherit;color:inherit;cursor:pointer;text-overflow:ellipsis;white-space:nowrap;background:0 0;border:none;border-radius:8px;flex:1;padding:6px 8px;overflow:hidden}.NriOdW_bookRow .NriOdW_bookBtn:hover,.NriOdW_entryRow .NriOdW_entryBtn:hover{background:var(--dsh-st-hover,#26264a)}.NriOdW_bookRowActive .NriOdW_bookBtn,.NriOdW_entryRowActive .NriOdW_entryBtn{background:var(--dsh-st-accent-dim,#37376b)}.NriOdW_activeTag{color:gold}.NriOdW_entries{border-right:1px solid var(--dsh-st-border,#2e2e48);flex-direction:column;flex:none;width:260px;min-height:0;display:flex}.NriOdW_entryList{flex:1;min-height:0;padding:4px 0;overflow-y:auto}.NriOdW_entriesFoot{border-top:1px solid var(--dsh-st-border,#2e2e48);justify-content:flex-end}.NriOdW_editor{flex:1;min-width:0;padding:16px;overflow-y:auto}.NriOdW_form{flex-direction:column;gap:12px;max-width:640px;display:flex}.NriOdW_label{opacity:.9;flex-direction:column;gap:4px;font-size:.9em;display:flex}.NriOdW_row{gap:16px;display:flex}.NriOdW_check{cursor:pointer;align-items:center;gap:6px;display:flex}.NriOdW_number{opacity:.9;flex-direction:column;flex:1;gap:4px;font-size:.9em;display:flex}.NriOdW_input,.NriOdW_textarea{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);color:inherit;font:inherit;border-radius:8px;padding:8px}.NriOdW_textarea{resize:vertical}.NriOdW_miniBtn,.NriOdW_toolBtn,.NriOdW_primaryBtn{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);color:inherit;font:inherit;cursor:pointer;border-radius:8px;padding:4px 10px}.NriOdW_miniBtn{border:none;padding:4px 8px}.NriOdW_miniBtn:hover,.NriOdW_toolBtn:hover{background:var(--dsh-st-hover,#26264a)}.NriOdW_miniBtn:disabled,.NriOdW_toolBtn:disabled{opacity:.4;cursor:default}.NriOdW_primaryBtn{background:var(--dsh-st-accent-dim,#37376b);border-color:#0000}.NriOdW_primaryBtn:disabled{opacity:.5;cursor:default}.NriOdW_hint{opacity:.6;margin:auto;padding:12px}.NriOdW_offTag{opacity:.5}.NriOdW_error{color:#f88;border:1px solid #a33;border-radius:8px;margin-top:12px;padding:8px 12px}.NriOdW_hitList{flex-direction:column;gap:8px;display:flex}.NriOdW_hit{border:1px solid var(--dsh-st-border,#2e2e48);border-radius:8px;flex-direction:column;gap:4px;padding:8px 10px;font-size:.9em;display:flex}.NriOdW_hitMeta{opacity:.6;font-size:.85em}.NriOdW_navBtn,.NriOdW_navBtnActive{text-align:left;font:inherit;cursor:pointer;color:inherit;border:none;border-radius:8px;padding:8px 12px;display:block}.NriOdW_navBtn{background:0 0}.NriOdW_navBtn:hover{background:var(--dsh-st-hover,#26264a)}.NriOdW_navBtnActive{background:var(--dsh-st-accent-dim,#37376b)}";
		const tagId = "@deepseek-ai/dsh-client-ui-st-lorebook/lorebook.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-st-lorebook";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var lorebook_module_css_default = {
			"navBtnActive": "NriOdW_navBtnActive",
			"bookRowActive": "NriOdW_bookRowActive",
			"entryRowActive": "NriOdW_entryRowActive",
			"label": "NriOdW_label",
			"error": "NriOdW_error",
			"miniBtn": "NriOdW_miniBtn",
			"entryList": "NriOdW_entryList",
			"check": "NriOdW_check",
			"books": "NriOdW_books",
			"bookBtn": "NriOdW_bookBtn",
			"entries": "NriOdW_entries",
			"panel": "NriOdW_panel",
			"bookRow": "NriOdW_bookRow",
			"hitList": "NriOdW_hitList",
			"globalTitle": "NriOdW_globalTitle",
			"globalBar": "NriOdW_globalBar",
			"input": "NriOdW_input",
			"hit": "NriOdW_hit",
			"hitMeta": "NriOdW_hitMeta",
			"entryRow": "NriOdW_entryRow",
			"entriesHead": "NriOdW_entriesHead",
			"editor": "NriOdW_editor",
			"textarea": "NriOdW_textarea",
			"hint": "NriOdW_hint",
			"entriesFoot": "NriOdW_entriesFoot",
			"entryBtn": "NriOdW_entryBtn",
			"toolBtn": "NriOdW_toolBtn",
			"booksHead": "NriOdW_booksHead",
			"offTag": "NriOdW_offTag",
			"row": "NriOdW_row",
			"form": "NriOdW_form",
			"activeTag": "NriOdW_activeTag",
			"number": "NriOdW_number",
			"primaryBtn": "NriOdW_primaryBtn",
			"navBtn": "NriOdW_navBtn"
		};
		//#endregion
		//#region src/client/DataBankPanel.tsx
		/**
		* The Data Bank panel: paste documents into the vector store, list indexed
		* files, delete them, and test similarity retrieval — ST's Data Bank screen
		* over the st-api vector file routes.
		*/
		/**
		* The Data Bank management surface.
		* @param props - the {@link StFace} share (api).
		*/
		function DataBankPanel({ api }) {
			const [files, setFiles] = (0, react.useState)([]);
			const [name, setName] = (0, react.useState)("");
			const [text, setText] = (0, react.useState)("");
			const [query, setQuery] = (0, react.useState)("");
			const [hits, setHits] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const load = (0, react.useCallback)(() => {
				api.listBankFiles().then(setFiles).catch((e) => {
					setError(String(e));
				});
			}, [api]);
			(0, react.useEffect)(load, [load]);
			/** Chunk and index the form's document, then refresh the file list. */
			const handleIndex = (0, react.useCallback)(async () => {
				if (name.trim() === "" || text.trim() === "") {
					setError("文件名与正文不能为空");
					return;
				}
				setBusy(true);
				setError("");
				try {
					const doc = name.trim();
					const { chunks } = await api.indexBankFile(doc, text);
					window.alert(`已索引「${doc}」：${chunks} 个分块`);
					setName("");
					setText("");
					load();
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, [
				api,
				name,
				text,
				load
			]);
			const handleDelete = (0, react.useCallback)(async (file) => {
				setBusy(true);
				setError("");
				try {
					await api.deleteBankFile(file);
					if (hits !== null) setHits(hits.filter((h) => !h.key.startsWith(`${file}#`)));
					load();
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, [
				api,
				hits,
				load
			]);
			/** Run one similarity query over the indexed chunks. */
			const handleSearch = (0, react.useCallback)(async () => {
				if (query.trim() === "") {
					setError("检索词不能为空");
					return;
				}
				setBusy(true);
				setError("");
				try {
					setHits(await api.searchBankFiles(query));
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, [api, query]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: lorebook_module_css_default.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lorebook_module_css_default.books,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: lorebook_module_css_default.booksHead,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									"文档（",
									files.length,
									"）"
								] })
							}),
							files.map((f) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: lorebook_module_css_default.bookRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: lorebook_module_css_default.bookBtn,
									children: f
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: lorebook_module_css_default.toolBtn,
									title: "删除索引",
									disabled: busy,
									onClick: () => {
										handleDelete(f);
									},
									children: "✕"
								})]
							}, f)),
							files.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: lorebook_module_css_default.hint,
								children: "暂无文档。粘贴正文建立第一个索引。"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lorebook_module_css_default.editor,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
							className: lorebook_module_css_default.form,
							onSubmit: (e) => {
								e.preventDefault();
								handleIndex();
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: lorebook_module_css_default.label,
									children: ["文件名", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: lorebook_module_css_default.input,
										value: name,
										placeholder: "例如：世界设定集",
										onChange: (e) => {
											setName(e.target.value);
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: lorebook_module_css_default.label,
									children: ["正文（分块后建立向量索引）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
										className: lorebook_module_css_default.textarea,
										rows: 8,
										value: text,
										onChange: (e) => {
											setText(e.target.value);
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: lorebook_module_css_default.row,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "submit",
										className: lorebook_module_css_default.primaryBtn,
										disabled: busy,
										children: "建立索引"
									})
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
							className: lorebook_module_css_default.form,
							onSubmit: (e) => {
								e.preventDefault();
								handleSearch();
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: lorebook_module_css_default.label,
								children: ["检索测试", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lorebook_module_css_default.row,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: lorebook_module_css_default.input,
										value: query,
										placeholder: "输入检索词，按相似度返回分块",
										onChange: (e) => {
											setQuery(e.target.value);
										}
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "submit",
										className: lorebook_module_css_default.miniBtn,
										disabled: busy,
										children: "检索"
									})]
								})]
							}), hits !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: lorebook_module_css_default.hitList,
								children: [hits.map((h) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lorebook_module_css_default.hit,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: lorebook_module_css_default.hitMeta,
										children: [
											h.key,
											" · ",
											h.score.toFixed(3)
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [h.text.slice(0, 200), h.text.length > 200 ? "…" : ""] })]
								}, h.key)), hits.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: lorebook_module_css_default.hint,
									children: "无命中。"
								})]
							})]
						})]
					}),
					error !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: lorebook_module_css_default.error,
						children: error
					})
				]
			});
		}
		//#endregion
		//#region src/client/LorebookPanel.tsx
		/**
		* The World Info (lorebook) editor: book picker, entry list, and entry editor
		* over the st-lorebook service's HTTP table — ST's world-info screen layout.
		*/
		/** Chinese label per secondary-key logic value (ST's world_info_logic). */
		const LOGIC_LABELS = {
			0: "任意副关键词 (AND_ANY)",
			1: "非全部 (NOT_ALL)",
			2: "均不含 (NOT_ANY)",
			3: "全部包含 (AND_ALL)"
		};
		/** Common insertion positions (ST's world_info_position subset). */
		const POSITION_OPTIONS = [
			{
				value: 0,
				label: "角色定义之前 (before)"
			},
			{
				value: 1,
				label: "角色定义之后 (after)"
			},
			{
				value: 4,
				label: "按深度插入 (atDepth)"
			},
			{
				value: 7,
				label: "系统提示 (system)"
			},
			{
				value: 1e3,
				label: "示例对话之前 (beforeChar)"
			},
			{
				value: 1001,
				label: "示例对话之后 (afterChar)"
			}
		];
		/** ST's newWorldInfoEntry template defaults (client mirror). */
		function newEntry(uid, displayIndex) {
			return {
				uid,
				key: [],
				keysecondary: [],
				comment: "",
				content: "",
				constant: false,
				vectorized: false,
				selective: true,
				selectiveLogic: 0,
				addMemo: false,
				order: 100,
				position: 0,
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
				displayIndex
			};
		}
		/** Comma-separated editing view of a keyword list. */
		function joinKeys(keys) {
			return keys.join(", ");
		}
		/** Parse a comma-separated input back into a keyword list. */
		function splitKeys(text) {
			return text.split(",").map((k) => k.trim()).filter((k) => k !== "");
		}
		/** Blank input means "not set": ST's sticky/cooldown editor shows empty for null. */
		function msOfSeconds(text) {
			const t = text.trim();
			if (t === "") return null;
			const n = Number(t);
			return Number.isFinite(n) ? Math.round(n * 1e3) : null;
		}
		/** Seconds view of a millisecond field; null renders blank. */
		function secondsOfMs(ms) {
			return ms === null ? "" : String(ms / 1e3);
		}
		/** Blank input means "not set" for a message-count field (delay / scanDepth). */
		function countOrNull(text) {
			const t = text.trim();
			if (t === "") return null;
			const n = Number(t);
			return Number.isFinite(n) ? Math.floor(n) : null;
		}
		function stringOfCount(v) {
			return v === null ? "" : String(v);
		}
		/**
		* The ST lorebook surface.
		* @param props - the {@link StFace} share (state hook, api, actions).
		*/
		function LorebookPanel({ useSt, api, actions }) {
			const st = useSt((s) => s);
			const activeWorlds = st.worlds;
			const [books, setBooks] = (0, react.useState)([]);
			const [book, setBook] = (0, react.useState)("");
			const [file, setFile] = (0, react.useState)(null);
			const [selUid, setSelUid] = (0, react.useState)(null);
			const [dirty, setDirty] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const loadBooks = (0, react.useCallback)(async () => {
				const names = (await api.listWorlds()).map((r) => r.name);
				setBooks(names);
				return names;
			}, [api]);
			(0, react.useEffect)(() => {
				loadBooks().then((list) => {
					if (list.length > 0 && book === "") setBook(list[0]);
				}).catch((e) => {
					setError(String(e));
				});
			}, [loadBooks, book]);
			(0, react.useEffect)(() => {
				if (book === "") {
					setFile(null);
					setSelUid(null);
					return;
				}
				setError("");
				api.getWorld(book).then((f) => {
					setFile(f);
					setSelUid(null);
					setDirty(false);
				}).catch((e) => {
					setError(e instanceof Error ? e.message : String(e));
				});
			}, [api, book]);
			const entries = file === null ? [] : Object.values(file.entries).sort((a, b) => a.displayIndex - b.displayIndex);
			const selected = entries.find((e) => e.uid === selUid) ?? null;
			/** Local edit: rewrite the selected entry in the file, mark dirty. */
			const patchEntry = (0, react.useCallback)((patch) => {
				if (selected === null) return;
				setFile((prev) => prev === null ? prev : {
					...prev,
					entries: {
						...prev.entries,
						[String(selected.uid)]: {
							...selected,
							...patch
						}
					}
				});
				setDirty(true);
			}, [selected]);
			const addEntry = (0, react.useCallback)(() => {
				if (file === null) return;
				const uid = entries.reduce((m, e) => Math.max(m, e.uid), -1) + 1;
				const entry = newEntry(uid, entries.length);
				setFile({
					...file,
					entries: {
						...file.entries,
						[String(uid)]: entry
					}
				});
				setSelUid(uid);
				setDirty(true);
			}, [file, entries]);
			const removeEntry = (0, react.useCallback)((uid) => {
				if (file === null) return;
				const next = { ...file.entries };
				delete next[String(uid)];
				setFile({
					...file,
					entries: next
				});
				if (selUid === uid) setSelUid(null);
				setDirty(true);
			}, [file, selUid]);
			const save = (0, react.useCallback)(async () => {
				if (file === null || book === "") return;
				setError("");
				try {
					await api.saveWorld(book, file);
					setDirty(false);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				api,
				book,
				file
			]);
			const createBook = (0, react.useCallback)(async () => {
				const name = window.prompt("新世界书名称");
				if (name === null || name.trim() === "") return;
				try {
					await api.saveWorld(name.trim(), { entries: {} });
					const list = await loadBooks();
					setBook(name.trim());
					if (list.length === 0) loadBooks();
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api, loadBooks]);
			/** ST activates several books at once: the toggle adds/removes from the set. */
			const toggleActive = (0, react.useCallback)((name) => {
				actions.setWorlds(activeWorlds.includes(name) ? activeWorlds.filter((w) => w !== name) : [...activeWorlds, name]);
			}, [actions, activeWorlds]);
			/** Flush pending edits, then (re)index the current book's vectorized entries. */
			const indexBook = (0, react.useCallback)(async () => {
				if (file === null || book === "") return;
				setError("");
				try {
					if (dirty) {
						await api.saveWorld(book, file);
						setDirty(false);
					}
					const { indexed } = await api.indexWorld(book);
					window.alert(`已为「${book}」建立向量索引：${indexed} 个向量检索条目`);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				api,
				file,
				book,
				dirty
			]);
			const deleteBook = (0, react.useCallback)(async (name) => {
				if (!window.confirm(`删除世界书「${name}」？此操作不可恢复。`)) return;
				try {
					await api.deleteWorld(name);
					const list = await loadBooks();
					if (book === name) setBook(list[0] ?? "");
					if (activeWorlds.includes(name)) actions.setWorlds(activeWorlds.filter((w) => w !== name));
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				api,
				loadBooks,
				book,
				activeWorlds,
				actions
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: lorebook_module_css_default.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lorebook_module_css_default.globalBar,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: lorebook_module_css_default.globalTitle,
							children: "全局设置（ST 的 world_info_*，作用于所有启用世界书的扫描）"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: lorebook_module_css_default.row,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: lorebook_module_css_default.number,
									children: [
										"扫描深度（消息）：",
										st.worldInfoDepth ?? 2,
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: lorebook_module_css_default.input,
											type: "range",
											min: 1,
											max: 10,
											step: 1,
											value: st.worldInfoDepth ?? 2,
											onChange: (e) => {
												actions.setWorldInfoDepth(Number(e.target.value));
											}
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: lorebook_module_css_default.number,
									children: [
										"Token 预算（% 上下文）：",
										st.worldInfoBudget ?? 25,
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: lorebook_module_css_default.input,
											type: "range",
											min: 1,
											max: 100,
											step: 5,
											value: st.worldInfoBudget ?? 25,
											onChange: (e) => {
												actions.setWorldInfoBudget(Number(e.target.value));
											}
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: lorebook_module_css_default.check,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: st.worldInfoCaseSensitive ?? false,
										onChange: (e) => {
											actions.setWorldInfoCaseSensitive(e.target.checked);
										}
									}), "大小写敏感"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: lorebook_module_css_default.check,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: st.worldInfoMatchWholeWords ?? true,
										onChange: (e) => {
											actions.setWorldInfoMatchWholeWords(e.target.checked);
										}
									}), "全词匹配"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: lorebook_module_css_default.check,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: st.worldInfoRecursive ?? true,
										onChange: (e) => {
											actions.setWorldInfoRecursive(e.target.checked);
										}
									}), "递归扫描"]
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lorebook_module_css_default.books,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: lorebook_module_css_default.booksHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "世界书" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: lorebook_module_css_default.miniBtn,
									title: "新建世界书",
									onClick: () => {
										createBook();
									},
									children: "＋"
								})]
							}),
							books.map((name) => {
								const active = activeWorlds.includes(name);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: name === book ? lorebook_module_css_default.bookRowActive : lorebook_module_css_default.bookRow,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: lorebook_module_css_default.bookBtn,
											onClick: () => {
												setBook(name);
											},
											children: [name, active && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: lorebook_module_css_default.activeTag,
												children: " ✦"
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: lorebook_module_css_default.miniBtn,
											title: active ? "取消启用" : "在对话中启用",
											onClick: () => {
												toggleActive(name);
											},
											children: active ? "✓" : "＋"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: lorebook_module_css_default.miniBtn,
											title: "删除世界书",
											onClick: () => {
												deleteBook(name);
											},
											children: "✕"
										})
									]
								}, name);
							}),
							books.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: lorebook_module_css_default.hint,
								children: "还没有世界书"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lorebook_module_css_default.entries,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: lorebook_module_css_default.entriesHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [entries.length, " 个条目"] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: lorebook_module_css_default.miniBtn,
										disabled: file === null,
										title: "为本书的向量检索条目建立/刷新向量索引",
										onClick: () => {
											indexBook();
										},
										children: "⌗"
									}),
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: lorebook_module_css_default.miniBtn,
										disabled: file === null,
										title: "新建条目",
										onClick: addEntry,
										children: "＋"
									})
								] })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: lorebook_module_css_default.entryList,
								children: [entries.map((e) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: e.uid === selUid ? lorebook_module_css_default.entryRowActive : lorebook_module_css_default.entryRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: lorebook_module_css_default.entryBtn,
										onClick: () => {
											setSelUid(e.uid);
										},
										children: [e.disable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: lorebook_module_css_default.offTag,
											children: "已停用 · "
										}), e.comment !== "" ? e.comment : e.content.slice(0, 24) || "(空条目)"]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: lorebook_module_css_default.miniBtn,
										title: "删除条目",
										onClick: () => {
											removeEntry(e.uid);
										},
										children: "✕"
									})]
								}, e.uid)), file !== null && entries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: lorebook_module_css_default.hint,
									children: "还没有条目"
								})]
							}),
							file !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: lorebook_module_css_default.entriesFoot,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: lorebook_module_css_default.primaryBtn,
									disabled: !dirty,
									onClick: () => {
										save();
									},
									children: dirty ? "保存更改" : "已保存"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: lorebook_module_css_default.toolBtn,
									onClick: () => {
										toggleActive(book);
									},
									children: activeWorlds.includes(book) ? "✓ 对话中已启用" : "在对话中启用"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lorebook_module_css_default.editor,
						children: [selected === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: lorebook_module_css_default.hint,
							children: "选择左侧条目进行编辑"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: lorebook_module_css_default.form,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: lorebook_module_css_default.label,
									children: ["备注", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: lorebook_module_css_default.input,
										value: selected.comment,
										onChange: (e) => {
											patchEntry({ comment: e.target.value });
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: lorebook_module_css_default.label,
									children: ["主关键词（逗号分隔）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: lorebook_module_css_default.input,
										value: joinKeys(selected.key),
										onChange: (e) => {
											patchEntry({ key: splitKeys(e.target.value) });
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: lorebook_module_css_default.label,
									children: ["副关键词（逗号分隔）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: lorebook_module_css_default.input,
										value: joinKeys(selected.keysecondary),
										onChange: (e) => {
											patchEntry({ keysecondary: splitKeys(e.target.value) });
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: lorebook_module_css_default.label,
									children: ["副关键词逻辑", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
										className: lorebook_module_css_default.input,
										value: selected.selectiveLogic,
										onChange: (e) => {
											patchEntry({ selectiveLogic: Number(e.target.value) });
										},
										children: Object.entries(LOGIC_LABELS).map(([v, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: v,
											children: label
										}, v))
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lorebook_module_css_default.row,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.label,
											children: ["大小写敏感", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
												className: lorebook_module_css_default.input,
												value: String(selected.caseSensitive ?? "null"),
												onChange: (e) => {
													patchEntry({ caseSensitive: e.target.value === "null" ? null : e.target.value === "true" });
												},
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "null",
														children: "沿用全局"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "true",
														children: "是"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "false",
														children: "否"
													})
												]
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.label,
											children: ["整词匹配", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
												className: lorebook_module_css_default.input,
												value: String(selected.matchWholeWords ?? "null"),
												onChange: (e) => {
													patchEntry({ matchWholeWords: e.target.value === "null" ? null : e.target.value === "true" });
												},
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "null",
														children: "沿用全局"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "true",
														children: "是"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "false",
														children: "否"
													})
												]
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.label,
											children: ["组评分", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
												className: lorebook_module_css_default.input,
												value: String(selected.useGroupScoring ?? "null"),
												onChange: (e) => {
													patchEntry({ useGroupScoring: e.target.value === "null" ? null : e.target.value === "true" });
												},
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "null",
														children: "沿用全局"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "true",
														children: "是"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "false",
														children: "否"
													})
												]
											})]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: lorebook_module_css_default.label,
									children: ["内容（触发后注入的文本）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
										className: lorebook_module_css_default.textarea,
										rows: 6,
										value: selected.content,
										onChange: (e) => {
											patchEntry({ content: e.target.value });
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lorebook_module_css_default.row,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.constant,
												onChange: (e) => {
													patchEntry({ constant: e.target.checked });
												}
											}), "常驻（无需关键词）"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.disable,
												onChange: (e) => {
													patchEntry({ disable: e.target.checked });
												}
											}), "停用"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.selective,
												onChange: (e) => {
													patchEntry({ selective: e.target.checked });
												}
											}), "选择性（Selective）"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.useProbability,
												onChange: (e) => {
													patchEntry({ useProbability: e.target.checked });
												}
											}), "启用概率"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.addMemo,
												onChange: (e) => {
													patchEntry({ addMemo: e.target.checked });
												}
											}), "添加 Memo"]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lorebook_module_css_default.row,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.number,
											children: ["Automation ID", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: lorebook_module_css_default.input,
												value: selected.automationId,
												onChange: (e) => {
													patchEntry({ automationId: e.target.value });
												}
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.number,
											children: ["Outlet Name", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: lorebook_module_css_default.input,
												value: selected.outletName,
												onChange: (e) => {
													patchEntry({ outletName: e.target.value });
												}
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.number,
											children: ["Recursion Level", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: lorebook_module_css_default.input,
												type: "number",
												min: 0,
												value: selected.delayUntilRecursion,
												onChange: (e) => {
													patchEntry({ delayUntilRecursion: Number(e.target.value) });
												}
											})]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lorebook_module_css_default.row,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: lorebook_module_css_default.number,
										children: ["顺序", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: lorebook_module_css_default.input,
											type: "number",
											value: selected.order,
											onChange: (e) => {
												patchEntry({ order: Number(e.target.value) });
											}
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: lorebook_module_css_default.number,
										children: ["触发概率 %", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: lorebook_module_css_default.input,
											type: "number",
											min: 0,
											max: 100,
											value: selected.probability,
											onChange: (e) => {
												patchEntry({ probability: Number(e.target.value) });
											}
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: lorebook_module_css_default.label,
									children: ["插入位置", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
										className: lorebook_module_css_default.input,
										value: selected.position,
										onChange: (e) => {
											patchEntry({ position: Number(e.target.value) });
										},
										children: POSITION_OPTIONS.map((o) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: o.value,
											children: o.label
										}, o.value))
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lorebook_module_css_default.row,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.number,
											children: ["分组（同名互斥）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: lorebook_module_css_default.input,
												value: selected.group,
												onChange: (e) => {
													patchEntry({ group: e.target.value });
												}
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.number,
											children: ["组权重", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: lorebook_module_css_default.input,
												type: "number",
												min: 0,
												value: selected.groupWeight,
												onChange: (e) => {
													patchEntry({ groupWeight: Number(e.target.value) });
												}
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.groupOverride,
												onChange: (e) => {
													patchEntry({ groupOverride: e.target.checked });
												}
											}), "组内覆盖"]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lorebook_module_css_default.row,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.excludeRecursion,
												onChange: (e) => {
													patchEntry({ excludeRecursion: e.target.checked });
												}
											}), "不可被递归激活"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.preventRecursion,
												onChange: (e) => {
													patchEntry({ preventRecursion: e.target.checked });
												}
											}), "不向递归贡献内容"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.ignoreBudget,
												onChange: (e) => {
													patchEntry({ ignoreBudget: e.target.checked });
												}
											}), "无视预算"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											title: "向量检索：条目不做关键词匹配，由向量存储按语义相似度激活（需先为本书建立向量索引）",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.vectorized,
												onChange: (e) => {
													patchEntry({ vectorized: e.target.checked });
												}
											}), "向量检索"]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lorebook_module_css_default.row,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: lorebook_module_css_default.number,
										children: ["Sticky（秒，留空关闭）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: lorebook_module_css_default.input,
											value: secondsOfMs(selected.sticky),
											onChange: (e) => {
												patchEntry({ sticky: msOfSeconds(e.target.value) });
											}
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: lorebook_module_css_default.number,
										children: ["Cooldown（秒，留空关闭）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: lorebook_module_css_default.input,
											value: secondsOfMs(selected.cooldown),
											onChange: (e) => {
												patchEntry({ cooldown: msOfSeconds(e.target.value) });
											}
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lorebook_module_css_default.row,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: lorebook_module_css_default.number,
										children: ["Delay（消息数，留空关闭）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: lorebook_module_css_default.input,
											value: stringOfCount(selected.delay),
											onChange: (e) => {
												patchEntry({ delay: countOrNull(e.target.value) });
											}
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: lorebook_module_css_default.number,
										children: ["扫描深度（消息，留空用全局）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: lorebook_module_css_default.input,
											value: stringOfCount(selected.scanDepth),
											onChange: (e) => {
												patchEntry({ scanDepth: countOrNull(e.target.value) });
											}
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: lorebook_module_css_default.row,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: lorebook_module_css_default.label,
										children: "Additional Matching Sources（关键词同时扫描以下字段）"
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lorebook_module_css_default.row,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.matchCharacterDescription,
												onChange: (e) => {
													patchEntry({ matchCharacterDescription: e.target.checked });
												}
											}), "角色描述"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.matchCharacterPersonality,
												onChange: (e) => {
													patchEntry({ matchCharacterPersonality: e.target.checked });
												}
											}), "角色性格"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.matchScenario,
												onChange: (e) => {
													patchEntry({ matchScenario: e.target.checked });
												}
											}), "场景"]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lorebook_module_css_default.row,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.matchPersonaDescription,
												onChange: (e) => {
													patchEntry({ matchPersonaDescription: e.target.checked });
												}
											}), "人物描述"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.matchCharacterDepthPrompt,
												onChange: (e) => {
													patchEntry({ matchCharacterDepthPrompt: e.target.checked });
												}
											}), "角色 Note"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: lorebook_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: selected.matchCreatorNotes,
												onChange: (e) => {
													patchEntry({ matchCreatorNotes: e.target.checked });
												}
											}), "作者注释"]
										})
									]
								})
							]
						}), error !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: lorebook_module_css_default.error,
							children: error
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/apply.tsx
		/** Services required by the browser plugin. */
		const inject = ["slots"];
		/** The nav row for the lorebook surface; the panel key is closed over. */
		function LorebookNavRow(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: props.panel === "lorebook" ? lorebook_module_css_default.navBtnActive : lorebook_module_css_default.navBtn,
				onClick: () => {
					props.select("lorebook");
				},
				children: "📚 世界书"
			});
		}
		/** The nav row for the Data Bank surface. */
		function DataBankNavRow(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: props.panel === "databank" ? lorebook_module_css_default.navBtnActive : lorebook_module_css_default.navBtn,
				onClick: () => {
					props.select("databank");
				},
				children: "🏦 数据银行"
			});
		}
		/**
		* Mount the lorebook and Data Bank surfaces into the ST shell's nav and panel
		* slots.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.slots.inject("st.panel", () => {
				const disposeLore = ctx.slots.register({
					name: "st.panel",
					key: "lorebook"
				}, LorebookPanel);
				const disposeLoreNav = ctx.slots.register({
					name: "st.nav",
					id: "lorebook",
					order: 20
				}, LorebookNavRow);
				const disposeBank = ctx.slots.register({
					name: "st.panel",
					key: "databank"
				}, DataBankPanel);
				return [
					disposeLoreNav,
					disposeLore,
					ctx.slots.register({
						name: "st.nav",
						id: "databank",
						order: 25
					}, DataBankNavRow),
					disposeBank
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