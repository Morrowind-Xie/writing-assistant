import { useEffect, useRef, useState } from 'react'
import { Editor } from '@tiptap/react'
import { Scissors, Expand, RefreshCw, Languages, Sparkles } from 'lucide-react'

interface FloatingToolbarProps {
  editor: Editor | null
  selectedText: string
  onAction: (action: string, text: string) => void
}

const ACTIONS = [
  { id: 'refine', icon: Sparkles, label: '润色' },
  { id: 'rewrite', icon: RefreshCw, label: '改写' },
  { id: 'shorten', icon: Scissors, label: '缩短' },
  { id: 'expand', icon: Expand, label: '扩展' },
  { id: 'translate', icon: Languages, label: '翻译' },
]

export function FloatingToolbar({ editor, selectedText, onAction }: FloatingToolbarProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editor || !selectedText.trim()) {
      setPos(null)
      return
    }

    try {
      const { from, to } = editor.state.selection
      if (from === to) { setPos(null); return }

      const view = editor.view
      if (!view || !view.dom) { setPos(null); return }

      const editorDom = view.dom
      const editorRect = editorDom.getBoundingClientRect()
      const start = view.coordsAtPos(from)

      setPos({
        top: start.top - editorRect.top - 52,
        left: Math.max(0, start.left - editorRect.left),
      })
    } catch {
      setPos(null)
    }
  }, [editor, selectedText])

  if (!pos || !selectedText.trim()) return null

  return (
    <div
      ref={ref}
      className="absolute z-50 flex items-center gap-0.5 px-2 py-1.5 rounded-full
        bg-bg-card/95 backdrop-blur-md border border-white/10 shadow-2xl animate-fade-in"
      style={{ top: pos.top, left: pos.left }}
    >
      {ACTIONS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onAction(id, selectedText)}
          title={label}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
            text-text-muted hover:text-white hover:bg-accent-blue/20 transition-all duration-150
            cursor-pointer"
        >
          <Icon size={12} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
