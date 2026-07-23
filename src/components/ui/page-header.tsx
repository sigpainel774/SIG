'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconTile } from '@/components/ui/icon-tile'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  iconVariant?: 'primary' | 'success' | 'warning' | 'destructive'
  iconClassName?: string
  backHref?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  icon,
  iconVariant = 'primary',
  iconClassName,
  backHref,
  actions,
  className,
}: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backHref) return
    router.back()
  }

  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border", className)}>
      <div className="flex items-start gap-3">
        {backHref ? (
          <Link href={backHref}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 mt-1">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}

        <div>
          <div className="flex items-center gap-3">
            {icon && (
              <IconTile icon={icon} variant={iconVariant} className={cn("h-10 w-10 shrink-0 rounded-xl", iconClassName)} />
            )}
            <h1 className="text-2xl font-bold text-foreground tracking-tight m-0">
              {title}
            </h1>
          </div>
          {description && (
            <p className="text-sm font-normal mt-1 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
