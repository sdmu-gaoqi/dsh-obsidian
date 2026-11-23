# 知识库 · Obsidian（@wagq/dsh-obsidian）

把本地 **Obsidian vault** 接到 [DeepSeek Harness](https://github.com/deepseek-ai/dsh)（DSH）：左侧栏多出一个三栏知识库工作区，对话里的智能体同时获得一套 `kb_*` 工具，两边读写的是**同一个 vault**——你在面板里改的笔记，智能体立刻能读到；智能体写入的笔记，刷新面板就能看到。

- 侧栏：文件库 / 文档 / 大纲 · 关联 · 问答 三栏，Markdown 渲染阅读 + 就地编辑保存
- 右键：新建笔记、新建文件夹、重命名、删除（移入 `.trash`，可逆），只填名称不用手打路径
- 对话：16 个 `kb_*` 工具，检索、读、写、移动、删除、建目录、全库问答
- 零依赖：纯 `node:fs` 实现，不装数据库、不建索引、不上传任何内容

![三栏知识库工作区](docs/preview.svg)

## 安装

**从 NPM 安装（推荐，插件商城里可搜到）**

```bash
dsh plugin --profile web add @wagq/dsh-obsidian
```

**从源码安装**

```bash
dsh plugin --profile web add github:sdmu-gaoqi/dsh-obsidian
```

装完刷新页面（或重启 DSH）即可生效，左侧栏出现「知识库」图标。

也可以走图形界面：**设置 → 插件 → 添加插件**，粘贴包名 `@wagq/dsh-obsidian` 或上面的 GitHub 地址。

## 快速上手

1. **准备一个 vault**：先在 Obsidian 里打开任意一个 vault。插件启动时会读取 `obsidian.json`，自动连上当前打开的那个。
2. **打开面板**：点左侧栏的「知识库」图标，进入三栏工作区。
3. **确认连接**：面板顶部会显示 vault 名称。显示「未连接知识库」时，点右上角 **刷新**；仍连不上就在插件设置里填 `vaultPath`（绝对路径，见下）。
4. **开始用**：左栏点笔记阅读，工具栏切 **编辑** 改内容、**保存** 落盘；树里右键管理文件。

## 界面

| 区域 | 内容 |
| --- | --- |
| **左 · 文件库** | 类型筛选 chip（全部 / 笔记 / PDF / 图片 / 其他）、搜索框、可折叠文件夹树、底部统计 |
| **中 · 文档** | 面包屑 → 标题 → 标签行 → 元信息 chip（字数 / 字符 / 行数 / 修改时间 / 大小）→ Markdown 渲染 |
| **右 · 侧栏** | `大纲`（点击跳转）· `关联`（反链 / 出链）· `问答`（全库问答） |

工具栏：只读渲染 / 预览 / 编辑 / 保存 / 重命名 / 删除 / 全屏。全屏按 `Esc` 或 ⇱ 退出。

- 阅读态渲染标题、段落、列表、引用、代码块、表格、`[[wikilink]]`、行内代码与链接
- 编辑态是受控 textarea，未保存时顶部显示「未保存」并出现保存按钮
- 搜索命中直接标出行号（如 `平台端 :1`）
- 图片走 `<img>`、PDF 走 `<iframe>`，其他文件给下载入口

## 右键菜单

左侧树里右键即可操作，**只填名称，不用手打路径**：

| 右键位置 | 菜单项 |
| --- | --- |
| 文件夹行 | 新建笔记 · 新建文件夹 · 重命名 · 删除 |
| 笔记行 | 打开 · 重命名 · 删除 |
| 树内空白处 | 新建笔记 · 新建文件夹 · 新建知识库项目 |

- 在文件夹上新建 → 落到该文件夹内；空白处新建 → 落到 vault 根目录
- 新建笔记只输名称，`.md` 自动补全，创建后立即打开
- 重命名只改名称，父目录不变
- 删除移入 `.trash/`，可逆；删除文件夹连整棵子树一起移入

## 全库问答

右栏「问答」标签：输入问题（`Ctrl+Enter` 发送），插件会

1. 用词元切分（中英文）在全库打分检索，按标题分块取 Top-N 片段
2. 调用当前默认模型，只依据这些片段作答
3. 返回答案 + 出处列表（点开即跳转对应笔记）

模型不可用时会退回「证据模式」：只展示最相关的片段，不会编造答案。对话里同样可用 `kb_ask` 完成这件事。

## 对话工具

装好插件后，任何会话里的智能体都能直接调用下面这些工具，不需要额外授权步骤：

| 工具 | 作用 |
| --- | --- |
| `kb_status` | 连接状态、vault 路径、各类文件数量 |
| `kb_list` | 列出笔记，可按子目录与类型过滤 |
| `kb_search` | 全文检索标题与正文，返回匹配行 |
| `kb_read` | 读一篇：正文、frontmatter、标签、大纲、字数、链接 |
| `kb_outline` | 只取标题大纲 |
| `kb_write` | 新建或覆盖 |
| `kb_append` | 追加到末尾 |
| `kb_move` | 移动 / 重命名 |
| `kb_delete` | 移入 `.trash/`（可逆） |
| `kb_backlinks` | 反链 |
| `kb_related` | 反链 + 出链 |
| `kb_ask` | 全库问答：检索 + 模型作答 + 出处 |
| `kb_tags` | 全库标签及使用次数 |
| `kb_mkdir` | 建文件夹 |
| `kb_rmdir` | 删文件夹（整棵子树移入 `.trash/`） |
| `kb_create_vault` | 新建一个知识库项目（vault）并切换过去 |

典型用法，直接在对话里说：

- 「把这个 vault 里所有提到 `部署` 的笔记找出来，列标题和行号」→ `kb_search`
- 「读 `架构/网关.md`，帮我补一节『限流』并写回去」→ `kb_read` + `kb_append`
- 「按 `日记/` 下的记录，总结我这周做了什么」→ `kb_list` + `kb_read`
- 「新建一个叫 `读书笔记` 的知识库项目」→ `kb_create_vault`

## 配置

插件设置里只有一项：

| 字段 | 说明 |
| --- | --- |
| `vaultPath` | Obsidian vault 的**绝对路径**。留空时自动检测：读取 `%APPDATA%\obsidian\obsidian.json`（macOS / Linux 对应 `Application Support` / `.config`）里当前打开的 vault |

面板顶部的 vault 切换器可以在已登记的多个 vault 之间切换，不必改配置。

## 兼容与运行要求

| 项 | 要求 |
| --- | --- |
| DSH | `>=0.2.0 <0.3.0`（桌面版 / Web 版均可） |
| Node | `>=22.19.0` |
| 平台 | Windows · macOS · Linux（路径全部走 `node:path`） |
| 依赖 | 无运行时依赖；仅 `@deepseek-ai/schemastery` 作可选 peer（DSH 自带） |

## 边界与安全

- 只索引 vault 内的文件；路径越界（`..`、绝对路径、盘符、UNC）一律拒绝
- 隐藏目录不索引：`.obsidian/`、`.trash/`、`.git/`、`.claudian/` 等
- 删除只移入 `.trash/`，不永久删除
- 单个笔记上限 4 MB，原始文件预览上限 32 MB
- 本地 HTTP 接口只接受同源请求（`Origin` 与 `Host` 一致），并带 `nosniff`
- 不上传、不外发：所有读写都在本机文件系统完成；只有「问答」会把检索到的片段交给当前会话的模型

## 开发

```bash
git clone https://github.com/sdmu-gaoqi/dsh-obsidian.git
cd dsh-obsidian
dsh plugin --profile web add .
```

`index.js` 是 Host 半端（`export function apply(ctx, config)`，注册 `webServer` 路由与 `tools`），`client.js` 是浏览器半端（`window.__ModuleLoader__.load`，注册 `main` 与 `sidebar.panellist` 两个 slot）。改完刷新页面即可，Host 改动需重启 DSH。

## 许可证

[MIT](LICENSE)

English: [README.en.md](README.en.md)
