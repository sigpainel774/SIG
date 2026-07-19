"use client"

import React from 'react'
import { cn } from '@/lib/utils'

export interface PrintHeaderProps {
  // Conteúdo customizado para a coluna do meio (ex: Título do documento, ano letivo, etc.)
  // Se não informado, renderiza o texto padrão do município.
  centerContent?: React.ReactNode
  
  // Customização de logotipo da escola (se houver, substitui o da secretaria na direita)
  escolaLogoUrl?: string
  escolaNome?: string
  
  // Customização de textos padrões
  estado?: string
  municipio?: string
  secretaria?: string
  
  // Classes CSS extras para flexibilidade
  className?: string
  logoClassName?: string
  centerClassName?: string
}

export function PrintHeader({
  centerContent,
  escolaLogoUrl,
  escolaNome,
  estado = "ESTADO DA BAHIA",
  municipio = "PREFEITURA MUNICIPAL DE SAPEAÇU",
  secretaria = "SECRETARIA MUNICIPAL DE EDUCAÇÃO",
  className,
  logoClassName = "doc-header-logo-prefeitura",
  centerClassName,
}: PrintHeaderProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijjizpcodnjhvqwjuso.supabase.co'
  const logoPrefeituraUrl = `${supabaseUrl}/storage/v1/object/public/logos/logo-prefeitura.png`
  const logoSecretariaUrl = `${supabaseUrl}/storage/v1/object/public/logos/logo-secretaria.jpg`

  const getCacheBustedUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('data:')) return url
    const cleanUrl = url.split('?')[0]
    return `${cleanUrl}?t=${Date.now()}`
  }

  return (
    <div className={cn("flex items-center justify-between pb-3 border-b border-black mb-4 shrink-0", className)}>
      {/* Logo Prefeitura (Esquerda) */}
      <div className="flex items-center gap-2 max-w-[180px] shrink-0">
        <img
          src={getCacheBustedUrl(logoPrefeituraUrl)}
          alt="Prefeitura de Sapeaçu"
          className={logoClassName}
          onError={(e) => {
            e.currentTarget.src = '/img/brasaoSapeaçu.png'
          }}
        />
      </div>

      {/* Identificação Oficial / Título (Centro) */}
      <div className={cn("text-center flex-1 px-3", centerClassName)}>
        {centerContent ? (
          centerContent
        ) : (
          <>
            <h2 className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-gray-800 uppercase leading-none">{estado}</h2>
            <h3 className="text-[11px] sm:text-[13px] font-black text-gray-900 uppercase mt-0.5">{municipio}</h3>
            <p className="text-[8.5px] sm:text-[10px] font-bold text-gray-600 mt-0.5">{secretaria}</p>
          </>
        )}
      </div>

      {/* Logo Escola ou Secretaria (Direita) */}
      <div className="text-right max-w-[180px] shrink-0">
        <img
          src={escolaLogoUrl ? getCacheBustedUrl(escolaLogoUrl) : getCacheBustedUrl(logoSecretariaUrl)}
          alt={escolaNome || "Secretaria de Educação"}
          className={logoClassName}
          onError={(e) => {
            e.currentTarget.src = '/img/logo-secretaria.png'
          }}
        />
      </div>
    </div>
  )
}
