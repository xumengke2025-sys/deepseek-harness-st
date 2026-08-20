window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-st-characters",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:D:\deepseek harness\packages\client\ui-st-characters\src\client\characters.module.css.mjs
		const css = ".zOZRcG_panel{background:var(--dsh-st-bg,#1a1a2e);min-width:0;min-height:0;color:var(--dsh-st-fg,#e8e8f0);flex-direction:column;flex:1;gap:12px;padding:16px;display:flex;overflow-y:auto}.zOZRcG_toolbar{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.zOZRcG_count{opacity:.7;margin-right:auto}.zOZRcG_toolBtn,.zOZRcG_primaryBtn,.zOZRcG_miniBtn{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);color:inherit;font:inherit;cursor:pointer;border-radius:8px;padding:6px 12px}.zOZRcG_toolBtn:hover,.zOZRcG_miniBtn:hover{background:var(--dsh-st-hover,#26264a)}.zOZRcG_toolBtn:disabled{opacity:.5;cursor:default}.zOZRcG_fileInput{display:none}.zOZRcG_form{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);border-radius:8px;flex-direction:column;gap:8px;padding:12px;display:flex}.zOZRcG_input,.zOZRcG_textarea{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-bg,#1a1a2e);color:inherit;font:inherit;border-radius:8px;padding:8px}.zOZRcG_textarea{resize:vertical}.zOZRcG_label{opacity:.9;flex-direction:column;gap:4px;font-size:.9em;display:flex}.zOZRcG_row{align-items:flex-end;gap:12px;display:flex}.zOZRcG_number{opacity:.9;flex-direction:column;gap:4px;font-size:.9em;display:flex}.zOZRcG_number .zOZRcG_input{width:110px}.zOZRcG_primaryBtn{background:var(--dsh-st-accent-dim,#37376b);border-color:#0000;align-self:flex-end}.zOZRcG_error{color:#f88;border:1px solid #a33;border-radius:8px;padding:8px 12px}.zOZRcG_grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;display:grid}.zOZRcG_card,.zOZRcG_cardActive{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);cursor:pointer;border-radius:12px;flex-direction:column;gap:6px;padding:10px;display:flex}.zOZRcG_card:hover{background:var(--dsh-st-hover,#26264a)}.zOZRcG_cardActive{border-color:var(--dsh-st-accent-dim,#37376b);background:var(--dsh-st-accent-dim,#37376b)}.zOZRcG_avatar{aspect-ratio:2/3;object-fit:cover;background:var(--dsh-st-hover,#26264a);border-radius:8px;width:100%}.zOZRcG_cardName{text-overflow:ellipsis;white-space:nowrap;font-weight:600;overflow:hidden}.zOZRcG_cardActions{gap:6px;display:flex}.zOZRcG_favOn,.zOZRcG_favOff,.zOZRcG_miniBtn{color:inherit;font:inherit;cursor:pointer;background:0 0;border:none;border-radius:6px;padding:2px 8px}.zOZRcG_favOn{color:gold}.zOZRcG_favOn:hover,.zOZRcG_favOff:hover,.zOZRcG_miniBtn:hover{background:var(--dsh-st-hover,#26264a)}.zOZRcG_empty{opacity:.7;grid-column:1/-1;margin:auto}.zOZRcG_navBtn,.zOZRcG_navBtnActive{text-align:left;font:inherit;cursor:pointer;color:inherit;border:none;border-radius:8px;padding:8px 12px;display:block}.zOZRcG_navBtn{background:0 0}.zOZRcG_navBtn:hover{background:var(--dsh-st-hover,#26264a)}.zOZRcG_navBtnActive{background:var(--dsh-st-accent-dim,#37376b)}";
		const tagId = "@deepseek-ai/dsh-client-ui-st-characters/characters.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-st-characters";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var characters_module_css_default = {
			"favOff": "zOZRcG_favOff",
			"label": "zOZRcG_label",
			"cardActions": "zOZRcG_cardActions",
			"panel": "zOZRcG_panel",
			"toolBtn": "zOZRcG_toolBtn",
			"form": "zOZRcG_form",
			"card": "zOZRcG_card",
			"miniBtn": "zOZRcG_miniBtn",
			"favOn": "zOZRcG_favOn",
			"cardName": "zOZRcG_cardName",
			"count": "zOZRcG_count",
			"toolbar": "zOZRcG_toolbar",
			"grid": "zOZRcG_grid",
			"row": "zOZRcG_row",
			"number": "zOZRcG_number",
			"avatar": "zOZRcG_avatar",
			"navBtn": "zOZRcG_navBtn",
			"textarea": "zOZRcG_textarea",
			"fileInput": "zOZRcG_fileInput",
			"input": "zOZRcG_input",
			"cardActive": "zOZRcG_cardActive",
			"primaryBtn": "zOZRcG_primaryBtn",
			"empty": "zOZRcG_empty",
			"navBtnActive": "zOZRcG_navBtnActive",
			"error": "zOZRcG_error"
		};
		//#endregion
		//#region src/client/CharactersPanel.tsx
		/**
		* The characters panel: card grid over `POST characters/all` with select /
		* create / import / edit / favourite / delete, mirroring ST's character
		* management screen and full card editor.
		*/
		/** Blank creation form; ST creates a minimal card then edits it. */
		const EMPTY_FORM = { ch_name: "" };
		/** Fill an edit form from the wire card data. */
		function formFromCard(name, data) {
			const depth = data.extensions?.depth_prompt;
			return {
				ch_name: name,
				description: data.description ?? "",
				personality: data.personality ?? "",
				scenario: data.scenario ?? "",
				first_mes: data.first_mes ?? "",
				mes_example: data.mes_example ?? "",
				creator_notes: data.creator_notes ?? "",
				system_prompt: data.system_prompt ?? "",
				post_history_instructions: data.post_history_instructions ?? "",
				tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
				alternate_greetings: Array.isArray(data.alternate_greetings) ? data.alternate_greetings.join("\n") : "",
				world: data.world ?? "",
				depth_prompt_prompt: depth?.prompt ?? "",
				depth_prompt_depth: depth?.depth ?? 4,
				depth_prompt_role: depth?.role ?? "system"
			};
		}
		/** One line per alternative greeting, ST's alternate_greetings array. */
		function splitGreetings(text) {
			return text.split("\n").map((g) => g.trim()).filter((g) => g !== "");
		}
		/**
		* The ST characters surface.
		* @param props - the {@link StFace} share (state hook, api, actions).
		*/
		function CharactersPanel({ useSt, api, actions }) {
			const avatar = useSt((s) => s.avatar);
			const [rows, setRows] = (0, react.useState)([]);
			const [error, setError] = (0, react.useState)("");
			const [showForm, setShowForm] = (0, react.useState)(false);
			const [form, setForm] = (0, react.useState)(EMPTY_FORM);
			const [busy, setBusy] = (0, react.useState)(false);
			/** Card under full-field edit; the avatar stays fixed, renames go through rename. */
			const [editing, setEditing] = (0, react.useState)(null);
			const refresh = (0, react.useCallback)(async () => {
				setError("");
				try {
					setRows(await api.listCharacters());
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api]);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			/** Select a card and jump to its chat, ST's "Start chat" behavior. */
			const select = (0, react.useCallback)((row) => {
				actions.setAvatar(row.avatar);
				actions.setChatId("");
				actions.setPanel("chat");
			}, [actions]);
			const submitCreate = (0, react.useCallback)(async () => {
				if (form.ch_name.trim() === "") {
					setError("请输入角色名");
					return;
				}
				setBusy(true);
				try {
					const { avatar: created } = await api.createCharacter(form);
					setForm(EMPTY_FORM);
					setShowForm(false);
					setRows(await api.listCharacters());
					actions.setAvatar(created);
					actions.setChatId("");
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, [
				form,
				api,
				actions
			]);
			/** Open the full-card editor over `characters/get`. */
			const openEdit = (0, react.useCallback)(async (row) => {
				setError("");
				try {
					const full = await api.getCharacter(row.avatar);
					setEditing({
						avatar: row.avatar,
						form: formFromCard(full.name, full.card.data)
					});
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api]);
			const saveEdit = (0, react.useCallback)(async () => {
				if (editing === null) return;
				const { alternate_greetings, ...rest } = editing.form;
				const greetings = typeof alternate_greetings === "string" ? splitGreetings(alternate_greetings) : alternate_greetings;
				const payload = {
					...rest,
					...greetings === void 0 ? {} : { alternate_greetings: greetings }
				};
				setBusy(true);
				try {
					let target = editing.avatar;
					const currentName = editing.avatar.replace(/\.png$/, "");
					if (payload.ch_name.trim() !== "" && payload.ch_name.trim() !== currentName) {
						const input = window.confirm(`角色名将改为「${payload.ch_name.trim()}」并重命名角色卡，继续？`) ? payload.ch_name.trim() : null;
						if (input === null) {
							setBusy(false);
							return;
						}
						const { avatar: renamed } = await api.renameCharacter(editing.avatar, input);
						target = renamed;
					}
					await api.editCharacter(target, payload);
					setEditing(null);
					setRows(await api.listCharacters());
					if (target !== editing.avatar && editing.avatar === avatar) actions.setAvatar(target);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, [
				editing,
				api,
				actions,
				avatar
			]);
			const importPng = (0, react.useCallback)(async (file) => {
				setBusy(true);
				try {
					const dataUrl = await new Promise((resolve, reject) => {
						const reader = new FileReader();
						reader.addEventListener("load", () => {
							resolve(String(reader.result));
						});
						reader.addEventListener("error", () => {
							reject(reader.error);
						});
						reader.readAsDataURL(file);
					});
					const { avatar: imported } = await api.importCharacterPng(dataUrl);
					setRows(await api.listCharacters());
					actions.setAvatar(imported);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, [api, actions]);
			const rename = (0, react.useCallback)(async (row) => {
				const input = window.prompt("新的角色名", row.name);
				if (input === null || input.trim() === "") return;
				try {
					const { avatar: renamed } = await api.renameCharacter(row.avatar, input.trim());
					setRows(await api.listCharacters());
					if (row.avatar === avatar) actions.setAvatar(renamed);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				api,
				actions,
				avatar
			]);
			const toggleFav = (0, react.useCallback)(async (row) => {
				try {
					await api.setFavourite(row.avatar, !row.fav);
					await refresh();
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api, refresh]);
			/** Download the character PNG with its embedded card, ST's export behavior. */
			const exportPng = (0, react.useCallback)(async (row) => {
				setError("");
				try {
					const { png } = await api.exportCharacterPng(row.avatar);
					const link = document.createElement("a");
					link.href = png;
					link.download = row.avatar.endsWith(".png") ? row.avatar : `${row.avatar}.png`;
					link.click();
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api]);
			const remove = (0, react.useCallback)(async (row) => {
				if (!window.confirm(`删除 ${row.name}？其聊天记录也会一并删除。`)) return;
				try {
					await api.deleteCharacter(row.avatar);
					if (row.avatar === avatar) actions.setAvatar("");
					await refresh();
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				api,
				actions,
				avatar,
				refresh
			]);
			const sorted = [...rows].sort((a, b) => Number(b.fav) - Number(a.fav) || a.name.localeCompare(b.name));
			const editForm = editing === null ? null : editing.form;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: characters_module_css_default.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: characters_module_css_default.toolbar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: characters_module_css_default.count,
								children: [rows.length, " 个角色"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: characters_module_css_default.toolBtn,
								onClick: () => {
									refresh();
								},
								disabled: busy,
								children: "⟳ 刷新"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: characters_module_css_default.toolBtn,
								onClick: () => {
									setShowForm(!showForm);
								},
								children: "＋ 新建"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: characters_module_css_default.toolBtn,
								children: ["📥 导入 PNG", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "file",
									accept: "image/png",
									className: characters_module_css_default.fileInput,
									onChange: (e) => {
										const file = e.target.files?.[0];
										if (file !== void 0) importPng(file);
										e.target.value = "";
									}
								})]
							})
						]
					}),
					showForm && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: characters_module_css_default.form,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: characters_module_css_default.input,
								placeholder: "角色名",
								value: form.ch_name,
								onChange: (e) => {
									setForm({
										...form,
										ch_name: e.target.value
									});
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: characters_module_css_default.input,
								placeholder: "描述",
								value: form.description ?? "",
								onChange: (e) => {
									setForm({
										...form,
										description: e.target.value
									});
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: characters_module_css_default.input,
								placeholder: "性格 (可选)",
								value: form.personality ?? "",
								onChange: (e) => {
									setForm({
										...form,
										personality: e.target.value
									});
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								className: characters_module_css_default.textarea,
								placeholder: "开场白 (可选)",
								rows: 3,
								value: form.first_mes ?? "",
								onChange: (e) => {
									setForm({
										...form,
										first_mes: e.target.value
									});
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: characters_module_css_default.primaryBtn,
								onClick: () => {
									submitCreate();
								},
								disabled: busy,
								children: "创建角色"
							})
						]
					}),
					editForm !== null && editing !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: characters_module_css_default.form,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: characters_module_css_default.label,
								children: ["角色名（修改后保存将重命名角色卡）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: characters_module_css_default.input,
									value: editForm.ch_name,
									onChange: (e) => {
										setEditing({
											...editing,
											form: {
												...editForm,
												ch_name: e.target.value
											}
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: characters_module_css_default.label,
								children: ["描述", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: characters_module_css_default.textarea,
									rows: 4,
									value: editForm.description ?? "",
									onChange: (e) => {
										setEditing({
											...editing,
											form: {
												...editForm,
												description: e.target.value
											}
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: characters_module_css_default.label,
								children: ["性格", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: characters_module_css_default.textarea,
									rows: 2,
									value: editForm.personality ?? "",
									onChange: (e) => {
										setEditing({
											...editing,
											form: {
												...editForm,
												personality: e.target.value
											}
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: characters_module_css_default.label,
								children: ["情景", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: characters_module_css_default.textarea,
									rows: 2,
									value: editForm.scenario ?? "",
									onChange: (e) => {
										setEditing({
											...editing,
											form: {
												...editForm,
												scenario: e.target.value
											}
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: characters_module_css_default.label,
								children: ["开场白", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: characters_module_css_default.textarea,
									rows: 3,
									value: editForm.first_mes ?? "",
									onChange: (e) => {
										setEditing({
											...editing,
											form: {
												...editForm,
												first_mes: e.target.value
											}
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: characters_module_css_default.label,
								children: ["备选开场白（每行一条；开场白消息左右切换时轮换）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: characters_module_css_default.textarea,
									rows: 3,
									value: String(editForm.alternate_greetings ?? ""),
									onChange: (e) => {
										setEditing({
											...editing,
											form: {
												...editForm,
												alternate_greetings: e.target.value
											}
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: characters_module_css_default.label,
								children: [
									"对话示例（用 <START> 分隔，支持 ",
									"{{char}}",
									" / ",
									"{{user}}",
									" 宏）",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
										className: characters_module_css_default.textarea,
										rows: 3,
										value: editForm.mes_example ?? "",
										onChange: (e) => {
											setEditing({
												...editing,
												form: {
													...editForm,
													mes_example: e.target.value
												}
											});
										}
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: characters_module_css_default.label,
								children: ["作者备注（creator notes）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: characters_module_css_default.textarea,
									rows: 2,
									value: editForm.creator_notes ?? "",
									onChange: (e) => {
										setEditing({
											...editing,
											form: {
												...editForm,
												creator_notes: e.target.value
											}
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: characters_module_css_default.label,
								children: ["系统提示词（留空用默认）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: characters_module_css_default.textarea,
									rows: 2,
									value: editForm.system_prompt ?? "",
									onChange: (e) => {
										setEditing({
											...editing,
											form: {
												...editForm,
												system_prompt: e.target.value
											}
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: characters_module_css_default.label,
								children: ["历史后指令（jailbreak）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: characters_module_css_default.textarea,
									rows: 2,
									value: editForm.post_history_instructions ?? "",
									onChange: (e) => {
										setEditing({
											...editing,
											form: {
												...editForm,
												post_history_instructions: e.target.value
											}
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: characters_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: characters_module_css_default.number,
									children: ["版本", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: characters_module_css_default.input,
										value: editForm.character_version ?? "",
										onChange: (e) => {
											setEditing({
												...editing,
												form: {
													...editForm,
													character_version: e.target.value
												}
											});
										}
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: characters_module_css_default.number,
									children: ["Talkativeness (0-1)", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: characters_module_css_default.input,
										type: "number",
										min: 0,
										max: 1,
										step: .05,
										value: Number(editForm.talkativeness ?? .5),
										onChange: (e) => {
											setEditing({
												...editing,
												form: {
													...editForm,
													talkativeness: Number(e.target.value)
												}
											});
										}
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: characters_module_css_default.label,
								children: ["深度提示词（按深度注入）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: characters_module_css_default.textarea,
									rows: 2,
									value: editForm.depth_prompt_prompt ?? "",
									onChange: (e) => {
										setEditing({
											...editing,
											form: {
												...editForm,
												depth_prompt_prompt: e.target.value
											}
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: characters_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: characters_module_css_default.number,
									children: ["深度", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: characters_module_css_default.input,
										type: "number",
										min: 0,
										value: Number(editForm.depth_prompt_depth ?? 4),
										onChange: (e) => {
											setEditing({
												...editing,
												form: {
													...editForm,
													depth_prompt_depth: Number(e.target.value)
												}
											});
										}
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: characters_module_css_default.number,
									children: ["角色", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: characters_module_css_default.input,
										value: String(editForm.depth_prompt_role ?? "system"),
										onChange: (e) => {
											setEditing({
												...editing,
												form: {
													...editForm,
													depth_prompt_role: e.target.value
												}
											});
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "system",
												children: "system"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "user",
												children: "user"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "assistant",
												children: "assistant"
											})
										]
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: characters_module_css_default.label,
								children: ["关联世界书（角色卡专属）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: characters_module_css_default.input,
									value: editForm.world ?? "",
									onChange: (e) => {
										setEditing({
											...editing,
											form: {
												...editForm,
												world: e.target.value
											}
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: characters_module_css_default.label,
								children: ["标签（逗号分隔）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: characters_module_css_default.input,
									value: String(editForm.tags ?? ""),
									onChange: (e) => {
										setEditing({
											...editing,
											form: {
												...editForm,
												tags: e.target.value
											}
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: characters_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: characters_module_css_default.primaryBtn,
									disabled: busy,
									onClick: () => {
										saveEdit();
									},
									children: "保存角色卡"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: characters_module_css_default.toolBtn,
									onClick: () => {
										setEditing(null);
									},
									children: "取消"
								})]
							})
						]
					}),
					error !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: characters_module_css_default.error,
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: characters_module_css_default.grid,
						children: [sorted.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: row.avatar === avatar ? characters_module_css_default.cardActive : characters_module_css_default.card,
							onClick: () => {
								select(row);
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
									className: characters_module_css_default.avatar,
									src: api.avatarUrl(row.avatar),
									alt: row.name
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: characters_module_css_default.cardName,
									title: row.name,
									children: row.name
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: characters_module_css_default.cardActions,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: row.fav ? characters_module_css_default.favOn : characters_module_css_default.favOff,
											title: row.fav ? "取消收藏" : "收藏",
											onClick: (e) => {
												e.stopPropagation();
												toggleFav(row);
											},
											children: "★"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: characters_module_css_default.miniBtn,
											title: "编辑角色卡",
											onClick: (e) => {
												e.stopPropagation();
												openEdit(row);
											},
											children: "✎"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: characters_module_css_default.miniBtn,
											title: "导出 PNG 角色卡",
											onClick: (e) => {
												e.stopPropagation();
												exportPng(row);
											},
											children: "⬇"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: characters_module_css_default.miniBtn,
											title: "重命名",
											onClick: (e) => {
												e.stopPropagation();
												rename(row);
											},
											children: "⌗"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: characters_module_css_default.miniBtn,
											title: "删除",
											onClick: (e) => {
												e.stopPropagation();
												remove(row);
											},
											children: "✕"
										})
									]
								})
							]
						}, row.avatar)), rows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: characters_module_css_default.empty,
							children: "还没有角色——新建或导入一个吧。"
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/apply.tsx
		/** Services required by the browser plugin. */
		const inject = ["slots"];
		/** The nav row for the characters surface; the panel key is closed over. */
		function CharactersNavRow(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: props.panel === "characters" ? characters_module_css_default.navBtnActive : characters_module_css_default.navBtn,
				onClick: () => {
					props.select("characters");
				},
				children: "👥 角色卡"
			});
		}
		/**
		* Mount the characters surface into the ST shell's nav and panel slots.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.slots.inject("st.panel", () => {
				const disposePanel = ctx.slots.register({
					name: "st.panel",
					key: "characters"
				}, CharactersPanel);
				return [ctx.slots.register({
					name: "st.nav",
					id: "characters",
					order: 10
				}, CharactersNavRow), disposePanel];
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map