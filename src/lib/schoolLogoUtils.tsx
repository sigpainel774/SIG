import { Building2 } from 'lucide-react'
import React from 'react'

export function getSchoolIconProps(escola: any) {
  if (!escola) {
    return {
      style: {},
      content: <Building2 className="w-8 h-8 text-white" />
    }
  }

  if (escola.logo_url) {
    const logoSrc = escola.logo_url

    return {
      style: {},
      content: (
        <img
          src={logoSrc}
          alt={escola.nome}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      )
    }
  }

  const nomeLower = escola.nome.toLowerCase()
  
  if (nomeLower.includes('moisés alves') || nomeLower.includes('moises alves')) {
    return {
      style: { backgroundColor: '#1d4ed8' },
      content: <span className="text-white font-extrabold text-2xl tracking-tight select-none">EMV</span>
    }
  }
  
  if (nomeLower.includes('teste 1')) {
    return {
      style: { backgroundColor: '#4f46e5' },
      content: <span className="text-white font-extrabold text-4xl select-none">1</span>
    }
  }

  if (nomeLower.includes('teste 2')) {
    return {
      style: { backgroundColor: '#c2410c' },
      content: <span className="text-white font-extrabold text-4xl select-none">2</span>
    }
  }

  if (nomeLower.includes('eraldo tinoco')) {
    return {
      style: { backgroundColor: '#1b4e9b' },
      content: <Building2 className="w-10 h-10 text-white" />
    }
  }

  // Fallback para as outras escolas sem logo
  const words = escola.nome
    .replace(/(municipal|colégio|colegio|escola|centro|educacional|de|da|do|para)/gi, '')
    .trim()
    .split(/\s+/)
  const initials = words
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)

  const colors = [
    '#1d4ed8', // blue
    '#059669', // emerald
    '#7c3aed', // violet
    '#db2777', // pink
    '#d97706', // amber
    '#dc2626', // red
    '#0891b2'  // cyan
  ]
  const charCodeSum = escola.nome.split('').reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0)
  const bgStyle = { backgroundColor: colors[charCodeSum % colors.length] }

  return {
    style: bgStyle,
    content: initials ? (
      <span className="text-white font-extrabold text-xl select-none">{initials}</span>
    ) : (
      <Building2 className="w-10 h-10 text-white" />
    )
  }
}
