import { ChevronRight, Brain, Trash2 } from 'lucide-react'
import { AiSuggestion, FeedbackType } from '../../types'
import { SuggestionCard } from './SuggestionCard'

interface SuggestionPanelProps {
  suggestions: AiSuggestion[]
  collapsed: boolean
  onToggleCollapse: () => void
  onFeedback: (id: string, feedback: FeedbackType) => void
  onInsert: (content: string) => void
  onClearAll: () => void
  memoryStatus?: 'idle' | 'saving' | 'saved'
}

export function SuggestionPanel({
  suggestions,
  collapsed,
  onToggleCollapse,
  onFeedback,
  onInsert,
  onClearAll,
  memoryStatus = 'idle',
}: SuggestionPanelProps) {
  return (
    <div
      className={`flex flex-col h-full border-l border-white/8 bg-[#1E1F24]
        transition-all duration-300 ${collapsed ? 'w-10' : 'w-[320px]'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/8 shrink-0">
        {!collapsed && (
          <>
            <div className="flex items-center gap-2">
              <Brain size={15} className="text-[#6C8EF5]" />
              <span className="text-sm font-medium text-white/80">AI 建议</span>
              {memoryStatus === 'saving' && (
                <span className="text-xs text-[#FD7E14] animate-pulse">记忆中…</span>
              )}
              {memoryStatus === 'saved' && (
                <span className="text-xs text-[#40C057]">✓ 已记忆</span>
              )}
            </div>
            {suggestions.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-white/25 hover:text-white/60 transition-colors cursor-pointer p-1"
                title="清空所有建议"
              >
                <Trash2 size={13} />
              </button>
            )}
          </>
        )}
        <button
          onClick={onToggleCollapse}
          className="text-white/30 hover:text-white/70 transition-colors cursor-pointer p-1 ml-auto"
          title={collapsed ? '展开面板' : '收起面板'}
        >
          <ChevronRight
            size={16}
            className={`transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}
          />
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
              <div className="w-12 h-12 rounded-full bg-[#6C8EF5]/10 flex items-center justify-center">
                <Brain size={22} className="text-[#6C8EF5]/50" />
              </div>
              <div>
                <p className="text-sm text-white/40 font-medium">暂无 AI 建议</p>
                <p className="text-xs text-white/25 mt-1 leading-relaxed">
                  按 Ctrl+Space 续写<br />
                  选中文字后点击工具条<br />
                  或按 Ctrl+Shift+P 输入指令
                </p>
              </div>
            </div>
          ) : (
            suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                onFeedback={onFeedback}
                onInsert={onInsert}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
