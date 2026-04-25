# 智能写作助手 (Writing Assistant)

以 **hermes-agent** 为核心能力的智能文本生成与编辑系统。

## 功能概述

| 功能 | 触发方式 |
|---|---|
| AI 续写 | `Alt+/` |
| 命令面板 | `Ctrl+Shift+P` |
| 浮动工具条（润色/改写/精简/扩展/翻译） | 选中文字后自动出现 |
| 采纳建议并记忆风格 | 点击「采纳」按钮 |
| 拒绝并反向学习 | 点击「拒绝」按钮 |

## 架构

```
React 前端 (5179)
  └─► Vite Proxy /hermes → hermes-agent API (8642)
  └─► Vite Proxy /hermes-dash → hermes Dashboard (9119)
```

无独立后端，所有 AI 推理和记忆操作通过 hermes-agent 完成。

## 依赖

- hermes-agent 运行中（端口 8642）
- Node.js 18+

## 启动

```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:5179
```

## 快捷键

| 快捷键 | 功能 |
|---|---|
| `Alt+/` | 在光标处触发 AI 续写（Copilot 风格） |
| `Ctrl+Shift+P` | 打开命令面板，输入自然语言指令 |

## 记忆系统

- 采纳的建议 → 调用 hermes API 将风格偏好写入 `~/.hermes/memories/USER.md`
- 拒绝的建议 → 写入反向偏好，引导 hermes 避免类似输出
- hermes 在下次生成时自动加载记忆，实现个性化写作风格

## 端口

| 端口 | 用途 |
|---|---|
| 5179 | 前端 React 应用 |
| 8642 | hermes-agent API（依赖，需预先运行） |
