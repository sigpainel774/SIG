'use client'

import React from 'react'

interface LogoProps {
  className?: string
  variant?: 'icon' | 'full'
}

export function Logo({ className = 'w-10 h-10', variant = 'icon' }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* SVG Icon */}
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_4px_12px_rgba(62,166,255,0.15)]"
      >
        <defs>
          {/* Background Gradient */}
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d1117" />
            <stop offset="50%" stopColor="#121824" />
            <stop offset="100%" stopColor="#1a2336" />
          </linearGradient>

          {/* Border Gradient */}
          <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3ea6ff" />
            <stop offset="50%" stopColor="#8c52ff" />
            <stop offset="100%" stopColor="#ff7300" />
          </linearGradient>

          {/* Primary Gradient (Electric Blue) */}
          <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3ea6ff" />
            <stop offset="100%" stopColor="#00d2ff" />
          </linearGradient>

          {/* Accent Gradient (Orange/Gold) */}
          <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff9f43" />
            <stop offset="100%" stopColor="#ff5a00" />
          </linearGradient>

          {/* Glow Filter for tech feel */}
          <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Container (Squircle) */}
        <rect
          x="12"
          y="12"
          width="488"
          height="488"
          rx="124"
          fill="url(#bgGrad)"
          stroke="url(#borderGrad)"
          strokeWidth="14"
        />

        {/* Outer Glow Inner Border */}
        <rect
          x="26"
          y="26"
          width="460"
          height="460"
          rx="110"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.04"
          strokeWidth="2"
        />

        {/* --- Graphic Emblem (Graduation Cap + Book) --- */}
        <g filter="url(#glow)">
          {/* Graduation Cap (Mortarboard Top) */}
          <path
            d="M256 100 L400 170 L256 240 L112 170 Z"
            fill="url(#primaryGrad)"
            opacity="0.95"
          />

          {/* Cap Underneath Shadow/Depth */}
          <path
            d="M176 201 V240 C176 280 336 280 336 240 V201"
            stroke="url(#primaryGrad)"
            strokeWidth="16"
            strokeLinecap="round"
            fill="none"
          />

          {/* Golden Tassel */}
          <path
            d="M256 170 L370 220 V300"
            stroke="url(#accentGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="370" cy="308" r="8" fill="url(#accentGrad)" />

          {/* Open Book Pages at the base */}
          {/* Left Page */}
          <path
            d="M256 285 C200 255 140 260 90 280 V370 C140 350 200 345 256 375 Z"
            fill="url(#accentGrad)"
            opacity="0.85"
          />

          {/* Right Page */}
          <path
            d="M256 285 C312 255 372 260 422 280 V370 C372 350 312 345 256 375 Z"
            fill="url(#accentGrad)"
            opacity="0.85"
          />
        </g>

        {/* --- Monogram SPE --- */}
        <g fill="none" stroke="#ffffff" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
          {/* Letter S (Stylized) */}
          <path d="M 185 410 H 145 C 130 410 120 420 120 432.5 C 120 445 130 455 145 455 H 175 C 190 455 200 465 200 477.5 C 200 490 190 500 175 500 H 135" stroke="url(#primaryGrad)" strokeWidth="16" />
          
          {/* Letter P (Stylized) */}
          <path d="M 235 410 V 500 M 235 410 H 270 C 285 410 295 420 295 432.5 C 295 445 285 455 270 455 H 235" stroke="#ffffff" strokeWidth="16" />
          
          {/* Letter E (Stylized) */}
          <path d="M 330 410 V 500 M 330 410 H 380 M 330 455 H 370 M 330 500 H 380" stroke="url(#accentGrad)" strokeWidth="16" />
        </g>
      </svg>

      {/* Typography for full variant */}
      {variant === 'full' && (
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight text-white leading-tight">
            Sapeaçu
          </span>
          <span className="text-sm font-semibold tracking-wide text-highlight leading-tight">
            Painel Escolar
          </span>
        </div>
      )}
    </div>
  )
}
