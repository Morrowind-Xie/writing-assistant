import { useEffect, useRef, useState } from 'react'
import { Command, ArrowRight, Clock, Sparkles, Zap, FileText, Wand2 } from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onSubmit: (command: string) => void
}

const SUGGESTED_COMMANDS = [
  { icon: Wand2, label: '帮我润色这段文字，使其更加流畅', category: '润色' },
  { icon: Sparkles, label: '将这段改写为更正式的商务风格', category: '改写' },
  { icon: Zap, label: '将这段内容扩展为300字以上', category: '扩展' },
  { icon: FileText, label: '为我生成一段开头段落', category: '生成' },
  { icon: ArrowRight, label: '继续写下一段', category: '续写' },
  { icon: Command, label: '将这段缩写为核心要点', category: '精简' },
]

export function CommandPalette({ open, onClose, onSubmit }: CommandPaletteProps) {
  const [input, setInput] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = input.trim()
    ? SUGGESTED_COMMANDS.filter(
        (c) =>
          c.label.includes(input) ||
          c.category.includes(input),
      )
    : SUGGESTED_COMMANDS

  useEffect(() => {
    if (open) {
      setInput('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [input])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = selectedIndex === 0 && input.trim()
        ? input.trim()
        : filtered[selectedIndex - 1]?.label
      if (cmd) { onSubmit(cmd); onClose() }
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-[600px] rounded-2xl overflow-hidden
          bg-[#1E1F24]/95 backdrop-blur-xl
          border border-white/10 shadow-2xl shadow-black/60
          animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
          <Command size={18} className="text-[#6C8EF5] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入指令，或选择下方建议…"
            className="flex-1 bg-transparent text-white text-base placeholder-white/30 outline-none"
          />
          <kbd className="text-xs text-white/30 border border-white/15 rounded px-1.5 py-0.5 shrink-0">ESC</kbd>
        </div>

        {/* Custom input option */}
        {input.trim() && (
          <button
            className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors cursor-pointer
              ${selectedIndex === 0 ? 'bg-[#6C8EF5]/15 text-white' : 'text-white/70 hover:bg-white/5'}`}
            onClick={() => { onSubmit(input.trim()); onClose() }}
          >
            <ArrowRight size={15} className="text-[#6C8EF5] shrink-0" />
            <span className="text-sm">执行：<span className="text-white font-medium">{input}</span></span>
          </button>
        )}

        {/* Suggested commands */}
        {filtered.length > 0 && (
          <div className="py-2">
            <div className="px-5 py-1.5 text-xs font-medium text-white/30 uppercase tracking-wider">
              {input.trim() ? '匹配建议' : '快捷指令'}
            </div>
            {filtered.map((cmd, i) => {
              const actualIndex = input.trim() ? i + 1 : i
              const Icon = cmd.icon
              return (
                <button
                  key={cmd.label}
                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors cursor-pointer
                    ${selectedIndex === actualIndex ? 'bg-[#6C8EF5]/15 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                  onClick={() => { onSubmit(cmd.label); onClose() }}
                >
                  <Icon size={14} className="shrink-0 opacity-70" />
                  <span className="text-sm flex-1">{cmd.label}</span>
                  <span className="text-xs text-white/25 border border-white/10 rounded px-1.5 py-0.5">{cmd.category}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* History hint */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-white/8 text-xs text-white/25">
          <Clock size={11} />
          <span>↑↓ 导航　Enter 确认　Esc 关闭</span>
        </div>
      </div>
    </div>
  )
}
