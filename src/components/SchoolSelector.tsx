'use client'

import { useSchoolStore } from '@/store/useSchoolStore'
import { useAuthStore } from '@/store/useAuthStore'
import { Building2, ChevronDown, Check, Globe } from 'lucide-react'
import { useState, useRef, useEffect, useMemo } from 'react'

interface SchoolSelectorProps {
  scope?: 'all' | 'emaee'
}

export function SchoolSelector({ scope = 'all' }: SchoolSelectorProps) {
  const { escolas, selectedEscola, setSelectedEscola, selectedSecretaria, setSelectedSecretaria, loadEscolas } = useSchoolStore()
  const { funcionario, acessos, isAdminGlobalOrRoot, escolaAtivaId, setEscolaAtivaId, vinculos, isContaEja } = useAuthStore()
  const isSuperAdmin = Boolean(funcionario?.is_superadmin)
  const isNivel1 = !isSuperAdmin && Boolean(acessos?.some(a => a.nivel === 1 && a.ativo))
  const isAdmin = isAdminGlobalOrRoot()
  const isEja = isContaEja()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const vinculosAtivos = useMemo(() => vinculos?.filter((v) => v.ativo) || [], [vinculos])

  const escolasOficiais = useMemo(() => escolas.filter((e) => !e.is_teste), [escolas])

  const escolasDoEscopo = useMemo(() => {
    if (scope !== 'emaee') return escolasOficiais

    return escolasOficiais.filter((escola) => {
      const tipo = escola.tipo?.trim().toUpperCase()
      const nome = escola.nome.trim()
      return tipo === 'EMAEE' || /\bEMAEE\b|\bEMAAE\b|\bEMMAE\b/i.test(nome)
    })
  }, [escolasOficiais, scope])

  // IDs de secretarias autorizadas para o Nível 1
  const secretariasIdsNivel1 = useMemo<string[] | null>(() => {
    if (!isNivel1) return null
    const acs = acessos?.filter(a => a.nivel === 1 && a.ativo) || []
    const ids = acs.flatMap(a => (a as any).secretarias_ids || []).filter(Boolean)
    return ids.length > 0 ? ids : null
  }, [isNivel1, acessos])

  const escolasPermitidas = useMemo(() => {
    if (isEja) {
      return escolasDoEscopo.filter((e) => e.eja_ativo === true)
    }

    // Superadmin: Acesso global irrestrito a todas as secretarias e unidades
    if (isSuperAdmin) {
      return escolasDoEscopo
    }

    // Nível 1 (Secretário de Educação / Saúde / Admin de Pasta)
    if (isNivel1) {
      if (secretariasIdsNivel1 && secretariasIdsNivel1.length > 0) {
        return escolasDoEscopo.filter(e => e.secretaria_id && secretariasIdsNivel1.includes(e.secretaria_id))
      }

      if (selectedSecretaria?.id) {
        return escolasDoEscopo.filter(e => e.secretaria_id === selectedSecretaria.id)
      }

      // Detecção por contexto do cargo/pasta do Secretário
      const cargoNorm = (funcionario?.cargo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const isCargoSaude = /saude/i.test(cargoNorm)

      if (isCargoSaude) {
        return escolasDoEscopo.filter(e => {
          const secNome = e.secretariaNome || (e.secretarias as any)?.nome || ''
          return /sa[uú]de/i.test(secNome) || e.tipo === 'SAUDE' || e.tipo === 'UNIDADE_SAUDE'
        })
      }

      // Default para Secretário de Educação: apenas escolas regulares e EMAEE, excluindo Saúde
      return escolasDoEscopo.filter(e => {
        const secNome = e.secretariaNome || (e.secretarias as any)?.nome || ''
        const isSaude = /sa[uú]de/i.test(secNome) || e.tipo === 'SAUDE' || e.tipo === 'UNIDADE_SAUDE'
        return !isSaude
      })
    }

    // Nível 2 e Nível 3 (Diretores, Secretários Escolares, etc.)
    const allowedSchoolIds = new Set([
      ...vinculosAtivos.map(v => v.escola_id),
      ...(acessos?.filter(a => a.ativo && a.escola_id).map(a => a.escola_id as string) || [])
    ])

    if (allowedSchoolIds.size > 0) {
      return escolasDoEscopo.filter((e) => allowedSchoolIds.has(e.id))
    }

    // Sem fallback aberto para outras secretarias ou unidades
    return []
  }, [isSuperAdmin, isNivel1, isEja, escolasDoEscopo, secretariasIdsNivel1, selectedSecretaria?.id, funcionario?.cargo, vinculosAtivos, acessos])

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

  // Sincroniza a store de escola com a store de autenticação no carregamento com auto-limpeza
  useEffect(() => {
    if (selectedEscola?.is_teste) {
      if (escolaAtivaId !== selectedEscola.id) {
        setEscolaAtivaId(selectedEscola.id)
      }
      return
    }

    if (escolasPermitidas.length > 0) {
      // Auto-limpeza: Se havia uma escola selecionada no cache local que não pertence às escolasPermitidas (ex: USF na Educação)
      if (selectedEscola && !escolasPermitidas.some(e => e.id === selectedEscola.id)) {
        if (isSuperAdmin || isNivel1) {
          setSelectedEscola(null)
          setEscolaAtivaId(null)
        } else {
          setSelectedEscola(escolasPermitidas[0])
          setEscolaAtivaId(escolasPermitidas[0].id)
        }
        return
      }

      if (escolaAtivaId) {
        const escola = escolasPermitidas.find(e => e.id === escolaAtivaId)
        if (escola && selectedEscola?.id !== escola.id) {
          setSelectedEscola(escola)
        } else if (!escola && !isSuperAdmin && !isNivel1) {
          setSelectedEscola(escolasPermitidas[0])
          setEscolaAtivaId(escolasPermitidas[0].id)
        }
      } else if (!escolaAtivaId && selectedEscola) {
        setEscolaAtivaId(selectedEscola.id)
      } else if (!escolaAtivaId && !selectedEscola && !isSuperAdmin && !isNivel1 && !selectedSecretaria) {
        setSelectedEscola(escolasPermitidas[0])
        setEscolaAtivaId(escolasPermitidas[0].id)
      }
    } else if (!isSuperAdmin && !isNivel1 && selectedEscola) {
      setSelectedEscola(null)
      setEscolaAtivaId(null)
    }
  }, [escolasPermitidas, escolaAtivaId, selectedEscola, selectedSecretaria, isSuperAdmin, isNivel1, setSelectedEscola, setEscolaAtivaId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (escolasPermitidas.length === 0 && !isSuperAdmin && !isNivel1) {
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
              <div className={`w-3 h-3 rounded-full shrink-0 ${selectedEscola.color || (selectedEscola.is_teste ? 'bg-amber-500' : 'bg-blue-500')}`} />
              <span className="font-semibold text-white max-w-[180px] sm:max-w-[240px] truncate">{selectedEscola.nome}</span>
              {selectedEscola.is_teste && (
                <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40 uppercase shrink-0">
                  Teste
                </span>
              )}
            </>
          ) : selectedSecretaria ? (
            <>
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-emerald-200 max-w-[180px] sm:max-w-[240px] truncate">{selectedSecretaria.nome} (Consolidado)</span>
            </>
          ) : (
            <>
              <Globe className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="font-semibold text-sky-200 truncate">
                {isSuperAdmin ? 'Todas as Unidades (Rede Municipal)' : 'Visão Geral da Rede'}
              </span>
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

          {/* Visão Global da Rede exclusiva para Superadmin raiz */}
          {isSuperAdmin && (
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
