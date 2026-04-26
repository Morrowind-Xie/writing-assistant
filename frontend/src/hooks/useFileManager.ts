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
  handleSaveAs: () => void
  markDirty: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
}

// File System Access API type augmentation
declare global {
  interface Window {
    showSaveFilePicker?: (opts?: {
      suggestedName?: string
      types?: { description: string; accept: Record<string, string[]> }[]
    }) => Promise<FileSystemFileHandle>
  }
}

const SAVE_PICKER_OPTS = (suggestedName: string) => ({
  suggestedName,
  types: [
    { description: '文本文档', accept: { 'text/plain': ['.txt'] } as Record<string, string[]> },
    { description: 'Markdown', accept: { 'text/markdown': ['.md'] } as Record<string, string[]> },
  ],
})

export function useFileManager(getEditor: () => Editor | null): FileManagerState & FileManagerActions {
  const [fileName, setFileName] = useState('无标题文档')
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Holds the file handle after first save — enables direct overwrite
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const markDirty = useCallback(() => {
    setIsDirty(true)
  }, [])

  // Write text to a file handle (File System Access API)
  const writeToHandle = useCallback(async (handle: FileSystemFileHandle, text: string) => {
    const writable = await handle.createWritable()
    await writable.write(text)
    await writable.close()
    setLastSaved(new Date())
    setIsDirty(false)
  }, [])

  // Fallback: download via <a> (for browsers without File System Access API)
  const downloadFallback = useCallback((name: string, text: string) => {
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

  // Core save: if handle exists → overwrite directly; otherwise → pick location first
  const handleSave = useCallback(async () => {
    const editor = getEditor()
    if (!editor) return
    const text = editor.getText()

    // Already have a file handle → overwrite silently
    if (fileHandleRef.current) {
      try {
        await writeToHandle(fileHandleRef.current, text)
        return
      } catch {
        // Permission revoked or handle stale — fall through to re-pick
        fileHandleRef.current = null
      }
    }

    // No handle yet: try File System Access API (showSaveFilePicker)
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker(SAVE_PICKER_OPTS(
          fileName.endsWith('.txt') || fileName.endsWith('.md') ? fileName : `${fileName}.txt`
        ))
        fileHandleRef.current = handle
        setFileName(handle.name)
        await writeToHandle(handle, text)
      } catch (err: unknown) {
        // User cancelled the picker — do nothing
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Save failed:', err)
        }
      }
    } else {
      // Fallback for browsers that don't support File System Access API
      downloadFallback(fileName, text)
    }
  }, [getEditor, fileName, writeToHandle, downloadFallback])

  // "Save As": always open picker, even if a handle exists
  const handleSaveAs = useCallback(async () => {
    const editor = getEditor()
    if (!editor) return
    const text = editor.getText()

    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker(SAVE_PICKER_OPTS(
          fileName.endsWith('.txt') || fileName.endsWith('.md') ? fileName : `${fileName}.txt`
        ))
        fileHandleRef.current = handle
        setFileName(handle.name)
        await writeToHandle(handle, text)
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Save As failed:', err)
        }
      }
    } else {
      downloadFallback(fileName, text)
    }
  }, [getEditor, fileName, writeToHandle, downloadFallback])

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
    fileHandleRef.current = null
  }, [getEditor, isDirty])

  const handleOpen = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm('当前文档有未保存的更改，确定要打开新文件吗？')
      if (!ok) return
    }
    fileInputRef.current?.click()
  }, [isDirty])

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
        // Opened via <input>, no file handle available for direct overwrite
        fileHandleRef.current = null
      }
      reader.readAsText(file, 'utf-8')
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
    handleSaveAs,
    markDirty,
    fileInputRef,
  }
}
