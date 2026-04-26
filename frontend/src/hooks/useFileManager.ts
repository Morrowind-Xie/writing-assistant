import { useState, useRef, useCallback, useEffect } from 'react'
import { Editor } from '@tiptap/react'

export interface FileManagerState {
  fileName: string
  isDirty: boolean
  lastSaved: Date | null
}

export interface FileManagerActions {
  handleNew: () => void
  handleOpen: () => void
  handleSave: () => void
  markDirty: () => void
  /** Render this hidden input somewhere in the tree */
  fileInputRef: React.RefObject<HTMLInputElement>
}

export function useFileManager(getEditor: () => Editor | null): FileManagerState & FileManagerActions {
  const [fileName, setFileName] = useState('无标题文档')
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const markDirty = useCallback(() => {
    setIsDirty(true)
  }, [])

  const doSave = useCallback((name: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name.endsWith('.txt') || name.endsWith('.md') ? name : `${name}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setLastSaved(new Date())
    setIsDirty(false)
  }, [])

  const handleNew = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm('当前文档有未保存的更改，确定要新建文档吗？')
      if (!ok) return
    }
    const editor = getEditor()
    editor?.commands.clearContent(true)
    setFileName('无标题文档')
    setIsDirty(false)
    setLastSaved(null)
  }, [getEditor, isDirty])

  const handleOpen = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm('当前文档有未保存的更改，确定要打开新文件吗？')
      if (!ok) return
    }
    fileInputRef.current?.click()
  }, [isDirty])

  const handleSave = useCallback(() => {
    const editor = getEditor()
    if (!editor) return
    const text = editor.getText()
    doSave(fileName, text)
  }, [getEditor, fileName, doSave])

  // Bind file input change event
  useEffect(() => {
    const input = fileInputRef.current
    if (!input) return

    const onChange = () => {
      const file = input.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        const editor = getEditor()
        if (editor) {
          const paragraphs = text.split(/\r?\n/).map((line) =>
            `<p>${line
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;') || '<br/>'
            }</p>`
          )
          editor.commands.setContent(paragraphs.join(''), false)
        }
        setFileName(file.name)
        setIsDirty(false)
        setLastSaved(null)
      }
      reader.readAsText(file, 'utf-8')
      // Reset so same file can be re-opened
      input.value = ''
    }

    input.addEventListener('change', onChange)
    return () => input.removeEventListener('change', onChange)
  }, [getEditor])

  return {
    fileName,
    isDirty,
    lastSaved,
    handleNew,
    handleOpen,
    handleSave,
    markDirty,
    fileInputRef,
  }
}
