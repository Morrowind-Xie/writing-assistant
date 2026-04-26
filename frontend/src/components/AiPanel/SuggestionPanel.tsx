import { useRef, useState } from 'react'
import { ChevronRight, Brain, Trash2, SendHorizonal, Lightbulb, Pencil, MessageSquare, Loader2 } from 'lucide-react'
import { AiSuggestion, FeedbackType } from '../../types'
import { SuggestionCard } from './SuggestionCard'

interface SuggestionPanelProps {
  suggestions: AiSuggestion[]
  collapsed: boolean
  onToggleCollapse: () => void
  onFeedback: (id: string, feedback: FeedbackType) => void
  onInsert: (content: string) => void
  onClearAll: () => void
  /** directEdit=true → AI streams directly into editor; false → goes into suggestion card */
  onCommand: (command: string, directEdit: boolean) => void
  /** Whether a direct-edit stream is currently running */
  directEditActive: boolean
  memoryStatus?: 'idle' | 'saving' | 'saved'
}

const QUICK_COMMANDS = [
  '帮我续写下一段',
  '润色选中文字',
  '扩展这段内容',
  '将内容精简提炼',
]

export function SuggestionPanel({
  suggestions,
  collapsed,
  onToggleCollapse,
  onFeedback,
  onInsert,
  onClearAll,
  onCommand,
  directEditActive,
  memoryStatus = 'idle',
}: SuggestionPanelProps) {
  const [input, setInput] = useState('')
  const [directMode, setDirectMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const submit = (cmd: string) => {
    const trimmed = cmd.trim()
    if (!trimmed) return
    onCommand(trimmed, directMode)
    setInput('')
    // reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '22px'
    }
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(input)
    }
  }

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
              <span className="text-sm font-medium text-white/80">AI 助手</span>
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

      {/* Direct-edit banner */}
      {!collapsed && directEditActive && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#6C8EF5]/10 border-b border-[#6C8EF5]/20 shrink-0">
          <Loader2 size={12} className="text-[#6C8EF5] animate-spin" />
          <span className="text-xs text-[#6C8EF5]">AI 正在直接编辑文档… Ctrl+Z 可撤销</span>
        </div>
      )}

      {/* Content */}
      {!collapsed && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {suggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                <div className="w-12 h-12 rounded-full bg-[#6C8EF5]/10 flex items-center justify-center">
                  <Brain size={22} className="text-[#6C8EF5]/50" />
                </div>
                <div>
                  <p className="text-sm text-white/40 font-medium">在下方输入指令</p>
                  <p className="text-xs text-white/25 mt-1 leading-relaxed">
                    或按 Alt+/ 快速续写<br />
                    选中文字后使用浮动工具条
                  </p>
                </div>

                {/* Quick command chips */}
                <div className="flex flex-wrap gap-1.5 justify-center mt-2 px-2">
                  {QUICK_COMMANDS.map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => submit(cmd)}
                      className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70
                        border border-white/10 hover:border-white/25 rounded-full px-2.5 py-1
                        transition-colors cursor-pointer hover:bg-white/5"
                    >
                      <Lightbulb size={10} />
                      {cmd}
                    </button>
                  ))}
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

          {/* Input area */}
          <div className="border-t border-white/8 p-3 shrink-0">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 mb-2 bg-[#17181C] rounded-lg p-0.5">
              <button
                onClick={() => setDirectMode(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md
                  transition-colors cursor-pointer
                  ${!directMode
                    ? 'bg-[#2A2B32] text-white/70 shadow-sm'
                    : 'text-white/30 hover:text-white/50'}`}
                title="AI 回复进建议卡片，由你确认后插入"
              >
                <MessageSquare size={11} />
                建议模式
              </button>
              <button
                onClick={() => setDirectMode(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md
                  transition-colors cursor-pointer
                  ${directMode
                    ? 'bg-[#6C8EF5]/20 text-[#6C8EF5] shadow-sm'
                    : 'text-white/30 hover:text-white/50'}`}
                title="AI 直接编辑文档，Ctrl+Z 可撤销"
              >
                <Pencil size={11} />
                直接编辑
              </button>
            </div>

            <div className="flex items-end gap-2 bg-[#17181C] rounded-xl border border-white/8
              focus-within:border-[#6C8EF5]/40 transition-colors px-3 py-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                }}
                onKeyDown={handleKeyDown}
                placeholder={directMode ? '输入指令，AI 将直接修改文档…' : '输入指令，Enter 发送…'}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/25
                  outline-none resize-none leading-relaxed min-h-[22px] max-h-[120px]"
                style={{ height: '22px' }}
              />
              <button
                onClick={() => submit(input)}
                disabled={!input.trim() || directEditActive}
                className={`shrink-0 mb-0.5 transition-colors cursor-pointer disabled:cursor-default
                  ${directMode
                    ? 'text-[#6C8EF5] hover:text-[#8AABFF] disabled:text-white/20'
                    : 'text-[#6C8EF5] hover:text-[#8AABFF] disabled:text-white/20'}`}
                title={directMode ? '直接编辑 (Enter)' : '发送 (Enter)'}
              >
                {directMode ? <Pencil size={15} /> : <SendHorizonal size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-white/20 mt-1.5 text-center">
              {directMode
                ? 'AI 直接修改文档 · Ctrl+Z 撤销 · Shift+Enter 换行'
                : 'Enter 发送 · Shift+Enter 换行 · Ctrl+Shift+P 指令面板'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
