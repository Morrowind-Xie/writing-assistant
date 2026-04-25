import { Wifi, WifiOff, FileText, AlignLeft, Clock } from 'lucide-react'
import { HermesStatus } from '../types'

interface StatusBarProps {
  hermesStatus: HermesStatus
  wordCount: number
  paragraphCount: number
  lastSaved?: Date | null
}

export function StatusBar({ hermesStatus, wordCount, paragraphCount, lastSaved }: StatusBarProps) {
  return (
    <div className="h-6 flex items-center justify-between px-4
      bg-[#17181C] border-t border-white/6 text-[11px] text-white/30 shrink-0">
      {/* Left: word stats */}
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <FileText size={11} />
          {wordCount} 词
        </span>
        <span className="flex items-center gap-1.5">
          <AlignLeft size={11} />
          {paragraphCount} 段
        </span>
        {lastSaved && (
          <span className="flex items-center gap-1.5">
            <Clock size={11} />
            {lastSaved.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 已保存
          </span>
        )}
      </div>

      {/* Right: hermes status */}
      <div className="flex items-center gap-2">
        {hermesStatus.online ? (
          <>
            <Wifi size={11} className="text-[#40C057]" />
            <span className="text-white/50">
              {hermesStatus.model || 'hermes-agent'}
            </span>
            {hermesStatus.latency && (
              <span className="text-white/25">{hermesStatus.latency}ms</span>
            )}
          </>
        ) : (
          <>
            <WifiOff size={11} className="text-[#FA5252]" />
            <span className="text-[#FA5252]/70">hermes 未连接</span>
          </>
        )}
      </div>
    </div>
  )
}
