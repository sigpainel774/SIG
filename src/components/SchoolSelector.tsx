'use client'

import { useSchoolStore } from '@/store/useSchoolStore'
import { useAuthStore } from '@/store/useAuthStore'
import { Building2, ChevronDown, Check, Globe } from 'lucide-react'
import { useState, useRef, useEffect, useMemo } from 'react'

export function SchoolSelector() {
  const { escolas, selectedEscola, setSelectedEscola, selectedSecretaria, setSelectedSecretaria, loadEscolas } = useSchoolStore()
  const { isAdminGlobalOrRoot, escolaAtivaId, setEscolaAtivaId, vinculos } = useAuthStore()
  const isAdmin = isAdminGlobalOrRoot()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const vinculosAtivos = useMemo(() => vinculos?.filter((v) => v.ativo) || [], [vinculos])

  const escolasPermitidas = useMemo(() => {
    if (isAdmin) return escolas
    if (vinculosAtivos.length > 0) {
      const permitidas = escolas.filter((e) => vinculosAtivos.some((v) => v.escola_id === e.id))
      return permitidas.length > 0 ? permitidas : escolas
    }
    return escolas
  }, [isAdmin, escolas, vinculosAtivos])

  // Agrupa as escolas por Secretaria mantenedora
  const escolasAgrupadas = useMemo(() => {
    const map: Record<string, typeof escolasPermitidas> = {}
    for (const e of escolasPermitidas) {
      const secNome = e.secretariaNome || 'Secretaria Municipal de Educação'
      if (!map[secNome]) map[secNome] = []
      map[secNome].push(e)
    }
    return map
  }, [escolasPermitidas])

  useEffect(() => {
    loadEscolas()
  }, [loadEscolas])

  // Sincroniza a store de escola com a store de autenticação no carregamento
  useEffect(() => {
    if (escolasPermitidas.length > 0) {
      if (escolaAtivaId) {
        const escola = escolasPermitidas.find(e => e.id === escolaAtivaId)
        if (escola && selectedEscola?.id !== escola.id) {
          setSelectedEscola(escola)
        } else if (!escola && !isAdmin) {
          setSelectedEscola(escolasPermitidas[0])
          setEscolaAtivaId(escolasPermitidas[0].id)
        }
      } else if (!escolaAtivaId && selectedEscola) {
        setEscolaAtivaId(selectedEscola.id)
      } else if (!escolaAtivaId && !selectedEscola && !isAdmin && !selectedSecretaria) {
        setSelectedEscola(escolasPermitidas[0])
        setEscolaAtivaId(escolasPermitidas[0].id)
      }
    }
  }, [escolasPermitidas, escolaAtivaId, selectedEscola, selectedSecretaria, isAdmin, setSelectedEscola, setEscolaAtivaId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (escolasPermitidas.length === 0 && !isAdmin) {
    return null
  }

  return (
    <div className="relative inline-block text-left max-w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2.5 bg-[#1a1f2c] hover:bg-[#22293a] border border-[#2e3952] text-white px-3.5 py-2 rounded-xl text-sm font-medium transition-all shadow-sm cursor-pointer max-w-full"
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {selectedEscola ? (
            <>
              <div className={`w-3 h-3 rounded-full shrink-0 ${selectedEscola.color || 'bg-blue-500'}`} />
              <span className="font-semibold text-white max-w-[180px] sm:max-w-[240px] truncate">{selectedEscola.nome}</span>
            </>
          ) : selectedSecretaria ? (
            <>
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-emerald-200 max-w-[180px] sm:max-w-[240px] truncate">{selectedSecretaria.nome} (Consolidado)</span>
            </>
          ) : (
            <>
              <Globe className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="font-semibold text-sky-200 truncate">Todas as Unidades (Rede Municipal)</span>
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#141824] border border-[#2a3449] shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95">
          <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-[#222b3d]">
            Selecione a Unidade Foco
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setSelectedEscola(null)
                setSelectedSecretaria(null)
                useAuthStore.getState().setEscolaAtivaId(null)
                setIsOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                !selectedEscola && !selectedSecretaria ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'text-gray-300 hover:bg-[#1f2738] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="text-left">
                  <p className="font-bold">Visão Geral da Rede</p>
                  <p className="text-[10px] text-gray-400 font-normal">Todas as secretarias e unidades</p>
                </div>
              </div>
              {!selectedEscola && !selectedSecretaria && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
            </button>
          )}

          <div className="pt-1 border-t border-[#222b3d]/60 space-y-3 max-h-72 overflow-y-auto pr-0.5">
            {Object.entries(escolasAgrupadas).map(([secNome, unidades]) => {
              const isSecSelected = !selectedEscola && selectedSecretaria?.nome === secNome
              return (
                <div key={secNome} className="space-y-1">
                  {/* Header Clicável da Secretaria (Visão Consolidada) */}
                  <button
                    type="button"
                    onClick={() => {
                      const secId = unidades.find(u => u.secretaria_id)?.secretaria_id || escolas.find(e => e.secretariaNome === secNome || (e.secretarias as any)?.nome === secNome)?.secretaria_id || ''
                      setSelectedSecretaria({ id: secId, nome: secNome })
                      useAuthStore.getState().setEscolaAtivaId(null)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      isSecSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-sky-400 hover:bg-[#1f2738] hover:text-sky-300'
                    }`}
                    title={`Selecionar visão consolidada da ${secNome}`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{secNome}</span>
                      <span className="text-[9px] font-normal normal-case opacity-75">(Consolidado)</span>
                    </div>
                    {isSecSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>

                  {/* Unidades filhas */}
                  {unidades.map((escola) => {
                    const isSelected = selectedEscola?.id === escola.id
                    return (
                      <button
                        key={escola.id}
                        onClick={() => {
                          setSelectedEscola(escola)
                          useAuthStore.getState().setEscolaAtivaId(escola.id)
                          setIsOpen(false)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-semibold'
                            : 'text-gray-300 hover:bg-[#1f2738] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pl-1">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${escola.color || 'bg-blue-500'}`} />
                          <span className="truncate">{escola.nome}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
