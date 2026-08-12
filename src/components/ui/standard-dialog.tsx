"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface StandardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  maxWidth?: string // Ex: "sm:max-w-[425px]", "sm:max-w-2xl", etc.
}

export function StandardDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  maxWidth = "sm:max-w-[450px]",
}: StandardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden", maxWidth, className)}>
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-muted-foreground">
              {description}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              {title}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="py-2 flex-1 overflow-y-auto min-h-0 pr-1 space-y-2">
          {children}
        </div>
        {footer && <DialogFooter className="shrink-0 pt-2">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
