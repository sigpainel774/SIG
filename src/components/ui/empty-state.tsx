"use client"

import React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  icon?: LucideIcon
  actionButton?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionButton,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#2a2a2a] rounded-2xl bg-[#121212]/50 max-w-md mx-auto my-6 animate-in fade-in duration-200",
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[#1c1c20] flex items-center justify-center border border-[#2a2a2a] text-zinc-500 mb-4">
          <Icon className="w-6 h-6" />
        </div>
      )}
      
      <h3 className="text-sm font-semibold text-zinc-200 select-none">
        {title}
      </h3>
      
      {description && (
        <p className="text-xs text-zinc-500 mt-1 select-none max-w-[280px] leading-relaxed">
          {description}
        </p>
      )}

      {actionButton && (
        <div className="mt-4">
          {actionButton}
        </div>
      )}
    </div>
  )
}
