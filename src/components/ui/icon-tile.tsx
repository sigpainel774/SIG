import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

type IconTileVariant = "primary" | "success" | "warning" | "destructive"

const variantClasses: Record<IconTileVariant, string> = {
  primary: "bg-primary/15 border-primary/40 text-primary",
  success: "bg-success/15 border-success/40 text-success",
  warning: "bg-warning/15 border-warning/40 text-warning",
  destructive: "bg-destructive/15 border-destructive/40 text-destructive",
}

interface IconTileProps {
  icon: LucideIcon
  variant?: IconTileVariant
  className?: string
}

export function IconTile({ icon: Icon, variant = "primary", className }: IconTileProps) {
  return (
    <div
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-2xl border shrink-0",
        variantClasses[variant],
        className
      )}
    >
      <Icon className="h-6 w-6" strokeWidth={2} />
    </div>
  )
}
