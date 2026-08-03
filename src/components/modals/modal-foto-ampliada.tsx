'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { getAvatarUrl } from '@/lib/photoHelper'
import { formatPhotoUrlWithTimestamp } from '@/lib/mapCache'
import type { Aluno } from '@/hooks/useAlunos'

interface ModalFotoAmpliadaProps {
  aluno: Aluno | null
  onClose: () => void
}

export function ModalFotoAmpliada({ aluno, onClose }: ModalFotoAmpliadaProps) {
  if (!aluno || typeof window === 'undefined') return null

  const avatarUrl = getAvatarUrl(aluno)
  const safeFotoUrl = avatarUrl ? formatPhotoUrlWithTimestamp(avatarUrl) : null

  const obterIniciais = (nome: string) => {
    return nome
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm sm:max-w-md w-full bg-[#141a27] border border-[#2d3a54] rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#1e283b] transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Título */}
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Foto 3x4 do Aluno
        </div>

        {/* Container da Foto Ampliada 3x4 */}
        <div className="relative w-56 h-64 sm:w-64 sm:h-72 rounded-2xl overflow-hidden border-4 border-[#232d42] shadow-2xl bg-[#1e283b] flex items-center justify-center shrink-0">
          {safeFotoUrl ? (
            <img
              src={safeFotoUrl}
              alt={aluno.nome}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : null}
          <div className="w-full h-full text-white font-bold text-5xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800">
            {obterIniciais(aluno.nome)}
          </div>
        </div>

        {/* Detalhes do Aluno */}
        <div className="flex flex-col items-center gap-1 w-full">
          <h3 className="text-lg font-bold text-white leading-snug">{aluno.nome}</h3>
          
          <div className="flex items-center gap-2 flex-wrap justify-center text-xs text-slate-300">
            {aluno.serie && (
              <span className="px-2.5 py-0.5 rounded-full font-semibold bg-primary/20 border border-primary/30 text-primary">
                {aluno.serie}
              </span>
            )}
            {aluno.numero_matricula && (
              <span className="text-purple-300 font-medium">
                Matrícula: {aluno.numero_matricula}
              </span>
            )}
          </div>

          {aluno.escola_nome && (
            <span className="text-xs text-slate-400 mt-1 block">
              📍 {aluno.escola_nome}
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
