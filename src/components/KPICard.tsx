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
    blue:    { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20 dark:border-blue-500/30' },
    amber:   { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20 dark:border-amber-500/30' },
    emerald: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20 dark:border-emerald-500/30' },
    violet:  { bg: 'bg-violet-500/10 dark:bg-violet-500/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20 dark:border-violet-500/30' },
    rose:    { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20 dark:border-rose-500/30' },
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
