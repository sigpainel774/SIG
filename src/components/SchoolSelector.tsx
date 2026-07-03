'use client'

import { useSchoolStore, mockEscolas } from '@/store/useSchoolStore'
import { Building2, ChevronDown, Check, Globe } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function SchoolSelector() {
  const { selectedEscola, setSelectedEscola } = useSchoolStore()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 bg-[#1a1f2c] hover:bg-[#22293a] border border-[#2e3952] text-white px-3.5 py-2 rounded-xl text-sm font-medium transition-all shadow-sm cursor-pointer"
      >
        {selectedEscola ? (
          <>
            <div className={`w-3 h-3 rounded-full ${selectedEscola.color || 'bg-blue-500'}`} />
            <span className="font-semibold text-white max-w-[200px] truncate">{selectedEscola.nome}</span>
          </>
        ) : (
          <>
            <Globe className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-sky-200">Todas as Escolas (Rede Macro)</span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#141824] border border-[#2a3449] shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95">
          <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-[#222b3d]">
            Filtro de Relatório
          </div>

          <button
            onClick={() => {
              setSelectedEscola(null)
              setIsOpen(false)
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              !selectedEscola ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'text-gray-300 hover:bg-[#1f2738] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-sky-400" />
              <div className="text-left">
                <p className="font-bold">Visão Geral da Rede</p>
                <p className="text-[10px] text-gray-400 font-normal">Todas as unidades municipais</p>
              </div>
            </div>
            {!selectedEscola && <Check className="w-4 h-4 text-sky-400" />}
          </button>

          <div className="pt-1 border-t border-[#222b3d]/60 space-y-1 max-h-60 overflow-y-auto">
            {mockEscolas.map((escola) => {
              const isSelected = selectedEscola?.id === escola.id
              return (
                <button
                  key={escola.id}
                  onClick={() => {
                    setSelectedEscola(escola)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-semibold' : 'text-gray-300 hover:bg-[#1f2738] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${escola.color || 'bg-blue-500'}`} />
                    <span className="truncate">{escola.nome}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
