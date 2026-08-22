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
