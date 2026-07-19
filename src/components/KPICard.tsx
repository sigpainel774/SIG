'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KPICardProps {
  icon: any
  label: string
  value: number | string
  subLabel?: string
  color?: 'blue' | 'amber' | 'emerald' | 'violet' | 'rose'
  loading?: boolean
  href?: string
}

export function KPICard({
  icon: Icon,
  label,
  value,
  subLabel,
  color = 'blue',
  loading,
  href,
}: KPICardProps) {
  const colors = {
    blue:    { bg: 'bg-[#1b253b]', text: 'text-[#3ea6ff]', border: 'border-[#3ea6ff]/20' },
    amber:   { bg: 'bg-[#2c1a0e]', text: 'text-amber-400', border: 'border-amber-500/20' },
    emerald: { bg: 'bg-[#0d1f18]', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    violet:  { bg: 'bg-[#1e1b2e]', text: 'text-violet-400', border: 'border-violet-500/20' },
    rose:    { bg: 'bg-[#1f0d0d]', text: 'text-rose-400', border: 'border-rose-500/20' },
  }
  const c = colors[color]

  const content = (
    <Card className={cn(
      'bg-surface-1 border-borderCustom rounded-2xl p-5 flex flex-col gap-3 shadow-sm',
      href && 'hover:border-highlight/40 hover:bg-surface-2 transition-all duration-200 cursor-pointer'
    )}>
      <div className="flex items-center justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.bg, 'border', c.border)}>
          <Icon className={cn('w-5 h-5', c.text)} />
        </div>
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-muted/20 rounded animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
      )}
      {subLabel && !loading && (
        <p className="text-xs text-muted-foreground">{subLabel}</p>
      )}
    </Card>
  )

  if (href) return <Link href={href}>{content}</Link>
  return content
}
