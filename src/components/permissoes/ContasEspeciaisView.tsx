'use client'

import { useState, useMemo } from 'react'
import { Sparkles, Search, Star, ShieldAlert, AlertCircle, RefreshCw, UserCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { UsePermissoesReturn } from './usePermissoes'

interface ContasEspeciaisViewProps {
  hook: UsePermissoesReturn
}

export function ContasEspeciaisView({ hook }: ContasEspeciaisViewProps) {
  const {
    funcionariosAll,
    loading,
    isEditActive,
    handleToggleContaEspecial,
    setModalSenhaOpen,
    fetchDadosContasEspeciais
  } = hook

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'especiais' | 'normais'>('todas')
  const [processandoId, setProcessandoId] = useState<string | null>(null)

  // Filtragem de funcionários em memória
  const contasFiltradas = useMemo(() => {
    return funcionariosAll.filter((f) => {
      const matchBusca =
        f.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (f.email ?? '').toLowerCase().includes(busca.toLowerCase()) ||
        (f.cargo ?? '').toLowerCase().includes(busca.toLowerCase())

      const isEspecial = !!f.is_conta_especial

      let matchStatus = true
      if (filtroStatus === 'especiais') matchStatus = isEspecial
      if (filtroStatus === 'normais') matchStatus = !isEspecial

      return matchBusca && matchStatus
    })
  }, [funcionariosAll, busca, filtroStatus])

  // Métricas do painel superior
  const totalEspeciais = useMemo(() => {
    return funcionariosAll.filter((f) => !!f.is_conta_especial).length
  }, [funcionariosAll])

  const handleToggle = async (funcId: string, currentStatus: boolean, nome: string) => {
    if (!isEditActive) {
      setModalSenhaOpen(true)
      return
    }

    setProcessandoId(funcId)
    await handleToggleContaEspecial(funcId, !currentStatus, nome)
    setProcessandoId(null)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Banner Informativo ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Gestão de Contas Especiais
              </h2>
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-xs font-semibold">
                {totalEspeciais} {totalEspeciais === 1 ? 'Conta Especial' : 'Contas Especiais'}
              </Badge>
            </div>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed max-w-3xl">
              Contas marcadas como <strong>Especiais</strong> (como contas de teste, superadmins ou perfis estritamente administrativos) 
              são <strong>omitidas da listagem operacional de funcionários</strong> e dos <strong>relatórios corporativos/escolares</strong>, 
              garantindo que os números de pessoal do município permaneçam 100% autênticos.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchDadosContasEspeciais}
          disabled={loading}
          className="bg-card hover:bg-hoverCustom border-borderCustom text-zinc-300 text-xs gap-2 rounded-xl shrink-0 cursor-pointer"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* ── Painel de Filtros e Busca ───────────────────────────────────────── */}
      <div className="bg-card border border-borderCustom rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              type="text"
              placeholder="Buscar conta por nome, e-mail ou cargo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 bg-input border-borderCustom text-foregroundCustom text-sm rounded-xl focus:border-[#0090ff] focus:ring-0"
            />
          </div>

          {/* Filtro por status */}
          <div className="inline-flex items-center bg-[#141416] p-1 rounded-xl border border-[#26262a] shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFiltroStatus('todas')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                filtroStatus === 'todas'
                  ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Todas ({funcionariosAll.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroStatus('especiais')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                filtroStatus === 'especiais'
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-bold"
                  : "text-zinc-400 hover:text-amber-400"
              )}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              Especiais ({totalEspeciais})
            </button>
            <button
              type="button"
              onClick={() => setFiltroStatus('normais')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                filtroStatus === 'normais'
                  ? "bg-blue-500/20 text-[#3ea6ff] border border-blue-500/40 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Normais ({funcionariosAll.length - totalEspeciais})
            </button>
          </div>
        </div>

        {/* ── Lista / Grid de Contas ────────────────────────────────────────── */}
        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-sm animate-pulse space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
            <p>Carregando catálogo de contas do sistema...</p>
          </div>
        ) : contasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-sm flex flex-col items-center justify-center space-y-3 bg-surface-1 rounded-xl border border-dashed border-borderCustom">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <div>
              <p className="font-semibold text-white">Nenhuma conta encontrada</p>
              <p className="text-xs text-zinc-400 mt-1">Tente ajustar a busca ou os filtros de status acima.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {contasFiltradas.map((item) => {
              const isEspecial = !!item.is_conta_especial
              const isBusy = processandoId === item.id

              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all flex flex-col justify-between gap-4 relative overflow-hidden",
                    isEspecial
                      ? "bg-amber-950/20 border-amber-500/40 shadow-md shadow-amber-950/30"
                      : "bg-surface-1 border-borderCustom hover:border-zinc-700"
                  )}
                >
                  {isEspecial && (
                    <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                      <div className="bg-amber-500 text-black font-extrabold text-[9px] py-0.5 text-center rotate-45 translate-x-4 translate-y-2 uppercase shadow-sm">
                        Especial
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          {item.nome}
                          {item.is_superadmin && (
                            <Badge variant="outline" className="border-red-500/40 text-red-400 bg-red-500/10 text-[10px] uppercase font-bold py-0">
                              ROOT
                            </Badge>
                          )}
                        </h4>
                        <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate max-w-[280px]">
                          {item.email ?? 'Sem e-mail cadastrado'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-300 pt-1">
                      <span className="bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700/60 font-medium">
                        {item.cargo ?? 'Cargo não informado'}
                      </span>
                    </div>

                    {isEspecial ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 mt-2 font-medium">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span>Oculto da listagem de funcionários e relatórios.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800/80 mt-2">
                        <UserCheck className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                        <span>Conta normal (Visível em listagens e relatórios).</span>
                      </div>
                    )}
                  </div>

                  {/* Botão de Alternância */}
                  <div className="pt-2 border-t border-borderCustom/50 flex items-center justify-end">
                    <Button
                      type="button"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleToggle(item.id, isEspecial, item.nome)}
                      className={cn(
                        "text-xs font-semibold rounded-xl gap-2 cursor-pointer transition-all",
                        isEspecial
                          ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                          : "bg-amber-600/90 hover:bg-amber-600 text-white shadow-md shadow-amber-600/20"
                      )}
                    >
                      {isBusy ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Atualizando...</span>
                        </>
                      ) : isEspecial ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Remover Especial</span>
                        </>
                      ) : (
                        <>
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>Marcar como Especial</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
