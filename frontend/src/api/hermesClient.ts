import { ChatMessage } from '../types'

const HERMES_BASE = '/hermes'

// Check if hermes-agent API is reachable
export async function checkHermesStatus(): Promise<{ online: boolean; latency?: number; model?: string }> {
  const start = Date.now()
  const res = await fetch(`${HERMES_BASE}/health`)
  if (!res.ok) return { online: false }
  const latency = Date.now() - start
  const models = await fetch(`${HERMES_BASE}/v1/models`)
  const data = await models.json()
  const model = data?.data?.[0]?.id || 'hermes-agent'
  return { online: true, latency, model }
}

// Stream a chat completion from hermes-agent
// onToken: called for each text token
// onDone: called when stream ends
export async function streamChatCompletion(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onDone: () => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${HERMES_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'hermes-agent',
      messages,
      stream: true,
    }),
    signal,
  })

  if (!res.ok || !res.body) {
    console.error('Hermes API error:', res.status)
    onDone()
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') { onDone(); return }
      const parsed = JSON.parse(data)
      const token = parsed?.choices?.[0]?.delta?.content
      if (token) onToken(token)
    }
  }

  onDone()
}

// Single (non-streaming) chat completion
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${HERMES_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'hermes-agent', messages, stream: false }),
  })
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
}

// Ask hermes to remember a writing preference (fires-and-forgets a short session)
export async function rememberPreference(preference: string): Promise<void> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a writing assistant memory recorder. When asked to remember a writing preference, use your memory tool to store it in your USER.md under [Writing Assistant] section. Be concise.',
    },
    {
      role: 'user',
      content: `Please remember this writing preference: ${preference}`,
    },
  ]
  // Fire and forget — we don't need the response
  fetch(`${HERMES_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'hermes-agent', messages, stream: false }),
  }).catch(() => {})
}

// Fetch recent writing-related memories from hermes session history
export async function fetchWritingMemory(): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a writing assistant. Briefly summarize the writing preferences and style notes stored in your memory (USER.md [Writing Assistant] section). If nothing is stored yet, say "No writing preferences recorded yet."',
    },
    { role: 'user', content: 'What writing preferences do you have on file for me?' },
  ]
  return chatCompletion(messages)
}
