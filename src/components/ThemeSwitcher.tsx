'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

type ThemeSwitcherProps = {
  align?: 'left' | 'right'
  buttonClassName?: string
  menuClassName?: string
}

const options = [
  { value: 'light', label: 'Claro', icon: Sun, iconClassName: 'text-amber-500' },
  { value: 'dark', label: 'Escuro', icon: Moon, iconClassName: 'text-blue-400' },
  { value: 'system', label: 'Sistema', icon: Monitor, iconClassName: '' },
] as const

export function ThemeSwitcher({ align = 'right', buttonClassName, menuClassName }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const activeOption = options.find((option) => option.value === theme) ?? options[2]
  const ActiveIcon = activeOption.icon

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-hoverCustom hover:text-foreground',
          buttonClassName
        )}
        title="Alterar Tema"
        aria-label="Alterar Tema"
      >
        <ActiveIcon className={cn('h-5 w-5', activeOption.iconClassName)} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={cn(
              'absolute mt-2 w-36 rounded-xl border border-borderCustom bg-card p-1 shadow-lg z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150',
              align === 'right' ? 'right-0' : 'left-0',
              menuClassName
            )}
          >
            {options.map((option) => {
              const Icon = option.icon
              const isActive = theme === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setTheme(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-hoverCustom',
                    isActive ? 'font-semibold text-[#185FA5] dark:text-[#3ea6ff]' : 'text-foregroundCustom'
                  )}
                >
                  <Icon className={cn('h-4 w-4', option.iconClassName)} />
                  <span>{option.label}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
