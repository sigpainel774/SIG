"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "highlight" | "muted"
  placement?: "inline" | "centered" | "fullscreen"
  label?: string
}

export function LoadingSpinner({
  size = "md",
  variant = "default",
  placement = "centered",
  label,
  className,
  ...props
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  }

  const variantClasses = {
    default: "text-[#0090ff] dark:text-[#3ea6ff]",
    highlight: "text-highlight",
    muted: "text-zinc-500 dark:text-zinc-400",
  }

  const spinner = (
    <Loader2
      className={cn(
        "animate-spin shrink-0",
        sizeClasses[size],
        variantClasses[variant]
      )}
    />
  )

  const content = (
    <div
      className={cn(
        "flex flex-col items-center gap-2",
        className
      )}
      {...props}
    >
      {spinner}
      {label && (
        <span className="text-xs font-medium text-zinc-400 select-none">
          {label}
        </span>
      )}
    </div>
  )

  if (placement === "centered") {
    return (
      <div className="flex w-full min-h-[150px] items-center justify-center p-4">
        {content}
      </div>
    )
  }

  if (placement === "fullscreen") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        {content}
      </div>
    )
  }

  return content
}

export interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  active: boolean
  label?: string
}

export function LoadingOverlay({ active, label, className, ...props }: LoadingOverlayProps) {
  if (!active) return null

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-2xl transition-opacity animate-in fade-in duration-150",
        className
      )}
      {...props}
    >
      <LoadingSpinner size="lg" label={label} placement="inline" />
    </div>
  )
}
