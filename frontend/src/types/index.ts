export type FeedbackType = 'accept' | 'modify' | 'reject'

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
