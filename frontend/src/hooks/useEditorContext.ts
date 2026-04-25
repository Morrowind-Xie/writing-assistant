import { createContext, useContext } from 'react'
import { Editor } from '@tiptap/react'

interface EditorContextValue {
  editor: Editor | null
  selectedText: string
  wordCount: number
}

export const EditorContext = createContext<EditorContextValue>({
  editor: null,
  selectedText: '',
  wordCount: 0,
})

export function useEditorContext() {
  return useContext(EditorContext)
}
