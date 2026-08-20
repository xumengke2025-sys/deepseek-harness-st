# deepseek-harness-st

SillyTavern 集成插件集 —— 把完整的酒馆体验作为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的可安装插件（Cordis bundle）交付。

> 本仓库是 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) monorepo 的插件子集发布仓：只包含 SillyTavern 迁移的全部产物（23 个包），依赖的 DSH 基座包（`@deepseek-ai/dsh-base`、`dsh-web-app`、`dsh-llm` 等）从 npm 解析。

## 功能一览

| 模块 | 包 | 能力 |
|---|---|---|
| 角色卡 | `dsh-st-character` | PNG/JSON 卡导入（chara_card_v2/v3）、卡编辑、与 ST 目录格式字节兼容 |
| 聊天 | `dsh-st-chat` | JSONL 持久化、swipe、分支（checkpoint）、全局搜索、纯文本导出 |
| 生成 | `dsh-st-generate` | 宏引擎、上下文/instruct 模板、token 预算裁剪、names_behavior、代写（impersonate）、续写（continue） |
| 世界书 | `dsh-st-lorebook` | 关键词扫描 + 递归 + 定时（sticky/cooldown）+ 向量化激活、全局扫描设置 |
| 群聊 | `dsh-st-group` | NATURAL/LIST/MANUAL/POOLED 四种发言策略 |
| 预设 | `dsh-st-preset` | OpenAI Settings 预设 + prompt manager 条目 |
| 指令模板 | `dsh-st-instruct` | ST 格式 instruct 模板库 |
| 正则 | `dsh-st-regex` | 提示词侧/显示侧 find-replace 脚本 |
| 人格 | `dsh-st-persona` | 用户人格库 |
| 向量 | `dsh-st-vector` | 本地 n-gram 嵌入 + OpenAI 兼容端点、Data Bank 文档检索 |
| API 配置 | `dsh-st-api-config` | 提供方直连（任意已注册 `ctx.llm` 路由）、模型目录、SSE 生成端点 |
| 界面 | `dsh-client-ui-st-*` ×6 | 聊天/角色/世界书/正则/设置/主题六个面板 |
| 组装 | `dsh-bundle-sillytavern` | 一条 patch 层挂载全部 21 个插件的 bundle |

## 安装（在任意 DeepSeek Harness 上）

```sh
# 1) 安装到你的 profile（推荐）
dsh plugin --profile my-profile add github:xumengke2025-sys/deepseek-harness-st#packages/bundle/sillytavern
```

> 注意：`dsh plugin add` 以包为单位安装；直接添加 bundle 子目录时，pnpm 会把本仓库作为源解析。
> 各包的 `lib/` 构建产物已随仓库提交，安装后 Cordis loader 可直接挂载，无需构建。

```sh
# 2) 或在完整 deepseek-harness 源码仓内使用内置 profile
dsh --profile sillytavern --port 3085
```

## 数据目录

所有服务保持与 SillyTavern 相同的磁盘布局（`characters/`、`chats/`、`worlds/`、`groups/`、`OpenAI Settings/`、`personas/`、`instructs/`……）：一个 ST 数据目录可以直接被本插件集读写，两边可互换使用。

## 模型接入

- **API 密钥与端点**：在 DSH Web 设置 → 模型页管理（credentials 体系，密钥永不落 ST 配置文件）
- **路由选择**：ST 设置面板 → API 配置 → 提供方下拉（任意已注册 LLM 路由，如 OpenAI 兼容网关）+ 模型筛选

## 开发

```sh
pnpm install
pnpm run bundle:client   # 重建浏览器面板产物
```

完整编译/测试（tsconfig 项目引用横跨整个 harness 包图）在 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 源码仓内进行：本仓库的 `packages/` 子树与源码仓路径完全同构，可直接同步。

## 许可证

[MIT](./LICENSE)（沿用上游 deepseek-harness）。第三方声明见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
