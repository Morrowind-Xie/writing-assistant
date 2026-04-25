import { useEffect, useRef } from 'react'

interface StreamingTextProps {
  content: string
  streaming: boolean
  className?: string
}

export function StreamingText({ content, streaming, className = '' }: StreamingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom as content streams in
  useEffect(() => {
    if (streaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [content, streaming])

  return (
    <div ref={containerRef} className={`leading-relaxed whitespace-pre-wrap break-words ${className}`}>
      {content}
      {streaming && (
        <span className="inline-block w-0.5 h-4 bg-[#6C8EF5] ml-0.5 align-middle animate-pulse" />
      )}
    </div>
  )
}
