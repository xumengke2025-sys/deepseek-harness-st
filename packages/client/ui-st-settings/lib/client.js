window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-st-settings",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:D:\deepseek harness\packages\client\ui-st-settings\src\client\settings.module.css.mjs
		const css = ".N6HjNq_panel{background:var(--dsh-st-bg,#1a1a2e);min-width:0;min-height:0;color:var(--dsh-st-fg,#e8e8f0);flex-direction:column;flex:1;gap:20px;padding:20px 24px;display:flex;overflow-y:auto}.N6HjNq_section{flex-direction:column;gap:10px;max-width:640px;display:flex}.N6HjNq_sectionTitle{opacity:.75;border-bottom:1px solid var(--dsh-st-border,#2e2e48);margin:0;padding-bottom:6px;font-size:1em}.N6HjNq_label{opacity:.9;flex-direction:column;gap:4px;font-size:.9em;display:flex}.N6HjNq_check{cursor:pointer;align-items:center;gap:6px;display:flex}.N6HjNq_presetBar{flex-wrap:wrap;gap:8px;display:flex}.N6HjNq_fileInput{display:none}.N6HjNq_presetBar .N6HjNq_input{flex:1;min-width:160px}.N6HjNq_form{flex-direction:column;gap:12px;display:flex}.N6HjNq_input,.N6HjNq_textarea{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);color:inherit;font:inherit;border-radius:8px;padding:8px}.N6HjNq_textarea{resize:vertical}input[type=range]{accent-color:var(--dsh-st-accent-dim,#37376b)}.N6HjNq_toolBtn,.N6HjNq_primaryBtn{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);color:inherit;font:inherit;cursor:pointer;border-radius:8px;padding:6px 12px}.N6HjNq_toolBtn:hover{background:var(--dsh-st-hover,#26264a)}.N6HjNq_toolBtn:disabled{opacity:.4;cursor:default}.N6HjNq_primaryBtn{background:var(--dsh-st-accent-dim,#37376b);border-color:#0000;align-self:flex-start}.N6HjNq_primaryBtn:disabled{opacity:.5;cursor:default}.N6HjNq_error{color:#f88;border:1px solid #a33;border-radius:8px;max-width:640px;padding:8px 12px}.N6HjNq_navBtn,.N6HjNq_navBtnActive{text-align:left;font:inherit;cursor:pointer;color:inherit;border:none;border-radius:8px;padding:8px 12px;display:block}.N6HjNq_navBtn{background:0 0}.N6HjNq_navBtn:hover{background:var(--dsh-st-hover,#26264a)}.N6HjNq_navBtnActive{background:var(--dsh-st-accent-dim,#37376b)}";
		const tagId = "@deepseek-ai/dsh-client-ui-st-settings/settings.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-st-settings";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var settings_module_css_default = {
			"navBtn": "N6HjNq_navBtn",
			"fileInput": "N6HjNq_fileInput",
			"section": "N6HjNq_section",
			"check": "N6HjNq_check",
			"navBtnActive": "N6HjNq_navBtnActive",
			"panel": "N6HjNq_panel",
			"textarea": "N6HjNq_textarea",
			"primaryBtn": "N6HjNq_primaryBtn",
			"error": "N6HjNq_error",
			"label": "N6HjNq_label",
			"sectionTitle": "N6HjNq_sectionTitle",
			"input": "N6HjNq_input",
			"form": "N6HjNq_form",
			"toolBtn": "N6HjNq_toolBtn",
			"presetBar": "N6HjNq_presetBar"
		};
		//#endregion
		//#region src/client/SettingsPanel.tsx
		/**
		* The settings panel: user persona name, the persona library (ST's personas/
		* directory), instruct templates (ST's instructs/), model selection, and
		* chat-completion preset management
		* (create/edit/duplicate/delete/export) — ST's settings surface reduced to the
		* fields this harness's generation path consumes.
		*/
		/** Generation sliders shown in the preset editor; the rest stay untouched. */
		const SLIDERS = [
			{
				key: "temp",
				label: "温度",
				min: 0,
				max: 2,
				step: .05
			},
			{
				key: "frequency_penalty",
				label: "频率惩罚",
				min: -2,
				max: 2,
				step: .01
			},
			{
				key: "presence_penalty",
				label: "存在惩罚",
				min: -2,
				max: 2,
				step: .01
			},
			{
				key: "repetition_penalty",
				label: "重复惩罚",
				min: 1,
				max: 2,
				step: .01
			},
			{
				key: "min_p",
				label: "Min P",
				min: 0,
				max: 1,
				step: .001
			},
			{
				key: "top_p",
				label: "Top P",
				min: 0,
				max: 1,
				step: .05
			},
			{
				key: "top_k",
				label: "Top K",
				min: 0,
				max: 100,
				step: 1
			},
			{
				key: "max_tokens",
				label: "最大回复长度",
				min: 64,
				max: 8192,
				step: 64
			}
		];
		/** ChatML wrapper preset mirroring the server's CHATML_INSTRUCT; seeds the built-in button. */
		const CHATML = {
			systemSequence: "<|im_start|>system\n",
			systemSequencePrefix: "",
			systemSequenceSuffix: "",
			inputSequence: "<|im_start|>user\n",
			inputSuffix: "<|im_end|>\n",
			outputSequence: "<|im_start|>assistant\n",
			outputSuffix: "<|im_end|>\n",
			firstOutputSequence: "",
			firstOutputSuffix: "",
			lastOutputSequence: "",
			lastOutputSuffix: "",
			stopSequence: "<|im_end|>",
			separatorSequence: "",
			wrap: false,
			trimSequences: false
		};
		/**
		* The ST settings surface.
		* @param props - the {@link StFace} share (state hook, api, actions).
		*/
		function SettingsPanel({ useSt, api, actions }) {
			const st = useSt((s) => s);
			const [models, setModels] = (0, react.useState)([]);
			const [personas, setPersonas] = (0, react.useState)([]);
			const [selPersona, setSelPersona] = (0, react.useState)("");
			const [instructs, setInstructs] = (0, react.useState)([]);
			const [instructDraft, setInstructDraft] = (0, react.useState)(null);
			const [instructDirty, setInstructDirty] = (0, react.useState)(false);
			const [presets, setPresets] = (0, react.useState)([]);
			const [selId, setSelId] = (0, react.useState)("");
			const [draft, setDraft] = (0, react.useState)(null);
			const [dirty, setDirty] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const [cfgDraft, setCfgDraft] = (0, react.useState)(null);
			const [sourceModels, setSourceModels] = (0, react.useState)([]);
			const [providers, setProviders] = (0, react.useState)([]);
			const refreshPresets = (0, react.useCallback)(async () => {
				try {
					const list = await api.listPresets();
					setPresets(list);
					setSelId((prev) => list.some((p) => p.id === prev) ? prev : list[0]?.id ?? "");
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api]);
			(0, react.useEffect)(() => {
				api.listModels().then(setModels).catch((e) => {
					setError(String(e));
				});
				api.listPersonas().then(setPersonas).catch((e) => {
					setError(String(e));
				});
				api.listInstructs().then(setInstructs).catch((e) => {
					setError(String(e));
				});
				api.getApiConfig().then(setCfgDraft).catch((e) => {
					setError(String(e));
				});
				api.listProviders().then(setProviders).catch(() => {
					setProviders([]);
				});
				refreshPresets();
			}, [api, refreshPresets]);
			/** Load the model catalog for the active API source (the custom source's pinned
			* provider decides the catalog); empty on failure (fallback to manual entry). */
			(0, react.useEffect)(() => {
				if (cfgDraft === null) return;
				api.listModelsBySource(cfgDraft.source).then(setSourceModels).catch(() => {
					setSourceModels([]);
				});
			}, [
				api,
				cfgDraft?.source,
				cfgDraft?.custom?.provider
			]);
			(0, react.useEffect)(() => {
				const found = presets.find((p) => p.id === selId) ?? null;
				setDraft(found === null ? null : structuredClone(found));
				setDirty(false);
			}, [presets, selId]);
			/** Keep the instruct editor draft in sync with the active template selection. */
			(0, react.useEffect)(() => {
				const row = instructs.find((t) => t.filename === st.instructId) ?? null;
				setInstructDraft(row === null ? null : structuredClone(row));
				setInstructDirty(false);
			}, [instructs, st.instructId]);
			/** Edit one instruct-template sequence field in place. */
			const patchInstruct = (0, react.useCallback)((patch) => {
				setInstructDraft((prev) => prev === null ? prev : {
					...prev,
					template: {
						...prev.template,
						...patch
					}
				});
				setInstructDirty(true);
			}, []);
			/** Persist the edited instruct template; the list refreshes from the saved row. */
			const saveInstructDraft = (0, react.useCallback)(async () => {
				if (instructDraft === null) return;
				setError("");
				try {
					const saved = await api.saveInstruct(instructDraft);
					setInstructs((prev) => [...prev.filter((t) => t.filename !== saved.filename), saved].sort((a, b) => a.filename.localeCompare(b.filename)));
					setInstructDirty(false);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api, instructDraft]);
			/** Patch the API-config draft; triggers the source-specific useEffect that re-fetches models. */
			const patchCfg = (0, react.useCallback)((patch) => {
				setCfgDraft((prev) => prev === null ? prev : {
					...prev,
					...patch
				});
			}, []);
			/** Persist the current API-config draft; re-reads from server on success so subsequent edits start fresh. */
			const handleSaveApiConfig = (0, react.useCallback)(async () => {
				if (cfgDraft === null) return;
				try {
					await api.saveApiConfig(cfgDraft);
					setCfgDraft(await api.getApiConfig());
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api, cfgDraft]);
			/** Local edit on the draft preset; mark dirty. */
			const patchDraft = (0, react.useCallback)((patch) => {
				setDraft((prev) => prev === null ? prev : {
					...prev,
					...patch
				});
				setDirty(true);
			}, []);
			/** Edit one prompt-manager entry in place. */
			const patchEntry = (0, react.useCallback)((index, patch) => {
				setDraft((prev) => prev === null ? prev : {
					...prev,
					promptOrder: { entries: prev.promptOrder.entries.map((e, i) => {
						if (i !== index) return e;
						const { depth, ...rest } = patch;
						const next = {
							...e,
							...rest
						};
						if (depth === void 0) delete next.depth;
						else next.depth = depth;
						return next;
					}) }
				});
				setDirty(true);
			}, []);
			/** Move one prompt-manager entry within the order. */
			const moveEntry = (0, react.useCallback)((index, delta) => {
				setDraft((prev) => {
					if (prev === null) return prev;
					const entries = [...prev.promptOrder.entries];
					const target = index + delta;
					if (target < 0 || target >= entries.length) return prev;
					[entries[index], entries[target]] = [entries[target], entries[index]];
					return {
						...prev,
						promptOrder: { entries }
					};
				});
				setDirty(true);
			}, []);
			/** Append a blank disabled entry; the user fills name and content. */
			const addEntry = (0, react.useCallback)(() => {
				setDraft((prev) => prev === null ? prev : {
					...prev,
					promptOrder: { entries: [...prev.promptOrder.entries, {
						name: "",
						enabled: true,
						role: "system",
						content: ""
					}] }
				});
				setDirty(true);
			}, []);
			const removeEntry = (0, react.useCallback)((index) => {
				setDraft((prev) => prev === null ? prev : {
					...prev,
					promptOrder: { entries: prev.promptOrder.entries.filter((_, i) => i !== index) }
				});
				setDirty(true);
			}, []);
			const patchGeneration = (0, react.useCallback)((key, value) => {
				setDraft((prev) => prev === null ? prev : {
					...prev,
					generation: {
						...prev.generation,
						[key]: value
					}
				});
				setDirty(true);
			}, []);
			const save = (0, react.useCallback)(async () => {
				if (draft === null) return;
				setError("");
				try {
					await api.updatePreset(draft.id, draft);
					await refreshPresets();
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				draft,
				api,
				refreshPresets
			]);
			const create = (0, react.useCallback)(async () => {
				const name = window.prompt("新预设名称");
				if (name === null || name.trim() === "") return;
				try {
					const { id } = await api.createPreset({ name: name.trim() });
					await refreshPresets();
					setSelId(id);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api, refreshPresets]);
			const duplicate = (0, react.useCallback)(async (id) => {
				try {
					const { id: newId } = await api.duplicatePreset(id);
					await refreshPresets();
					setSelId(newId);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api, refreshPresets]);
			const remove = (0, react.useCallback)(async (id, name) => {
				if (!window.confirm(`删除预设「${name}」？此操作不可恢复。`)) return;
				try {
					await api.deletePreset(id);
					await refreshPresets();
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api, refreshPresets]);
			const exportJson = (0, react.useCallback)(async (id, name) => {
				try {
					const { json } = await api.exportPreset(id);
					const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
					const a = document.createElement("a");
					a.href = url;
					a.download = `${name}.json`;
					a.click();
					URL.revokeObjectURL(url);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api]);
			/** Import a preset from its exported JSON file; selects it on success. */
			const importJson = (0, react.useCallback)(async (file) => {
				setError("");
				try {
					const { id } = await api.importPreset(await file.text());
					await refreshPresets();
					setSelId(id);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api, refreshPresets]);
			/** Persist the current name + persona description as a new persona file. */
			const savePersona = (0, react.useCallback)(async () => {
				const name = window.prompt("新 persona 名字（同时用作 {{user}} 显示名）", st.userName);
				if (name === null || name.trim() === "") return;
				setError("");
				try {
					const saved = await api.savePersona({
						filename: name.trim(),
						name: name.trim(),
						description: st.persona
					});
					setPersonas((prev) => [...prev.filter((p) => p.filename !== saved.filename), saved].sort((a, b) => a.filename.localeCompare(b.filename)));
					setSelPersona(saved.filename);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				api,
				st.userName,
				st.persona
			]);
			const removePersona = (0, react.useCallback)(async (filename) => {
				if (!window.confirm(`删除 persona「${filename}」？此操作不可恢复。`)) return;
				try {
					await api.deletePersona(filename);
					setPersonas((prev) => prev.filter((p) => p.filename !== filename));
					setSelPersona("");
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api]);
			/** Save the built-in ChatML template as a library file. */
			const createChatML = (0, react.useCallback)(async () => {
				setError("");
				try {
					const saved = await api.saveInstruct({
						filename: "ChatML",
						name: "ChatML",
						template: CHATML
					});
					setInstructs((prev) => [...prev.filter((t) => t.filename !== saved.filename), saved].sort((a, b) => a.filename.localeCompare(b.filename)));
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [api]);
			const removeInstruct = (0, react.useCallback)(async (filename) => {
				if (!window.confirm(`删除指令模板「${filename}」？此操作不可恢复。`)) return;
				try {
					await api.deleteInstruct(filename);
					setInstructs((prev) => prev.filter((t) => t.filename !== filename));
					if (st.instructId === filename) actions.setInstructId("");
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}, [
				api,
				st.instructId,
				actions
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_module_css_default.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: settings_module_css_default.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: settings_module_css_default.sectionTitle,
								children: "用户"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.label,
								children: [
									"你的名字（",
									"{{user}}",
									" 宏替换值）",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: settings_module_css_default.input,
										value: st.userName,
										onChange: (e) => {
											actions.setUserName(e.target.value);
										}
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.label,
								children: [
									"用户人设（注入到角色描述之前，支持 ",
									"{{char}}/{{user}}",
									" 宏）",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
										className: settings_module_css_default.textarea,
										rows: 3,
										value: st.persona,
										placeholder: "描述 {'{{user}}'} 是谁：外貌、身份、性格…",
										onChange: (e) => {
											actions.setPersona(e.target.value);
										}
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.label,
								children: ["人设描述位置（ST's persona_description_position）", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: settings_module_css_default.input,
									value: st.personaPosition ?? 0,
									onChange: (e) => {
										actions.setPersonaPosition(Number(e.target.value));
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 0,
											children: "In Story String / Prompt Manager"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 2,
											children: "Top of Author's Note"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 3,
											children: "Bottom of Author's Note"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 4,
											children: "In-chat @ Depth"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 9,
											children: "None (disabled)"
										})
									]
								})]
							}),
							st.personaPosition === 4 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["Depth", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: settings_module_css_default.input,
										type: "number",
										min: 0,
										max: 9999,
										value: st.personaDepth ?? 4,
										onChange: (e) => {
											actions.setPersonaDepth(Number(e.target.value));
										}
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["Role", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: settings_module_css_default.input,
										value: st.personaDepthRole ?? 0,
										onChange: (e) => {
											actions.setPersonaDepthRole(Number(e.target.value));
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: 0,
												children: "System"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: 1,
												children: "User"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: 2,
												children: "Assistant"
											})
										]
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.label,
								children: [
									"上下文模板（Story String，留空用默认布局；激活后 ",
									"{{persona}}",
									" 槽接管人设行）",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
										className: settings_module_css_default.textarea,
										rows: 5,
										value: st.storyString,
										placeholder: "{'{{#if description}}{{description}}\\n{{/if}}{{#if personality}}{{char}}\\'s personality: {{personality}}\\n{{/if}}…'}",
										onChange: (e) => {
											actions.setStoryString(e.target.value);
										}
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_module_css_default.label,
								children: ["Persona 库（ST 的 personas/ 目录；选中即把名字+人设写入上方输入框）", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: settings_module_css_default.presetBar,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											className: settings_module_css_default.input,
											value: selPersona,
											onChange: (e) => {
												setSelPersona(e.target.value);
												const p = personas.find((x) => x.filename === e.target.value);
												if (p !== void 0) {
													actions.setUserName(p.name);
													actions.setPersona(p.description);
												}
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "",
												children: "（无）"
											}), personas.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: p.filename,
												children: p.name
											}, p.filename))]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: settings_module_css_default.toolBtn,
											onClick: () => {
												savePersona();
											},
											children: "保存当前为 persona"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: settings_module_css_default.toolBtn,
											disabled: selPersona === "",
											onClick: () => {
												removePersona(selPersona);
											},
											children: "删除"
										})
									]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: settings_module_css_default.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: settings_module_css_default.sectionTitle,
								children: "指令模板（Instruct Mode）"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.label,
								children: ["激活模板（把提示词展平为角色标记包裹的单条文本，ST 的 instruct 模式）", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: settings_module_css_default.input,
									value: st.instructId,
									onChange: (e) => {
										actions.setInstructId(e.target.value);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: "（关闭，聊天模式）"
									}), instructs.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: t.filename,
										children: t.name
									}, t.filename))]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_module_css_default.presetBar,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_module_css_default.toolBtn,
									onClick: () => {
										createChatML();
									},
									children: "＋ 内置 ChatML"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_module_css_default.toolBtn,
									disabled: st.instructId === "",
									onClick: () => {
										removeInstruct(st.instructId);
									},
									children: "删除"
								})]
							}),
							instructDraft !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_module_css_default.form,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: settings_module_css_default.label,
										children: ["模板名", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: settings_module_css_default.input,
											value: instructDraft.name,
											onChange: (e) => {
												setInstructDraft({
													...instructDraft,
													name: e.target.value
												});
												setInstructDirty(true);
											}
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: settings_module_css_default.label,
										children: ["System 序列（system_sequence；留空则不输出系统行）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: settings_module_css_default.input,
											value: instructDraft.template.systemSequence,
											onChange: (e) => {
												patchInstruct({ systemSequence: e.target.value });
											}
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_module_css_default.row,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: settings_module_css_default.label,
											children: ["System 前缀（system_sequence_prefix）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: settings_module_css_default.input,
												value: instructDraft.template.systemSequencePrefix,
												onChange: (e) => {
													patchInstruct({ systemSequencePrefix: e.target.value });
												}
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: settings_module_css_default.label,
											children: ["System 后缀（system_sequence_suffix）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: settings_module_css_default.input,
												value: instructDraft.template.systemSequenceSuffix,
												onChange: (e) => {
													patchInstruct({ systemSequenceSuffix: e.target.value });
												}
											})]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_module_css_default.row,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: settings_module_css_default.label,
											children: ["用户开（input_sequence）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: settings_module_css_default.input,
												value: instructDraft.template.inputSequence,
												onChange: (e) => {
													patchInstruct({ inputSequence: e.target.value });
												}
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: settings_module_css_default.label,
											children: ["用户闭（input_suffix）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: settings_module_css_default.input,
												value: instructDraft.template.inputSuffix,
												onChange: (e) => {
													patchInstruct({ inputSuffix: e.target.value });
												}
											})]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_module_css_default.row,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: settings_module_css_default.label,
											children: ["AI 开（output_sequence）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: settings_module_css_default.input,
												value: instructDraft.template.outputSequence,
												onChange: (e) => {
													patchInstruct({ outputSequence: e.target.value });
												}
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: settings_module_css_default.label,
											children: ["AI 闭（output_suffix）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: settings_module_css_default.input,
												value: instructDraft.template.outputSuffix,
												onChange: (e) => {
													patchInstruct({ outputSuffix: e.target.value });
												}
											})]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_module_css_default.row,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: settings_module_css_default.label,
											children: ["首条 AI 开（first_output_sequence）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: settings_module_css_default.input,
												value: instructDraft.template.firstOutputSequence,
												onChange: (e) => {
													patchInstruct({ firstOutputSequence: e.target.value });
												}
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: settings_module_css_default.label,
											children: ["首条 AI 闭（first_output_suffix）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: settings_module_css_default.input,
												value: instructDraft.template.firstOutputSuffix,
												onChange: (e) => {
													patchInstruct({ firstOutputSuffix: e.target.value });
												}
											})]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_module_css_default.row,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: settings_module_css_default.label,
											children: ["末条 AI 开（last_output_sequence）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: settings_module_css_default.input,
												value: instructDraft.template.lastOutputSequence,
												onChange: (e) => {
													patchInstruct({ lastOutputSequence: e.target.value });
												}
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: settings_module_css_default.label,
											children: ["末条 AI 闭（last_output_suffix）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: settings_module_css_default.input,
												value: instructDraft.template.lastOutputSuffix,
												onChange: (e) => {
													patchInstruct({ lastOutputSuffix: e.target.value });
												}
											})]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_module_css_default.row,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: settings_module_css_default.label,
											children: ["停止序列（stop_sequence，追加到生成停止列表）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: settings_module_css_default.input,
												value: instructDraft.template.stopSequence,
												onChange: (e) => {
													patchInstruct({ stopSequence: e.target.value });
												}
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: settings_module_css_default.label,
											children: ["行间分隔（separator_sequence）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: settings_module_css_default.input,
												value: instructDraft.template.separatorSequence,
												onChange: (e) => {
													patchInstruct({ separatorSequence: e.target.value });
												}
											})]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_module_css_default.row,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: settings_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: instructDraft.template.wrap,
												onChange: (e) => {
													patchInstruct({ wrap: e.target.checked });
												}
											}), "开序列后换行（wrap）"]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: settings_module_css_default.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: instructDraft.template.trimSequences,
												onChange: (e) => {
													patchInstruct({ trimSequences: e.target.checked });
												}
											}), "使用前修剪序列空白（trim_sequences）"]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: settings_module_css_default.primaryBtn,
										disabled: !instructDirty,
										onClick: () => {
											saveInstructDraft();
										},
										children: instructDirty ? "保存模板更改" : "已保存"
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: settings_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: settings_module_css_default.sectionTitle,
							children: "API 配置"
						}), cfgDraft === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: settings_module_css_default.hint,
							children: "加载中…"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.label,
								children: ["API 类型", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: settings_module_css_default.input,
									value: cfgDraft.source,
									onChange: (e) => {
										patchCfg({ source: e.target.value });
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "openai",
											children: "OpenAI"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "anthropic",
											children: "Anthropic"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "custom",
											children: "Custom（OpenAI 兼容）"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "openrouter",
											children: "OpenRouter"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "ollama",
											children: "Ollama（本地）"
										})
									]
								})]
							}),
							cfgDraft.source === "openai" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["API Server URL", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: settings_module_css_default.input,
										value: cfgDraft.openai?.baseUrl ?? "https://api.openai.com/v1",
										readOnly: true
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["API Key 环境变量名", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: settings_module_css_default.input,
										value: cfgDraft.openai?.apiKeyEnv ?? "OPENAI_API_KEY",
										onChange: (e) => {
											patchCfg({ openai: {
												...cfgDraft.openai,
												apiKeyEnv: e.target.value
											} });
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["Model", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: settings_module_css_default.input,
										value: cfgDraft.openai?.model ?? "",
										onChange: (e) => {
											patchCfg({ openai: {
												...cfgDraft.openai,
												model: e.target.value
											} });
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "",
											children: "默认（服务器决定）"
										}), sourceModels.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: m.model,
											children: m.model
										}, m.model))]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["Streaming", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: settings_module_css_default.input,
										value: String(cfgDraft.openai?.streaming ?? true),
										onChange: (e) => {
											patchCfg({ openai: {
												...cfgDraft.openai,
												streaming: e.target.value === "true"
											} });
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "true",
											children: "开启"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "false",
											children: "关闭"
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["上下文大小（tokens）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "number",
										className: settings_module_css_default.input,
										value: cfgDraft.openai?.contextSize ?? 4096,
										onChange: (e) => {
											patchCfg({ openai: {
												...cfgDraft.openai,
												contextSize: Number(e.target.value)
											} });
										}
									})]
								})
							] }),
							cfgDraft.source === "anthropic" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["API Server URL", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: settings_module_css_default.input,
										value: cfgDraft.anthropic?.baseUrl ?? "https://api.anthropic.com",
										readOnly: true
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["API Key 环境变量名", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: settings_module_css_default.input,
										value: cfgDraft.anthropic?.apiKeyEnv ?? "ANTHROPIC_API_KEY",
										onChange: (e) => {
											patchCfg({ anthropic: {
												...cfgDraft.anthropic,
												apiKeyEnv: e.target.value
											} });
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["Model", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: settings_module_css_default.input,
										value: cfgDraft.anthropic?.model ?? "",
										onChange: (e) => {
											patchCfg({ anthropic: {
												...cfgDraft.anthropic,
												model: e.target.value
											} });
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "",
											children: "默认（服务器决定）"
										}), sourceModels.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: m.model,
											children: m.model
										}, m.model))]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["Streaming", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: settings_module_css_default.input,
										value: String(cfgDraft.anthropic?.streaming ?? true),
										onChange: (e) => {
											patchCfg({ anthropic: {
												...cfgDraft.anthropic,
												streaming: e.target.value === "true"
											} });
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "true",
											children: "开启"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "false",
											children: "关闭"
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["上下文大小（tokens）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "number",
										className: settings_module_css_default.input,
										value: cfgDraft.anthropic?.contextSize ?? 4096,
										onChange: (e) => {
											patchCfg({ anthropic: {
												...cfgDraft.anthropic,
												contextSize: Number(e.target.value)
											} });
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["Assistant Prefill（注入到 assistant 第一条消息的文本）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: settings_module_css_default.input,
										value: cfgDraft.anthropic?.assistantPrefill ?? "",
										onChange: (e) => {
											patchCfg({ anthropic: {
												...cfgDraft.anthropic,
												assistantPrefill: e.target.value
											} });
										}
									})]
								})
							] }),
							cfgDraft.source === "custom" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["提供方（已注册的 LLM 路由）", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: settings_module_css_default.input,
										value: cfgDraft.custom?.provider ?? "",
										onChange: (e) => {
											patchCfg({ custom: {
												...cfgDraft.custom,
												baseUrl: cfgDraft.custom?.baseUrl ?? "",
												model: cfgDraft.custom?.model ?? "",
												...e.target.value === "" ? {} : { provider: e.target.value }
											} });
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "",
											children: "默认（部署配置的提供方）"
										}), providers.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
											value: p.id,
											children: [
												p.name,
												"（",
												p.id,
												"）"
											]
										}, p.id))]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: settings_module_css_default.hint,
									children: "API 密钥与地址在各提供方的 DSH 设置 → 模型页管理（顶栏右侧齿轮 → 模型）；这里只选择路由与模型。"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["Custom Endpoint URL", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: settings_module_css_default.input,
										value: cfgDraft.custom?.baseUrl ?? "",
										placeholder: "https://example.com/v1",
										onChange: (e) => {
											patchCfg({ custom: {
												...cfgDraft.custom,
												baseUrl: e.target.value,
												model: cfgDraft.custom?.model ?? ""
											} });
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["API Key 环境变量名（可选）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: settings_module_css_default.input,
										value: cfgDraft.custom?.apiKeyEnv ?? "",
										onChange: (e) => {
											patchCfg({ custom: {
												...cfgDraft.custom,
												baseUrl: cfgDraft.custom?.baseUrl ?? "",
												model: cfgDraft.custom?.model ?? "",
												apiKeyEnv: e.target.value
											} });
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: [
										"Model ID（可手动输入）",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: settings_module_css_default.input,
											value: cfgDraft.custom?.model ?? "",
											placeholder: "deepseek-v4-flash",
											onChange: (e) => {
												patchCfg({ custom: {
													...cfgDraft.custom,
													baseUrl: cfgDraft.custom?.baseUrl ?? "",
													model: e.target.value
												} });
											}
										}),
										sourceModels.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											className: settings_module_css_default.input,
											value: cfgDraft.custom?.model ?? "",
											onChange: (e) => {
												patchCfg({ custom: {
													...cfgDraft.custom,
													baseUrl: cfgDraft.custom?.baseUrl ?? "",
													model: e.target.value
												} });
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "",
												children: "（手动输入）"
											}), sourceModels.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: m.model,
												children: m.model
											}, m.model))]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["Streaming", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: settings_module_css_default.input,
										value: String(cfgDraft.custom?.streaming ?? true),
										onChange: (e) => {
											patchCfg({ custom: {
												...cfgDraft.custom,
												baseUrl: cfgDraft.custom?.baseUrl ?? "",
												model: cfgDraft.custom?.model ?? "",
												streaming: e.target.value === "true"
											} });
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "true",
											children: "开启"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "false",
											children: "关闭"
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["上下文大小（tokens）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "number",
										className: settings_module_css_default.input,
										value: cfgDraft.custom?.contextSize ?? 4096,
										onChange: (e) => {
											patchCfg({ custom: {
												...cfgDraft.custom,
												baseUrl: cfgDraft.custom?.baseUrl ?? "",
												model: cfgDraft.custom?.model ?? "",
												contextSize: Number(e.target.value)
											} });
										}
									})]
								})
							] }),
							cfgDraft.source === "openrouter" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["API Server URL", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: settings_module_css_default.input,
										value: cfgDraft.openrouter?.baseUrl ?? "https://openrouter.ai/api/v1",
										readOnly: true
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["API Key 环境变量名", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: settings_module_css_default.input,
										value: cfgDraft.openrouter?.apiKeyEnv ?? "OPENROUTER_API_KEY",
										onChange: (e) => {
											patchCfg({ openrouter: {
												...cfgDraft.openrouter,
												model: cfgDraft.openrouter?.model ?? "",
												apiKeyEnv: e.target.value
											} });
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: [
										"Model ID（如 anthropic/claude-3.5-sonnet）",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: settings_module_css_default.input,
											value: cfgDraft.openrouter?.model ?? "",
											onChange: (e) => {
												patchCfg({ openrouter: {
													...cfgDraft.openrouter,
													model: e.target.value
												} });
											}
										}),
										sourceModels.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											className: settings_module_css_default.input,
											value: cfgDraft.openrouter?.model ?? "",
											onChange: (e) => {
												patchCfg({ openrouter: {
													...cfgDraft.openrouter,
													model: e.target.value
												} });
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "",
												children: "（手动输入）"
											}), sourceModels.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: m.model,
												children: m.model
											}, m.model))]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["Streaming", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: settings_module_css_default.input,
										value: String(cfgDraft.openrouter?.streaming ?? true),
										onChange: (e) => {
											patchCfg({ openrouter: {
												...cfgDraft.openrouter,
												model: cfgDraft.openrouter?.model ?? "",
												streaming: e.target.value === "true"
											} });
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "true",
											children: "开启"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "false",
											children: "关闭"
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["上下文大小（tokens）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "number",
										className: settings_module_css_default.input,
										value: cfgDraft.openrouter?.contextSize ?? 4096,
										onChange: (e) => {
											patchCfg({ openrouter: {
												...cfgDraft.openrouter,
												model: cfgDraft.openrouter?.model ?? "",
												contextSize: Number(e.target.value)
											} });
										}
									})]
								})
							] }),
							cfgDraft.source === "ollama" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["Ollama Endpoint", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: settings_module_css_default.input,
										value: cfgDraft.ollama?.baseUrl ?? "http://localhost:11434",
										onChange: (e) => {
											patchCfg({ ollama: {
												...cfgDraft.ollama,
												model: cfgDraft.ollama?.model ?? "",
												baseUrl: e.target.value
											} });
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: [
										"Model ID（如 llama3、mistral）",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: settings_module_css_default.input,
											value: cfgDraft.ollama?.model ?? "",
											onChange: (e) => {
												patchCfg({ ollama: {
													...cfgDraft.ollama,
													model: e.target.value
												} });
											}
										}),
										sourceModels.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											className: settings_module_css_default.input,
											value: cfgDraft.ollama?.model ?? "",
											onChange: (e) => {
												patchCfg({ ollama: {
													...cfgDraft.ollama,
													model: e.target.value
												} });
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "",
												children: "（手动输入）"
											}), sourceModels.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: m.model,
												children: m.model
											}, m.model))]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["上下文大小（tokens）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "number",
										className: settings_module_css_default.input,
										value: cfgDraft.ollama?.contextSize ?? 4096,
										onChange: (e) => {
											patchCfg({ ollama: {
												...cfgDraft.ollama,
												model: cfgDraft.ollama?.model ?? "",
												contextSize: Number(e.target.value)
											} });
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: settings_module_css_default.label,
									children: ["Streaming", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: settings_module_css_default.input,
										value: String(cfgDraft.ollama?.streaming ?? true),
										onChange: (e) => {
											patchCfg({ ollama: {
												...cfgDraft.ollama,
												model: cfgDraft.ollama?.model ?? "",
												streaming: e.target.value === "true"
											} });
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "true",
											children: "开启"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "false",
											children: "关闭"
										})]
									})]
								})
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: settings_module_css_default.presetBar,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_module_css_default.toolBtn,
									onClick: () => {
										handleSaveApiConfig();
									},
									children: "保存 API 配置"
								})
							})
						] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: settings_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: settings_module_css_default.sectionTitle,
							children: "模型"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: settings_module_css_default.label,
							children: ["当前模型", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: settings_module_css_default.input,
								value: st.model,
								onChange: (e) => {
									actions.setModel(e.target.value);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: "服务器默认"
								}), models.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
									value: m.model,
									children: [
										m.model,
										"（",
										m.provider,
										"）"
									]
								}, `${m.provider}/${m.model}`))]
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: settings_module_css_default.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: settings_module_css_default.sectionTitle,
								children: "预设（OpenAI Settings）"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.label,
								children: ["激活预设（生成时应用其参数与主/越狱提示词）", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: settings_module_css_default.input,
									value: st.presetId,
									onChange: (e) => {
										actions.setPresetId(e.target.value);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: "（不使用）"
									}), presets.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: p.id,
										children: p.name
									}, p.id))]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_module_css_default.presetBar,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										className: settings_module_css_default.input,
										value: selId,
										onChange: (e) => {
											setSelId(e.target.value);
										},
										children: [presets.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "",
											children: "（无预设）"
										}), presets.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: p.id,
											children: p.name
										}, p.id))]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: settings_module_css_default.toolBtn,
										onClick: () => {
											create();
										},
										children: "＋ 新建"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: settings_module_css_default.toolBtn,
										disabled: selId === "",
										onClick: () => {
											duplicate(selId);
										},
										children: "复制"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: settings_module_css_default.toolBtn,
										disabled: selId === "",
										onClick: () => {
											exportJson(selId, presets.find((p) => p.id === selId)?.name ?? "preset");
										},
										children: "导出"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: settings_module_css_default.toolBtn,
										children: ["📥 导入", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "file",
											accept: ".json,application/json",
											className: settings_module_css_default.fileInput,
											onChange: (e) => {
												const file = e.target.files?.[0];
												if (file !== void 0) importJson(file);
												e.target.value = "";
											}
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: settings_module_css_default.toolBtn,
										disabled: selId === "",
										onClick: () => {
											remove(selId, presets.find((p) => p.id === selId)?.name ?? "");
										},
										children: "删除"
									})
								]
							}),
							draft !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_module_css_default.form,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: settings_module_css_default.label,
										children: ["名称", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: settings_module_css_default.input,
											value: draft.name,
											onChange: (e) => {
												patchDraft({ name: e.target.value });
											}
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: settings_module_css_default.label,
										children: ["描述", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: settings_module_css_default.input,
											value: draft.description,
											onChange: (e) => {
												patchDraft({ description: e.target.value });
											}
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: settings_module_css_default.label,
										children: ["主提示词（系统提示）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
											className: settings_module_css_default.textarea,
											rows: 4,
											value: draft.mainPrompt,
											onChange: (e) => {
												patchDraft({ mainPrompt: e.target.value });
											}
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: settings_module_css_default.label,
										children: ["越狱提示词（历史后注入）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
											className: settings_module_css_default.textarea,
											rows: 3,
											value: draft.jailbreakPrompt,
											onChange: (e) => {
												patchDraft({ jailbreakPrompt: e.target.value });
											}
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_module_css_default.label,
										children: [
											"提示词管理器（启用条目接管系统提示与历史后区块；带深度则注入历史内）",
											draft.promptOrder.entries.map((e, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: settings_module_css_default.form,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: settings_module_css_default.presetBar,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
															type: "checkbox",
															checked: e.enabled,
															title: "启用",
															onChange: (ev) => {
																patchEntry(i, { enabled: ev.target.checked });
															}
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
															className: settings_module_css_default.input,
															value: e.name,
															placeholder: "条目名",
															onChange: (ev) => {
																patchEntry(i, { name: ev.target.value });
															}
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
															className: settings_module_css_default.input,
															value: e.role,
															onChange: (ev) => {
																patchEntry(i, { role: ev.target.value });
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
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
															className: settings_module_css_default.input,
															type: "number",
															min: 0,
															placeholder: "深度",
															value: e.depth === void 0 ? "" : e.depth,
															onChange: (ev) => {
																patchEntry(i, { depth: ev.target.value === "" ? void 0 : Number(ev.target.value) });
															}
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: settings_module_css_default.toolBtn,
															onClick: () => {
																moveEntry(i, -1);
															},
															children: "↑"
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: settings_module_css_default.toolBtn,
															onClick: () => {
																moveEntry(i, 1);
															},
															children: "↓"
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: settings_module_css_default.toolBtn,
															onClick: () => {
																removeEntry(i);
															},
															children: "✕"
														})
													]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
													className: settings_module_css_default.textarea,
													rows: 2,
													value: e.content,
													onChange: (ev) => {
														patchEntry(i, { content: ev.target.value });
													}
												})]
											}, i)),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: settings_module_css_default.toolBtn,
												onClick: addEntry,
												children: "＋ 新条目"
											})
										]
									}),
									SLIDERS.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: settings_module_css_default.label,
										children: [
											s.label,
											"：",
											draft.generation[s.key],
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "range",
												min: s.min,
												max: s.max,
												step: s.step,
												value: draft.generation[s.key],
												onChange: (e) => {
													patchGeneration(s.key, Number(e.target.value));
												}
											})
										]
									}, s.key)),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: settings_module_css_default.check,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: draft.nsfw,
											onChange: (e) => {
												patchDraft({ nsfw: e.target.checked });
											}
										}), "NSFW 内容"]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: settings_module_css_default.primaryBtn,
										disabled: !dirty,
										onClick: () => {
											save();
										},
										children: dirty ? "保存更改" : "已保存"
									})
								]
							})
						]
					}),
					error !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: settings_module_css_default.error,
						children: error
					})
				]
			});
		}
		//#endregion
		//#region src/client/apply.tsx
		/** Services required by the browser plugin. */
		const inject = ["slots"];
		/** The nav row for the settings surface; the panel key is closed over. */
		function SettingsNavRow(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: props.panel === "settings" ? settings_module_css_default.navBtnActive : settings_module_css_default.navBtn,
				onClick: () => {
					props.select("settings");
				},
				children: "⚙️ 设置"
			});
		}
		/**
		* Mount the settings surface into the ST shell's nav and panel slots.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.slots.inject("st.panel", () => {
				const disposePanel = ctx.slots.register({
					name: "st.panel",
					key: "settings"
				}, SettingsPanel);
				return [ctx.slots.register({
					name: "st.nav",
					id: "settings",
					order: 30
				}, SettingsNavRow), disposePanel];
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map