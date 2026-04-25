import { Check, Edit3, X, Copy } from 'lucide-react'
import { AiSuggestion, FeedbackType } from '../../types'
import { StreamingText } from './StreamingText'

interface SuggestionCardProps {
  suggestion: AiSuggestion
  onFeedback: (id: string, feedback: FeedbackType) => void
  onInsert: (content: string) => void
}

const TYPE_LABEL: Record<AiSuggestion['type'], { label: string; color: string }> = {
  continue: { label: '续写', color: 'text-[#6C8EF5] bg-[#6C8EF5]/10' },
  refine:   { label: '润色', color: 'text-[#40C057] bg-[#40C057]/10' },
  shorten:  { label: '精简', color: 'text-[#FD7E14] bg-[#FD7E14]/10' },
  expand:   { label: '扩展', color: 'text-[#228BE6] bg-[#228BE6]/10' },
  rewrite:  { label: '改写', color: 'text-[#FA5252] bg-[#FA5252]/10' },
  translate:{ label: '翻译', color: 'text-purple-400 bg-purple-400/10' },
  command:  { label: '指令', color: 'text-yellow-400 bg-yellow-400/10' },
}

export function SuggestionCard({ suggestion, onFeedback, onInsert }: SuggestionCardProps) {
  const meta = TYPE_LABEL[suggestion.type]

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion.content).catch(() => {})
  }

  return (
    <div className="group rounded-xl border border-white/8 bg-white/3 hover:bg-white/5
      transition-all duration-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/6">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
          {meta.label}
        </span>
        <span className="text-xs text-white/25">
          {new Date(suggestion.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-3 max-h-48 overflow-y-auto">
        <StreamingText
          content={suggestion.content || ''}
          streaming={suggestion.streaming}
          className="text-sm text-white/80"
        />
        {!suggestion.content && !suggestion.streaming && (
          <div className="flex gap-1.5 items-center text-white/25 text-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6C8EF5] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#6C8EF5] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#6C8EF5] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {/* Actions — only shown when done */}
      {suggestion.done && (
        <div className="flex items-center gap-1 px-4 py-2.5 border-t border-white/6 bg-white/2">
          <button
            onClick={() => { onInsert(suggestion.content); onFeedback(suggestion.id, 'accept') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-[#40C057]/15 text-[#40C057] hover:bg-[#40C057]/25 transition-colors cursor-pointer"
            title="采纳并插入到编辑器"
          >
            <Check size={12} />
            采纳
          </button>
          <button
            onClick={() => onFeedback(suggestion.id, 'modify')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-white/8 text-white/60 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
            title="记录修改偏好"
          >
            <Edit3 size={12} />
            修改
          </button>
          <button
            onClick={() => onFeedback(suggestion.id, 'reject')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-[#FA5252]/10 text-[#FA5252]/70 hover:bg-[#FA5252]/20 hover:text-[#FA5252] transition-colors cursor-pointer"
            title="拒绝并反向学习"
          >
            <X size={12} />
            拒绝
          </button>
          <button
            onClick={handleCopy}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
              text-white/30 hover:text-white/60 transition-colors cursor-pointer"
            title="复制到剪贴板"
          >
            <Copy size={12} />
          </button>
        </div>
      )}
    </div>
  )
}
