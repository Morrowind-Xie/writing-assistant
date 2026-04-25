import { useCallback, useRef, useState } from 'react'
import { streamChatCompletion } from '../api/hermesClient'
import { ChatMessage } from '../types'

interface UseAiStreamResult {
  content: string
  streaming: boolean
  error: string | null
  run: (messages: ChatMessage[]) => Promise<void>
  cancel: () => void
  reset: () => void
}

export function useAiStream(): UseAiStreamResult {
  const [content, setContent] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setStreaming(false)
  }, [])

  const reset = useCallback(() => {
    cancel()
    setContent('')
    setError(null)
  }, [cancel])

  const run = useCallback(async (messages: ChatMessage[]) => {
    cancel()
    setContent('')
    setError(null)
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    await streamChatCompletion(
      messages,
      (token) => setContent((prev) => prev + token),
      () => setStreaming(false),
      controller.signal,
    )
  }, [cancel])

  return { content, streaming, error, run, cancel, reset }
}
