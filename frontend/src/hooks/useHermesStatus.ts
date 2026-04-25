import { useEffect, useRef, useState } from 'react'
import { checkHermesStatus } from '../api/hermesClient'
import { HermesStatus } from '../types'

export function useHermesStatus(pollInterval = 30000) {
  const [status, setStatus] = useState<HermesStatus>({ online: false })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const check = async () => {
    const result = await checkHermesStatus()
    setStatus(result)
  }

  useEffect(() => {
    check()
    timerRef.current = setInterval(check, pollInterval)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [pollInterval])

  return status
}
