# 写作助手 开发日志

> 时间线索：最新记录在最顶端，按时间倒序排列。

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
