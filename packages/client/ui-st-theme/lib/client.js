window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-st-theme",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/themes.ts
		/** The shipped themes, in panel order; `midnight` doubles as the default. */
		const THEMES = [
			{
				id: "midnight",
				label: "午夜蓝",
				vars: {
					"--dsh-st-bg": "#1a1a2e",
					"--dsh-st-fg": "#e8e8f0",
					"--dsh-st-border": "#2e2e48",
					"--dsh-st-nav-bg": "#16162a",
					"--dsh-st-hover": "#26264a",
					"--dsh-st-accent": "#4a4a9c",
					"--dsh-st-accent-dim": "#37376b",
					"--dsh-st-bubble": "#23233d",
					"--dsh-st-bubble-user": "#2c2a52"
				}
			},
			{
				id: "violet",
				label: "紫罗兰",
				vars: {
					"--dsh-st-bg": "#1e1626",
					"--dsh-st-fg": "#ece4f4",
					"--dsh-st-border": "#3a2c4a",
					"--dsh-st-nav-bg": "#181022",
					"--dsh-st-hover": "#2e2040",
					"--dsh-st-accent": "#8b5fbf",
					"--dsh-st-accent-dim": "#4d3568",
					"--dsh-st-bubble": "#261c33",
					"--dsh-st-bubble-user": "#33254a"
				}
			},
			{
				id: "forest",
				label: "深林",
				vars: {
					"--dsh-st-bg": "#16221a",
					"--dsh-st-fg": "#e2eee6",
					"--dsh-st-border": "#2b3e30",
					"--dsh-st-nav-bg": "#111b15",
					"--dsh-st-hover": "#223428",
					"--dsh-st-accent": "#3f8f5f",
					"--dsh-st-accent-dim": "#2c5a42",
					"--dsh-st-bubble": "#1c2b21",
					"--dsh-st-bubble-user": "#24382c"
				}
			},
			{
				id: "graphite",
				label: "石墨",
				vars: {
					"--dsh-st-bg": "#1f1f22",
					"--dsh-st-fg": "#e6e6e8",
					"--dsh-st-border": "#34343a",
					"--dsh-st-nav-bg": "#19191c",
					"--dsh-st-hover": "#2b2b30",
					"--dsh-st-accent": "#7a7a88",
					"--dsh-st-accent-dim": "#4c4c56",
					"--dsh-st-bubble": "#26262a",
					"--dsh-st-bubble-user": "#303036"
				}
			},
			{
				id: "daylight",
				label: "日光",
				vars: {
					"--dsh-st-bg": "#f4f2ec",
					"--dsh-st-fg": "#2c2a26",
					"--dsh-st-border": "#d8d2c4",
					"--dsh-st-nav-bg": "#ebe7dd",
					"--dsh-st-hover": "#ddd7c9",
					"--dsh-st-accent": "#7d6bb8",
					"--dsh-st-accent-dim": "#c4bce0",
					"--dsh-st-bubble": "#e9e5da",
					"--dsh-st-bubble-user": "#dad2ee"
				}
			}
		];
		/** The default theme id; also the fallback for unknown persisted values. */
		const DEFAULT_THEME_ID = "midnight";
		/** Look up a theme by id; unknown ids fall back to {@link DEFAULT_THEME_ID}. */
		function resolveTheme(id) {
			return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === "midnight");
		}
		/** Resolve a persisted storage value; `null` or an unknown id selects the default. */
		function resolveStoredTheme(stored) {
			return stored === null ? resolveTheme(DEFAULT_THEME_ID) : resolveTheme(stored);
		}
		//#endregion
		//#region src/client/dom.ts
		/**
		* DOM application of the theme registry: writes the active theme's custom
		* properties onto the document root (every ST panel's CSS resolves them with
		* its own fallbacks) and persists the selection in localStorage.
		*/
		/** localStorage key holding the selected theme id. */
		const THEME_STORAGE_KEY = "dsh-st.theme";
		/** Read the persisted theme id; `null` when storage is unavailable or empty. */
		function readStoredThemeId() {
			try {
				return localStorage.getItem(THEME_STORAGE_KEY);
			} catch {
				return null;
			}
		}
		/**
		* Write one theme's custom properties onto the document root and persist its id.
		* @param theme - the theme to activate and remember.
		*/
		function applyTheme(theme) {
			for (const [name, value] of Object.entries(theme.vars)) document.documentElement.style.setProperty(name, value);
			try {
				localStorage.setItem(THEME_STORAGE_KEY, theme.id);
			} catch {}
		}
		/** Apply the persisted (or default) theme; called once at plugin load. */
		function restoreTheme() {
			applyTheme(resolveStoredTheme(readStoredThemeId()));
		}
		/** Apply and persist a theme by id; unknown ids resolve to the default. */
		function selectTheme(id) {
			applyTheme(resolveTheme(id));
		}
		//#endregion
		//#region \0dsh-css:D:\deepseek harness\packages\client\ui-st-theme\src\client\theme.module.css.mjs
		const css = ".MCGtaq_panel{background:var(--dsh-st-bg,#1a1a2e);min-width:0;min-height:0;color:var(--dsh-st-fg,#e8e8f0);flex:1;padding:16px;overflow-y:auto}.MCGtaq_navBtn,.MCGtaq_navBtnActive{text-align:left;font:inherit;cursor:pointer;color:inherit;border:none;border-radius:8px;padding:8px 12px;display:block}.MCGtaq_navBtn{background:0 0}.MCGtaq_navBtn:hover{background:var(--dsh-st-hover,#26264a)}.MCGtaq_navBtnActive{background:var(--dsh-st-accent-dim,#37376b)}.MCGtaq_hint{opacity:.7;margin-bottom:12px}.MCGtaq_grid{grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;display:grid}.MCGtaq_card,.MCGtaq_cardActive{border:1px solid var(--dsh-st-border,#2e2e48);background:var(--dsh-st-nav-bg,#16162a);font:inherit;cursor:pointer;color:inherit;text-align:left;border-radius:12px;flex-direction:column;gap:10px;padding:14px;display:flex}.MCGtaq_card:hover{background:var(--dsh-st-hover,#26264a)}.MCGtaq_cardActive{border-color:var(--dsh-st-accent,#4a4a9c);background:var(--dsh-st-accent-dim,#37376b)}.MCGtaq_swatches{gap:6px;display:flex}.MCGtaq_swatch{border:1px solid var(--dsh-st-border,#2e2e48);border-radius:8px;flex:1;height:34px}.MCGtaq_label{font-size:14px}";
		const tagId = "@deepseek-ai/dsh-client-ui-st-theme/theme.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-st-theme";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var theme_module_css_default = {
			"grid": "MCGtaq_grid",
			"cardActive": "MCGtaq_cardActive",
			"hint": "MCGtaq_hint",
			"card": "MCGtaq_card",
			"panel": "MCGtaq_panel",
			"navBtnActive": "MCGtaq_navBtnActive",
			"swatches": "MCGtaq_swatches",
			"navBtn": "MCGtaq_navBtn",
			"swatch": "MCGtaq_swatch",
			"label": "MCGtaq_label"
		};
		//#endregion
		//#region src/client/ThemePanel.tsx
		/**
		* The theme panel: one card per registry theme with color swatches; clicking
		* applies the theme immediately and persists the selection.
		*/
		/** Swatch columns shown per card: background, bubbles, accent. */
		const SWATCH_VARS = [
			"--dsh-st-bg",
			"--dsh-st-bubble-user",
			"--dsh-st-accent"
		];
		/**
		* The ST theme surface.
		* @param _props - the {@link StFace} share; theme selection is local to this panel.
		*/
		function ThemePanel(_props) {
			const [active, setActive] = (0, react.useState)(readStoredThemeId() ?? THEMES[0].id);
			const choose = (id) => {
				selectTheme(id);
				setActive(id);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: theme_module_css_default.panel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: theme_module_css_default.hint,
					children: "选择主题后立即生效，并会在刷新后保留。"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: theme_module_css_default.grid,
					children: THEMES.map((theme) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: theme.id === active ? theme_module_css_default.cardActive : theme_module_css_default.card,
						onClick: () => {
							choose(theme.id);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: theme_module_css_default.swatches,
							children: SWATCH_VARS.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: theme_module_css_default.swatch,
								style: { background: theme.vars[name] }
							}, name))
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: theme_module_css_default.label,
							children: theme.label
						})]
					}, theme.id))
				})]
			});
		}
		//#endregion
		//#region src/client/apply.tsx
		/** Services required by the browser plugin. */
		const inject = ["slots"];
		/** The nav row for the theme surface; the panel key is closed over. */
		function ThemeNavRow(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: props.panel === "theme" ? theme_module_css_default.navBtnActive : theme_module_css_default.navBtn,
				onClick: () => {
					props.select("theme");
				},
				children: "🎨 主题"
			});
		}
		/**
		* Mount the theme surface into the ST shell's nav and panel slots.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			restoreTheme();
			ctx.slots.inject("st.panel", () => {
				const disposePanel = ctx.slots.register({
					name: "st.panel",
					key: "theme"
				}, ThemePanel);
				return [ctx.slots.register({
					name: "st.nav",
					id: "theme",
					order: 40
				}, ThemeNavRow), disposePanel];
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map