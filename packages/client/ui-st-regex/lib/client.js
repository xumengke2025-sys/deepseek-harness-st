window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-st-regex",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:D:\deepseek harness\packages\client\ui-st-regex\src\client\regex.module.css.mjs
		const css = ".tKVKHW_panel{background:var(--dsh-st-bg,#1a1a2e);min-width:0;min-height:0;color:var(--dsh-st-fg,#e8e8f0);flex:1;padding:16px;overflow-y:auto}.tKVKHW_navBtn,.tKVKHW_navBtnActive{text-align:left;font:inherit;cursor:pointer;color:inherit;border:none;border-radius:8px;padding:8px 12px;display:block}.tKVKHW_navBtn{background:0 0}.tKVKHW_navBtn:hover{background:var(--dsh-st-hover,#26264a)}.tKVKHW_navBtnActive{background:var(--dsh-st-accent-dim,#37376b)}.tKVKHW_head{align-items:center;gap:12px;margin-bottom:8px;display:flex}.tKVKHW_title{font-size:18px;font-weight:600}.tKVKHW_hint{opacity:.7;margin-bottom:12px}.tKVKHW_smallBtn{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);font:inherit;cursor:pointer;color:inherit;border-radius:8px;padding:6px 14px}.tKVKHW_smallBtn:hover{background:var(--dsh-st-hover,#26264a)}.tKVKHW_list{flex-direction:column;gap:8px;margin-bottom:16px;display:flex}.tKVKHW_item,.tKVKHW_itemActive{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);border-radius:10px;align-items:center;gap:6px;padding:8px 10px;display:flex}.tKVKHW_itemActive{border-color:var(--dsh-st-accent,#4a4a9c)}.tKVKHW_itemMain{min-width:0;font:inherit;text-align:left;cursor:pointer;color:inherit;background:0 0;border:none;flex-direction:column;flex:1;gap:2px;display:flex}.tKVKHW_name{font-weight:600}.tKVKHW_nameOff{opacity:.45;font-weight:600}.tKVKHW_rule{opacity:.75;text-overflow:ellipsis;white-space:nowrap;font-family:monospace;font-size:13px;overflow:hidden}.tKVKHW_toolBtn{cursor:pointer;color:inherit;background:0 0;border:none;border-radius:6px;padding:4px 8px}.tKVKHW_toolBtn:hover{background:var(--dsh-st-hover,#26264a)}.tKVKHW_editor{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);border-radius:12px;flex-direction:column;gap:10px;padding:14px;display:flex}.tKVKHW_label{flex-direction:column;gap:4px;font-size:14px;display:flex}.tKVKHW_row{flex-wrap:wrap;align-items:center;gap:14px;display:flex}.tKVKHW_check{align-items:center;gap:6px;font-size:14px;display:flex}.tKVKHW_input,.tKVKHW_area{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-bg,#1a1a2e);color:inherit;font:inherit;border-radius:8px;padding:8px 10px}.tKVKHW_area{resize:vertical;font-family:monospace}.tKVKHW_error{color:#ff9a9a;white-space:pre-wrap;background:#dc3c3c33;border-radius:8px;margin-top:10px;padding:8px 10px}";
		const tagId = "@deepseek-ai/dsh-client-ui-st-regex/regex.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-st-regex";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var regex_module_css_default = {
			"input": "tKVKHW_input",
			"navBtnActive": "tKVKHW_navBtnActive",
			"list": "tKVKHW_list",
			"editor": "tKVKHW_editor",
			"name": "tKVKHW_name",
			"row": "tKVKHW_row",
			"area": "tKVKHW_area",
			"item": "tKVKHW_item",
			"hint": "tKVKHW_hint",
			"itemActive": "tKVKHW_itemActive",
			"head": "tKVKHW_head",
			"itemMain": "tKVKHW_itemMain",
			"nameOff": "tKVKHW_nameOff",
			"toolBtn": "tKVKHW_toolBtn",
			"title": "tKVKHW_title",
			"panel": "tKVKHW_panel",
			"error": "tKVKHW_error",
			"navBtn": "tKVKHW_navBtn",
			"check": "tKVKHW_check",
			"rule": "tKVKHW_rule",
			"smallBtn": "tKVKHW_smallBtn",
			"label": "tKVKHW_label"
		};
		//#endregion
		//#region src/client/RegexPanel.tsx
		/**
		* The regex-script panel: list, edit, create, enable, and delete find-replace
		* scripts over the st-api regex routes. Saves broadcast 'st-regex-updated' on
		* window so the chat surface re-fetches its display-side copy.
		*/
		/** ST's placement flags, mirrored locally: cross-plugin value imports are forbidden in client bundles. */
		const PLACEMENT = {
			USER_INPUT: 1,
			DISPLAY: 0,
			AI_OUTPUT: 2
		};
		/** A fresh script skeleton for the editor, ST's defaults. */
		function blankScript() {
			return {
				id: "",
				scriptName: "新建脚本",
				findRegex: "",
				replaceString: "",
				trimStrings: [],
				placement: [PLACEMENT.DISPLAY],
				disabled: false,
				markdownOnly: false,
				promptOnly: false,
				substituteRegex: false
			};
		}
		/** One placement flag's label. */
		const PLACEMENTS = [
			{
				flag: PLACEMENT.USER_INPUT,
				label: "用户输入"
			},
			{
				flag: PLACEMENT.DISPLAY,
				label: "显示"
			},
			{
				flag: PLACEMENT.AI_OUTPUT,
				label: "AI 输出"
			}
		];
		/**
		* The regex-script management surface.
		* @param props - the {@link StFace} share (api, actions).
		*/
		function RegexPanel({ api }) {
			const [scripts, setScripts] = (0, react.useState)([]);
			const [editing, setEditing] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const load = (0, react.useCallback)(() => {
				api.listRegex().then(setScripts).catch((e) => {
					setError(String(e));
				});
			}, [api]);
			(0, react.useEffect)(load, [load]);
			/** Persist the editor's script, then tell the chat surface to refetch. */
			const handleSave = (0, react.useCallback)(async () => {
				if (editing === null) return;
				if (editing.findRegex === "") {
					setError("查找正则不能为空");
					return;
				}
				setBusy(true);
				setError("");
				try {
					new RegExp(editing.findRegex);
					setEditing(await api.saveRegex(editing));
					window.dispatchEvent(new CustomEvent("st-regex-updated"));
					load();
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, [
				api,
				editing,
				load
			]);
			const handleDelete = (0, react.useCallback)(async (id) => {
				setBusy(true);
				setError("");
				try {
					await api.deleteRegex(id);
					if (editing?.id === id) setEditing(null);
					window.dispatchEvent(new CustomEvent("st-regex-updated"));
					load();
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, [
				api,
				editing?.id,
				load
			]);
			/** Toggle one placement flag in the editor. */
			const togglePlacement = (flag) => {
				setEditing((cur) => cur === null ? null : {
					...cur,
					placement: cur.placement.includes(flag) ? cur.placement.filter((p) => p !== flag) : [...cur.placement, flag]
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: regex_module_css_default.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: regex_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: regex_module_css_default.title,
							children: "正则脚本"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: regex_module_css_default.smallBtn,
							disabled: busy,
							onClick: () => {
								setEditing(blankScript());
								setError("");
							},
							children: "＋ 新建"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: regex_module_css_default.hint,
						children: "查找替换脚本：按作用位置改写入提示词或仅显示的文本。存储在 settings/regex.json，与 SillyTavern 兼容。"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: regex_module_css_default.list,
						children: [scripts.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: s.id === editing?.id ? regex_module_css_default.itemActive : regex_module_css_default.item,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: regex_module_css_default.itemMain,
									onClick: () => {
										setEditing({ ...s });
										setError("");
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: s.disabled ? regex_module_css_default.nameOff : regex_module_css_default.name,
										children: s.scriptName
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: regex_module_css_default.rule,
										children: [
											s.findRegex,
											" → ",
											s.replaceString === "" ? "(删除)" : s.replaceString
										]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: regex_module_css_default.toolBtn,
									title: s.disabled ? "启用" : "停用",
									onClick: () => {
										setEditing({
											...s,
											disabled: !s.disabled
										});
									},
									children: s.disabled ? "⏸" : "▶"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: regex_module_css_default.toolBtn,
									title: "删除",
									onClick: () => {
										handleDelete(s.id);
									},
									children: "✕"
								})
							]
						}, s.id)), scripts.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: regex_module_css_default.hint,
							children: "暂无脚本。"
						})]
					}),
					editing !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: regex_module_css_default.editor,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: regex_module_css_default.label,
								children: ["名称", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: regex_module_css_default.input,
									value: editing.scriptName,
									onChange: (e) => {
										setEditing({
											...editing,
											scriptName: e.target.value
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: regex_module_css_default.label,
								children: ["查找正则（全局匹配）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: regex_module_css_default.input,
									value: editing.findRegex,
									placeholder: "例如 \\*\\*(.+?)\\*\\*",
									onChange: (e) => {
										setEditing({
											...editing,
											findRegex: e.target.value
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: regex_module_css_default.label,
								children: [
									"替换为（支持 $1 反向引用、",
									"{{char}}/{{user}}",
									"）",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: regex_module_css_default.input,
										value: editing.replaceString,
										onChange: (e) => {
											setEditing({
												...editing,
												replaceString: e.target.value
											});
										}
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: regex_module_css_default.label,
								children: ["移除片段（每行一个，替换后删除）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: regex_module_css_default.area,
									rows: 2,
									value: editing.trimStrings.join("\n"),
									onChange: (e) => {
										setEditing({
											...editing,
											trimStrings: e.target.value.split("\n").filter((t) => t !== "")
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: regex_module_css_default.label,
								children: ["作用位置", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: regex_module_css_default.row,
									children: PLACEMENTS.map(({ flag, label }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: regex_module_css_default.check,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: editing.placement.includes(flag),
											onChange: () => {
												togglePlacement(flag);
											}
										}), label]
									}, flag))
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: regex_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: regex_module_css_default.check,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: editing.substituteRegex,
											onChange: (e) => {
												setEditing({
													...editing,
													substituteRegex: e.target.checked
												});
											}
										}),
										"替换文本中代入 ",
										"{{char}}/{{user}}"
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: regex_module_css_default.check,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: editing.disabled,
										onChange: (e) => {
											setEditing({
												...editing,
												disabled: e.target.checked
											});
										}
									}), "停用"]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: regex_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: regex_module_css_default.smallBtn,
									disabled: busy,
									onClick: () => {
										handleSave();
									},
									children: "保存"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: regex_module_css_default.smallBtn,
									onClick: () => {
										setEditing(null);
									},
									children: "关闭"
								})]
							})
						]
					}),
					error !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: regex_module_css_default.error,
						children: error
					})
				]
			});
		}
		//#endregion
		//#region src/client/apply.tsx
		/** Services required by the browser plugin. */
		const inject = ["slots"];
		/** The nav row for the regex surface; the panel key is closed over. */
		function RegexNavRow(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: props.panel === "regex" ? regex_module_css_default.navBtnActive : regex_module_css_default.navBtn,
				onClick: () => {
					props.select("regex");
				},
				children: "⧉ 正则"
			});
		}
		/**
		* Mount the regex-script surface into the ST shell's nav and panel slots.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.slots.inject("st.panel", () => {
				const disposePanel = ctx.slots.register({
					name: "st.panel",
					key: "regex"
				}, RegexPanel);
				return [ctx.slots.register({
					name: "st.nav",
					id: "regex",
					order: 25
				}, RegexNavRow), disposePanel];
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map