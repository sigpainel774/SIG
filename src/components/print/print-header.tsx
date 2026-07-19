"use client"

import React from 'react'
import { cn } from '@/lib/utils'

// Timestamp fixo de sessão para evitar flickering e re-fetch de imagens dinâmicas durante re-renderizações
const sessionTimestamp = Date.now()

export interface PrintHeaderProps {
  // Conteúdo customizado para a coluna do meio (ex: Título do documento, ano letivo, etc.)
  centerContent?: React.ReactNode
  
  // Título e Subtítulo amigáveis quando centerContent não for fornecido
  docTitulo?: string
  docSubtitulo?: string
  
  // Customização de logotipo da escola (se houver, substitui o da secretaria na direita)
  escolaLogoUrl?: string
  escolaNome?: string
  
  // Customização de textos padrões
  estado?: string
  municipio?: string
  secretaria?: string
  
  // Timestamp para forçar busting de cache manual (opcional)
  timestamp?: number

  // Classes CSS extras para flexibilidade
  className?: string
  logoClassName?: string
  centerClassName?: string
}

export function PrintHeader({
  centerContent,
  docTitulo,
  docSubtitulo,
  escolaLogoUrl,
  escolaNome,
  estado = "ESTADO DA BAHIA",
  municipio = "PREFEITURA MUNICIPAL DE SAPEAÇU",
  secretaria = "SECRETARIA MUNICIPAL DE EDUCAÇÃO",
  timestamp,
  className,
  logoClassName = "h-14 w-auto max-w-[160px] object-contain",
  centerClassName,
}: PrintHeaderProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijjizpcodnjhvqwjuso.supabase.co'
  const logoPrefeituraUrl = `${supabaseUrl}/storage/v1/object/public/logos/logo-prefeitura.png`
  const logoSecretariaUrl = `${supabaseUrl}/storage/v1/object/public/logos/logo-secretaria.jpg`

  const activeTimestamp = timestamp ?? sessionTimestamp

  const getCacheBustedUrl = (url?: string) => {
    if (!url) return ''
    if (url.startsWith('data:')) return url
    const cleanUrl = url.split('?')[0]
    return `${cleanUrl}?t=${activeTimestamp}`
  }

  const nomeExibicaoEscola = escolaNome ?? "Secretaria Municipal de Educação"

  return (
    <div className={cn("flex items-center justify-between pb-3 border-b-2 border-black mb-4 shrink-0 w-full", className)}>
      {/* Logo Prefeitura (Esquerda) */}
      <div className="flex items-center justify-start max-w-[180px] shrink-0">
        <img
          src={getCacheBustedUrl(logoPrefeituraUrl)}
          alt="Prefeitura de Sapeaçu"
          className={logoClassName}
          onError={(e) => {
            if (e.currentTarget.dataset.failed) return
            e.currentTarget.dataset.failed = 'true'
            e.currentTarget.src = '/img/logo-prefeitura.png'
          }}
        />
      </div>

      {/* Identificação Oficial / Título (Centro) */}
      <div className={cn("text-center flex-1 px-3 min-w-0", centerClassName)}>
        {centerContent ? (
          centerContent
        ) : (
          <>
            <h2 className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-gray-800 uppercase leading-none">{estado}</h2>
            <h3 className="text-[11px] sm:text-[13px] font-black text-gray-900 uppercase mt-0.5">{municipio}</h3>
            <p className="text-[8.5px] sm:text-[10px] font-bold text-gray-600 mt-0.5 truncate">{secretaria}</p>
            {escolaNome && (
              <p className="text-[10px] sm:text-[11px] font-black text-blue-900 uppercase mt-1 line-clamp-2">
                {escolaNome}
              </p>
            )}
            {docTitulo && (
              <p className="text-[10px] sm:text-[12px] font-bold text-gray-800 uppercase mt-1 tracking-wide">
                {docTitulo}
              </p>
            )}
            {docSubtitulo && (
              <p className="text-[9px] sm:text-[10px] font-semibold text-gray-500 mt-0.5">
                {docSubtitulo}
              </p>
            )}
          </>
        )}
      </div>

      {/* Logo Escola ou Secretaria (Direita) */}
      <div className="flex items-center justify-end max-w-[180px] shrink-0">
        <img
          src={escolaLogoUrl ? getCacheBustedUrl(escolaLogoUrl) : getCacheBustedUrl(logoSecretariaUrl)}
          alt={nomeExibicaoEscola}
          className={logoClassName}
          onError={(e) => {
            if (e.currentTarget.dataset.failed) return
            e.currentTarget.dataset.failed = 'true'
            e.currentTarget.src = '/img/logo-secretaria.png'
          }}
        />
      </div>
    </div>
  )
}
