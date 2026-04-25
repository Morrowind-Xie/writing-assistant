# 写作助手 开发日志

> 时间线索：最新记录在最顶端，按时间倒序排列。

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
