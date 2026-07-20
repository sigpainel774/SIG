'use client'

import React from 'react'

interface LogoProps {
  className?: string
  variant?: 'icon' | 'full'
}

export function Logo({ className = 'w-10 h-10', variant = 'icon' }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Emblem / Logo SPE */}
      <img
        src="/img/logo-spe.png"
        alt="Logo SPE Sapeaçu"
        className="w-full h-full object-contain"
      />

      {/* Typography for full variant */}
      {variant === 'full' && (
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight text-white leading-tight">
            Sapeaçu
          </span>
          <span className="text-sm font-semibold tracking-wide text-[#3ea6ff] leading-tight">
            Painel Escolar
          </span>
        </div>
      )}
    </div>
  )
}
