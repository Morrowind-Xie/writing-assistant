# 写作助手 开发日志

> 时间线索：最新记录在最顶端，按时间倒序排列。

---

## 2026-04-26｜功能：AI 直接编辑文档（直接编辑模式）

### 需求
AI 之前只能把结果推到建议卡片，用户需要手动点"插入"才能进入文档。
需要让 AI 能"看到"文档当前状态（光标位置、选区、前后文），并能直接操作文档。

### 设计

两种模式，由 AI 面板底部的切换按钮控制：

| 模式 | 行为 |
|---|---|
| **建议模式**（默认） | AI 回复流入右侧卡片，用户确认后插入，可反馈学习 |
| **直接编辑模式** | AI 流式输出直接写入编辑器，有选区则替换选区，无选区则在光标处插入 |

### 实现细节

**1. 文档上下文感知（`getEditorSnapshot`）**
- 从 TipTap editor 读取：全文纯文本、当前选区文字、光标前 500 字、光标后 500 字、是否有选区
- 每次发送请求时实时抓取快照，确保 AI 看到最新状态

**2. `buildMessages` 升级**
- 接收 `EditorSnapshot` 代替原来的 `context` 字符串
- `command` 类型请求注入结构化文档上下文（选中位置前后文 + 完整文章）
- 其余类型（续写/润色等）保持原有逻辑，使用 selectedText 或 fullText

**3. `launchDirectEdit`（新增）**
- 先保存撤销检查点（`setMeta addToHistory`）
- 有选区：先 `deleteRange` 删除选区，再在原位置流式插入
- 无选区：在光标处流式插入
- 每个 token 通过 `insertContentAt` 逐字写入，insertPos 随之递增
- 流结束后再次设置撤销边界，确保 `Ctrl+Z` 一次性撤销整个 AI 编辑

**4. UI（`SuggestionPanel`）**
- 新增模式切换 tab：「建议模式 / 直接编辑模式」
- 直接编辑模式激活时，输入框 placeholder 和发送图标切换为铅笔样式
- 顶部 banner 显示「AI 正在直接编辑文档… Ctrl+Z 可撤销」
- 直接编辑进行中，发送按钮 disabled，防止并发写入

### 修改文件
- `frontend/src/App.tsx`：`getEditorSnapshot`、`buildMessages` 重构，新增 `launchDirectEdit`、`directEditActive` 状态，`handleCommandSubmit` 支持 `directEdit` 参数
- `frontend/src/components/AiPanel/SuggestionPanel.tsx`：新增模式切换 UI、banner、props 扩展

---

## 2026-04-26｜功能：优化保存逻辑（首次选路径，后续静默覆盖）

### 问题
原保存逻辑每次都触发浏览器下载对话框，相当于每次"另存为"，无法实现静默覆盖原文件。

### 解决方案

使用 **File System Access API**（`showSaveFilePicker`）：

- **首次保存**：调用 `showSaveFilePicker` 弹出系统文件保存对话框，用户选择路径和文件名，获得 `FileSystemFileHandle`
- **后续保存（Ctrl+S）**：持有 handle，直接 `createWritable()` 覆盖写入，无弹窗
- **另存为**（新增 `SaveAll` 按钮）：强制重新弹出选择器，可换路径/改名
- **降级兼容**：不支持 File System Access API 的浏览器自动回退到原来的 `<a download>` 下载方式
- **handle 失效处理**：写入时如 handle 权限被撤销，自动清空 handle 并重新弹出选择器

### 修改文件

- `frontend/src/hooks/useFileManager.ts`：核心逻辑重写，新增 `handleSaveAs`，`fileHandleRef` 持久化文件句柄
- `frontend/src/App.tsx`：解构 `handleSaveAs`，顶栏新增"另存为"图标按钮（`SaveAll`）

---

## 2026-04-26｜功能：AI 面板常驻输入框

### 问题
AI 面板只展示建议，没有任何可见的用户输入入口。新用户不知道如何主动向 AI 提问或发指令（只能靠 `Ctrl+Shift+P` 快捷键，完全不可发现）。

### 解决方案

在 `SuggestionPanel` 底部新增常驻聊天输入框：

- **输入框**：自动增高的 `<textarea>`，`Enter` 发送，`Shift+Enter` 换行
- **发送按钮**：`SendHorizonal` 图标，输入为空时 disabled
- **快捷指令 chips**：面板空白时展示 4 个常用指令气泡，点击直接发送
- **提示文字**：底部显示快捷键说明（Enter/Shift+Enter/Ctrl+Shift+P）
- 空白提示语由"暂无 AI 建议"改为"在下方输入指令"，更具引导性

### 修改文件

- `frontend/src/components/AiPanel/SuggestionPanel.tsx`：新增输入区、快捷指令 chips，新增 `onCommand` prop
- `frontend/src/App.tsx`：`SuggestionPanel` 传入 `onCommand={handleCommandSubmit}`

---

## 2026-04-26｜功能：文件新建、打开、保存

### 功能概述

基于浏览器原生 File API，在现有 TipTap 编辑器上叠加轻量级文件管理层，无需后端或 Electron，实现本地文件的完整生命周期管理。

### 新增文件

- `frontend/src/hooks/useFileManager.ts`：核心 hook，封装文件管理全部逻辑

### 修改文件

- `frontend/src/components/Editor/WritingEditor.tsx`：新增 `onTriggerSave` prop，注册 `Ctrl+S` 快捷键
- `frontend/src/App.tsx`：接入 `useFileManager`，顶栏添加操作按钮

### 技术实现

**`useFileManager` hook**

| 能力 | 实现方式 |
|---|---|
| 新建文档 | `editor.commands.clearContent()` + `window.confirm` 未保存确认 |
| 打开文件 | 隐藏 `<input type="file" accept=".txt,.md">` + `FileReader.readAsText` |
| 保存文件 | `Blob` + 动态 `<a download>` + `URL.createObjectURL` |
| Dirty 标记 | 每次 `onWordCountChange` 时 `markDirty()`，保存后重置 |
| lastSaved | 保存时 `setLastSaved(new Date())`，状态栏实时显示 |

**顶栏变更**

- 文件名动态显示（打开后显示真实文件名）
- Dirty 时文件名旁显示橙色小圆点
- 新增三个图标按钮：`FilePlus`（新建）、`FolderOpen`（打开）、`Save`（保存）
- `Ctrl+S` 快捷键在 TipTap ShortcutExtension 中注册

### 快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl+S` | 保存当前文档 |

---

## 2026-04-25｜Debug：hermes API 403 / FloatingToolbar 崩溃

### 症状
1. WebView 控制台持续报错：`Uncaught TypeError: Cannot read properties of null (reading 'getBoundingClientRect')`
2. 所有 AI 续写/润色请求返回 403，功能完全不可用

---

### 问题一：getBoundingClientRect null 崩溃

**根本原因**

`FloatingToolbar` 组件在 `useEffect` 中直接调用 `view.dom.getBoundingClientRect()`，但编辑器初始化阶段 `view.dom` 可能尚未挂载到 DOM，导致 null 引用崩溃。

**修复方案**（`src/components/Editor/FloatingToolbar.tsx`）

在 `useEffect` 内用 `try/catch` 包裹，并在调用前检查 `view` 和 `view.dom` 是否存在：

```ts
try {
  const view = editor.view
  if (!view || !view.dom) { setPos(null); return }
  const editorRect = view.dom.getBoundingClientRect()  // 现在安全
  // ...
} catch {
  setPos(null)
}
```

同步清理了 `WritingEditor` 中传入但从未被使用的 `floatingToolbarRef` prop（App.tsx、接口定义、传参三处）。

---

### 问题二：hermes API 403 CORS 拦截

**根本原因**

hermes-agent（端口 8642）内置 CORS Origin 白名单，只允许自身来源的请求。浏览器/WebView 发送 `fetch` 时会自动附加 `Origin: http://localhost:5179`，hermes 检测到非白名单来源后直接返回 403。

直连验证：
```bash
# 无 Origin 头 → 200 OK
curl http://localhost:8642/v1/chat/completions ...

# 带 Origin 头 → 403
curl -H "Origin: http://localhost:5179" http://localhost:8642/v1/chat/completions ...
```

**修复方案**（`frontend/vite.config.ts`）

在 Vite proxy 的 `proxyReq` 事件中移除 `origin` 和 `referer` 头，使代理请求对 hermes 表现为本地直连：

```ts
'/hermes': {
  target: 'http://localhost:8642',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/hermes/, ''),
  configure: (proxy) => {
    proxy.on('proxyReq', (proxyReq) => {
      proxyReq.removeHeader('origin')
      proxyReq.removeHeader('referer')
    })
  },
},
```

**验证**：修复后带 `Origin` 头的请求也能正常返回 200。

---

### 经验总结

- hermes-agent 有 CORS 白名单保护，所有通过非 8642 端口访问的前端项目必须在 Vite proxy 层剥离 Origin/Referer 头
- TipTap 编辑器的 `view.dom` 在初始化阶段可能为 null，涉及 DOM 操作的 useEffect 必须做防御性检查

---

## 2026-04-25｜项目初始化

### 技术栈
- **前端**：React 18 + Vite + TypeScript + TailwindCSS
- **编辑器**：TipTap（StarterKit + Placeholder）
- **AI 后端**：hermes-agent（端口 8642），通过 Vite proxy 转发
- **字体**：Lora（正文衬线）+ Inter（UI）

### 架构
```
React (5179) → Vite Proxy → hermes-agent API (8642)
```
无独立后端进程，零冗余。所有 AI 推理和记忆操作由 hermes-agent 承载。

### 快捷键
| 快捷键 | 功能 |
|---|---|
| `Alt+/` | 触发 AI 续写（Copilot 风格） |
| `Ctrl+Shift+P` | 打开命令面板 |
| 选中文字 | 自动弹出浮动工具条（润色/改写/精简/扩展/翻译） |

### 端口
| 服务 | 端口 |
|---|---|
| 前端 dev server | 5179 |
| hermes-agent API | 8642 |
