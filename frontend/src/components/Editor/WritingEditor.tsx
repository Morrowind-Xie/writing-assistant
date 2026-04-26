import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Extension } from '@tiptap/core'
import { useEffect, useRef, useState } from 'react'
import { Editor } from '@tiptap/react'

interface WritingEditorProps {
  onEditorReady: (editor: Editor) => void
  onSelectionChange: (text: string) => void
  onWordCountChange: (count: number) => void
  onTriggerContinue: (context: string) => void
  onTriggerCommand: () => void
  onTriggerSave: () => void
}

const countWords = (text: string) =>
  text.trim() ? text.trim().split(/\s+/).length : 0

export function WritingEditor({
  onEditorReady,
  onSelectionChange,
  onWordCountChange,
  onTriggerContinue,
  onTriggerCommand,
  onTriggerSave,
}: WritingEditorProps) {
  const onTriggerContinueRef = useRef(onTriggerContinue)
  const onTriggerCommandRef = useRef(onTriggerCommand)
  const onTriggerSaveRef = useRef(onTriggerSave)
  onTriggerContinueRef.current = onTriggerContinue
  onTriggerCommandRef.current = onTriggerCommand
  onTriggerSaveRef.current = onTriggerSave

  // Delay mount until container DOM is ready, avoiding prosemirror-view
  // getBoundingClientRect crash during initial hydration
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const ShortcutExtension = Extension.create({
    name: 'writingShortcuts',
    addKeyboardShortcuts() {
      return {
        'Alt-/': () => {
          const text = this.editor.getText()
          onTriggerContinueRef.current(text)
          return true
        },
        'Ctrl-s': () => {
          onTriggerSaveRef.current()
          return true
        },
        'Ctrl-Shift-p': () => {
          onTriggerCommandRef.current()
          return true
        },
        'Ctrl-Shift-P': () => {
          onTriggerCommandRef.current()
          return true
        },
      }
    },
  })

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '开始写作… 按 Alt+/ 触发 AI 续写，Ctrl+Shift+P 打开命令面板',
      }),
      ShortcutExtension,
    ],
    editorProps: {
      attributes: {
        class: 'editor-content tiptap min-h-[calc(100vh-120px)] px-2 py-6 focus:outline-none',
      },
    },
    onUpdate({ editor }) {
      const text = editor.getText()
      onWordCountChange(countWords(text))
    },
    onSelectionUpdate({ editor }) {
      const { from, to } = editor.state.selection
      const selected = editor.state.doc.textBetween(from, to, ' ')
      onSelectionChange(selected)
    },
    // Only create editor after DOM is ready
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor) onEditorReady(editor)
  }, [editor, onEditorReady])

  return (
    <div className="relative h-full">
      {mounted && <EditorContent editor={editor} className="h-full" />}
    </div>
  )
}
