'use client'

import React from 'react'

interface ComunicadoCorpoProps {
  texto: string
}

export function ComunicadoCorpo({ texto }: ComunicadoCorpoProps) {
  if (!texto) return null

  // Processador leve e seguro para formatação inline (negrito, itálico, links)
  const formatarLinha = (linha: string, index: number) => {
    // Detecta se a linha é um item de lista
    const isListItem = /^[•\-\*]\s+/.test(linha.trim())
    const textoLimpo = isListItem ? linha.trim().replace(/^[•\-\*]\s+/, '') : linha

    // Tokenização simples de Markdown (links, negrito, itálico)
    // Regex para capturar [link](url), **negrito**, *italico*, ou url direta
    const tokens = []
    let cursor = 0

    // Match links [texto](url)
    const regexLink = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g
    // Match negrito **texto**
    const regexBold = /\*\*([^*]+)\*\*/g
    // Match itálico *texto*
    const regexItalic = /\*([^*]+)\*/g

    // Função helper para transformar string em nós React
    const renderStyledText = (raw: string, keyPrefix: string): React.ReactNode[] => {
      const parts: React.ReactNode[] = []
      // Divide por links primeiro
      let lastIdx = 0
      let match: RegExpExecArray | null

      const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)|(https?:\/\/[^\s]+)/g
      while ((match = linkRegex.exec(raw)) !== null) {
        if (match.index > lastIdx) {
          parts.push(...parseBoldItalic(raw.substring(lastIdx, match.index), `${keyPrefix}_p_${lastIdx}`))
        }
        if (match[1] && match[2]) {
          // [texto](url)
          parts.push(
            <a
              key={`${keyPrefix}_link_${match.index}`}
              href={match[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-highlight hover:underline font-medium inline-flex items-center gap-0.5"
            >
              {match[1]}
            </a>
          )
        } else if (match[3]) {
          // URL direta
          parts.push(
            <a
              key={`${keyPrefix}_urllink_${match.index}`}
              href={match[3]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-highlight hover:underline font-medium break-all"
            >
              {match[3]}
            </a>
          )
        }
        lastIdx = linkRegex.lastIndex
      }

      if (lastIdx < raw.length) {
        parts.push(...parseBoldItalic(raw.substring(lastIdx), `${keyPrefix}_p_${lastIdx}`))
      }

      return parts.length > 0 ? parts : [raw]
    }

    const parseBoldItalic = (rawText: string, prefix: string): React.ReactNode[] => {
      // Processa negrito **texto**
      const boldParts = rawText.split(/\*\*([^*]+)\*\*/)
      const result: React.ReactNode[] = []

      boldParts.forEach((part, i) => {
        if (i % 2 === 1) {
          // É negrito
          result.push(
            <strong key={`${prefix}_b_${i}`} className="font-bold text-foreground">
              {part}
            </strong>
          )
        } else if (part) {
          // Processa itálico *texto*
          const italicParts = part.split(/\*([^*]+)\*/)
          italicParts.forEach((itPart, j) => {
            if (j % 2 === 1) {
              result.push(
                <em key={`${prefix}_it_${i}_${j}`} className="italic text-foreground/90">
                  {itPart}
                </em>
              )
            } else if (itPart) {
              result.push(itPart)
            }
          })
        }
      })
      return result
    }

    if (isListItem) {
      return (
        <li key={index} className="flex items-start gap-2 text-sm text-foregroundCustom/90 my-1">
          <span className="text-highlight font-bold shrink-0 mt-1">•</span>
          <span className="flex-1 leading-relaxed">{renderStyledText(textoLimpo, `li_${index}`)}</span>
        </li>
      )
    }

    if (!linha.trim()) {
      return <div key={index} className="h-2" />
    }

    return (
      <p key={index} className="text-sm leading-relaxed text-foregroundCustom/90 my-1">
        {renderStyledText(linha, `p_${index}`)}
      </p>
    )
  }

  const linhas = texto.split('\n')

  return <div className="space-y-0.5">{linhas.map((linha, idx) => formatarLinha(linha, idx))}</div>
}
