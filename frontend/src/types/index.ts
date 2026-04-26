export type FeedbackType = 'accept' | 'modify' | 'dismiss' | 'reject'
// accept  → 采纳插入，触发正向记忆
// modify  → 有修改，仅关闭卡片（暂无额外记忆逻辑）
// dismiss → 忽略，不采用但无评价，不触发任何记忆
// reject  → 明确不好，触发反向记忆（以后避免类似风格）

export interface AiSuggestion {
  id: string
  type: 'continue' | 'refine' | 'shorten' | 'expand' | 'rewrite' | 'translate' | 'command'
  label: string
  content: string
  streaming: boolean
  done: boolean
  timestamp: number
}

export interface FeedbackRecord {
  suggestionId: string
  feedback: FeedbackType
  originalContent: string
  suggestionContent: string
  context: string
  timestamp: number
}

export interface HermesStatus {
  online: boolean
  model?: string
  latency?: number
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}
