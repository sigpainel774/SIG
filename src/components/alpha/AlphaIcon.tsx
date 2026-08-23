'use client'

import React from 'react'
import {
  Route,
  MapPin,
  Compass,
  Building2,
  Sparkles,
  Activity,
  Shield,
  SlidersHorizontal,
  Layers,
  Car,
  FileText,
  Users,
  Gauge,
  ScanLine,
  Atom,
  FlaskConical,
  Navigation,
  Map,
  Boxes,
  LucideIcon,
} from 'lucide-react'

// Mapa tipado e estático de ícones para evitar importar toda a biblioteca de ícones
export const AlphaIconMap: Record<string, LucideIcon> = {
  Route,
  MapPin,
  Compass,
  Building2,
  Sparkles,
  Activity,
  Shield,
  SlidersHorizontal,
  Layers,
  Car,
  FileText,
  Users,
  Gauge,
  ScanLine,
  Atom,
  FlaskConical,
  Navigation,
  Map,
  Boxes,
}

interface AlphaIconProps {
  name: string
  className?: string
}

export function AlphaIcon({ name, className = 'w-5 h-5' }: AlphaIconProps) {
  const IconComponent = AlphaIconMap[name] || Compass
  return <IconComponent className={className} />
}

export function AlphaLogoGraphic({ className = 'w-20 h-20' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SIG Alpha Lab Logo"
    >
      <defs>
        <linearGradient id="alphaGradA1" x1="25" y1="20" x2="60" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="alphaGradA2" x1="50" y1="20" x2="85" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="alphaGradNode" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#60A5FA" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <filter id="alphaNodeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#1D4ED8" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Perna esquerda do 'A' */}
      <path
        d="M50 16 L22 88 H38 L47 64 H65 L57 44 H49 L55 28 Z"
        fill="url(#alphaGradA1)"
      />

      {/* Perna direita do 'A' */}
      <path
        d="M57 16 L49 35 L67 78 H83 L57 16 Z"
        fill="url(#alphaGradA2)"
      />

      {/* Linhas de Conexão Molecular */}
      <line x1="58" y1="46" x2="82" y2="34" stroke="#2563EB" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="82" y1="34" x2="97" y2="52" stroke="#2563EB" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="82" y1="34" x2="94" y2="23" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
      <line x1="58" y1="46" x2="70" y2="61" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />

      {/* Nós Moleculares com Anel Branco */}
      {/* Nó Central */}
      <circle cx="82" cy="34" r="9.5" fill="url(#alphaGradNode)" stroke="#FFFFFF" strokeWidth="3" filter="url(#alphaNodeGlow)" />
      {/* Nó Superior Direito */}
      <circle cx="94" cy="23" r="5.5" fill="url(#alphaGradNode)" stroke="#FFFFFF" strokeWidth="2" filter="url(#alphaNodeGlow)" />
      {/* Nó Médio Direito */}
      <circle cx="97" cy="52" r="6.5" fill="url(#alphaGradNode)" stroke="#FFFFFF" strokeWidth="2.5" filter="url(#alphaNodeGlow)" />
      {/* Nó Interno do A */}
      <circle cx="58" cy="46" r="6" fill="url(#alphaGradNode)" stroke="#FFFFFF" strokeWidth="2" filter="url(#alphaNodeGlow)" />
      {/* Nó Inferior */}
      <circle cx="70" cy="61" r="5" fill="url(#alphaGradNode)" stroke="#FFFFFF" strokeWidth="2" filter="url(#alphaNodeGlow)" />
    </svg>
  )
}

