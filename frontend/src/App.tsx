import { useCallback, useRef, useState } from 'react'
import { Editor } from '@tiptap/react'
import { WritingEditor } from './components/Editor/WritingEditor'
import { FloatingToolbar } from './components/Editor/FloatingToolbar'
import { CommandPalette } from './components/Editor/CommandPalette'
import { SuggestionPanel } from './components/AiPanel/SuggestionPanel'
import { StatusBar } from './components/StatusBar'
import { EditorContext } from './hooks/useEditorContext'
import { useHermesStatus } from './hooks/useHermesStatus'
import { useFileManager } from './hooks/useFileManager'
import { streamChatCompletion, rememberPreference } from './api/hermesClient'
import { AiSuggestion, FeedbackType, ChatMessage } from './types'
import { Settings, PenLine, FilePlus, FolderOpen, Save } from 'lucide-react'

let _suggestionCounter = 0
const newId = () => `s-${++_suggestionCounter}-${Date.now()}`

function buildMessages(
  type: AiSuggestion['type'],
  context: string,
  selectedText?: string,
  command?: string,
): ChatMessage[] {
  const styleNote =
    '请根据用户写作偏好（见你的记忆系统 USER.md [Writing Assistant] 章节）匹配写作风格。'

  const systemPrompt =
    `你是一个专业的智能写作助手，辅助用户进行中文文章的生成和编辑。${styleNote}
回复时只输出写作内容本身，不要解释、不要前缀，直接开始正文。`

  const userPrompts: Record<AiSuggestion['type'], string> = {
    continue: `请根据以下文章内容，继续写下一段（约150字）：\n\n${context}`,
    refine: `请润色以下文字，使其更加流畅自然，保持原意：\n\n${selectedText || context}`,
    shorten: `请将以下文字精简为核心要点，保留关键信息：\n\n${selectedText || context}`,
    expand: `请将以下文字扩展为更详细的内容（约原文2倍长）：\n\n${selectedText || context}`,
    rewrite: `请改写以下文字，保持内容不变但表达方式不同：\n\n${selectedText || context}`,
    translate: `请将以下内容翻译为英文：\n\n${selectedText || context}`,
    command: `用户指令：${command}\n\n当前文章内容（供参考）：\n${context}`,
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompts[type] },
  ]
}

export default function App() {
  const hermesStatus = useHermesStatus(30000)

  const editorRef = useRef<Editor | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [paragraphCount, setParagraphCount] = useState(0)

  const { fileName, isDirty, lastSaved, handleNew, handleOpen, handleSave, markDirty, fileInputRef } =
    useFileManager(() => editorRef.current)

  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [memoryStatus, setMemoryStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const abortRefs = useRef<Map<string, AbortController>>(new Map())

  // Launch an AI suggestion stream
  const launchSuggestion = useCallback(
    (type: AiSuggestion['type'], context: string, selectedTxt?: string, command?: string) => {
      if (!hermesStatus.online) return

      const id = newId()
      const label = { continue:'续写', refine:'润色', shorten:'精简', expand:'扩展',
                      rewrite:'改写', translate:'翻译', command:'指令' }[type]

      const suggestion: AiSuggestion = {
        id, type, label, content: '', streaming: true, done: false, timestamp: Date.now(),
      }

      setSuggestions((prev) => [suggestion, ...prev])
      if (panelCollapsed) setPanelCollapsed(false)

      const ctrl = new AbortController()
      abortRefs.current.set(id, ctrl)

      const messages = buildMessages(type, context, selectedTxt, command)

      streamChatCompletion(
        messages,
        (token) => {
          setSuggestions((prev) =>
            prev.map((s) => s.id === id ? { ...s, content: s.content + token } : s)
          )
        },
        () => {
          setSuggestions((prev) =>
            prev.map((s) => s.id === id ? { ...s, streaming: false, done: true } : s)
          )
          abortRefs.current.delete(id)
        },
        ctrl.signal,
      )
    },
    [hermesStatus.online, panelCollapsed],
  )

  const handleEditorReady = useCallback((ed: Editor) => {
    editorRef.current = ed
    setEditor(ed)
  }, [])

  const handleWordCountChange = useCallback((count: number) => {
    setWordCount(count)
    markDirty()
    if (editor) {
      const text = editor.getText()
      setParagraphCount(text.split(/\n+/).filter((p) => p.trim()).length)
    }
  }, [editor, markDirty])

  const handleSelectionChange = useCallback((text: string) => {
    setSelectedText(text)
  }, [])

  // Ctrl+Space: continue writing
  const handleTriggerContinue = useCallback((context: string) => {
    launchSuggestion('continue', context)
  }, [launchSuggestion])

  // Ctrl+Shift+P: open command palette
  const handleTriggerCommand = useCallback(() => {
    setCommandOpen(true)
  }, [])

  const handleTriggerSave = useCallback(() => {
    handleSave()
  }, [handleSave])

  // Floating toolbar action (refine/rewrite/shorten/expand/translate)
  const handleToolbarAction = useCallback((action: string, text: string) => {
    const context = editor?.getText() || ''
    const type = action as AiSuggestion['type']
    launchSuggestion(type, context, text)
  }, [editor, launchSuggestion])

  // Command palette submit
  const handleCommandSubmit = useCallback((command: string) => {
    const context = editor?.getText() || ''
    launchSuggestion('command', context, selectedText, command)
  }, [editor, selectedText, launchSuggestion])

  // Feedback handler
  const handleFeedback = useCallback((id: string, feedback: FeedbackType) => {
    const suggestion = suggestions.find((s) => s.id === id)
    if (!suggestion) return

    if (feedback === 'accept') {
      // Trigger hermes memory recording in background
      const pref = `用户采纳了类型为「${suggestion.label}」的写作建议，内容摘要：${suggestion.content.slice(0, 120)}`
      setMemoryStatus('saving')
      rememberPreference(pref)
      setTimeout(() => setMemoryStatus('saved'), 2000)
      setTimeout(() => setMemoryStatus('idle'), 5000)
    } else if (feedback === 'reject') {
      const pref = `用户拒绝了类型为「${suggestion.label}」的写作建议，内容摘要：${suggestion.content.slice(0, 120)}，请避免类似风格`
      rememberPreference(pref)
    }

    // Remove card after feedback
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }, [suggestions])

  // Insert content into editor at cursor
  const handleInsert = useCallback((content: string) => {
    if (!editor) return
    const { from } = editor.state.selection
    editor.chain().focus().insertContentAt(from, content).run()
  }, [editor])

  const handleClearAll = useCallback(() => {
    // Abort all ongoing streams
    abortRefs.current.forEach((ctrl) => ctrl.abort())
    abortRefs.current.clear()
    setSuggestions([])
  }, [])

  return (
    <EditorContext.Provider value={{ editor, selectedText, wordCount }}>
      <div className="flex flex-col h-screen bg-[#1A1B1E] text-white overflow-hidden">
        {/* Hidden file input for open */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md"
          className="hidden"
          aria-hidden
        />

        {/* Top Navigation Bar */}
        <header className="flex items-center justify-between px-5 h-10 bg-[#17181C]/90
          backdrop-blur-sm border-b border-white/8 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <PenLine size={15} className="text-[#6C8EF5]" />
            <span className="text-sm font-medium text-white/80">写作助手</span>
            <span className="text-white/20 text-xs mx-1">·</span>
            <span className="text-xs text-white/35">{fileName}</span>
            {isDirty && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block"
                title="有未保存的更改"
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* File action buttons */}
            <button
              onClick={handleNew}
              title="新建文档"
              className="text-white/30 hover:text-white/70 transition-colors p-1.5 cursor-pointer rounded hover:bg-white/5"
            >
              <FilePlus size={14} />
            </button>
            <button
              onClick={handleOpen}
              title="打开文件 (.txt / .md)"
              className="text-white/30 hover:text-white/70 transition-colors p-1.5 cursor-pointer rounded hover:bg-white/5"
            >
              <FolderOpen size={14} />
            </button>
            <button
              onClick={handleSave}
              title="保存文件 (Ctrl+S)"
              className="text-white/30 hover:text-white/70 transition-colors p-1.5 cursor-pointer rounded hover:bg-white/5"
            >
              <Save size={14} />
            </button>
            <span className="w-px h-4 bg-white/10 mx-1" />
            {/* Hermes status dot */}
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <div className={`w-1.5 h-1.5 rounded-full ${
                hermesStatus.online ? 'bg-[#40C057] shadow-[0_0_6px_#40C057]' : 'bg-white/20'
              }`} />
              <span className={hermesStatus.online ? 'text-white/50' : 'text-white/25'}>
                {hermesStatus.online ? 'hermes 已连接' : 'hermes 离线'}
              </span>
            </div>
            <button className="text-white/30 hover:text-white/70 transition-colors p-1 cursor-pointer ml-2">
              <Settings size={14} />
            </button>
          </div>
        </header>

        {/* Main Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Editor Area */}
          <div className="flex-1 overflow-y-auto bg-white relative">
            <div className="max-w-[720px] mx-auto px-8 py-10 min-h-full relative">
              {/* Floating Toolbar — rendered inside editor container */}
              <FloatingToolbar
                editor={editor}
                selectedText={selectedText}
                onAction={handleToolbarAction}
              />

              <WritingEditor
                onEditorReady={handleEditorReady}
                onSelectionChange={handleSelectionChange}
                onWordCountChange={handleWordCountChange}
                onTriggerContinue={handleTriggerContinue}
                onTriggerCommand={handleTriggerCommand}
                onTriggerSave={handleTriggerSave}
              />
            </div>
          </div>

          {/* AI Suggestion Panel */}
          <SuggestionPanel
            suggestions={suggestions}
            collapsed={panelCollapsed}
            onToggleCollapse={() => setPanelCollapsed((p) => !p)}
            onFeedback={handleFeedback}
            onInsert={handleInsert}
            onClearAll={handleClearAll}
            memoryStatus={memoryStatus}
          />
        </div>

        {/* Status Bar */}
        <StatusBar
          hermesStatus={hermesStatus}
          wordCount={wordCount}
          paragraphCount={paragraphCount}
          lastSaved={lastSaved}
        />

        {/* Command Palette */}
        <CommandPalette
          open={commandOpen}
          onClose={() => setCommandOpen(false)}
          onSubmit={handleCommandSubmit}
        />
      </div>
    </EditorContext.Provider>
  )
}
