'use client'

import { useSessionReplay } from '@/hooks/useSessionReplay'

export function SessionReplayTracker() {
  useSessionReplay()
  return null
}
